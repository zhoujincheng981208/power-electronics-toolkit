const builtinTools = [];

const storageKeys = {
  customTools: "power-electronics-custom-tools-v2",
  favorites: "power-electronics-favorites-v2",
  notes: "power-electronics-notes-v2",
  globalNotes: "power-electronics-global-notes"
};

const state = {
  selectedCategory: "全部",
  search: "",
  favoritesOnly: false,
  customTools: loadJson(storageKeys.customTools, []),
  favorites: new Set(loadJson(storageKeys.favorites, [])),
  notes: loadJson(storageKeys.notes, {}),
  globalNotes: localStorage.getItem(storageKeys.globalNotes) || ""
};

const elements = {
  categoryFilters: document.querySelector("#category-filters"),
  searchInput: document.querySelector("#search-input"),
  favoritesOnly: document.querySelector("#favorites-only"),
  toolGrid: document.querySelector("#tool-grid"),
  template: document.querySelector("#tool-card-template"),
  resultsSummary: document.querySelector("#results-summary"),
  favoritesBoard: document.querySelector("#favorites-board"),
  globalNotes: document.querySelector("#global-notes"),
  metrics: {
    total: document.querySelector("#metric-total"),
    favorites: document.querySelector("#metric-favorites"),
    custom: document.querySelector("#metric-custom")
  },
  dialog: document.querySelector("#tool-dialog"),
  toolForm: document.querySelector("#tool-form"),
  openAddTool: document.querySelector("#open-add-tool"),
  cancelDialog: document.querySelector("#cancel-dialog"),
  closeDialog: document.querySelector("#close-dialog"),
  exportTools: document.querySelector("#export-tools"),
  importTools: document.querySelector("#import-tools"),
  calculators: {
    buck: { inputs: { vin: document.querySelector("#buck-vin"), vout: document.querySelector("#buck-vout"), iout: document.querySelector("#buck-iout"), fsw: document.querySelector("#buck-fsw"), rippleCurrent: document.querySelector("#buck-ripple-current"), rippleVoltage: document.querySelector("#buck-ripple-voltage") }, output: document.querySelector("#buck-results") },
    boost: { inputs: { vin: document.querySelector("#boost-vin"), vout: document.querySelector("#boost-vout"), iout: document.querySelector("#boost-iout"), fsw: document.querySelector("#boost-fsw"), efficiency: document.querySelector("#boost-efficiency"), rippleCurrent: document.querySelector("#boost-ripple-current") }, output: document.querySelector("#boost-results") },
    lcl: { inputs: { vdc: document.querySelector("#lcl-vdc"), vll: document.querySelector("#lcl-vll"), power: document.querySelector("#lcl-power"), fsw: document.querySelector("#lcl-fsw"), gridFrequency: document.querySelector("#lcl-grid-frequency"), rippleCurrent: document.querySelector("#lcl-ripple-current"), capRatio: document.querySelector("#lcl-cap-ratio"), gridRatio: document.querySelector("#lcl-grid-ratio"), pf: document.querySelector("#lcl-pf"), dampingFactor: document.querySelector("#lcl-damping-factor"), minResonanceMultiple: document.querySelector("#lcl-min-resonance-multiple"), maxResonanceRatio: document.querySelector("#lcl-max-resonance-ratio") }, output: document.querySelector("#lcl-results") },
    filter: { inputs: { order: document.querySelector("#filter-order"), type: document.querySelector("#filter-type"), gainDb: document.querySelector("#filter-gain-db"), frequency: document.querySelector("#filter-frequency"), zeta: document.querySelector("#filter-zeta"), span: document.querySelector("#filter-span") }, output: document.querySelector("#filter-results") }
  }
};

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getAllTools() {
  return [...builtinTools, ...state.customTools];
}

function getCategories() {
  return ["全部", ...new Set(getAllTools().map((tool) => tool.category))];
}

function getFilteredTools() {
  return getAllTools().filter((tool) => {
    const matchesCategory = state.selectedCategory === "全部" || tool.category === state.selectedCategory;
    const searchable = `${tool.title} ${tool.description} ${tool.tags.join(" ")}`.toLowerCase();
    const matchesSearch = searchable.includes(state.search.toLowerCase());
    const matchesFavorite = !state.favoritesOnly || state.favorites.has(tool.id);
    return matchesCategory && matchesSearch && matchesFavorite;
  });
}

