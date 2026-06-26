const builtinTools = [];

const storageKeys = {
  customTools: "power-electronics-custom-tools-v3",
  favorites: "power-electronics-favorites-v3",
  notes: "power-electronics-notes-v3",
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
    buck: {
      inputs: {
        vin: document.querySelector("#buck-vin"),
        vout: document.querySelector("#buck-vout"),
        iout: document.querySelector("#buck-iout"),
        fsw: document.querySelector("#buck-fsw"),
        rippleCurrent: document.querySelector("#buck-ripple-current"),
        rippleVoltage: document.querySelector("#buck-ripple-voltage")
      },
      output: document.querySelector("#buck-results")
    },
    boost: {
      inputs: {
        vin: document.querySelector("#boost-vin"),
        vout: document.querySelector("#boost-vout"),
        iout: document.querySelector("#boost-iout"),
        fsw: document.querySelector("#boost-fsw"),
        efficiency: document.querySelector("#boost-efficiency"),
        rippleCurrent: document.querySelector("#boost-ripple-current")
      },
      output: document.querySelector("#boost-results")
    },
    lcl: {
      inputs: {
        vdc: document.querySelector("#lcl-vdc"),
        vll: document.querySelector("#lcl-vll"),
        power: document.querySelector("#lcl-power"),
        fsw: document.querySelector("#lcl-fsw"),
        gridFrequency: document.querySelector("#lcl-grid-frequency"),
        rippleCurrent: document.querySelector("#lcl-ripple-current"),
        capRatio: document.querySelector("#lcl-cap-ratio"),
        gridRatio: document.querySelector("#lcl-grid-ratio"),
        pf: document.querySelector("#lcl-pf"),
        dampingFactor: document.querySelector("#lcl-damping-factor"),
        minResonanceMultiple: document.querySelector("#lcl-min-resonance-multiple"),
        maxResonanceRatio: document.querySelector("#lcl-max-resonance-ratio")
      },
      output: document.querySelector("#lcl-results")
    },
    filter: {
      inputs: {
        modeDesign: document.querySelector("#filter-mode-design"),
        modeAnalyze: document.querySelector("#filter-mode-analyze"),
        order: document.querySelector("#filter-order"),
        type: document.querySelector("#filter-type"),
        sampleRate: document.querySelector("#filter-sample-rate"),
        frequency: document.querySelector("#filter-frequency"),
        q: document.querySelector("#filter-q"),
        gainDb: document.querySelector("#filter-gain-db"),
        b0: document.querySelector("#filter-b0"),
        b1: document.querySelector("#filter-b1"),
        b2: document.querySelector("#filter-b2"),
        a1: document.querySelector("#filter-a1"),
        a2: document.querySelector("#filter-a2"),
        probeFrequency: document.querySelector("#filter-probe-frequency")
      },
      output: document.querySelector("#filter-results")
    }
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

function toNumber(element) {
  return Number(element?.value);
}

function formatNumber(value, digits = 3) {
  return Number.isFinite(value) ? Number(value).toFixed(digits) : "-";
}

function formatEngineering(value, unit, digits = 3) {
  if (!Number.isFinite(value)) return "-";
  const prefixes = [
    { scale: 1e9, prefix: "G" },
    { scale: 1e6, prefix: "M" },
    { scale: 1e3, prefix: "k" },
    { scale: 1, prefix: "" },
    { scale: 1e-3, prefix: "m" },
    { scale: 1e-6, prefix: "u" },
    { scale: 1e-9, prefix: "n" }
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
    elements.resultsSummary.textContent = "工具库为空";
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
      if (state.favorites.has(tool.id)) state.favorites.delete(tool.id);
      else state.favorites.add(tool.id);
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
    empty.textContent = "你还没收藏工具。";
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
  if (!file) return;

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
  renderResultCards(elements.calculators.buck.output, [
    { label: "占空比 D", value: formatNumber(duty, 3) },
    { label: "电感纹波 ΔIL (A)", value: formatNumber(deltaIL, 3) },
    { label: "建议电感 L (uH)", value: formatNumber(inductance * 1e6, 2) },
    { label: "建议输出电容 C (uF)", value: formatNumber(capacitance * 1e6, 2) },
    { label: "负载等效 R (ohm)", value: formatNumber(vout / iout, 3) },
    { label: "输出功率 Pout (W)", value: formatNumber(vout * iout, 1) }
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
  renderResultCards(elements.calculators.boost.output, [
    { label: "占空比 D", value: formatNumber(duty, 3) },
    { label: "输入平均电流 (A)", value: formatNumber(inputCurrent, 3) },
    { label: "电感纹波 ΔIL (A)", value: formatNumber(deltaIL, 3) },
    { label: "建议电感 L (uH)", value: formatNumber(inductance * 1e6, 2) },
    { label: "输出功率 Pout (W)", value: formatNumber(powerOut, 1) },
    { label: "输出电容 RMS 电流近似 (A)", value: formatNumber(iout * duty, 3) }
  ]);
}

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
  if (element) element.value = value;
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

  const power = values.powerKw * 1000;
  const fsw = values.fswKhz * 1000;
  const vPhase = values.vll / Math.sqrt(3);
  const iPhase = power / (Math.sqrt(3) * values.vll * values.pf);
  const zBase = (vPhase * vPhase) / (power / 3);
  const cBase = 1 / (2 * Math.PI * values.fg * zBase);
  const deltaI = iPhase * values.rippleCurrentPercent / 100;
  const li = values.vdc / (6 * fsw * deltaI);
  const lg = li * values.gridRatio;
  const cf = cBase * values.capRatioPercent / 100;
  const resonance = (1 / (2 * Math.PI)) * Math.sqrt((li + lg) / (li * lg * cf));
  const damping = values.dampingFactor / (3 * 2 * Math.PI * resonance * cf);
  const capReactivePower = 3 * vPhase ** 2 * 2 * Math.PI * values.fg * cf;
  const capCurrent = vPhase * 2 * Math.PI * values.fg * cf;
  const dampingLoss = 3 * capCurrent ** 2 * damping;

  return {
    ...values,
    power,
    fsw,
    vPhase,
    iPhase,
    zBase,
    cBase,
    deltaI,
    li,
    lg,
    cf,
    resonance,
    damping,
    capReactivePower,
    capCurrent,
    dampingLoss,
    minResonance: values.fg * values.minResonanceMultiple,
    maxResonance: fsw * values.maxResonanceRatio
  };
}

function lclStatusItems(result) {
  const capReactiveRatio = result.capReactivePower / result.power;
  const resonanceInBand = result.resonance > result.minResonance && result.resonance < result.maxResonance;
  const fswRatio = result.fsw / result.resonance;
  const dampingLossRatio = result.dampingLoss / result.power;
  return [
    {
      level: resonanceInBand ? "ok" : "bad",
      text: resonanceInBand
        ? `谐振频率 ${formatNumber(result.resonance, 1)} Hz 位于推荐窗口内。`
        : `谐振频率应在 ${formatNumber(result.minResonance, 0)} Hz 到 ${formatNumber(result.maxResonance, 0)} Hz 之间。`
    },
    {
      level: capReactiveRatio <= 0.05 ? "ok" : capReactiveRatio <= 0.08 ? "warn" : "bad",
      text: `滤波电容基波无功约为额定功率的 ${formatNumber(capReactiveRatio * 100, 2)}%。工程上通常希望不超过 5%。`
    },
    {
      level: fswRatio >= 2 ? "ok" : "warn",
      text: `开关频率 / 谐振频率 = ${formatNumber(fswRatio, 2)}。过低会让控制和开关纹波处理更吃紧。`
    },
    {
      level: dampingLossRatio <= 0.01 ? "ok" : dampingLossRatio <= 0.03 ? "warn" : "bad",
      text: `阻尼电阻基波损耗估算为 ${formatNumber(result.dampingLoss, 2)} W，约占额定功率 ${formatNumber(dampingLossRatio * 100, 2)}%。`
    }
  ];
}

function renderChecks(containerSelector, items) {
  const container = document.querySelector(containerSelector);
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

  ctx.fillStyle = "rgba(22,138,91,.12)";
  ctx.fillRect(xFor(result.minResonance), y - 46, xFor(result.maxResonance) - xFor(result.minResonance), 92);

  [
    { label: "fg", freq: result.fg, color: "#566579" },
    { label: "10fg", freq: result.minResonance, color: "#168a5b" },
    { label: "fres", freq: result.resonance, color: "#c24718" },
    { label: "0.5fsw", freq: result.maxResonance, color: "#168a5b" },
    { label: "fsw", freq: result.fsw, color: "#132238" }
  ].forEach((marker, index) => {
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
}

function buildLclReport(result) {
  return [
    "LCL 滤波器设计报告",
    `Vdc=${result.vdc} V, Vac,ll=${result.vll} V, Pout=${result.powerKw} kW, fsw=${result.fswKhz} kHz`,
    `Iphase=${formatNumber(result.iPhase, 3)} A, DeltaI=${formatNumber(result.deltaI, 3)} A`,
    `Li=${formatNumber(result.li * 1e6, 2)} uH, Lg=${formatNumber(result.lg * 1e6, 2)} uH, Cf=${formatNumber(result.cf * 1e6, 2)} uF`,
    `fres=${formatNumber(result.resonance, 1)} Hz, Rd=${formatNumber(result.damping, 3)} ohm`
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
    { label: "电流纹波 DeltaI (A)", value: formatNumber(result.deltaI, 3) },
    { label: "基值电容 Cbase (uF)", value: formatNumber(result.cBase * 1e6, 2) },
    { label: "电容无功 Qc (var)", value: formatNumber(result.capReactivePower, 2) },
    { label: "阻尼损耗估算 (W)", value: formatNumber(result.dampingLoss, 2) }
  ]);
  renderChecks("#lcl-checks", lclStatusItems(result));
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

function interpolateCrossing(points, key, target, direction = "any") {
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const av = a[key] - target;
    const bv = b[key] - target;
    if (direction === "down" && !(a[key] >= target && b[key] <= target)) continue;
    if (direction === "up" && !(a[key] <= target && b[key] >= target)) continue;
    if (av === 0 || av * bv <= 0) {
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

function normalizeIir(n0, n1, n2, d0, d1, d2) {
  return {
    b0: n0 / d0,
    b1: n1 / d0,
    b2: n2 / d0,
    a1: d1 / d0,
    a2: d2 / d0
  };
}

function designDigitalFilter({ order, type, sampleRate, frequency, q, gainDb }) {
  const safeFc = Math.min(Math.max(frequency, 0.001), sampleRate * 0.499);
  const gain = 10 ** (gainDb / 20);
  const c = 2 * sampleRate;
  const omega = c * Math.tan(Math.PI * safeFc / sampleRate);
  const safeQ = Math.max(q, 0.001);

  if (order === 1) {
    const d0 = c + omega;
    const d1 = omega - c;
    const coeffs = type === "highpass"
      ? normalizeIir(gain * c, -gain * c, 0, d0, d1, 0)
      : normalizeIir(gain * omega, gain * omega, 0, d0, d1, 0);
    return {
      coeffs,
      omega,
      analog:
        type === "highpass"
          ? "H(s) = K*s / (s + wc)"
          : "H(s) = K*wc / (s + wc)",
      zForm:
        type === "highpass"
          ? "H(z) = K*2fs*(1 - z^-1) / [(2fs + wc) + (wc - 2fs)z^-1]"
          : "H(z) = K*wc*(1 + z^-1) / [(2fs + wc) + (wc - 2fs)z^-1]"
    };
  }

  const damping = omega / safeQ;
  const c2 = c * c;
  const omega2 = omega * omega;
  const d0 = c2 + damping * c + omega2;
  const d1 = -2 * c2 + 2 * omega2;
  const d2 = c2 - damping * c + omega2;
  let n0;
  let n1;
  let n2;
  let analog;
  let zNumerator;

  if (type === "highpass") {
    n0 = gain * c2;
    n1 = -2 * gain * c2;
    n2 = gain * c2;
    analog = "H(s) = K*s^2 / (s^2 + (w0/Q)s + w0^2)";
    zNumerator = "K*(2fs)^2*(1 - 2z^-1 + z^-2)";
  } else if (type === "bandpass") {
    n0 = gain * damping * c;
    n1 = 0;
    n2 = -gain * damping * c;
    analog = "H(s) = K*(w0/Q)s / (s^2 + (w0/Q)s + w0^2)";
    zNumerator = "K*(w0/Q)*2fs*(1 - z^-2)";
  } else if (type === "notch") {
    n0 = gain * (c2 + omega2);
    n1 = gain * (-2 * c2 + 2 * omega2);
    n2 = gain * (c2 + omega2);
    analog = "H(s) = K*(s^2 + w0^2) / (s^2 + (w0/Q)s + w0^2)";
    zNumerator = "K*[(2fs)^2(1 - 2z^-1 + z^-2) + w0^2(1 + 2z^-1 + z^-2)]";
  } else {
    n0 = gain * omega2;
    n1 = 2 * gain * omega2;
    n2 = gain * omega2;
    analog = "H(s) = K*w0^2 / (s^2 + (w0/Q)s + w0^2)";
    zNumerator = "K*w0^2*(1 + 2z^-1 + z^-2)";
  }

  return {
    coeffs: normalizeIir(n0, n1, n2, d0, d1, d2),
    omega,
    analog,
    zForm: `H(z) = ${zNumerator} / [D0 + D1*z^-1 + D2*z^-2]`
  };
}

function coefficientResponse(coeffs, frequency, sampleRate) {
  const omega = 2 * Math.PI * frequency / sampleRate;
  const z1 = complex(Math.cos(-omega), Math.sin(-omega));
  const z2 = complex(Math.cos(-2 * omega), Math.sin(-2 * omega));
  const numerator = cAdd(cAdd(complex(coeffs.b0), cMul(complex(coeffs.b1), z1)), cMul(complex(coeffs.b2), z2));
  const denominator = cAdd(cAdd(complex(1), cMul(complex(coeffs.a1), z1)), cMul(complex(coeffs.a2), z2));
  return cDiv(numerator, denominator);
}

function poleInfo(coeffs) {
  const discriminant = coeffs.a1 * coeffs.a1 - 4 * coeffs.a2;
  if (discriminant >= 0) {
    const r1 = (-coeffs.a1 + Math.sqrt(discriminant)) / 2;
    const r2 = (-coeffs.a1 - Math.sqrt(discriminant)) / 2;
    return { maxRadius: Math.max(Math.abs(r1), Math.abs(r2)), text: `${formatNumber(r1, 4)}, ${formatNumber(r2, 4)}` };
  }
  const real = -coeffs.a1 / 2;
  const imag = Math.sqrt(-discriminant) / 2;
  return { maxRadius: Math.hypot(real, imag), text: `${formatNumber(real, 4)} +/- j${formatNumber(imag, 4)}` };
}

function setCoefficientInputs(coeffs) {
  Object.entries(coeffs).forEach(([key, value]) => {
    const input = elements.calculators.filter.inputs[key];
    if (input) input.value = formatNumber(value, 8);
  });
}

function syncFilterTypeOptions() {
  const inputs = elements.calculators.filter.inputs;
  const order = Number(inputs.order.value);
  [...inputs.type.options].forEach((option) => {
    option.disabled = order === 1 && (option.value === "bandpass" || option.value === "notch");
  });
  if (order === 1 && (inputs.type.value === "bandpass" || inputs.type.value === "notch")) {
    inputs.type.value = "lowpass";
  }
}

function computeFilterValues() {
  const inputs = elements.calculators.filter.inputs;
  syncFilterTypeOptions();
  const mode = inputs.modeAnalyze.checked ? "analyze" : "design";
  const sampleRate = toNumber(inputs.sampleRate);
  const nyquist = sampleRate / 2;
  const order = Number(inputs.order.value);
  let type = inputs.type.value;
  if (order === 1 && (type === "bandpass" || type === "notch")) type = "lowpass";
  const frequency = toNumber(inputs.frequency);
  const q = toNumber(inputs.q);
  const gainDb = toNumber(inputs.gainDb);
  const probeFrequency = Math.min(toNumber(inputs.probeFrequency), nyquist);
  const design = mode === "design"
    ? designDigitalFilter({ order, type, sampleRate, frequency, q, gainDb })
    : null;
  const coeffs = design
    ? design.coeffs
    : {
        b0: toNumber(inputs.b0),
        b1: toNumber(inputs.b1),
        b2: toNumber(inputs.b2),
        a1: toNumber(inputs.a1),
        a2: toNumber(inputs.a2)
      };

  if (mode === "design") setCoefficientInputs(coeffs);

  const points = [];
  const samples = 420;
  for (let i = 0; i < samples; i += 1) {
    const t = i / (samples - 1);
    const freq = t * nyquist;
    const response = coefficientResponse(coeffs, freq, sampleRate);
    points.push({
      frequency: freq,
      magnitudeDb: 20 * Math.log10(Math.max(cAbs(response), 1e-12)),
      phaseDeg: cPhaseDeg(response)
    });
  }
  const phases = unwrapPhases(points.map((point) => point.phaseDeg));
  points.forEach((point, index) => { point.phaseDeg = phases[index]; });

  const dcGainDb = points[0].magnitudeDb;
  const nyquistGainDb = points[points.length - 1].magnitudeDb;
  const peak = points.reduce((best, point) => point.magnitudeDb > best.magnitudeDb ? point : best, points[0]);
  const notch = points.reduce((best, point) => point.magnitudeDb < best.magnitudeDb ? point : best, points[0]);
  const passbandDb = type === "highpass" ? nyquistGainDb : type === "bandpass" ? peak.magnitudeDb : dcGainDb;
  const direction = type === "highpass" || type === "bandpass" ? "up" : "down";
  const cutoff = interpolateCrossing(points, "magnitudeDb", passbandDb - 3, direction);
  const probeResponse = coefficientResponse(coeffs, probeFrequency, sampleRate);
  const poles = poleInfo(coeffs);

  return {
    mode,
    order,
    type,
    sampleRate,
    nyquist,
    frequency,
    q,
    gainDb,
    design,
    probeFrequency,
    coeffs,
    points,
    cutoffFrequency: cutoff?.frequency || frequency,
    dcGainDb,
    nyquistGainDb,
    peakMagnitudeDb: peak.magnitudeDb,
    peakFrequency: peak.frequency,
    notchMagnitudeDb: notch.magnitudeDb,
    notchFrequency: notch.frequency,
    probeMagnitudeDb: 20 * Math.log10(Math.max(cAbs(probeResponse), 1e-12)),
    probePhaseDeg: cPhaseDeg(probeResponse),
    poleText: poles.text,
    maxPoleRadius: poles.maxRadius,
    stable: poles.maxRadius < 1
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
  const pad = { left: 72, right: 32, top: 34, bottom: 44 };
  const mid = height * 0.49;
  const magTop = pad.top;
  const magBottom = mid - 24;
  const phaseTop = mid + 34;
  const phaseBottom = height - pad.bottom;
  const plotWidth = width - pad.left - pad.right;
  const mags = result.points.map((point) => point.magnitudeDb);
  const phases = result.points.map((point) => point.phaseDeg);
  const magMin = Math.floor((Math.min(...mags, -80) - 6) / 10) * 10;
  const magMax = Math.ceil((Math.max(...mags, 10) + 6) / 10) * 10;
  const phaseMin = Math.floor((Math.min(...phases, -360) - 20) / 45) * 45;
  const phaseMax = Math.ceil((Math.max(...phases, 90) + 20) / 45) * 45;
  const xFor = (freq) => pad.left + (freq / result.nyquist) * plotWidth;
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
    for (let i = 0; i <= 4; i += 1) {
      const value = min + (max - min) * i / 4;
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

  ctx.fillStyle = "#566579";
  ctx.textAlign = "center";
  ctx.font = "12px Space Grotesk, sans-serif";
  for (let i = 0; i <= 5; i += 1) {
    const freq = result.nyquist * i / 5;
    const x = xFor(freq);
    ctx.strokeStyle = "rgba(19,34,56,.09)";
    ctx.beginPath();
    ctx.moveTo(x, magTop);
    ctx.lineTo(x, magBottom);
    ctx.moveTo(x, phaseTop);
    ctx.lineTo(x, phaseBottom);
    ctx.stroke();
    ctx.fillText(formatEngineering(freq, "Hz", 1), x, height - 16);
  }

  function drawCurve(yFor, color, key) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    result.points.forEach((point, index) => {
      const x = xFor(point.frequency);
      const y = yFor(point[key]);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  drawCurve(yMag, "#0f766e", "magnitudeDb");
  drawCurve(yPhase, "#c24718", "phaseDeg");

  const markerX = xFor(Math.min(result.cutoffFrequency, result.nyquist));
  ctx.strokeStyle = "rgba(194,71,24,.5)";
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(markerX, magTop);
  ctx.lineTo(markerX, phaseBottom);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#c24718";
  ctx.fillText("fc", markerX, magTop + 16);
}

function filterStatusItems(result) {
  const items = [];
  const coefficientText = `b=[${formatNumber(result.coeffs.b0, 6)}, ${formatNumber(result.coeffs.b1, 6)}, ${formatNumber(result.coeffs.b2, 6)}], a=[1, ${formatNumber(result.coeffs.a1, 6)}, ${formatNumber(result.coeffs.a2, 6)}]`;
  items.push({
    level: result.sampleRate > 0 && result.frequency < result.nyquist ? "ok" : "bad",
    text: `采样频率 fs=${formatNumber(result.sampleRate, 2)} Hz，Nyquist=${formatNumber(result.nyquist, 2)} Hz。设计时 fc 必须小于 fs/2。`
  });
  items.push({
    level: result.stable ? "ok" : "bad",
    text: `极点：${result.poleText}，最大极点半径=${formatNumber(result.maxPoleRadius, 4)}。半径小于 1 才是稳定数字滤波器。`
  });
  items.push({
    level: "ok",
    text: `当前系数：${coefficientText}。分析模式下你可以直接改这些系数查看性能变化。`
  });
  items.push({
    level: result.peakMagnitudeDb <= 6 ? "ok" : "warn",
    text: `峰值幅值=${formatNumber(result.peakMagnitudeDb, 2)} dB @ ${formatNumber(result.peakFrequency, 2)} Hz；探针频率 ${formatNumber(result.probeFrequency, 2)} Hz 处幅值=${formatNumber(result.probeMagnitudeDb, 2)} dB，相位=${formatNumber(result.probePhaseDeg, 1)}°。`
  });
  items.push({
    level: "ok",
    text: "说明：单独滤波器通常看截止频率、阻带衰减、相位延迟、峰值和稳定性；幅值裕度/相位裕度更适合完整开环控制系统，而不是单个滤波器模块。"
  });
  return items;
}

function createDerivationBlock(title, body) {
  const block = document.createElement("article");
  const heading = document.createElement("h4");
  const pre = document.createElement("pre");
  heading.textContent = title;
  pre.textContent = body;
  block.append(heading, pre);
  return block;
}

function renderFilterDerivation(result) {
  const container = document.querySelector("#filter-derivation");
  if (!container) return;
  container.innerHTML = "";

  const coeffs = result.coeffs;
  const normalized = [
    `H(z) = (b0 + b1*z^-1 + b2*z^-2) / (1 + a1*z^-1 + a2*z^-2)`,
    `b0 = ${formatNumber(coeffs.b0, 8)}`,
    `b1 = ${formatNumber(coeffs.b1, 8)}`,
    `b2 = ${formatNumber(coeffs.b2, 8)}`,
    `a1 = ${formatNumber(coeffs.a1, 8)}`,
    `a2 = ${formatNumber(coeffs.a2, 8)}`
  ].join("\n");

  const timeDomain = [
    "y[n] = b0*x[n] + b1*x[n-1] + b2*x[n-2] - a1*y[n-1] - a2*y[n-2]",
    `y[n] = ${formatNumber(coeffs.b0, 8)}*x[n] + ${formatNumber(coeffs.b1, 8)}*x[n-1] + ${formatNumber(coeffs.b2, 8)}*x[n-2]`,
    `       - (${formatNumber(coeffs.a1, 8)})*y[n-1] - (${formatNumber(coeffs.a2, 8)})*y[n-2]`
  ].join("\n");

  if (result.mode === "design" && result.design) {
    const fs2 = 2 * result.sampleRate;
    const prewarp = [
      `fc = ${formatNumber(result.frequency, 4)} Hz, fs = ${formatNumber(result.sampleRate, 4)} Hz`,
      `w = 2*fs*tan(pi*fc/fs) = ${formatNumber(result.design.omega, 6)} rad/s`,
      `s = 2*fs*(1 - z^-1)/(1 + z^-1) = ${formatNumber(fs2, 4)}*(1 - z^-1)/(1 + z^-1)`
    ].join("\n");
    container.append(
      createDerivationBlock("1. s 域模拟原型", result.design.analog),
      createDerivationBlock("2. 预畸变和双线性变换", prewarp),
      createDerivationBlock("3. z 域形式与归一化系数", `${result.design.zForm}\n\n${normalized}`),
      createDerivationBlock("4. 时域差分方程", timeDomain)
    );
    return;
  }

  container.append(
    createDerivationBlock("1. 已输入 z 域传递函数", normalized),
    createDerivationBlock("2. 频响分析代入", "令 z = exp(j*2*pi*f/fs)，扫描 f = 0 ... fs/2，得到幅值和相位曲线。"),
    createDerivationBlock("3. 时域差分方程", timeDomain)
  );
}

function computeFilter() {
  const result = computeFilterValues();
  const modeLabel = result.mode === "design" ? "按指标设计" : "按系数分析";
  renderResultCards(elements.calculators.filter.output, [
    { label: "工作模式", value: modeLabel },
    { label: "滤波器类型", value: filterTypeLabel(result) },
    { label: "-3 dB 截止估计", value: `${formatNumber(result.cutoffFrequency, 2)} Hz` },
    { label: "DC 增益", value: `${formatNumber(result.dcGainDb, 2)} dB` },
    { label: "Nyquist 增益", value: `${formatNumber(result.nyquistGainDb, 2)} dB` },
    { label: "稳定性", value: result.stable ? "稳定" : "不稳定" }
  ]);
  renderFilterDerivation(result);
  drawBodeChart(result);
  renderChecks("#filter-checks", filterStatusItems(result));
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

render();
initEnhancedLclControls();
initCalculators();
