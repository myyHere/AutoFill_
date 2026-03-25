const KEYWORDS = {
  name: ["姓名", "名字", "name", "realname"],
  phone: ["手机", "电话", "mobile", "phone", "tel"],
  email: ["邮箱", "邮件", "email", "mail"],
  github: ["github", "git"],
  school: ["学校", "院校", "毕业院校", "university", "college", "school"],
  schoolPeriod: ["在校时间", "就读时间", "起止时间", "schoolperiod", "educationperiod", "fromto"],
  college: ["学院", "学部", "college", "faculty", "department"],
  major: ["专业", "major"],
  schoolCity: ["学校城市", "院校城市", "学校所在地", "学校所在城市", "schoolcity", "universitycity", "campuscity"],
  familyCity: ["家庭城市", "户籍", "生源地", "籍贯", "家乡", "hometown", "homecity"],
  gpa: ["gpa", "绩点", "平均绩点", "gradepoint"],
  majorRank: ["专业排名", "排名", "rank", "top"],
  lab: ["实验室", "lab", "laboratory", "researchgroup", "acm", "icpc"],
  scholarships: ["奖学金", "荣誉", "获奖", "scholarship", "award", "honor"],
  projectName: ["项目名称", "项目名", "项目", "projectname", "project"],
  projectTime: ["项目时间", "项目起止时间", "projecttime", "projectperiod"],
  projectContent: ["项目内容", "项目描述", "项目简介", "projectdescription", "projectcontent"],
  competitionAward: ["竞赛获奖", "竞赛奖项", "比赛获奖", "competitionaward", "awardname"],
  competitionTime: ["获奖时间", "比赛时间", "awardtime", "competitiontime"],
  competitionContent: ["获奖内容", "获奖描述", "奖项内容", "awarddescription", "awardcontent"],
  wechat: ["微信", "wechat", "weixin"],
  city: ["城市", "所在地", "居住地", "city", "location"],
  degree: ["学历", "学位", "degree", "education"],
  workYears: ["工作年限", "工作经验", "years", "experience"],
  currentCompany: ["当前公司", "现公司", "company", "employer"],
  currentTitle: ["当前职位", "岗位", "title", "position", "job"],
  expectedSalary: ["期望薪资", "薪资", "salary", "compensation"],
  portfolio: ["作品", "个人主页", "portfolio", "blog", "website", "site"],
  selfIntro: ["自我介绍", "个人简介", "profile", "summary", "about"]
};

const STRICT_LABEL_KEYWORDS = {
  schoolCity: ["学校城市", "院校城市", "学校所在地", "学校所在城市", "schoolcity", "universitycity", "campuscity"],
  familyCity: ["家庭城市", "户籍", "生源地", "籍贯", "家乡", "hometown", "homecity"]
};

const FIELD_SHAPE_HINTS = {
  scholarships: "textarea",
  projectContent: "textarea",
  competitionContent: "textarea",
  selfIntro: "textarea",
  degree: "selectLike",
  schoolCity: "selectLike",
  familyCity: "selectLike",
  city: "selectLike"
};

const FIELD_INPUT_TYPE_HINTS = {
  email: ["email", "text"],
  phone: ["tel", "text", "number"],
  portfolio: ["url", "text"],
  github: ["url", "text"],
  gpa: ["number", "text"],
  workYears: ["number", "text"]
};

const CUSTOM_COMBOBOX_SELECTORS = [
  "[role='combobox']",
  "[aria-haspopup='listbox']"
].join(",");

const CUSTOM_DROPDOWN_CONTAINER_SELECTORS = [
  "[role='listbox']",
  ".ant-select-dropdown",
  ".el-select-dropdown",
  ".ivu-select-dropdown",
  ".n-base-select-menu",
  ".select-dropdown",
  ".dropdown-menu"
].join(",");