function renderCategories() {
  elements.categoryFilters.innerHTML = "";
  getCategories().forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-chip${state.selectedCategory === category ? " active" : ""}`;
    button.textContent = category;
    button.addEventListener("click", () => {
      state.selectedCategory = category;
      render();
    });
    elements.categoryFilters.appendChild(button);
  });
}

function renderTools() {
  const filteredTools = getFilteredTools();
  elements.toolGrid.innerHTML = "";
  if (!filteredTools.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "工具库已清空。后面你想放资料链接、仿真入口或厂家手册，可以点“新增工具”慢慢加。";
    elements.toolGrid.appendChild(empty);
    elements.resultsSummary.textContent = "没有匹配结果";
    return;
  }
  elements.resultsSummary.textContent = `当前显示 ${filteredTools.length} 个工具`;
  filteredTools.forEach((tool) => {
    const fragment = elements.template.content.cloneNode(true);
    const category = fragment.querySelector(".card-category");
    const favoriteBtn = fragment.querySelector(".favorite-btn");
    const title = fragment.querySelector(".card-title");
    const description = fragment.querySelector(".card-description");
    const tags = fragment.querySelector(".tag-row");
    const note = fragment.querySelector(".card-note");
    const openLink = fragment.querySelector(".primary-link");
    const deleteBtn = fragment.querySelector(".delete-btn");
    category.textContent = tool.category;
    title.textContent = tool.title;
    description.textContent = tool.description;
    note.value = state.notes[tool.id] || "";
    openLink.href = tool.url;
    if (state.favorites.has(tool.id)) {
      favoriteBtn.classList.add("active");
      favoriteBtn.textContent = "★";
    }
    tool.tags.forEach((tag) => {
      const chip = document.createElement("span");
      chip.textContent = tag;
      tags.appendChild(chip);
    });
    favoriteBtn.addEventListener("click", () => {
      if (state.favorites.has(tool.id)) {
        state.favorites.delete(tool.id);
      } else {
        state.favorites.add(tool.id);
      }
      saveJson(storageKeys.favorites, [...state.favorites]);
      render();
    });
    note.addEventListener("input", (event) => {
      state.notes[tool.id] = event.target.value;
      saveJson(storageKeys.notes, state.notes);
      renderFavoritesBoard();
    });
    if (tool.source !== "custom") {
      deleteBtn.classList.add("hidden");
    } else {
      deleteBtn.addEventListener("click", () => {
        state.customTools = state.customTools.filter((item) => item.id !== tool.id);
        state.favorites.delete(tool.id);
        delete state.notes[tool.id];
        saveJson(storageKeys.customTools, state.customTools);
        saveJson(storageKeys.favorites, [...state.favorites]);
        saveJson(storageKeys.notes, state.notes);
        render();
      });
    }
    elements.toolGrid.appendChild(fragment);
  });
}

function renderFavoritesBoard() {
  const favoriteTools = getAllTools().filter((tool) => state.favorites.has(tool.id));
  elements.favoritesBoard.innerHTML = "";
  if (!favoriteTools.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "你还没收藏工具。看到顺手的就点卡片右上角星标。";
    elements.favoritesBoard.appendChild(empty);
    return;
  }
  favoriteTools.forEach((tool) => {
    const wrapper = document.createElement("div");
    wrapper.className = "favorite-pill";
    const link = document.createElement("a");
    link.href = tool.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = tool.title;
    const note = document.createElement("span");
    note.textContent = state.notes[tool.id] ? "有备注" : tool.category;
    note.className = "panel-note";
    wrapper.append(link, note);
    elements.favoritesBoard.appendChild(wrapper);
  });
}

function renderMetrics() {
  elements.metrics.total.textContent = String(getAllTools().length);
  elements.metrics.favorites.textContent = String(state.favorites.size);
  elements.metrics.custom.textContent = String(state.customTools.length);
}

function render() {
  renderCategories();
  renderTools();
  renderFavoritesBoard();
  renderMetrics();
}
function openDialog() {
  elements.toolForm.reset();
  elements.dialog.showModal();
}

function closeDialog() {
  elements.dialog.close();
}

function exportTools() {
  const data = {
    exportedAt: new Date().toISOString(),
    customTools: state.customTools,
    favorites: [...state.favorites],
    notes: state.notes,
    globalNotes: state.globalNotes
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "power-electronics-toolkit.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

function handleImport(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      state.customTools = Array.isArray(data.customTools) ? data.customTools : [];
      state.favorites = new Set(Array.isArray(data.favorites) ? data.favorites : []);
      state.notes = data.notes && typeof data.notes === "object" ? data.notes : {};
      state.globalNotes = typeof data.globalNotes === "string" ? data.globalNotes : "";
      saveJson(storageKeys.customTools, state.customTools);
      saveJson(storageKeys.favorites, [...state.favorites]);
      saveJson(storageKeys.notes, state.notes);
      localStorage.setItem(storageKeys.globalNotes, state.globalNotes);
      elements.globalNotes.value = state.globalNotes;
      render();
    } catch {
      alert("导入失败：文件格式不对，请检查 JSON 文件内容。");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function toNumber(element) {
  return Number(element.value);
}

function formatNumber(value, digits = 3) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return Number(value).toFixed(digits);
}

function formatEngineering(value, unit, digits = 3) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  const prefixes = [
    { scale: 1e9, prefix: "G" },
    { scale: 1e6, prefix: "M" },
    { scale: 1e3, prefix: "k" },
    { scale: 1, prefix: "" },
    { scale: 1e-3, prefix: "m" },
    { scale: 1e-6, prefix: "u" },
    { scale: 1e-9, prefix: "n" },
    { scale: 1e-12, prefix: "p" }
  ];
  const abs = Math.abs(value);
  const selected = prefixes.find((item) => abs >= item.scale) || prefixes[prefixes.length - 1];
  return `${formatNumber(value / selected.scale, digits)} ${selected.prefix}${unit}`;
}

function renderResultCards(container, items) {
  if (!container) return;
  container.innerHTML = "";
  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "result-item";
    const label = document.createElement("span");
    label.textContent = item.label;
    const value = document.createElement("strong");
    value.textContent = item.value;
    card.append(label, value);
    container.appendChild(card);
  });
}

function computeBuck() {
  const vin = toNumber(elements.calculators.buck.inputs.vin);
  const vout = toNumber(elements.calculators.buck.inputs.vout);
  const iout = toNumber(elements.calculators.buck.inputs.iout);
  const fswHz = toNumber(elements.calculators.buck.inputs.fsw) * 1000;
  const rippleCurrentRatio = toNumber(elements.calculators.buck.inputs.rippleCurrent) / 100;
  const rippleVoltage = toNumber(elements.calculators.buck.inputs.rippleVoltage) / 1000;
  const duty = vout / vin;
  const deltaIL = iout * rippleCurrentRatio;
  const inductance = (vout * (1 - duty)) / (fswHz * deltaIL);
  const capacitance = deltaIL / (8 * fswHz * rippleVoltage);
  const load = vout / iout;
  const power = vout * iout;
  renderResultCards(elements.calculators.buck.output, [
    { label: "占空比 D", value: formatNumber(duty, 3) },
    { label: "电感纹波 ΔIL (A)", value: formatNumber(deltaIL, 3) },
    { label: "建议电感 L (uH)", value: formatNumber(inductance * 1e6, 2) },
    { label: "建议输出电容 C (uF)", value: formatNumber(capacitance * 1e6, 2) },
    { label: "负载等效 R (ohm)", value: formatNumber(load, 3) },
    { label: "输出功率 Pout (W)", value: formatNumber(power, 1) }
  ]);
}

function computeBoost() {
  const vin = toNumber(elements.calculators.boost.inputs.vin);
  const vout = toNumber(elements.calculators.boost.inputs.vout);
  const iout = toNumber(elements.calculators.boost.inputs.iout);
  const fswHz = toNumber(elements.calculators.boost.inputs.fsw) * 1000;
  const efficiency = toNumber(elements.calculators.boost.inputs.efficiency) / 100;
  const rippleCurrentRatio = toNumber(elements.calculators.boost.inputs.rippleCurrent) / 100;
  const duty = 1 - vin * efficiency / vout;
  const powerOut = vout * iout;
  const inputCurrent = powerOut / (vin * efficiency);
  const deltaIL = inputCurrent * rippleCurrentRatio;
  const inductance = (vin * duty) / (fswHz * deltaIL);
  const outputCapCurrent = iout * duty;
  renderResultCards(elements.calculators.boost.output, [
    { label: "占空比 D", value: formatNumber(duty, 3) },
    { label: "输入平均电流 (A)", value: formatNumber(inputCurrent, 3) },
    { label: "电感纹波 ΔIL (A)", value: formatNumber(deltaIL, 3) },
    { label: "建议电感 L (uH)", value: formatNumber(inductance * 1e6, 2) },
    { label: "输出功率 Pout (W)", value: formatNumber(powerOut, 1) },
    { label: "输出电容 RMS 电流近似 (A)", value: formatNumber(outputCapCurrent, 3) }
  ]);
}

function initCalculators() {
  Object.values(elements.calculators).forEach((calculator) => {
    Object.values(calculator.inputs).forEach((input) => {
      if (input) {
        input.addEventListener("input", runCalculators);
        input.addEventListener("change", runCalculators);
      }
    });
  });
  runCalculators();
}

function runCalculators() {
  computeBuck();
  computeBoost();
  computeLcl();
  computeFilter();
}

elements.searchInput.addEventListener("input", (event) => {
  state.search = event.target.value.trim();
  renderTools();
});
elements.favoritesOnly.addEventListener("change", (event) => {
  state.favoritesOnly = event.target.checked;
  renderTools();
});
elements.globalNotes.value = state.globalNotes;
elements.globalNotes.addEventListener("input", (event) => {
  state.globalNotes = event.target.value;
  localStorage.setItem(storageKeys.globalNotes, state.globalNotes);
});
elements.openAddTool.addEventListener("click", openDialog);
elements.cancelDialog.addEventListener("click", closeDialog);
elements.closeDialog.addEventListener("click", closeDialog);
elements.exportTools.addEventListener("click", exportTools);
elements.importTools.addEventListener("change", handleImport);
elements.toolForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(elements.toolForm);
  const customTool = {
    id: `custom-${crypto.randomUUID()}`,
    title: String(formData.get("title") || "").trim(),
    url: String(formData.get("url") || "").trim(),
    category: String(formData.get("category") || "通用工具"),
    description: String(formData.get("description") || "").trim() || "个人自定义工具",
    tags: String(formData.get("tags") || "").split(",").map((tag) => tag.trim()).filter(Boolean),
    source: "custom"
  };
  state.customTools.unshift(customTool);
  saveJson(storageKeys.customTools, state.customTools);
  closeDialog();
  render();
});

const lclDefaults = {
  vdc: 800,
  vll: 380,
  power: 10,
  fsw: 20,
  gridFrequency: 50,
  pf: 0.99,
  rippleCurrent: 20,
  capRatio: 5,
  gridRatio: 0.3,
  dampingFactor: 1,
  minResonanceMultiple: 10,
  maxResonanceRatio: 0.5
};

function getElementValue(id) {
  const element = document.querySelector(`#${id}`);
  return element ? Number(element.value) : NaN;
}

