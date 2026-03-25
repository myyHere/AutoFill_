const FIELD_IDS = [
  "name",
  "phone",
  "email",
  "github",
  "school",
  "schoolPeriod",
  "college",
  "major",
  "schoolCity",
  "familyCity",
  "gpa",
  "majorRank",
  "lab",
  "scholarships",
  "projectName",
  "projectTime",
  "projectContent",
  "competitionAward",
  "competitionTime",
  "competitionContent",
  "wechat",
  "city",
  "degree",
  "workYears",
  "currentCompany",
  "currentTitle",
  "expectedSalary",
  "portfolio",
  "selfIntro"
];

const SETTINGS_IDS = ["fillMode", "apiKey", "baseUrl", "model"];
const DEFAULT_SETTINGS = {
  fillMode: "local",
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4.1-mini"
};
const REQUEST_TIMEOUT_MS = 25000;

const statusEl = document.getElementById("status");
const fillModeEl = document.getElementById("fillMode");

function showStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? "#b42318" : "#2f6f20";
}

function collectProfileFromUI() {
  const profile = {};
  for (const id of FIELD_IDS) {
    profile[id] = (document.getElementById(id).value || "").trim();
  }
  return profile;
}

function applyProfileToUI(profile) {
  for (const id of FIELD_IDS) {
    document.getElementById(id).value = profile?.[id] || "";
  }
}

function collectSettingsFromUI() {
  const settings = {};
  for (const id of SETTINGS_IDS) {
    settings[id] = (document.getElementById(id).value || "").trim();
  }
  return settings;
}

function applySettingsToUI(settings) {
  const merged = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  for (const id of SETTINGS_IDS) {
    document.getElementById(id).value = merged[id] || "";
  }
  updateAiVisibility();
}

function updateAiVisibility() {
  const aiMode = fillModeEl.value === "ai";
  document.querySelectorAll(".ai-only").forEach((el) => {
    el.classList.toggle("show", aiMode);
  });
}

async function loadAll() {
  const data = await chrome.storage.sync.get(["profile", "settings"]);
  applyProfileToUI(data.profile || {});
  applySettingsToUI(data.settings || DEFAULT_SETTINGS);
}

async function saveAll() {
  const profile = collectProfileFromUI();
  const settings = { ...DEFAULT_SETTINGS, ...collectSettingsFromUI() };
  await chrome.storage.sync.set({ profile, settings });
  showStatus("已保存信息和设置");
}

async function getCurrentTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id || null;
}

async function fillByLocalRules(tabId, profile) {
  const result = await chrome.tabs.sendMessage(tabId, {
    type: "AUTOFILL_PROFILE_LOCAL",
    payload: profile
  }).catch(() => null);

  if (!result) {
    showStatus("当前页面不支持自动填充", true);
    return;
  }

  showStatus(`本地模式完成，已填写 ${result.filledCount} 项`);
}

function extractJsonObject(text) {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function truncateText(text, maxLen = 160) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  return raw.length > maxLen ? `${raw.slice(0, maxLen)}...` : raw;
}

function compactProfileForAI(profile) {
  const compact = {};
  for (const [k, v] of Object.entries(profile || {})) {
    const value = String(v || "").trim();
    if (!value) continue;
    compact[k] = truncateText(value, 240);
  }
  return compact;
}

function compactFieldsForAI(fields) {
  return (fields || [])
    .slice(0, 30)
    .map((f) => ({
      fieldKey: f?.fieldKey || "",
      tag: f?.tag || "",
      inputType: f?.inputType || "",
      required: Boolean(f?.required),
      hint: truncateText(f?.hint || "", 120),
      options: Array.isArray(f?.options) ? f.options.slice(0, 8).map((x) => truncateText(x, 24)) : []
    }))
    .filter((f) => f.fieldKey);
}

function extractApiErrorMessage(rawText) {
  if (!rawText) return "";
  try {
    const parsed = JSON.parse(rawText);
    const msg = parsed?.error?.message || parsed?.message;
    return msg ? String(msg) : "";
  } catch {
    return "";
  }
}

