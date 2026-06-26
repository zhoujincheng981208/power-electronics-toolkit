const builtinTools = [
  { id: "builtin-lcl", title: "LCL 滤波器设计", category: "滤波器", url: "https://powtoolbox.cn/LCL%E6%BB%A4%E6%B3%A2%E5%99%A8%E8%AE%BE%E8%AE%A1", description: "适合并网逆变器侧的 LCL 参数估算与设计验证入口。", tags: ["LCL", "并网", "滤波器"], source: "builtin" },
  { id: "builtin-sim", title: "PLECS / PSIM / LTspice 资料入口", category: "仿真资料", url: "https://www.plexim.com/", description: "常用仿真平台的官方入口，可以作为模型、教程和案例的统一跳板。", tags: ["仿真", "PLECS", "PSIM", "LTspice"], source: "builtin" },
  { id: "builtin-datasheet", title: "器件数据手册总入口", category: "论文手册", url: "https://www.infineon.com/", description: "IGBT、SiC、MOSFET、驱动芯片等数据手册查询入口。", tags: ["DataSheet", "SiC", "MOSFET"], source: "builtin" },
  { id: "builtin-magnetics", title: "磁性器件设计资料", category: "磁性器件", url: "https://www.ferroxcube.com/", description: "磁芯选型、损耗曲线、材料手册和设计资源入口。", tags: ["磁芯", "损耗", "电感"], source: "builtin" },
  { id: "builtin-topology", title: "拓扑与控制思路整理", category: "拓扑设计", url: "https://www.ti.com/power-management/overview.html", description: "适合整理 Buck、Boost、PFC、LLC、逆变器相关资料。", tags: ["Buck", "Boost", "PFC", "LLC"], source: "builtin" },
  { id: "builtin-select", title: "器件选型与参考设计", category: "器件选型", url: "https://www.wolfspeed.com/knowledge-center/", description: "适合查看 SiC 器件、参考设计和应用笔记。", tags: ["选型", "SiC", "参考设计"], source: "builtin" }
];