function setElementValue(id, value) {
  const element = document.querySelector(`#${id}`);
  if (element) {
    element.value = value;
  }
}

function computeLclValues() {
  const values = {
    vdc: getElementValue("lcl-vdc"),
    vll: getElementValue("lcl-vll"),
    powerKw: getElementValue("lcl-power"),
    fswKhz: getElementValue("lcl-fsw"),
    fg: getElementValue("lcl-grid-frequency"),
    pf: getElementValue("lcl-pf"),
    rippleCurrentPercent: getElementValue("lcl-ripple-current"),
    capRatioPercent: getElementValue("lcl-cap-ratio"),
    gridRatio: getElementValue("lcl-grid-ratio"),
    dampingFactor: getElementValue("lcl-damping-factor"),
    minResonanceMultiple: getElementValue("lcl-min-resonance-multiple"),
    maxResonanceRatio: getElementValue("lcl-max-resonance-ratio")
  };

  const p = values.powerKw * 1000;
  const fsw = values.fswKhz * 1000;
  const vPhase = values.vll / Math.sqrt(3);
  const iPhase = p / (Math.sqrt(3) * values.vll * values.pf);
  const zBase = (vPhase * vPhase) / (p / 3);
  const cBase = 1 / (2 * Math.PI * values.fg * zBase);
  const deltaI = iPhase * values.rippleCurrentPercent / 100;
  const li = values.vdc / (6 * fsw * deltaI);
  const lg = li * values.gridRatio;
  const cf = cBase * values.capRatioPercent / 100;
  const lTotal = li + lg;
  const resonance = (1 / (2 * Math.PI)) * Math.sqrt(lTotal / (li * lg * cf));
  const damping = values.dampingFactor / (3 * 2 * Math.PI * resonance * cf);
  const capReactivePower = 3 * vPhase ** 2 * 2 * Math.PI * values.fg * cf;
  const capCurrent = vPhase * 2 * Math.PI * values.fg * cf;
  const dampingLoss = 3 * capCurrent ** 2 * damping;
  const minResonance = values.fg * values.minResonanceMultiple;
  const maxResonance = fsw * values.maxResonanceRatio;

  return {
    ...values,
    power: p,
    fsw,
    vPhase,
    iPhase,
    zBase,
    cBase,
    deltaI,
    li,
    lg,
    cf,
    lTotal,
    resonance,
    damping,
    capReactivePower,
    capCurrent,
    dampingLoss,
    minResonance,
    maxResonance
  };
}