function formatHttpError(status, rawText, context, model = "") {
  const detail = extractApiErrorMessage(rawText) || truncateText(rawText);
  if (status === 400) return `${context}失败：请求参数错误（400）${detail ? `，${detail}` : ""}`;
  if (status === 401 || status === 403) return `${context}失败：API Key 无效或无权限（${status}）`;
  if (status === 404) return `${context}失败：接口地址或模型不存在（404）${model ? `，模型 ${model}` : ""}`;
  if (status === 408 || status === 504) return `${context}失败：服务超时（${status}）`;
  if (status === 429) return `${context}失败：请求过于频繁/额度不足（429），请稍后重试`;
  if (status >= 500) return `${context}失败：服务端异常（${status}）${detail ? `，${detail}` : ""}`;
  return `${context}失败：HTTP ${status}${detail ? `，${detail}` : ""}`;
}

function formatNetworkError(err, context) {
  if (err?.name === "AbortError") {
    return `${context}失败：请求超时（>${REQUEST_TIMEOUT_MS / 1000}s）`;
  }
  const raw = String(err?.message || err || "");
  if (/Failed to fetch|NetworkError|Load failed/i.test(raw)) {
    return `${context}失败：网络不可达或 Base URL 不可用`;
  }
  return `${context}失败：${truncateText(raw) || "未知错误"}`;
}

async function fetchWithTimeout(url, options, context) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    throw new Error(formatNetworkError(err, context));
  } finally {
    clearTimeout(timer);
  }
}

async function verifyApiConnection() {
  const settings = { ...DEFAULT_SETTINGS, ...collectSettingsFromUI() };
  if (!settings.apiKey) {
    showStatus("请先填写 AI API Key", true);
    return;
  }

  const baseUrl = (settings.baseUrl || DEFAULT_SETTINGS.baseUrl).replace(/\/+$/, "");
  const model = settings.model || DEFAULT_SETTINGS.model;
  const authHeaders = { Authorization: `Bearer ${settings.apiKey}` };

  showStatus("正在验证 AI API...");

  const modelsResp = await fetchWithTimeout(`${baseUrl}/models`, {
    method: "GET",
    headers: authHeaders
  }, "API 验证");

  if (modelsResp.ok) {
    const data = await modelsResp.json();
    const models = Array.isArray(data?.data) ? data.data.map((x) => x?.id).filter(Boolean) : [];
    if (!models.length) {
      showStatus("API 可用：模型列表接口连通");
      return;
    }
    if (models.includes(model)) {
      showStatus(`API 可用：模型 ${model} 可访问`);
      return;
    }
    showStatus(`API 可用：但未在列表中找到模型 ${model}`);
    return;
  }

  // Some OpenAI-compatible services may not implement /models, fallback to a tiny chat call.
  if (modelsResp.status !== 404) {
    const err = await modelsResp.text();
    throw new Error(formatHttpError(modelsResp.status, err, "API 验证", model));
  }

  const chatResp = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }]
    })
  }, "API 验证");

  if (!chatResp.ok) {
    const err = await chatResp.text();
    throw new Error(formatHttpError(chatResp.status, err, "API 验证", model));
  }

  showStatus(`API 可用：聊天接口测试通过（模型 ${model}）`);
}

async function mapFieldsByAI(profile, fields, settings) {
  const compactProfile = compactProfileForAI(profile);
  const compactFields = compactFieldsForAI(fields);

  const prompt = [
    "你是表单映射助手。",
    "给你候选表单字段和个人资料，返回应填写的映射。",
    "只返回 JSON，不要输出其他文本。",
    "JSON 格式: {\"mappings\":[{\"fieldKey\":\"...\",\"value\":\"...\"}]}",
    "规则:",
    "1) 仅使用提供的 fieldKey。",
    "2) 只填写有把握的字段。",
    "3) value 必须是字符串。",
    "4) 不要编造资料中不存在的信息。",
    "",
    `个人资料: ${JSON.stringify(compactProfile)}`,
    `候选字段: ${JSON.stringify(compactFields)}`
  ].join("\n");

  const baseUrl = (settings.baseUrl || DEFAULT_SETTINGS.baseUrl).replace(/\/+$/, "");
  const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model || DEFAULT_SETTINGS.model,
      temperature: 0,
      messages: [
        { role: "system", content: "你是严谨的 JSON 生成器。" },
        { role: "user", content: prompt }
      ]
    })
  }, "AI 分析");

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(formatHttpError(response.status, errorText, "AI 分析", settings.model || DEFAULT_SETTINGS.model));
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || "";
  const parsed = extractJsonObject(content);

  if (!parsed || !Array.isArray(parsed.mappings)) {
    throw new Error("AI 返回格式不正确");
  }

  return parsed.mappings
    .filter((x) => x && typeof x.fieldKey === "string" && typeof x.value === "string")
    .map((x) => ({ fieldKey: x.fieldKey, value: x.value.trim() }))
    .filter((x) => x.fieldKey && x.value);
}