const CUSTOM_OPTION_SELECTORS = [
  "[role='option']",
  "[data-value]",
  "li[aria-selected]",
  "li[data-value]",
  ".ant-select-item-option",
  ".ant-select-item-option-content",
  ".el-select-dropdown__item",
  ".ivu-select-item",
  ".n-base-select-option",
  ".vxe-select-option",
  ".select-option"
].join(",");

function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[\s\-_:：;；,.。()（）\[\]{}]/g, "");
}

function cssEscapeSafe(value) {
  if (window.CSS && typeof window.CSS.escape === "function") {
    return window.CSS.escape(value);
  }
  return String(value || "").replace(/[\\"]/g, "\\$&");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isVisible(el) {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function isCustomCombobox(el) {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    return false;
  }
  if (el.getAttribute("aria-disabled") === "true" || el.hasAttribute("disabled")) return false;

  const role = (el.getAttribute("role") || "").toLowerCase();
  const hasListboxPopup = (el.getAttribute("aria-haspopup") || "").toLowerCase() === "listbox";
  const isComboLike = role === "combobox" || hasListboxPopup;
  return isComboLike && isVisible(el);
}

function isEditableField(el) {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.getAttribute("aria-disabled") === "true") return false;

  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    return !el.disabled && !el.readOnly && isVisible(el);
  }

  if (el instanceof HTMLInputElement) {
    if (el.disabled || el.readOnly) return false;
    const t = (el.type || "text").toLowerCase();
    const denied = ["hidden", "file", "submit", "button", "image", "reset", "checkbox", "radio", "range", "color", "password"];
    return !denied.includes(t) && isVisible(el);
  }

  return isCustomCombobox(el);
}

function getEditableElements() {
  const nativeElements = Array.from(document.querySelectorAll("input, textarea, select")).filter(isEditableField);
  const customComboboxes = Array.from(document.querySelectorAll(CUSTOM_COMBOBOX_SELECTORS)).filter(isCustomCombobox);
  return Array.from(new Set([...nativeElements, ...customComboboxes]));
}

function elementLabelText(el) {
  const parts = [];

  const labels = el.labels ? Array.from(el.labels).map((n) => n.textContent || "") : [];
  parts.push(...labels);

  const prev = el.previousElementSibling;
  if (prev) parts.push(prev.textContent || "");

  const parentLabel = el.closest("label");
  if (parentLabel) parts.push(parentLabel.textContent || "");

  const ariaLabelledby = el.getAttribute("aria-labelledby");
  if (ariaLabelledby) {
    ariaLabelledby.split(/\s+/).forEach((id) => {
      const node = document.getElementById(id);
      if (node) parts.push(node.textContent || "");
    });
  }

  return (parts.filter(Boolean).join(" ") || "").trim();
}

function elementHintText(el) {
  const parts = [
    elementLabelText(el),
    el.getAttribute("name"),
    el.getAttribute("id"),
    el.getAttribute("placeholder"),
    el.getAttribute("aria-label"),
    el.getAttribute("data-testid"),
    el.getAttribute("data-name"),
    el.getAttribute("title")
  ];
  return (parts.filter(Boolean).join(" ") || "").trim();
}

function scoreAgainstTerms(source, terms, exactScore, includeScore) {
  if (!source) return 0;
  let score = 0;
  for (const term of terms || []) {
    const target = normalizeText(term);
    if (!target) continue;
    if (source === target) score = Math.max(score, exactScore);
    else if (source.includes(target)) score = Math.max(score, includeScore);
  }
  return score;
}

function buildFieldMeta(el) {
  const tag = el.tagName.toLowerCase();
  const inputType = el instanceof HTMLInputElement
    ? (el.type || "text").toLowerCase()
    : isCustomCombobox(el)
      ? "combobox"
      : tag;
  const labelNorm = normalizeText(elementLabelText(el));
  const hintNorm = normalizeText(elementHintText(el));
  return {
    el,
    tag,
    inputType,
    isCombobox: isCustomCombobox(el),
    labelNorm,
    hintNorm
  };
}