function lclStatusItems(result) {
  const items = [];
  const capReactiveRatio = result.capReactivePower / result.power;
  const resonanceInBand = result.resonance > result.minResonance && result.resonance < result.maxResonance;
  const fswRatio = result.fsw / result.resonance;
  const dampingLossRatio = result.dampingLoss / result.power;

  items.push({
    level: resonanceInBand ? "ok" : "bad",
    text: resonanceInBand
      ? `谐振频率 ${formatNumber(result.resonance, 1)} Hz 位于推荐窗口内。`
      : `谐振频率应在 ${formatNumber(result.minResonance, 0)} Hz 到 ${formatNumber(result.maxResonance, 0)} Hz 之间。`
  });

  items.push({
    level: capReactiveRatio <= 0.05 ? "ok" : capReactiveRatio <= 0.08 ? "warn" : "bad",
    text: `滤波电容基波无功约为额定功率的 ${formatNumber(capReactiveRatio * 100, 2)}%。工程上通常希望不超过 5%。`
  });

  items.push({
    level: fswRatio >= 2 ? "ok" : "warn",
    text: `开关频率 / 谐振频率 = ${formatNumber(fswRatio, 2)}。过低会让控制和开关纹波处理更吃紧。`
  });

  items.push({
    level: result.gridRatio >= 0.15 && result.gridRatio <= 1 ? "ok" : "warn",
    text: `当前 Lg/Li = ${formatNumber(result.gridRatio, 2)}。太小滤波效果弱，太大电网侧压降和动态会变差。`
  });

  items.push({
    level: dampingLossRatio <= 0.01 ? "ok" : dampingLossRatio <= 0.03 ? "warn" : "bad",
    text: `阻尼电阻基波损耗估算为 ${formatNumber(result.dampingLoss, 2)} W，约占额定功率 ${formatNumber(dampingLossRatio * 100, 2)}%。`
  });

  return items;
}

