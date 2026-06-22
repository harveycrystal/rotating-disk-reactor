const discGroup = document.querySelector("#discGroup");
const microbesLayer = document.querySelector("#microbesLayer");
const organicsLayer = document.querySelector("#organicsLayer");
const productsLayer = document.querySelector("#productsLayer");
const sludgeLayer = document.querySelector("#sludgeLayer");
const speedControl = document.querySelector("#speedControl");
const loadControl = document.querySelector("#loadControl");
const depthControl = document.querySelector("#depthControl");
const speedValue = document.querySelector("#speedValue");
const loadValue = document.querySelector("#loadValue");
const depthValue = document.querySelector("#depthValue");
const efficiencyValue = document.querySelector("#efficiencyValue");
const systemStatus = document.querySelector("#systemStatus");
const observationText = document.querySelector("#observationText");
const waterShape = document.querySelector("#waterShape");
const waterSurface = document.querySelector("#waterSurface");
const toggleRun = document.querySelector("#toggleRun");
const resetBtn = document.querySelector("#resetBtn");

const loadNames = ["低", "偏低", "中", "偏高", "高"];
let angle = 0;
let running = true;
let lastFrame = 0;
let processTime = 0;

const microbeData = Array.from({ length: 28 }, (_, index) => ({
  radius: 45 + (index % 4) * 22,
  offset: (index * 137) % 360,
  size: 4 + (index % 3),
}));

const sludgeData = Array.from({ length: 18 }, (_, index) => ({
  x: 150 + index * 18,
  y: 437 + (index % 4) * 7,
  size: 5 + (index % 4),
}));

const organicData = Array.from({ length: 20 }, (_, index) => ({
  startX: 142 + (index % 5) * 74,
  startY: 338 + Math.floor(index / 5) * 24,
  targetX: 236 + (index % 4) * 48,
  targetY: 348 + (index % 3) * 25,
  delay: (index % 7) * 0.11,
  size: 7 + (index % 4),
}));

function polarToCartesian(radius, degrees) {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: 313 + Math.cos(radians) * radius,
    y: 302 + Math.sin(radians) * radius,
  };
}

function updateMicrobes() {
  const load = Number(loadControl.value);
  const visibleCount = 12 + load * 4;
  const microbes = microbeData
    .slice(0, visibleCount)
    .map((item) => {
      const point = polarToCartesian(item.radius, angle + item.offset);
      const inWater = point.y > 318;
      return `<circle class="microbe" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${item.size}" opacity="${inWater ? 0.92 : 0.62}" />`;
    })
    .join("");

  microbesLayer.innerHTML = microbes;
}

function updateSludge() {
  const speed = Number(speedControl.value);
  const load = Number(loadControl.value);
  const activeCount = Math.min(sludgeData.length, Math.round(speed + load * 2));
  sludgeLayer.innerHTML = sludgeData
    .slice(0, activeCount)
    .map((item, index) => {
      const bob = Math.sin((angle + index * 19) * 0.05) * 3;
      return `<circle class="sludge" cx="${item.x}" cy="${item.y + bob}" r="${item.size}" />`;
    })
    .join("");
}

function updateOrganics() {
  const load = Number(loadControl.value);
  const speed = Number(speedControl.value);
  const digestRate = 0.12 + speed * 0.018;
  const visibleCount = 8 + load * 2;
  const pathHints = `<path class="organic-path" d="M142 370 C210 350 238 378 285 365 C330 352 352 380 405 360" />`;

  const organics = organicData
    .slice(0, visibleCount)
    .map((item, index) => {
      const phase = (processTime * digestRate + item.delay) % 1;
      const towardBiofilm = Math.min(1, phase / 0.72);
      const digested = Math.max(0, (phase - 0.62) / 0.38);
      const swirl = Math.sin(processTime * 2.2 + index) * 8;
      const x = item.startX + (item.targetX - item.startX) * towardBiofilm + swirl;
      const y = item.startY + (item.targetY - item.startY) * towardBiofilm + Math.cos(processTime * 2 + index) * 5;
      const radius = item.size * (1 - digested * 0.78);
      const opacity = 0.88 * (1 - digested);
      return `<circle class="organic" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius.toFixed(1)}" opacity="${opacity.toFixed(2)}" />`;
    })
    .join("");

  const products = organicData
    .slice(0, visibleCount)
    .map((item, index) => {
      const phase = (processTime * digestRate + item.delay) % 1;
      const released = Math.max(0, (phase - 0.62) / 0.38);
      if (released <= 0) {
        return "";
      }
      const rise = released * 44;
      const x = item.targetX + Math.sin(processTime * 3 + index) * 10;
      const y = item.targetY - rise;
      const radius = 3 + released * 5;
      const opacity = Math.sin(released * Math.PI) * 0.72;
      return `<circle class="product" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius.toFixed(1)}" opacity="${opacity.toFixed(2)}" />`;
    })
    .join("");

  organicsLayer.innerHTML = pathHints + organics;
  productsLayer.innerHTML = products;
}