const storageKeys = {
  customTools: "power-electronics-custom-tools",
  favorites: "power-electronics-favorites",
  notes: "power-electronics-notes",
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
    filter: { inputs: { type: document.querySelector("#filter-type"), frequency: document.querySelector("#filter-frequency"), capacitance: document.querySelector("#filter-capacitance"), resistance: document.querySelector("#filter-resistance"), zeta: document.querySelector("#filter-zeta"), q: document.querySelector("#filter-q") }, output: document.querySelector("#filter-results") }
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
    empty.textContent = "当前筛选条件下没有工具。你可以放宽搜索条件，或者自己新增一个工具卡片。";
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

function computeFilterValues() {
  const type = elements.calculators.filter.inputs.type.value;
  const frequency = toNumber(elements.calculators.filter.inputs.frequency);
  const capacitance = toNumber(elements.calculators.filter.inputs.capacitance) * 1e-6;
  const knownResistance = toNumber(elements.calculators.filter.inputs.resistance);
  const zeta = toNumber(elements.calculators.filter.inputs.zeta);
  const q = toNumber(elements.calculators.filter.inputs.q);
  const omega = 2 * Math.PI * frequency;
  const safeC = capacitance > 0 ? capacitance : NaN;
  const safeF = frequency > 0 ? frequency : NaN;
  const safeOmega = omega > 0 ? omega : NaN;

  if (type === "rc-lowpass" || type === "rc-highpass") {
    const resistance = 1 / (safeOmega * safeC);
    const timeConstant = resistance * safeC;
    const actualCutoff = 1 / (2 * Math.PI * knownResistance * safeC);
    return {
      type,
      frequency: safeF,
      capacitance: safeC,
      resistance,
      knownResistance,
      actualCutoff,
      timeConstant,
      slope: 20,
      phaseAtCutoff: type === "rc-lowpass" ? -45 : 45
    };
  }

  if (type === "lc-lowpass") {
    const inductance = 1 / (safeOmega * safeOmega * safeC);
    const characteristicImpedance = Math.sqrt(inductance / safeC);
    const dampingResistance = 2 * zeta * characteristicImpedance;
    return {
      type,
      frequency: safeF,
      capacitance: safeC,
      inductance,
      characteristicImpedance,
      dampingResistance,
      zeta,
      slope: 40
    };
  }

  const inductance = 1 / (safeOmega * safeOmega * safeC);
  const notchResistance = safeOmega * inductance / q;
  const bandwidth = safeF / q;
  const lowEdge = safeF - bandwidth / 2;
  const highEdge = safeF + bandwidth / 2;
  return {
    type,
    frequency: safeF,
    capacitance: safeC,
    inductance,
    notchResistance,
    q,
    bandwidth,
    lowEdge,
    highEdge,
    knownResistance
  };
}

function filterStatusItems(result) {
  const items = [];
  const frequencyOk = result.frequency > 0;
  const capacitanceOk = result.capacitance > 0;

  items.push({
    level: frequencyOk && capacitanceOk ? "ok" : "bad",
    text: frequencyOk && capacitanceOk
      ? "输入频率和电容有效，已按目标频率反推元件值。"
      : "频率和电容必须大于 0，否则公式会失效。"
  });

  if (result.type.startsWith("rc")) {
    items.push({
      level: result.resistance >= 1 && result.resistance <= 1e6 ? "ok" : "warn",
      text: `RC 反算电阻为 ${formatEngineering(result.resistance, "ohm", 2)}。太小会增加驱动负担，太大容易受漏电和噪声影响。`
    });
    items.push({
      level: "ok",
      text: `一阶 ${result.type === "rc-lowpass" ? "低通" : "高通"} 在截止频率处幅值约 -3 dB，相位约 ${result.phaseAtCutoff}°。`
    });
    return items;
  }

  if (result.type === "lc-lowpass") {
    items.push({
      level: result.zeta >= 0.5 && result.zeta <= 1.2 ? "ok" : "warn",
      text: `阻尼系数 ζ = ${formatNumber(result.zeta, 3)}。ζ≈0.707 常用于较平坦响应，ζ 太小会尖峰明显。`
    });
    items.push({
      level: result.dampingResistance > 0 ? "ok" : "bad",
      text: `按 Rcrit = 2ζsqrt(L/C) 得到阻尼/负载参考电阻 ${formatEngineering(result.dampingResistance, "ohm", 2)}。`
    });
    return items;
  }

  items.push({
    level: result.q >= 2 && result.q <= 50 ? "ok" : "warn",
    text: `陷波 Q = ${formatNumber(result.q, 2)}，带宽约 ${formatNumber(result.bandwidth, 2)} Hz。Q 越大陷波越窄，但对元件误差越敏感。`
  });
  items.push({
    level: result.notchResistance > 0 ? "ok" : "bad",
    text: `按 Q = ω0L/R 得到串联等效电阻 ${formatEngineering(result.notchResistance, "ohm", 2)}。实际还要算电感 DCR 和电容 ESR。`
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
  const typeLabel = {
    "rc-lowpass": "RC 低通",
    "rc-highpass": "RC 高通",
    "lc-lowpass": "LC 低通",
    "rlc-notch": "RLC 陷波"
  }[result.type];

  if (result.type.startsWith("rc")) {
    renderResultCards(elements.calculators.filter.output, [
      { label: "滤波器类型", value: typeLabel },
      { label: "反算电阻 R", value: formatEngineering(result.resistance, "ohm", 2) },
      { label: "已知电容 C", value: formatEngineering(result.capacitance, "F", 2) },
      { label: "时间常数 τ", value: formatEngineering(result.timeConstant, "s", 2) },
      { label: "截止频率 fc", value: `${formatNumber(result.frequency, 2)} Hz` },
      { label: "输入 R/C 实际 fc", value: `${formatNumber(result.actualCutoff, 2)} Hz` },
      { label: "滚降斜率", value: `${result.slope} dB/dec` }
    ]);
  } else if (result.type === "lc-lowpass") {
    renderResultCards(elements.calculators.filter.output, [
      { label: "滤波器类型", value: typeLabel },
      { label: "反算电感 L", value: formatEngineering(result.inductance, "H", 2) },
      { label: "已知电容 C", value: formatEngineering(result.capacitance, "F", 2) },
      { label: "特性阻抗 sqrt(L/C)", value: formatEngineering(result.characteristicImpedance, "ohm", 2) },
      { label: "阻尼/负载参考 R", value: formatEngineering(result.dampingResistance, "ohm", 2) },
      { label: "滚降斜率", value: `${result.slope} dB/dec` }
    ]);
  } else {
    renderResultCards(elements.calculators.filter.output, [
      { label: "滤波器类型", value: typeLabel },
      { label: "反算电感 L", value: formatEngineering(result.inductance, "H", 2) },
      { label: "已知电容 C", value: formatEngineering(result.capacitance, "F", 2) },
      { label: "串联电阻 R", value: formatEngineering(result.notchResistance, "ohm", 2) },
      { label: "陷波带宽 BW", value: `${formatNumber(result.bandwidth, 2)} Hz` },
      { label: "约略频带", value: `${formatNumber(result.lowEdge, 1)} - ${formatNumber(result.highEdge, 1)} Hz` }
    ]);
  }

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