function renderLclChecks(items) {
  const container = document.querySelector("#lcl-checks");
  if (!container) return;
  container.innerHTML = "";
  items.forEach((item) => {
    const node = document.createElement("div");
    node.className = `check-item ${item.level}`;
    node.textContent = item.text;
    container.appendChild(node);
  });
}

function drawLclChart(result) {
  const canvas = document.querySelector("#lcl-chart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fffaf0";
  ctx.fillRect(0, 0, width, height);

  const left = 70;
  const right = width - 40;
  const y = height / 2;
  const minFreq = Math.max(1, result.fg);
  const maxFreq = Math.max(result.fsw, result.maxResonance) * 1.1;
  const logMin = Math.log10(minFreq);
  const logMax = Math.log10(maxFreq);
  const xFor = (freq) => left + ((Math.log10(freq) - logMin) / (logMax - logMin)) * (right - left);

  ctx.strokeStyle = "rgba(19,34,56,.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(right, y);
  ctx.stroke();

  const bandStart = xFor(result.minResonance);
  const bandEnd = xFor(result.maxResonance);
  ctx.fillStyle = "rgba(22,138,91,.12)";
  ctx.fillRect(bandStart, y - 46, bandEnd - bandStart, 92);

  const markers = [
    { label: "fg", freq: result.fg, color: "#566579" },
    { label: "10fg", freq: result.minResonance, color: "#168a5b" },
    { label: "fres", freq: result.resonance, color: "#c24718" },
    { label: "0.5fsw", freq: result.maxResonance, color: "#168a5b" },
    { label: "fsw", freq: result.fsw, color: "#132238" }
  ];

  markers.forEach((marker, index) => {
    const x = xFor(marker.freq);
    ctx.strokeStyle = marker.color;
    ctx.lineWidth = marker.label === "fres" ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 62);
    ctx.lineTo(x, y + 62);
    ctx.stroke();
    ctx.fillStyle = marker.color;
    ctx.font = "14px Noto Sans SC, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(marker.label, x, index % 2 === 0 ? y - 76 : y + 88);
    ctx.fillText(`${formatNumber(marker.freq, 0)} Hz`, x, index % 2 === 0 ? y - 56 : y + 108);
  });

  ctx.fillStyle = "#566579";
  ctx.textAlign = "left";
  ctx.font = "13px Noto Sans SC, sans-serif";
  ctx.fillText("推荐窗口：高于若干倍电网频率，低于开关频率的一部分", left, 26);
}

function buildLclReport(result) {
  return [
    "LCL 滤波器设计报告",
    `Vdc=${result.vdc} V, Vac,ll=${result.vll} V, Pout=${result.powerKw} kW, fsw=${result.fswKhz} kHz`,
    `Iphase=${formatNumber(result.iPhase, 3)} A, ΔI=${formatNumber(result.deltaI, 3)} A`,
    `Li=${formatNumber(result.li * 1e6, 2)} uH, Lg=${formatNumber(result.lg * 1e6, 2)} uH, Cf=${formatNumber(result.cf * 1e6, 2)} uF`,
    `fres=${formatNumber(result.resonance, 1)} Hz, Rd=${formatNumber(result.damping, 3)} ohm`,
    `Qc=${formatNumber(result.capReactivePower, 2)} var, damping loss=${formatNumber(result.dampingLoss, 2)} W`
  ].join("\n");
}