function updateWaterDepth() {
  const depth = Number(depthControl.value);
  const surfaceY = 374 - depth * 1.4;
  const path = `M116 ${surfaceY} C170 ${surfaceY - 18} 196 ${surfaceY + 22} 250 ${surfaceY} C304 ${surfaceY - 22} 338 ${surfaceY + 22} 390 ${surfaceY} C442 ${surfaceY - 22} 474 ${surfaceY + 10} 510 ${surfaceY} L510 448 L116 448 Z`;
  const line = `M116 ${surfaceY} C170 ${surfaceY - 18} 196 ${surfaceY + 22} 250 ${surfaceY} C304 ${surfaceY - 22} 338 ${surfaceY + 22} 390 ${surfaceY} C442 ${surfaceY - 22} 474 ${surfaceY + 10} 510 ${surfaceY}`;
  waterShape.setAttribute("d", path);
  waterSurface.setAttribute("d", line);
}

function calculateEfficiency() {
  const speed = Number(speedControl.value);
  const load = Number(loadControl.value);
  const depth = Number(depthControl.value);
  const speedScore = Math.max(0, 1 - Math.abs(speed - 4) / 5);
  const depthScore = Math.max(0, 1 - Math.abs(depth - 40) / 35);
  const loadPenalty = (load - 1) * 5;
  const efficiency = Math.round(45 + speedScore * 30 + depthScore * 18 - loadPenalty);
  return Math.max(28, Math.min(92, efficiency));
}

function updateTeachingText(efficiency) {
  const speed = Number(speedControl.value);
  const load = Number(loadControl.value);
  const depth = Number(depthControl.value);

  if (speed <= 2) {
    systemStatus.textContent = "供氧偏低";
    observationText.textContent = "轉速偏低時，圓盤離開水面的頻率不足，生物膜取得氧氣的機會下降。";
  } else if (speed >= 7) {
    systemStatus.textContent = "剪力偏高";
    observationText.textContent = "轉速過高會增加剪力，生物膜較容易剝落，沉降池需要承受更多污泥。";
  } else if (load >= 5) {
    systemStatus.textContent = "負荷偏高";
    observationText.textContent = "有機物濃度很高時，單位面積生物膜負荷增加，可能需要增加圓盤面積或延長停留時間。";
  } else if (depth > 55) {
    systemStatus.textContent = "浸沒過深";
    observationText.textContent = "浸沒比例太高會縮短生物膜接觸空氣的時間，氧氣傳遞效率會下降。";
  } else if (efficiency >= 78) {
    systemStatus.textContent = "高效處理中";
    observationText.textContent = "此時圓盤在污水與空氣間交替接觸，兼顧基質供應與氧氣傳遞，處理效率較佳。";
  } else {
    systemStatus.textContent = "穩定處理中";
    observationText.textContent = "調整轉速、浸沒比例與有機物濃度，可以觀察生物膜處理效率的變化。";
  }
}

function syncControls() {
  const speed = Number(speedControl.value);
  const load = Number(loadControl.value);
  const depth = Number(depthControl.value);
  const efficiency = calculateEfficiency();

  speedValue.textContent = `${speed} rpm`;
  loadValue.textContent = loadNames[load - 1];
  depthValue.textContent = `${depth}%`;
  efficiencyValue.textContent = `${efficiency}%`;

  updateWaterDepth();
  updateOrganics();
  updateMicrobes();
  updateSludge();
  updateTeachingText(efficiency);
}

function animate(timestamp) {
  if (!lastFrame) {
    lastFrame = timestamp;
  }
  const delta = timestamp - lastFrame;
  lastFrame = timestamp;

  if (running) {
    processTime += delta / 1000;
    angle = (angle + delta * Number(speedControl.value) * 0.018) % 360;
    discGroup.setAttribute("transform", `translate(313 302) rotate(${angle})`);
    updateOrganics();
    updateMicrobes();
    updateSludge();
  }

  requestAnimationFrame(animate);
}

[speedControl, loadControl, depthControl].forEach((control) => {
  control.addEventListener("input", syncControls);
});

toggleRun.addEventListener("click", () => {
  running = !running;
  toggleRun.textContent = running ? "暫停" : "繼續";
});

resetBtn.addEventListener("click", () => {
  speedControl.value = 3;
  loadControl.value = 3;
  depthControl.value = 40;
  angle = 0;
  processTime = 0;
  running = true;
  toggleRun.textContent = "暫停";
  discGroup.setAttribute("transform", "translate(313 302) rotate(0)");
  syncControls();
});

syncControls();
requestAnimationFrame(animate);