function scoreFieldShape(fieldKey, meta) {
  const shape = FIELD_SHAPE_HINTS[fieldKey];
  if (!shape) return 0;

  if (shape === "textarea") {
    if (meta.tag === "textarea") return 12;
    if (meta.tag === "select" || meta.isCombobox) return -8;
    return -2;
  }

  if (shape === "selectLike") {
    if (meta.tag === "select" || meta.isCombobox) return 10;
    if (meta.tag === "textarea") return -8;
    return 1;
  }

  return 0;
}

function scoreInputTypePreference(fieldKey, meta) {
  const preferred = FIELD_INPUT_TYPE_HINTS[fieldKey];
  if (!preferred || !preferred.length) return 0;
  if (preferred.includes(meta.inputType)) return 6;
  return -2;
}

function chooseBestField(fieldMetas, fieldKey, keywords, usedSet) {
  const strictTerms = STRICT_LABEL_KEYWORDS[fieldKey] || [];

  if (strictTerms.length) {
    let strictBest = null;
    let strictScore = 0;
    for (const meta of fieldMetas) {
      if (usedSet.has(meta.el)) continue;
      const score = scoreAgainstTerms(meta.labelNorm, strictTerms, 140, 95) + scoreFieldShape(fieldKey, meta);
      if (score > strictScore) {
        strictBest = meta.el;
        strictScore = score;
      }
    }
    if (strictBest && strictScore > 0) return strictBest;
  }

  let best = null;
  let bestScore = 0;

  for (const meta of fieldMetas) {
    if (usedSet.has(meta.el)) continue;
    if (!meta.hintNorm) continue;

    let score = scoreAgainstTerms(meta.hintNorm, keywords, 35, 14);
    if (strictTerms.length) {
      score += scoreAgainstTerms(meta.hintNorm, strictTerms, 8, 4);
    }
    score += scoreFieldShape(fieldKey, meta);
    score += scoreInputTypePreference(fieldKey, meta);

    if (score > bestScore) {
      best = meta.el;
      bestScore = score;
    }
  }

  return bestScore > 0 ? best : null;
}

function buildSelectAliases(value) {
  const text = String(value || "");
  const normalized = normalizeText(text);
  const aliases = new Set([normalized]);

  const add = (arr) => arr.forEach((x) => aliases.add(normalizeText(x)));

  if (/本科|学士|bachelor|undergraduate/i.test(text)) add(["本科", "学士", "bachelor", "undergraduate"]);
  if (/硕士|研究生|master|postgraduate/i.test(text)) add(["硕士", "研究生", "master", "postgraduate"]);
  if (/博士|phd|doctor/i.test(text)) add(["博士", "phd", "doctor"]);
  if (/大专|专科|college|associate/i.test(text)) add(["大专", "专科", "college", "associate"]);
  if (/男|male/i.test(text)) add(["男", "male", "man"]);
  if (/女|female/i.test(text)) add(["女", "female", "woman"]);

  return Array.from(aliases).filter(Boolean);
}

function isPlaceholderOption(text, value) {
  const t = normalizeText(text);
  const v = normalizeText(value);
  if (!t && !v) return true;
  return ["请选择", "select", "pleaseselect", "choose", "--"].some((kw) => t.includes(normalizeText(kw)));
}

function pickSelectOption(selectEl, rawValue) {
  const aliases = buildSelectAliases(rawValue);
  let bestOption = null;
  let bestScore = 0;

  for (const option of Array.from(selectEl.options)) {
    if (option.disabled) continue;
    const optionTextRaw = (option.textContent || "").trim();
    const optionValueRaw = String(option.value || "");
    const optionText = normalizeText(optionTextRaw);
    const optionValue = normalizeText(optionValueRaw);
    const placeholder = isPlaceholderOption(optionTextRaw, optionValueRaw);

    for (const target of aliases) {
      if (!target) continue;
      let score = 0;

      if (optionValue && optionValue === target) score = 120;
      else if (optionText && optionText === target) score = 110;
      else if (!placeholder && optionText && (optionText.includes(target) || target.includes(optionText))) score = 70;
      else if (!placeholder && optionValue && (optionValue.includes(target) || target.includes(optionValue))) score = 60;

      if (score > bestScore) {
        bestScore = score;
        bestOption = option;
      }
    }
  }

  return bestScore > 0 ? bestOption : null;
}