function computeLcl() {
  const result = computeLclValues();
  renderResultCards(document.querySelector("#lcl-results"), [
    { label: "逆变侧电感 Li (uH)", value: formatNumber(result.li * 1e6, 2) },
    { label: "电网侧电感 Lg (uH)", value: formatNumber(result.lg * 1e6, 2) },
    { label: "滤波电容 Cf (uF)", value: formatNumber(result.cf * 1e6, 2) },
    { label: "谐振频率 fres (Hz)", value: formatNumber(result.resonance, 1) },
    { label: "阻尼电阻 Rd (ohm)", value: formatNumber(result.damping, 3) },
    { label: "fsw/fres", value: formatNumber(result.fsw / result.resonance, 2) }
  ]);

  renderResultCards(document.querySelector("#lcl-secondary-results"), [
    { label: "相电压 RMS (V)", value: formatNumber(result.vPhase, 2) },
    { label: "相电流 RMS (A)", value: formatNumber(result.iPhase, 3) },
    { label: "电流纹波 ΔI (A)", value: formatNumber(result.deltaI, 3) },
    { label: "基值电容 Cbase (uF)", value: formatNumber(result.cBase * 1e6, 2) },
    { label: "电容无功 Qc (var)", value: formatNumber(result.capReactivePower, 2) },
    { label: "阻尼损耗估算 (W)", value: formatNumber(result.dampingLoss, 2) }
  ]);

  renderLclChecks(lclStatusItems(result));
  drawLclChart(result);
  window.latestLclResult = result;
}

function complex(re, im = 0) {
  return { re, im };
}

function cAdd(a, b) {
  return complex(a.re + b.re, a.im + b.im);
}

function cMul(a, b) {
  return complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
}

function cDiv(a, b) {
  const den = b.re * b.re + b.im * b.im;
  return complex((a.re * b.re + a.im * b.im) / den, (a.im * b.re - a.re * b.im) / den);
}

function cAbs(a) {
  return Math.hypot(a.re, a.im);
}

function cPhaseDeg(a) {
  return Math.atan2(a.im, a.re) * 180 / Math.PI;
}

function unwrapPhases(phases) {
  const result = [];
  phases.forEach((phase, index) => {
    if (index === 0) {
      result.push(phase);
      return;
    }
    let next = phase;
    const previous = result[index - 1];
    while (next - previous > 180) next -= 360;
    while (next - previous < -180) next += 360;
    result.push(next);
  });
  return result;
}

function interpolateCrossing(points, key, target) {
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const av = a[key] - target;
    const bv = b[key] - target;
    if (av === 0) return a;
    if (av * bv <= 0) {
      const ratio = Math.abs(av) / (Math.abs(av) + Math.abs(bv));
      return {
        frequency: a.frequency + (b.frequency - a.frequency) * ratio,
        magnitudeDb: a.magnitudeDb + (b.magnitudeDb - a.magnitudeDb) * ratio,
        phaseDeg: a.phaseDeg + (b.phaseDeg - a.phaseDeg) * ratio
      };
    }
  }
  return null;
}

function transferResponse(config, omega) {
  const s = complex(0, omega);
  const k = complex(config.gain);
  const wn = config.omega0;
  const s2 = cMul(s, s);

  if (config.order === 1) {
    const denominator = cAdd(s, complex(wn));
    const numerator = config.type === "highpass" ? s : complex(wn);
    return cMul(k, cDiv(numerator, denominator));
  }

  const denominator = cAdd(cAdd(s2, cMul(complex(2 * config.zeta * wn), s)), complex(wn * wn));
  let numerator;
  if (config.type === "highpass") {
    numerator = s2;
  } else if (config.type === "bandpass") {
    numerator = cMul(complex(2 * config.zeta * wn), s);
  } else if (config.type === "notch") {
    numerator = cAdd(s2, complex(wn * wn));
  } else {
    numerator = complex(wn * wn);
  }
  return cMul(k, cDiv(numerator, denominator));
}

function computeFilterValues() {
  const order = Number(elements.calculators.filter.inputs.order.value);
  let type = elements.calculators.filter.inputs.type.value;
  const gainDb = toNumber(elements.calculators.filter.inputs.gainDb);
  const frequency = toNumber(elements.calculators.filter.inputs.frequency);
  const zeta = toNumber(elements.calculators.filter.inputs.zeta);
  const span = Math.max(10, toNumber(elements.calculators.filter.inputs.span));
  type = order === 1 && (type === "bandpass" || type === "notch") ? "lowpass" : type;

  const config = {
    order,
    type,
    gainDb,
    gain: 10 ** (gainDb / 20),
    frequency,
    omega0: 2 * Math.PI * frequency,
    zeta: order === 1 ? 1 : zeta,
    q: order === 1 ? null : 1 / (2 * zeta),
    span
  };

  const start = Math.max(0.001, frequency / span);
  const stop = Math.max(start * 10, frequency * span);
  const samples = 260;
  const points = [];
  for (let i = 0; i < samples; i += 1) {
    const t = i / (samples - 1);
    const freq = 10 ** (Math.log10(start) + (Math.log10(stop) - Math.log10(start)) * t);
    const response = transferResponse(config, 2 * Math.PI * freq);
    points.push({
      frequency: freq,
      magnitudeDb: 20 * Math.log10(Math.max(cAbs(response), 1e-12)),
      phaseDeg: cPhaseDeg(response)
    });
  }
  const unwrapped = unwrapPhases(points.map((point) => point.phaseDeg));
  points.forEach((point, index) => { point.phaseDeg = unwrapped[index]; });

  const passbandDb = gainDb;
  const cutoff = interpolateCrossing(points, "magnitudeDb", passbandDb - 3);
  const gainCross = interpolateCrossing(points, "magnitudeDb", 0);
  const phaseCross = interpolateCrossing(points, "phaseDeg", -180);
  const phaseMargin = gainCross ? 180 + gainCross.phaseDeg : Infinity;
  const gainMargin = phaseCross ? -phaseCross.magnitudeDb : Infinity;
  const peak = points.reduce((best, point) => point.magnitudeDb > best.magnitudeDb ? point : best, points[0]);

  return {
    ...config,
    points,
    cutoffFrequency: cutoff?.frequency || frequency,
    gainCrossFrequency: gainCross?.frequency || null,
    phaseCrossFrequency: phaseCross?.frequency || null,
    phaseMargin,
    gainMargin,
    peakMagnitudeDb: peak.magnitudeDb,
    peakFrequency: peak.frequency
  };
}

