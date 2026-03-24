const KEYWORDS = {
  name: ["姓名", "名字", "name", "realname"],
  phone: ["手机", "电话", "mobile", "phone", "tel"],
  email: ["邮箱", "邮件", "email", "mail"],
  github: ["github", "git"],
  school: ["学校", "院校", "毕业院校", "university", "college", "school"],
  schoolPeriod: ["在校时间", "就读时间", "起止时间", "schoolperiod", "educationperiod", "fromto"],
  college: ["学院", "学部", "college", "faculty", "department"],
  major: ["专业", "major"],
  schoolCity: ["学校城市", "院校城市", "城市", "city", "location"],
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

function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[\s\-_:：;；,.。()（）\[\]{}]/g, "");
}

function isEditableField(el) {
  if (!el || el.disabled || el.readOnly) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLSelectElement) return true;
  if (!(el instanceof HTMLInputElement)) return false;

  const t = (el.type || "text").toLowerCase();
  const denied = ["hidden", "file", "submit", "button", "image", "reset", "checkbox", "radio", "range", "color", "password"];
  return !denied.includes(t);
}

function elementTextHint(el) {
  const parts = [
    el.name,
    el.id,
    el.placeholder,
    el.getAttribute("aria-label"),
    el.getAttribute("data-testid"),
    el.getAttribute("data-name")
  ];

  const labels = el.labels ? Array.from(el.labels).map((n) => n.textContent) : [];
  parts.push(...labels);

  const prev = el.previousElementSibling;
  if (prev) parts.push(prev.textContent);

  const parentLabel = el.closest("label");
  if (parentLabel) parts.push(parentLabel.textContent);

  return (parts.filter(Boolean).join(" ") || "").trim();
}

function chooseBestField(elements, keywords, usedSet) {
  let best = null;
  let bestScore = 0;

  for (const el of elements) {
    if (usedSet.has(el)) continue;
    const hint = normalizeText(elementTextHint(el));
    if (!hint) continue;

    let score = 0;
    for (const kw of keywords) {
      const k = normalizeText(kw);
      if (!k) continue;
      if (hint === k) score += 5;
      else if (hint.includes(k)) score += 2;
    }

    if (score > bestScore) {
      best = el;
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

function setControlValue(el, value) {
  if (value === undefined || value === null || value === "") return false;

  if (el instanceof HTMLSelectElement) {
    const picked = pickSelectOption(el, value);
    if (!picked) return false;
    el.value = picked.value;
    if (el.value !== picked.value) {
      el.selectedIndex = picked.index;
    }
  } else {
    el.focus();
    el.value = String(value);
  }

  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.blur();
  return true;
}

function fillProfileLocal(profile) {
  const all = Array.from(document.querySelectorAll("input, textarea, select")).filter(isEditableField);
  const used = new Set();
  let filledCount = 0;

  for (const [fieldKey, keywords] of Object.entries(KEYWORDS)) {
    const value = profile[fieldKey];
    if (!value) continue;

    const target = chooseBestField(all, keywords, used);
    if (!target) continue;

    if (setControlValue(target, value)) {
      used.add(target);
      filledCount += 1;
    }
  }

  return filledCount;
}

function ensureFieldKey(el, index) {
  if (el.dataset.autofillKey) return el.dataset.autofillKey;
  const key = `af_${Date.now()}_${index}`;
  el.dataset.autofillKey = key;
  return key;
}

function extractFormFields() {
  const all = Array.from(document.querySelectorAll("input, textarea, select")).filter(isEditableField);
  return all.map((el, index) => {
    const fieldKey = ensureFieldKey(el, index);
    const hint = elementTextHint(el);
    const tag = el.tagName.toLowerCase();
    const inputType = el instanceof HTMLInputElement ? (el.type || "text") : tag;
    const required = Boolean(el.required || el.getAttribute("aria-required") === "true");
    const options = el instanceof HTMLSelectElement
      ? Array.from(el.options)
        .map((o) => (o.textContent || "").trim())
        .filter(Boolean)
        .filter((x) => !isPlaceholderOption(x, x))
        .slice(0, 8)
        .map((x) => x.slice(0, 24))
      : [];

    return {
      fieldKey,
      tag,
      inputType,
      required,
      hint,
      options
    };
  });
}

function applyAiMappings(mappings) {
  let filledCount = 0;
  for (const item of mappings || []) {
    if (!item || typeof item.fieldKey !== "string") continue;
    const el = document.querySelector(`[data-autofill-key="${CSS.escape(item.fieldKey)}"]`);
    if (!el || !isEditableField(el)) continue;
    if (setControlValue(el, item.value)) {
      filledCount += 1;
    }
  }
  return filledCount;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "AUTOFILL_PROFILE" || message?.type === "AUTOFILL_PROFILE_LOCAL") {
    const filledCount = fillProfileLocal(message.payload || {});
    sendResponse({ ok: true, filledCount });
    return;
  }

  if (message?.type === "EXTRACT_FORM_FIELDS") {
    const fields = extractFormFields();
    sendResponse({ ok: true, fields, count: fields.length });
    return;
  }

  if (message?.type === "APPLY_AI_MAPPING") {
    const mappings = message?.payload?.mappings || [];
    const filledCount = applyAiMappings(mappings);
    sendResponse({ ok: true, filledCount });
  }
});