function dispatchInputChange(el) {
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function clickLikeUser(el) {
  if (!el) return;
  el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
  el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
  el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
}

function isDisabledOptionNode(node) {
  if (!(node instanceof HTMLElement)) return true;
  if (node.getAttribute("aria-disabled") === "true") return true;
  if (node.hasAttribute("disabled")) return true;
  const className = String(node.className || "").toLowerCase();
  return className.includes("disabled") || className.includes("is-disabled");
}

function resolveOptionClickableNode(node) {
  if (!(node instanceof HTMLElement)) return null;
  return node.closest("[role='option'], .ant-select-item-option, .el-select-dropdown__item, .ivu-select-item, .n-base-select-option, .vxe-select-option, li") || node;
}

function distanceBetweenRects(a, b) {
  const ax = a.left + a.width / 2;
  const ay = a.top + a.height / 2;
  const bx = b.left + b.width / 2;
  const by = b.top + b.height / 2;
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

function collectDropdownContainers(anchorEl) {
  const containers = [];
  const controlsIds = [anchorEl.getAttribute("aria-controls"), anchorEl.getAttribute("aria-owns")]
    .filter(Boolean)
    .map((id) => id.trim());

  for (const id of controlsIds) {
    const node = document.getElementById(id);
    if (node && node instanceof HTMLElement && isVisible(node)) {
      containers.push(node);
    }
  }

  if (containers.length > 0) {
    return Array.from(new Set(containers));
  }

  const anchorRect = anchorEl.getBoundingClientRect();
  const visibleCandidates = Array.from(document.querySelectorAll(CUSTOM_DROPDOWN_CONTAINER_SELECTORS))
    .filter((node) => node instanceof HTMLElement)
    .filter((node) => isVisible(node));

  return visibleCandidates
    .sort((a, b) => distanceBetweenRects(anchorRect, a.getBoundingClientRect()) - distanceBetweenRects(anchorRect, b.getBoundingClientRect()))
    .slice(0, 3);
}

function collectCustomOptionCandidates(anchorEl) {
  const candidates = [];
  const containers = collectDropdownContainers(anchorEl);
  for (const container of containers) {
    candidates.push(...Array.from(container.querySelectorAll(CUSTOM_OPTION_SELECTORS)));
    if (container.matches("[role='option']")) {
      candidates.push(container);
    }
  }

  const unique = Array.from(new Set(candidates));
  return unique
    .map((node) => resolveOptionClickableNode(node))
    .filter(Boolean)
    .filter((node) => !isDisabledOptionNode(node))
    .filter((node) => isVisible(node))
    .filter((node) => {
      const text = (node.innerText || node.textContent || "").trim();
      return text.length > 0 && text.length <= 80;
    });
}

function pickBestCustomOption(anchorEl, rawValue) {
  const aliases = buildSelectAliases(rawValue);
  const candidates = collectCustomOptionCandidates(anchorEl);

  let best = null;
  let bestScore = 0;

  for (const node of candidates) {
    const textRaw = (node.innerText || node.textContent || "").trim();
    const text = normalizeText(textRaw);
    if (!text || isPlaceholderOption(textRaw, textRaw)) continue;

    for (const target of aliases) {
      if (!target) continue;
      let score = 0;
      if (text === target) score = 130;
      else if (text.includes(target) || target.includes(text)) score = 75;

      if (score > bestScore) {
        bestScore = score;
        best = node;
      }
    }
  }

  return bestScore > 0 ? best : null;
}

async function setCustomComboboxValue(el, value) {
  clickLikeUser(el);

  for (let attempt = 0; attempt < 6; attempt++) {
    const optionNode = pickBestCustomOption(el, value);
    if (optionNode) {
      clickLikeUser(optionNode);
      dispatchInputChange(el);
      if (typeof el.blur === "function") el.blur();
      return true;
    }
    await sleep(120);
  }

  const nestedInput = el instanceof HTMLInputElement
    ? el
    : el.querySelector("input, textarea, [contenteditable='true']");

  if (nestedInput instanceof HTMLInputElement || nestedInput instanceof HTMLTextAreaElement) {
    nestedInput.focus();
    nestedInput.value = String(value);
    dispatchInputChange(nestedInput);
    nestedInput.blur();
    dispatchInputChange(el);
    return true;
  }

  if (nestedInput instanceof HTMLElement && nestedInput.getAttribute("contenteditable") === "true") {
    nestedInput.focus();
    nestedInput.textContent = String(value);
    dispatchInputChange(nestedInput);
    nestedInput.blur();
    dispatchInputChange(el);
    return true;
  }

  return false;
}

async function setControlValue(el, value) {
  if (value === undefined || value === null || value === "") return false;

  if (el instanceof HTMLSelectElement) {
    const picked = pickSelectOption(el, value);
    if (!picked) return false;
    el.value = picked.value;
    if (el.value !== picked.value) {
      el.selectedIndex = picked.index;
    }
    dispatchInputChange(el);
    if (typeof el.blur === "function") el.blur();
    return true;
  }

  if (isCustomCombobox(el)) {
    return setCustomComboboxValue(el, value);
  }

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.focus();
    el.value = String(value);
    dispatchInputChange(el);
    el.blur();
    return true;
  }

  return false;
}

async function fillProfileLocal(profile) {
  const all = getEditableElements();
  const fieldMetas = all.map((el) => buildFieldMeta(el));
  const used = new Set();
  let filledCount = 0;

  for (const [fieldKey, keywords] of Object.entries(KEYWORDS)) {
    const value = profile[fieldKey];
    if (!value) continue;

    const target = chooseBestField(fieldMetas, fieldKey, keywords, used);
    if (!target) continue;

    if (await setControlValue(target, value)) {
      used.add(target);
      filledCount += 1;
    }
  }

  return filledCount;
}

function buildDomPath(el) {
  const segments = [];
  let current = el;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    const tag = current.tagName.toLowerCase();

    if (current.id) {
      segments.unshift(`${tag}#${cssEscapeSafe(current.id)}`);
      break;
    }

    let index = 1;
    let sibling = current.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === current.tagName) index += 1;
      sibling = sibling.previousElementSibling;
    }

    segments.unshift(`${tag}:nth-of-type(${index})`);
    current = current.parentElement;

    if (current === document.body || current === document.documentElement) {
      break;
    }
  }

  return segments.join(" > ");
}