function filterTypeLabel(result) {
  const labels = { lowpass: "低通", highpass: "高通", bandpass: "带通", notch: "陷波" };
  return `${result.order} 阶 ${labels[result.type]}`;
}

function drawBodeChart(result) {
  const canvas = document.querySelector("#filter-bode-chart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const pad = { left: 72, right: 32, top: 34, bottom: 42 };
  const mid = height * 0.49;
  const plotWidth = width - pad.left - pad.right;
  const magTop = pad.top;
  const magBottom = mid - 24;
  const phaseTop = mid + 34;
  const phaseBottom = height - pad.bottom;
  const freqs = result.points.map((point) => point.frequency);
  const mags = result.points.map((point) => point.magnitudeDb);
  const phases = result.points.map((point) => point.phaseDeg);
  const logMin = Math.log10(Math.min(...freqs));
  const logMax = Math.log10(Math.max(...freqs));
  const magMin = Math.floor((Math.min(...mags, -40) - 6) / 10) * 10;
  const magMax = Math.ceil((Math.max(...mags, 10) + 6) / 10) * 10;
  const phaseMin = Math.floor((Math.min(...phases, -180) - 20) / 45) * 45;
  const phaseMax = Math.ceil((Math.max(...phases, 90) + 20) / 45) * 45;
  const xFor = (freq) => pad.left + ((Math.log10(freq) - logMin) / (logMax - logMin)) * plotWidth;
  const yMag = (db) => magBottom - ((db - magMin) / (magMax - magMin)) * (magBottom - magTop);
  const yPhase = (deg) => phaseBottom - ((deg - phaseMin) / (phaseMax - phaseMin)) * (phaseBottom - phaseTop);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fffdf6";
  ctx.fillRect(0, 0, width, height);

  function drawPanel(top, bottom, min, max, label, yFor) {
    ctx.strokeStyle = "rgba(19,34,56,.13)";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#566579";
    ctx.font = "13px Noto Sans SC, sans-serif";
    ctx.textAlign = "right";
    const steps = 4;
    for (let i = 0; i <= steps; i += 1) {
      const value = min + (max - min) * i / steps;
      const y = yFor(value);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(width - pad.right, y);
      ctx.stroke();
      ctx.fillText(formatNumber(value, 0), pad.left - 10, y + 4);
    }
    ctx.fillStyle = "#132238";
    ctx.textAlign = "left";
    ctx.font = "700 14px Noto Sans SC, sans-serif";
    ctx.fillText(label, pad.left, top - 12);
    ctx.strokeStyle = "rgba(19,34,56,.22)";
    ctx.strokeRect(pad.left, top, plotWidth, bottom - top);
  }

  drawPanel(magTop, magBottom, magMin, magMax, "幅值 / dB", yMag);
  drawPanel(phaseTop, phaseBottom, phaseMin, phaseMax, "相位 / deg", yPhase);

  const decades = Math.ceil(logMax) - Math.floor(logMin);
  ctx.fillStyle = "#566579";
  ctx.textAlign = "center";
  ctx.font = "12px Space Grotesk, sans-serif";
  for (let d = 0; d <= decades; d += 1) {
    const freq = 10 ** (Math.floor(logMin) + d);
    if (freq < freqs[0] || freq > freqs[freqs.length - 1]) continue;
    const x = xFor(freq);
    ctx.strokeStyle = "rgba(19,34,56,.09)";
    ctx.beginPath();
    ctx.moveTo(x, magTop);
    ctx.lineTo(x, magBottom);
    ctx.moveTo(x, phaseTop);
    ctx.lineTo(x, phaseBottom);
    ctx.stroke();
    ctx.fillText(formatEngineering(freq, "Hz", 1), x, height - 14);
  }

  function drawCurve(yFor, color, key) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    result.points.forEach((point, index) => {
      const x = xFor(point.frequency);
      const y = yFor(point[key]);
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  drawCurve(yMag, "#0f766e", "magnitudeDb");
  drawCurve(yPhase, "#c24718", "phaseDeg");

  const markerX = xFor(result.cutoffFrequency);
  ctx.strokeStyle = "rgba(194,71,24,.5)";
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(markerX, magTop);
  ctx.lineTo(markerX, phaseBottom);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#c24718";
  ctx.textAlign = "center";
  ctx.fillText("fc", markerX, magTop + 16);
}

function filterStatusItems(result) {
  const items = [];
  const pmText = Number.isFinite(result.phaseMargin) ? `${formatNumber(result.phaseMargin, 1)}°` : "未出现 0 dB 穿越";
  const gmText = Number.isFinite(result.gainMargin) ? `${formatNumber(result.gainMargin, 2)} dB` : "未出现 -180° 相位穿越";

  items.push({
    level: result.frequency > 0 ? "ok" : "bad",
    text: result.frequency > 0 ? `当前模型为 ${filterTypeLabel(result)}，中心/截止频率设为 ${formatNumber(result.frequency, 2)} Hz。` : "频率必须大于 0。"
  });

  items.push({
    level: Number.isFinite(result.phaseMargin) ? result.phaseMargin >= 45 ? "ok" : result.phaseMargin >= 30 ? "warn" : "bad" : "ok",
    text: `相位裕度 PM = ${pmText}。一般控制系统会希望 PM 大于 45°，这样瞬态振铃和超调更容易控制。`
  });

  items.push({
    level: Number.isFinite(result.gainMargin) ? result.gainMargin >= 6 ? "ok" : result.gainMargin >= 3 ? "warn" : "bad" : "ok",
    text: `幅值裕度 GM = ${gmText}。GM 越大，代表增益变化后离失稳越远；没有 -180° 穿越通常表示这个开环模型在扫描范围内没有典型幅值裕度点。`
  });

  if (result.order === 2) {
    items.push({
      level: result.zeta >= 0.5 && result.zeta <= 1.2 ? "ok" : "warn",
      text: `二阶阻尼 ζ = ${formatNumber(result.zeta, 3)}，等效 Q = ${formatNumber(result.q, 3)}。ζ 小会更尖锐，ζ 大会更钝、更慢。`
    });
  }

  items.push({
    level: result.peakMagnitudeDb <= result.gainDb + 3 ? "ok" : "warn",
    text: `扫描范围内峰值幅值为 ${formatNumber(result.peakMagnitudeDb, 2)} dB，出现在 ${formatNumber(result.peakFrequency, 2)} Hz。峰值明显高于通带增益时，要留意共振或噪声放大。`
  });

  return items;
}

function renderFilterChecks(items) {
  const container = document.querySelector("#filter-checks");
  if (!container) return;
  container.innerHTML = "";
  items.forEach((item) => {
    const node = document.createElement("div");
    node.className = `check-item ${item.level}`;
    node.textContent = item.text;
    container.appendChild(node);
  });
}

function computeFilter() {
  const result = computeFilterValues();
  renderResultCards(elements.calculators.filter.output, [
    { label: "滤波器模型", value: filterTypeLabel(result) },
    { label: "截止/固有频率", value: `${formatNumber(result.cutoffFrequency, 2)} Hz` },
    { label: "通带增益 K", value: `${formatNumber(result.gainDb, 2)} dB` },
    { label: "相位裕度 PM", value: Number.isFinite(result.phaseMargin) ? `${formatNumber(result.phaseMargin, 1)}°` : "未穿越" },
    { label: "幅值裕度 GM", value: Number.isFinite(result.gainMargin) ? `${formatNumber(result.gainMargin, 2)} dB` : "未穿越" },
    { label: "峰值幅值", value: `${formatNumber(result.peakMagnitudeDb, 2)} dB` }
  ]);
  drawBodeChart(result);
  renderFilterChecks(filterStatusItems(result));
}
function initEnhancedLclControls() {
  const resetButton = document.querySelector("#lcl-reset");
  if (resetButton) {
    resetButton.addEventListener("click", () => {
      Object.entries(lclDefaults).forEach(([key, value]) => {
        const id = `lcl-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
        setElementValue(id, value);
      });
      runCalculators();
    });
  }

  const copyButton = document.querySelector("#lcl-copy-report");
  if (copyButton) {
    copyButton.addEventListener("click", async () => {
      if (!window.latestLclResult) runCalculators();
      const report = buildLclReport(window.latestLclResult);
      try {
        await navigator.clipboard.writeText(report);
        copyButton.textContent = "已复制";
        setTimeout(() => { copyButton.textContent = "复制报告"; }, 1200);
      } catch {
        alert(report);
      }
    });
  }
}

render();
initEnhancedLclControls();
initCalculators();