async function fillByAI(tabId, profile, settings) {
  if (!settings.apiKey) {
    showStatus("AI 模式需要先填写 API Key", true);
    return;
  }

  const extracted = await chrome.tabs.sendMessage(tabId, { type: "EXTRACT_FORM_FIELDS" }).catch(() => null);
  if (!extracted || !Array.isArray(extracted.fields) || extracted.fields.length === 0) {
    showStatus("未识别到可填写字段", true);
    return;
  }

  showStatus(`AI 分析中（字段 ${extracted.fields.length} 项）...`);
  const mappings = await mapFieldsByAI(profile, extracted.fields, settings);
  if (!mappings.length) {
    showStatus("AI 未找到可填项", true);
    return;
  }

  const result = await chrome.tabs.sendMessage(tabId, {
    type: "APPLY_AI_MAPPING",
    payload: { mappings }
  }).catch(() => null);

  if (!result) {
    showStatus("AI 回填失败", true);
    return;
  }

  showStatus(`AI 模式完成，建议 ${mappings.length} 项，已填 ${result.filledCount} 项`);
}

async function fillCurrentTab() {
  const { profile, settings } = await chrome.storage.sync.get(["profile", "settings"]);
  if (!profile) {
    showStatus("请先填写并保存个人信息", true);
    return;
  }

  const tabId = await getCurrentTabId();
  if (!tabId) {
    showStatus("未找到当前页面", true);
    return;
  }

  const mergedSettings = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  if (mergedSettings.fillMode === "ai") {
    await fillByAI(tabId, profile, mergedSettings);
  } else {
    await fillByLocalRules(tabId, profile);
  }
}

function exportProfile() {
  const data = collectProfileFromUI();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "autofill-profile.json";
  a.click();

  URL.revokeObjectURL(url);
  showStatus("已导出配置文件");
}

async function importProfile(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const profile = JSON.parse(text);
    applyProfileToUI(profile);
    const { settings } = await chrome.storage.sync.get("settings");
    await chrome.storage.sync.set({ profile, settings: settings || DEFAULT_SETTINGS });
    showStatus("导入成功，已自动保存");
  } catch {
    showStatus("导入失败，请检查 JSON 文件", true);
  }
}

async function clearSavedProfile() {
  const emptyProfile = {};
  for (const id of FIELD_IDS) {
    emptyProfile[id] = "";
  }
  applyProfileToUI(emptyProfile);

  const { settings } = await chrome.storage.sync.get("settings");
  await chrome.storage.sync.set({ profile: emptyProfile, settings: settings || DEFAULT_SETTINGS });
  showStatus("已清空已保存信息");
}

document.getElementById("saveBtn").addEventListener("click", () => {
  saveAll().catch(() => showStatus("保存失败", true));
});

document.getElementById("fillBtn").addEventListener("click", () => {
  fillCurrentTab().catch((err) => showStatus(err?.message || "自动填充失败", true));
});

document.getElementById("exportBtn").addEventListener("click", exportProfile);

document.getElementById("importInput").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  importProfile(file);
});

document.getElementById("clearProfileBtn").addEventListener("click", () => {
  clearSavedProfile().catch((err) => showStatus(err?.message || "清空失败", true));
});

document.getElementById("verifyApiBtn").addEventListener("click", () => {
  verifyApiConnection().catch((err) => showStatus(err?.message || "API 验证失败", true));
});

document.getElementById("saveAndVerifyBtn").addEventListener("click", () => {
  saveAll()
    .then(() => verifyApiConnection())
    .catch((err) => showStatus(err?.message || "保存并验证失败", true));
});

fillModeEl.addEventListener("change", updateAiVisibility);

loadAll().catch(() => showStatus("读取历史信息失败", true));