function buildStableFieldKey(el, index) {
  const id = el.getAttribute("id") || "";
  const name = el.getAttribute("name") || "";
  const path = buildDomPath(el);
  const tag = el.tagName.toLowerCase();

  return [
    "af",
    `tag=${encodeURIComponent(tag)}`,
    `id=${encodeURIComponent(id)}`,
    `name=${encodeURIComponent(name)}`,
    `path=${encodeURIComponent(path)}`,
    `idx=${index}`
  ].join("|");
}

function ensureFieldKey(el, index) {
  if (el.dataset.autofillKey) return el.dataset.autofillKey;
  const key = buildStableFieldKey(el, index);
  el.dataset.autofillKey = key;
  return key;
}

function parseFieldKey(fieldKey) {
  const result = { id: "", name: "", path: "", tag: "" };
  if (!fieldKey || typeof fieldKey !== "string") return result;

  fieldKey.split("|").forEach((part) => {
    const [k, v] = part.split("=");
    if (!v) return;
    if (k === "id") result.id = decodeURIComponent(v);
    if (k === "name") result.name = decodeURIComponent(v);
    if (k === "path") result.path = decodeURIComponent(v);
    if (k === "tag") result.tag = decodeURIComponent(v);
  });

  return result;
}

function resolveElementByFieldKey(fieldKey) {
  if (!fieldKey) return null;

  const direct = document.querySelector(`[data-autofill-key="${cssEscapeSafe(fieldKey)}"]`);
  if (direct && isEditableField(direct)) return direct;

  const parsed = parseFieldKey(fieldKey);

  if (parsed.id) {
    const byId = document.getElementById(parsed.id);
    if (byId && isEditableField(byId)) return byId;
  }

  if (parsed.name) {
    const byName = Array.from(document.querySelectorAll(`[name="${cssEscapeSafe(parsed.name)}"]`)).find(isEditableField);
    if (byName) return byName;
  }

  if (parsed.path) {
    try {
      const byPath = document.querySelector(parsed.path);
      if (byPath && isEditableField(byPath)) return byPath;
    } catch {
      // Ignore invalid selector path and continue fallback.
    }
  }

  if (parsed.tag && parsed.name) {
    const byTagAndName = document.querySelector(`${parsed.tag}[name="${cssEscapeSafe(parsed.name)}"]`);
    if (byTagAndName && isEditableField(byTagAndName)) return byTagAndName;
  }

  return null;
}

function extractOptionsForElement(el) {
  if (el instanceof HTMLSelectElement) {
    return Array.from(el.options)
      .map((o) => (o.textContent || "").trim())
      .filter(Boolean)
      .filter((x) => !isPlaceholderOption(x, x))
      .slice(0, 8)
      .map((x) => x.slice(0, 24));
  }

  if (isCustomCombobox(el)) {
    return collectCustomOptionCandidates(el)
      .map((node) => (node.innerText || node.textContent || "").trim())
      .filter(Boolean)
      .filter((x) => !isPlaceholderOption(x, x))
      .slice(0, 8)
      .map((x) => x.slice(0, 24));
  }

  return [];
}

function extractFormFields() {
  const all = getEditableElements();
  return all.map((el, index) => {
    const fieldKey = ensureFieldKey(el, index);
    const hint = elementHintText(el);
    const tag = el.tagName.toLowerCase();
    const inputType = el instanceof HTMLInputElement
      ? (el.type || "text")
      : isCustomCombobox(el)
        ? "combobox"
        : tag;

    const required = Boolean(
      (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)
        ? el.required
        : false
    ) || el.getAttribute("aria-required") === "true";

    return {
      fieldKey,
      tag,
      inputType,
      required,
      hint,
      options: extractOptionsForElement(el)
    };
  });
}

async function applyAiMappings(mappings) {
  let filledCount = 0;

  for (const item of mappings || []) {
    if (!item || typeof item.fieldKey !== "string") continue;
    const el = resolveElementByFieldKey(item.fieldKey);
    if (!el || !isEditableField(el)) continue;

    if (await setControlValue(el, item.value)) {
      filledCount += 1;
    }
  }

  return filledCount;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const type = message?.type;

  if (type === "AUTOFILL_PROFILE" || type === "AUTOFILL_PROFILE_LOCAL") {
    (async () => {
      const filledCount = await fillProfileLocal(message.payload || {});
      sendResponse({ ok: true, filledCount });
    })().catch((err) => {
      sendResponse({ ok: false, filledCount: 0, error: String(err?.message || err || "本地填充失败") });
    });
    return true;
  }

  if (type === "EXTRACT_FORM_FIELDS") {
    (async () => {
      const fields = extractFormFields();
      sendResponse({ ok: true, fields, count: fields.length });
    })().catch((err) => {
      sendResponse({ ok: false, fields: [], count: 0, error: String(err?.message || err || "字段提取失败") });
    });
    return true;
  }

  if (type === "APPLY_AI_MAPPING") {
    (async () => {
      const mappings = message?.payload?.mappings || [];
      const filledCount = await applyAiMappings(mappings);
      sendResponse({ ok: true, filledCount });
    })().catch((err) => {
      sendResponse({ ok: false, filledCount: 0, error: String(err?.message || err || "AI 回填失败") });
    });
    return true;
  }

  return false;
});
