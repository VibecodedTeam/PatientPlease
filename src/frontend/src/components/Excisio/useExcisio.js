import { useEffect, useRef, useState } from 'react';
import { MM, clamp, computeDifficulty, computeExcisionScore, formatZloty, isStitchValid, melanomaRadiusAt, scoreSutures, segmentIntersectionT, stitchGeometry } from './internal/geometry';
import { FIELD_HEIGHT, FIELD_WIDTH, computeAxis, generateLesions } from './internal/lesionGenerator';
import { PLASTER_DEFS, plasterSvg } from './internal/plasterMotifs';
import {
  createConfettiBurst,
  renderBaseField,
  renderExcisionResultOverlay,
  renderFreehandPath,
  renderInjectionEffects,
  renderInjections,
  renderSwabs,
  renderWound,
  stepConfetti,
} from './internal/canvasRenderer';
import { playFanfare, playScarySting } from './internal/sound';
import { TOOL_CURSORS } from './internal/cursors';

const BODY_PARTS = [
  { name: 'Przedramię', tone: ['#ecc0a2', '#dca07a', '#c98a63'] },
  { name: 'Plecy', tone: ['#e7b797', '#d3946f', '#bd7c58'] },
  { name: 'Łydka', tone: ['#eec5a6', '#dfa47d', '#cb8d66'] },
  { name: 'Ramię', tone: ['#eabd9d', '#d69a76', '#c07f5d'] },
];

const DEEP_NEED = 3;
const SKIN_NEED = 5;

const TOOL_FOR_PHASE = {
  disinfect: 'wipe',
  anest: 'syringe',
  cut: 'scissors',
  suture_deep: 'needleDeep',
  suture_skin: 'needleSkin',
  cream: 'cream',
};

const CURSOR_FOR_TOOL = {
  wipe: TOOL_CURSORS.wipe,
  syringe: TOOL_CURSORS.syringe,
  scissors: TOOL_CURSORS.scissors,
  needleDeep: TOOL_CURSORS.needle,
  needleSkin: TOOL_CURSORS.needle,
  cream: TOOL_CURSORS.cream,
};

const INITIAL_UI = {
  screen: 'tutorial',
  phase: 'disinfect',
  level: 1,
  partName: BODY_PARTS[0].name,
  cash: 0,
  zoom: 1,
  showResult: false,
  revealing: false,
  result: null,
  hint: true,
  injCount: 0,
  disinfectPct: 0,
  deepCount: 0,
  skinCount: 0,
  creamPct: 0,
  equipped: null,
  warn: '',
  alarm: false,
  alarmText: '',
  alarmX: 50,
  alarmY: 45,
  redFlash: false,
  showTray: false,
  cheer: false,
};

function createEngine() {
  return {
    config: null,
    axis: 0,
    mel: null,
    lesions: [],
    base: null,
    points: [],
    drawing: false,
    injections: [],
    injectFx: [],
    fxRAF: null,
    swabs: [],
    wiping: false,
    swabRAF: null,
    wipeCellsComputed: false,
    wipeCellSize: 24,
    wipeRadius: 0,
    wipeTarget: null,
    wipeDone: null,
    coveredSectors: new Set(),
    disinfectScore: 0,
    injectScore: 0,
    sutureScore: 0,
    pendingResult: null,
    ellipseA: 0,
    ellipseB: 0,
    deepStitches: [],
    skinStitches: [],
    creamSwabs: [],
    creaming: false,
    stitchStart: null,
    stitchDrag: null,
    woundOpen: false,
    woundC: null,
    woundAxis: 0,
    woundDir: { x: 1, y: 0 },
    woundN: { x: 0, y: 1 },
    woundClose: 0,
    woundCloseTarget: 0,
    woundReveal: 0,
    closeRAF: null,
    revRAF: null,
    creamFade: 1,
    creamFadeRAF: null,
    plaster: null,
    plasterImage: null,
    plasterAlpha: 0,
    plasterRAF: null,
    confetti: [],
    confRAF: null,
    warnToken: 0,
    warnTimer: null,
    revealTimer: null,
    alarmTimer: null,
    redTimer: null,
    cheerTimer: null,
  };
}

/**
 * All game engine + UI state for the excision biopsy minigame. Keeps everything that drives
 * per-frame canvas rendering (lesion geometry, freehand path, stitches, wound closure) in a
 * plain mutable ref - like a lightweight class instance - and only promotes the values the
 * JSX actually needs to read (phase, scores, modals, tool tray) into React state.
 */
export function useExcisio() {
  const canvasRef = useRef(null);
  const confettiRef = useRef(null);
  const viewRef = useRef(null);
  const plasterScrollRef = useRef(null);
  const audioContextRef = useRef(null);
  const engine = useRef(null);
  if (!engine.current) engine.current = createEngine();

  const [ui, setUi] = useState(INITIAL_UI);
  const uiRef = useRef(ui);

  function patchUi(patch) {
    setUi((previous) => ({ ...previous, ...(typeof patch === 'function' ? patch(previous) : patch) }));
  }

  function stitchOk(stitch) {
    return isStitchValid(stitch, engine.current.ellipseA);
  }

  function pointFromEvent(event) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * FIELD_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * FIELD_HEIGHT,
    };
  }

  function flashWarn(message) {
    const token = ++engine.current.warnToken;
    patchUi({ warn: message });
    if (engine.current.warnTimer) clearTimeout(engine.current.warnTimer);
    engine.current.warnTimer = setTimeout(() => {
      if (engine.current.warnToken === token) patchUi({ warn: '' });
    }, 2100);
  }

  function drawBaseField() {
    const offscreen = document.createElement('canvas');
    offscreen.width = FIELD_WIDTH;
    offscreen.height = FIELD_HEIGHT;
    const ctx = offscreen.getContext('2d');
    if (ctx) {
      renderBaseField(ctx, {
        width: FIELD_WIDTH,
        height: FIELD_HEIGHT,
        mmToPx: MM,
        axis: engine.current.axis,
        tone: engine.current.config.tone,
        lesions: engine.current.lesions,
      });
    }
    engine.current.base = offscreen;
  }

  function draw() {
    const canvas = canvasRef.current;
    const e = engine.current;
    if (!canvas || !e.base) return;
    if (canvas.width !== FIELD_WIDTH) {
      canvas.width = FIELD_WIDTH;
      canvas.height = FIELD_HEIGHT;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const now = performance.now();
    ctx.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
    ctx.drawImage(e.base, 0, 0);
    renderSwabs(ctx, e.swabs, now);
    renderInjections(ctx, e.injections);
    renderInjectionEffects(ctx, e.injectFx, now);

    if (e.woundOpen) {
      renderWound(ctx, {
        center: e.woundC,
        axis: e.woundAxis,
        a: e.ellipseA,
        b: e.ellipseB,
        reveal: e.woundReveal,
        closeAmount: e.woundClose,
        tone: e.config.tone,
        deepStitches: e.deepStitches,
        skinStitches: e.skinStitches,
        isStitchValid: stitchOk,
        creamSwabs: e.creamSwabs,
        creamFade: e.creamFade,
        plasterImage: e.plasterImage,
        plasterAlpha: e.plasterAlpha,
        stitchStart: e.stitchStart,
        stitchDrag: e.stitchDrag,
      });
      return;
    }

    const u = uiRef.current;
    const activeResult = u.showResult || u.revealing ? u.result : null;
    renderFreehandPath(ctx, e.points, activeResult);
    renderExcisionResultOverlay(ctx, {
      mel: e.mel,
      points: e.points,
      axis: e.axis,
      ellipseA: e.ellipseA,
      ellipseB: e.ellipseB,
      result: activeResult,
    });
  }

  function applyZoom() {
    const canvas = canvasRef.current;
    const mel = engine.current.mel;
    if (!canvas || !mel) return;
    canvas.style.transformOrigin = `${((mel.x / FIELD_WIDTH) * 100).toFixed(2)}% ${((mel.y / FIELD_HEIGHT) * 100).toFixed(2)}%`;
    canvas.style.transform = `scale(${uiRef.current.zoom})`;
  }

  function updateCursor() {
    const view = viewRef.current;
    if (!view) return;
    const u = uiRef.current;
    if (u.screen !== 'play' || u.showResult || u.revealing) {
      view.style.cursor = 'default';
      return;
    }
    view.style.cursor = CURSOR_FOR_TOOL[u.equipped] || 'default';
  }

  function cancelEngineAnimation() {
    const e = engine.current;
    [e.fxRAF, e.swabRAF, e.closeRAF, e.revRAF, e.creamFadeRAF, e.plasterRAF, e.confRAF].forEach((id) => {
      if (id) cancelAnimationFrame(id);
    });
    [e.warnTimer, e.revealTimer, e.alarmTimer, e.redTimer, e.cheerTimer].forEach((id) => {
      if (id) clearTimeout(id);
    });
    e.fxRAF = null;
    e.swabRAF = null;
    e.closeRAF = null;
    e.revRAF = null;
    e.creamFadeRAF = null;
    e.plasterRAF = null;
    e.confRAF = null;
  }

  function setupLevel(level) {
    cancelEngineAnimation();
    const config = computeDifficulty(level, BODY_PARTS);
    const axis = computeAxis(level);
    const { mel, lesions } = generateLesions({ config, axis });
    Object.assign(engine.current, createEngine(), {
      config,
      axis,
      mel,
      lesions,
    });
    drawBaseField();
    patchUi({ partName: config.part });
  }

  // ---- disinfect ----
  function computeWipeCells() {
    const e = engine.current;
    const mel = e.mel;
    const cellSize = 24;
    const radius = mel.maxR + 9 * MM;
    e.wipeCellSize = cellSize;
    e.wipeRadius = radius;
    e.wipeTarget = new Set();
    e.wipeDone = new Set();
    for (let gx = Math.floor((mel.x - radius) / cellSize); gx <= Math.floor((mel.x + radius) / cellSize); gx++) {
      for (let gy = Math.floor((mel.y - radius) / cellSize); gy <= Math.floor((mel.y + radius) / cellSize); gy++) {
        const cx = (gx + 0.5) * cellSize;
        const cy = (gy + 0.5) * cellSize;
        if (cx < 0 || cy < 0 || cx > FIELD_WIDTH || cy > FIELD_HEIGHT) continue;
        if (Math.hypot(cx - mel.x, cy - mel.y) <= radius) e.wipeTarget.add(`${gx},${gy}`);
      }
    }
    e.wipeCellsComputed = true;
  }

  function addSwab(p) {
    const e = engine.current;
    if (!e.mel) return;
    if (!e.wipeCellsComputed) computeWipeCells();
    const cellSize = e.wipeCellSize;
    const radius = e.wipeRadius;
    const d = Math.hypot(p.x - e.mel.x, p.y - e.mel.y);
    if (d > radius + cellSize) return;
    const last = e.swabs[e.swabs.length - 1];
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < 6) return;
    e.swabs.push({ x: p.x, y: p.y, r: 16 + Math.random() * 5, t: performance.now() });
    const angle = Math.atan2(p.y - e.mel.y, p.x - e.mel.x);
    e.coveredSectors.add(Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 12) % 12);
    const cellsUnderGauze = 18;
    for (let gx = Math.floor((p.x - cellsUnderGauze) / cellSize); gx <= Math.floor((p.x + cellsUnderGauze) / cellSize); gx++) {
      for (let gy = Math.floor((p.y - cellsUnderGauze) / cellSize); gy <= Math.floor((p.y + cellsUnderGauze) / cellSize); gy++) {
        const key = `${gx},${gy}`;
        if (e.wipeTarget.has(key)) e.wipeDone.add(key);
      }
    }
    const pct = Math.min(100, Math.round((e.wipeDone.size / (e.wipeTarget.size * 0.9)) * 100));
    if (pct !== uiRef.current.disinfectPct) patchUi({ disinfectPct: pct });
    else draw();
  }

  function tickSwabs() {
    const e = engine.current;
    const now = performance.now();
    e.swabs = e.swabs.filter((s) => now - (s.t || 0) < 1500);
    draw();
    if (uiRef.current.phase === 'disinfect' && (e.wiping || e.swabs.length)) {
      e.swabRAF = requestAnimationFrame(tickSwabs);
    } else {
      e.swabRAF = null;
      draw();
    }
  }

  function startWipe(event) {
    engine.current.wiping = true;
    addSwab(pointFromEvent(event));
    if (uiRef.current.hint) patchUi({ hint: false });
    if (!engine.current.swabRAF) tickSwabs();
  }

  function finishDisinfect() {
    const e = engine.current;
    if (e.swabRAF) {
      cancelAnimationFrame(e.swabRAF);
      e.swabRAF = null;
    }
    e.swabs = [];
    e.disinfectScore = Math.round(clamp((e.coveredSectors.size / 11) * 100, 0, 100));
    patchUi({ phase: 'anest', equipped: null, disinfectPct: 100, hint: true });
    flashWarn('Pole odkażone — weź strzykawkę z tacki.');
  }

  // ---- anesthesia ----
  function inject(event) {
    const e = engine.current;
    const p = pointFromEvent(event);
    const mel = e.mel;
    const angle = Math.atan2(p.y - mel.y, p.x - mel.x);
    const distance = Math.hypot(p.x - mel.x, p.y - mel.y);
    const lesionRadius = melanomaRadiusAt(mel, angle);
    if (distance < lesionRadius + 2) {
      flashWarn('Nie wbijaj igły w samego czerniaka — znieczulaj dookoła.');
      return;
    }
    if (distance > lesionRadius + 8 * MM) {
      flashWarn('Za daleko od zmiany — znieczulaj tuż przy jej brzegu.');
      return;
    }
    e.injections.push({ x: p.x, y: p.y, ang: angle });
    e.injectFx.push({ x: p.x, y: p.y, t0: performance.now() });
    startFx();

    const angles = e.injections.map((i) => i.ang).sort((a, b) => a - b);
    let maxGap = 0;
    for (let i = 0; i < angles.length; i++) {
      const next = i + 1 < angles.length ? angles[i + 1] : angles[0] + Math.PI * 2;
      maxGap = Math.max(maxGap, next - angles[i]);
    }
    const enough = e.injections.length >= 3 && (maxGap < 3.6 || e.injections.length >= 5);
    if (enough) {
      const n = e.injections.length;
      const even = (2 * Math.PI) / n;
      const countPenalty = Math.abs(n - 4) * 4;
      e.injectScore = Math.round(clamp(100 - Math.max(0, maxGap - even) * 42 - countPenalty, 0, 100));
      patchUi({ injCount: n, phase: 'cut', equipped: null, hint: true });
      flashWarn('Znieczulone — weź nożyczki z tacki.');
    } else {
      if (e.injections.length >= 3) flashWarn('Rozłóż znieczulenie równomiernie dookoła zmiany.');
      patchUi({ injCount: e.injections.length });
      draw();
    }
  }

  // ---- excision ----
  function startFx() {
    const e = engine.current;
    if (e.fxRAF) return;
    const loop = () => {
      draw();
      if (e.injectFx.length) {
        e.fxRAF = requestAnimationFrame(loop);
      } else {
        e.fxRAF = null;
        draw();
      }
    };
    e.fxRAF = requestAnimationFrame(loop);
  }

  function finalize() {
    const e = engine.current;
    e.drawing = false;
    if (e.points.length < 8) {
      e.points = [];
      draw();
      return;
    }
    const poly = [...e.points, { ...e.points[0] }];
    e.points = poly;
    const res = computeExcisionScore({ poly, mel: e.mel, lesions: e.lesions, axis: e.axis });
    res.exciseVal = res.score;
    if (res.ellipseA) e.ellipseA = res.ellipseA;
    if (res.ellipseB) e.ellipseB = res.ellipseB;
    const bad = res.wrong || (res.tumorRays || 0) > 0;
    e.pendingResult = res;
    if (bad) {
      e.sutureScore = 0;
      finishRun(res, true);
      return;
    }
    patchUi({ revealing: true, result: res });
    if (e.revealTimer) clearTimeout(e.revealTimer);
    e.revealTimer = setTimeout(() => {
      e.revealTimer = null;
      setupWound();
      patchUi({ revealing: false, phase: 'suture_deep', equipped: null, hint: true, deepCount: 0, skinCount: 0, creamPct: 0 });
      startWoundReveal();
    }, 1500);
  }

  function finishRun(res, bad) {
    const e = engine.current;
    res.disinfect = e.disinfectScore;
    res.inject = e.injectScore;
    res.suture = bad ? 0 : e.sutureScore;
    res.excise = res.exciseVal;
    const combined = bad
      ? res.exciseVal
      : Math.round(clamp(0.15 * res.disinfect + 0.15 * res.inject + 0.45 * res.excise + 0.25 * res.suture, 0, 100));
    res.score = combined;
    res.moneyNum = combined * 0.5;
    res.money = formatZloty(combined * 0.5);
    const mel = e.mel;
    patchUi({ revealing: true, result: res });
    if (bad) {
      playScarySting(audioContextRef);
      patchUi({
        alarm: true,
        alarmText: res.wrong ? 'CZERNIAK ZOSTAŁ NA SKÓRZE!' : 'DODATNI MARGINES — NOWOTWÓR ROŚNIE DALEJ!',
        alarmX: (mel.x / FIELD_WIDTH) * 100,
        alarmY: (mel.y / FIELD_HEIGHT) * 100,
      });
      if (e.alarmTimer) clearTimeout(e.alarmTimer);
      e.alarmTimer = setTimeout(() => patchUi({ alarm: false }), 1500);
    }
    if (e.revealTimer) clearTimeout(e.revealTimer);
    e.revealTimer = setTimeout(() => {
      e.revealTimer = null;
      patchUi({ showResult: true });
      if (res && !res.wrong && res.score >= 90) {
        playFanfare(audioContextRef);
        patchUi({ cheer: true });
        if (e.cheerTimer) clearTimeout(e.cheerTimer);
        e.cheerTimer = setTimeout(() => patchUi({ cheer: false }), 2600);
        requestAnimationFrame(() => startConfetti());
      }
    }, 1500);
  }

  // ---- wound closure ----
  function setupWound() {
    const e = engine.current;
    const mel = e.mel;
    e.woundC = { x: mel.x, y: mel.y };
    e.woundAxis = e.axis;
    e.woundDir = { x: Math.cos(e.axis), y: Math.sin(e.axis) };
    e.woundN = { x: -Math.sin(e.axis), y: Math.cos(e.axis) };
    e.deepStitches = [];
    e.skinStitches = [];
    e.creamSwabs = [];
    e.woundClose = 0;
    e.woundCloseTarget = 0;
    e.woundReveal = 0;
    e.woundOpen = true;
    e.stitchStart = null;
    e.stitchDrag = null;
  }

  function startWoundReveal() {
    const e = engine.current;
    e.woundReveal = 0;
    const t0 = performance.now();
    const step = (t) => {
      e.woundReveal = clamp((t - t0) / 650, 0, 1);
      draw();
      if (e.woundReveal < 1) e.revRAF = requestAnimationFrame(step);
      else e.revRAF = null;
    };
    e.revRAF = requestAnimationFrame(step);
  }

  function animateClose(target) {
    const e = engine.current;
    e.woundCloseTarget = target;
    if (e.closeRAF) return;
    const step = () => {
      const d = e.woundCloseTarget - e.woundClose;
      e.woundClose += d * 0.18;
      if (Math.abs(d) < 0.004) {
        e.woundClose = e.woundCloseTarget;
        e.closeRAF = null;
        draw();
        return;
      }
      draw();
      e.closeRAF = requestAnimationFrame(step);
    };
    e.closeRAF = requestAnimationFrame(step);
  }

  function flashRed() {
    const e = engine.current;
    patchUi({ redFlash: true });
    if (e.redTimer) clearTimeout(e.redTimer);
    e.redTimer = setTimeout(() => patchUi({ redFlash: false }), 650);
  }

  function placeStitch() {
    const e = engine.current;
    const A = e.stitchStart;
    const B = e.stitchDrag;
    e.stitchStart = null;
    if (!A || !B || Math.hypot(B.x - A.x, B.y - A.y) < 10) {
      draw();
      return;
    }
    const geom = stitchGeometry(e.woundC, e.woundDir, e.woundN, A, B);
    const deep = uiRef.current.phase === 'suture_deep';
    const arr = deep ? e.deepStitches : e.skinStitches;
    // tangled = crosses another GOOD stitch in the same layer. A good stitch drawn over an
    // earlier mistake is NOT flagged, since that mistake gets wiped out below.
    geom.tangled = arr.some(
      (other) => stitchOk(other) && segmentIntersectionT(geom.A.x, geom.A.y, geom.B.x, geom.B.y, other.A.x, other.A.y, other.B.x, other.B.y) != null
    );
    arr.push(geom);
    const bad = !stitchOk(geom);
    const wrongStitch = !geom.cross || geom.tangled;
    if (wrongStitch) flashRed();
    if (!bad) {
      // a correct stitch fixes the earlier mistake: the bad ones in this layer no longer count
      for (let i = arr.length - 2; i >= 0; i--) {
        if (!stitchOk(arr[i])) arr.splice(i, 1);
      }
    }
    const need = deep ? DEEP_NEED : SKIN_NEED;
    const count = arr.length;
    const good = arr.filter(stitchOk).length;
    if (deep) {
      patchUi({ deepCount: count });
      animateClose(0.5 * Math.min(good / need, 1));
    } else {
      patchUi({ skinCount: count });
      animateClose(0.5 + 0.5 * Math.min(good / need, 1));
    }
    if (count >= need) {
      if (deep) {
        patchUi({ phase: 'suture_skin', equipped: null, hint: true });
        flashWarn('Warstwa głęboka założona — teraz szwy skórne.');
      } else {
        patchUi({ phase: 'cream', equipped: null, hint: true });
        flashWarn('Rana zszyta — na koniec posmaruj maścią.');
      }
    } else {
      draw();
    }
  }

  function scoreSuturesNow() {
    const e = engine.current;
    e.sutureScore = scoreSutures(e.deepStitches, e.skinStitches, e.ellipseA);
  }

  // ---- cream ----
  function addCream(p) {
    const e = engine.current;
    const center = e.woundC;
    if (!center) return;
    const dir = e.woundDir;
    const normal = e.woundN;
    const s = (p.x - center.x) * dir.x + (p.y - center.y) * dir.y;
    const q = (p.x - center.x) * normal.x + (p.y - center.y) * normal.y;
    if (Math.abs(s) > e.ellipseA + 3 * MM || Math.abs(q) > e.ellipseB + 3 * MM) return;
    const last = e.creamSwabs[e.creamSwabs.length - 1];
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < 6) return;
    e.creamSwabs.push({ x: p.x, y: p.y, r: 15 + Math.random() * 5 });
    const pct = Math.min(100, e.creamSwabs.length * 9);
    if (pct !== uiRef.current.creamPct) patchUi({ creamPct: pct });
    else draw();
  }

  function startCream(event) {
    engine.current.creaming = true;
    addCream(pointFromEvent(event));
    if (uiRef.current.hint) patchUi({ hint: false });
  }

  function finishCream() {
    const e = engine.current;
    e.creaming = false;
    scoreSuturesNow();
    patchUi({ creamPct: 100 });
    e.creamFade = 1;
    const t0 = performance.now();
    if (e.creamFadeRAF) cancelAnimationFrame(e.creamFadeRAF);
    const step = (t) => {
      const elapsed = t - t0;
      e.creamFade = elapsed < 650 ? 1 : clamp(1 - (elapsed - 650) / 1050, 0, 1);
      draw();
      if (elapsed < 1700) {
        e.creamFadeRAF = requestAnimationFrame(step);
      } else {
        e.creamFadeRAF = null;
        e.creamSwabs = [];
        e.creamFade = 1;
        patchUi({ phase: 'plaster', equipped: null, hint: false, showTray: true });
        draw();
      }
    };
    e.creamFadeRAF = requestAnimationFrame(step);
  }

  // ---- plasters ----
  function animatePlasterIn() {
    const e = engine.current;
    const t0 = performance.now();
    if (e.plasterRAF) cancelAnimationFrame(e.plasterRAF);
    const step = (t) => {
      e.plasterAlpha = clamp((t - t0) / 430, 0, 1);
      draw();
      if (e.plasterAlpha < 1) {
        e.plasterRAF = requestAnimationFrame(step);
      } else {
        e.plasterRAF = null;
        setTimeout(() => {
          if (e.pendingResult) finishRun(e.pendingResult, false);
        }, 650);
      }
    };
    e.plasterRAF = requestAnimationFrame(step);
  }

  function pickPlaster(id) {
    const e = engine.current;
    const def = PLASTER_DEFS.find((d) => d.id === id);
    if (!def) return;
    e.plaster = def;
    e.plasterAlpha = 0;
    const img = new Image();
    img.onload = () => {
      e.plasterImage = img;
      animatePlasterIn();
    };
    img.src = `data:image/svg+xml,${encodeURIComponent(plasterSvg(def))}`;
    patchUi({ showTray: false });
  }

  // ---- confetti ----
  function startConfetti() {
    const canvas = confettiRef.current;
    if (!canvas) return;
    const width = canvas.clientWidth || FIELD_WIDTH;
    const height = canvas.clientHeight || FIELD_HEIGHT;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    engine.current.confetti = createConfettiBurst(width, height);
    const t0 = performance.now();
    const loop = (t) => {
      const alive = stepConfetti(ctx, engine.current.confetti, width, height, t - t0);
      if (alive) {
        engine.current.confRAF = requestAnimationFrame(loop);
      } else {
        ctx.clearRect(0, 0, width, height);
        engine.current.confRAF = null;
      }
    };
    engine.current.confRAF = requestAnimationFrame(loop);
  }

  // ---- pointer routing ----
  function onPointerDown(event) {
    if (ui.screen !== 'play' || ui.showResult || ui.revealing) return;
    const phase = ui.phase;
    const equipped = ui.equipped;
    if (phase === 'plaster') return;
    if (phase === 'disinfect') {
      if (equipped !== 'wipe') {
        flashWarn('Najpierw weź gazik z tacki.');
        return;
      }
      startWipe(event);
      return;
    }
    if (phase === 'anest') {
      if (equipped !== 'syringe') {
        flashWarn('Najpierw weź strzykawkę z tacki.');
        return;
      }
      inject(event);
      return;
    }
    if (phase === 'suture_deep' || phase === 'suture_skin') {
      const wanted = phase === 'suture_deep' ? 'needleDeep' : 'needleSkin';
      if (equipped !== wanted) {
        flashWarn('Najpierw weź igłę z nicią z tacki.');
        return;
      }
      try {
        viewRef.current.setPointerCapture(event.pointerId);
      } catch (_error) {
        // Pointer capture isn't implemented everywhere (e.g. jsdom); freehand still works.
      }
      engine.current.stitchStart = pointFromEvent(event);
      engine.current.stitchDrag = engine.current.stitchStart;
      if (ui.hint) patchUi({ hint: false });
      else draw();
      return;
    }
    if (phase === 'cream') {
      if (equipped !== 'cream') {
        flashWarn('Najpierw weź maść z tacki.');
        return;
      }
      startCream(event);
      return;
    }
    // cut
    if (equipped !== 'scissors') {
      flashWarn('Najpierw weź nożyczki z tacki.');
      return;
    }
    try {
      viewRef.current.setPointerCapture(event.pointerId);
    } catch (_error) {
      // Pointer capture isn't implemented everywhere (e.g. jsdom); freehand still works.
    }
    engine.current.drawing = true;
    engine.current.points = [pointFromEvent(event)];
    if (ui.hint) patchUi({ hint: false });
    else draw();
  }

  function onPointerMove(event) {
    const phase = ui.phase;
    const e = engine.current;
    if (phase === 'disinfect') {
      if (e.wiping) addSwab(pointFromEvent(event));
      return;
    }
    if (phase === 'cream') {
      if (e.creaming) addCream(pointFromEvent(event));
      return;
    }
    if (phase === 'suture_deep' || phase === 'suture_skin') {
      if (e.stitchStart) {
        e.stitchDrag = pointFromEvent(event);
        draw();
      }
      return;
    }
    if (!e.drawing) return;
    let p = pointFromEvent(event);
    const tremor = e.config.tremor;
    if (tremor > 0) {
      const randn = () => Math.random() + Math.random() + Math.random() - 1.5;
      p = { x: p.x + randn() * tremor, y: p.y + randn() * tremor };
    }
    const last = e.points[e.points.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 1.6) {
      e.points.push(p);
      draw();
    }
  }

  function onPointerUp() {
    const phase = ui.phase;
    const e = engine.current;
    if (phase === 'disinfect') {
      e.wiping = false;
      if (ui.disinfectPct >= 100) finishDisinfect();
      return;
    }
    if (phase === 'cream') {
      e.creaming = false;
      if (ui.creamPct >= 100) finishCream();
      return;
    }
    if (phase === 'suture_deep' || phase === 'suture_skin') {
      if (e.stitchStart) placeStitch();
      return;
    }
    if (!e.drawing) return;
    finalize();
  }

  function equip(id) {
    if (ui.screen !== 'play' || ui.showResult || ui.revealing) return;
    if (id !== TOOL_FOR_PHASE[ui.phase]) return;
    patchUi({ equipped: id });
  }

  const stopPropagation = (event) => event.stopPropagation();
  const zoomIn = () => patchUi((s) => ({ zoom: Math.min(3, s.zoom + 0.25) }));
  const zoomOut = () => patchUi((s) => ({ zoom: Math.max(0.9, s.zoom - 0.25) }));
  const scrollPlasters = (dir) => {
    plasterScrollRef.current?.scrollBy({ top: dir * 220, behavior: 'smooth' });
  };
  const scrollPlastersUp = () => scrollPlasters(-1);
  const scrollPlastersDown = () => scrollPlasters(1);
  const openTutorial = () => patchUi({ screen: 'tutorial' });

  function startGame() {
    patchUi({
      screen: 'play', phase: 'disinfect', equipped: null, disinfectPct: 0, deepCount: 0, skinCount: 0,
      creamPct: 0, revealing: false, zoom: 1, hint: true, showTray: false, redFlash: false,
    });
  }

  function retry() {
    const e = engine.current;
    if (e.revealTimer) {
      clearTimeout(e.revealTimer);
      e.revealTimer = null;
    }
    const level = ui.level;
    patchUi({
      showResult: false, revealing: false, result: null, zoom: 1, phase: 'disinfect', equipped: null,
      injCount: 0, disinfectPct: 0, deepCount: 0, skinCount: 0, creamPct: 0, hint: true, showTray: false, redFlash: false,
    });
    setupLevel(level);
  }

  function nextLevel() {
    const e = engine.current;
    if (e.revealTimer) {
      clearTimeout(e.revealTimer);
      e.revealTimer = null;
    }
    const level = ui.level + 1;
    const add = ui.result ? ui.result.moneyNum : 0;
    patchUi((s) => ({
      level, cash: s.cash + add, showResult: false, revealing: false, result: null, zoom: 1, phase: 'disinfect',
      equipped: null, injCount: 0, disinfectPct: 0, deepCount: 0, skinCount: 0, creamPct: 0, hint: true, showTray: false, redFlash: false,
    }));
    setupLevel(level);
  }

  function clearLine() {
    if (ui.showResult || ui.revealing) return;
    const e = engine.current;
    const phase = ui.phase;
    if (phase === 'cut') {
      e.points = [];
      e.drawing = false;
      draw();
      return;
    }
    if (phase === 'suture_deep') {
      if (e.deepStitches.length) {
        e.deepStitches.pop();
        patchUi({ deepCount: e.deepStitches.length });
        animateClose(0.5 * Math.min(e.deepStitches.length / DEEP_NEED, 1));
      }
      return;
    }
    if (phase === 'suture_skin') {
      if (e.skinStitches.length) {
        e.skinStitches.pop();
        patchUi({ skinCount: e.skinStitches.length });
        animateClose(0.5 + 0.5 * Math.min(e.skinStitches.length / SKIN_NEED, 1));
      }
      return;
    }
    if (phase === 'cream') {
      e.creamSwabs = [];
      patchUi({ creamPct: 0 });
      draw();
    }
  }

  function toolStatus(id) {
    const groups = { prep: ['wipe', 'syringe', 'scissors'], close: ['needleDeep', 'needleSkin', 'cream'] };
    const phaseOrder = {
      disinfect: ['prep', 0], anest: ['prep', 1], cut: ['prep', 2],
      suture_deep: ['close', 0], suture_skin: ['close', 1], cream: ['close', 2],
    }[ui.phase];
    if (!phaseOrder) return 'locked';
    const [group, cur] = phaseOrder;
    const arr = groups[group];
    const idx = arr.indexOf(id);
    if (idx < 0) return 'locked';
    if (idx < cur) return 'done';
    if (idx > cur) return 'locked';
    return ui.equipped === id ? 'held' : 'active';
  }

  // Keep the latest committed state available to rAF/timeout callbacks that outlive a single
  // render, and re-run the imperative canvas/cursor/zoom sync every render (mirrors a class
  // component's componentDidMount + componentDidUpdate combined).
  useEffect(() => {
    uiRef.current = ui;
    applyZoom();
    updateCursor();
    draw();
  });

  useEffect(() => {
    setupLevel(1);
    const view = viewRef.current;
    const handleWheel = (event) => {
      if (uiRef.current.screen !== 'play' || uiRef.current.showTray) return;
      event.preventDefault();
      const current = uiRef.current.zoom;
      const next = clamp(current + (event.deltaY < 0 ? 0.18 : -0.18), 0.9, 3);
      if (next !== current) patchUi({ zoom: next });
    };
    view?.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      view?.removeEventListener('wheel', handleWheel);
      cancelEngineAnimation();
    };
    // Mount-once setup, mirroring the original's componentDidMount/componentWillUnmount pair.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const plasterCards = PLASTER_DEFS.map((def) => ({
    id: def.id,
    name: def.name,
    svgMarkup: plasterSvg(def),
  }));

  return {
    ui,
    refs: { canvasRef, confettiRef, viewRef, plasterScrollRef },
    DEEP_NEED,
    SKIN_NEED,
    plasterCards,
    toolStatus,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      stopPropagation,
      equipWipe: () => equip('wipe'),
      equipSyringe: () => equip('syringe'),
      equipScissors: () => equip('scissors'),
      equipNeedleDeep: () => equip('needleDeep'),
      equipNeedleSkin: () => equip('needleSkin'),
      equipCream: () => equip('cream'),
      zoomIn,
      zoomOut,
      scrollPlastersUp,
      scrollPlastersDown,
      clearLine,
      openTutorial,
      startGame,
      retry,
      nextLevel,
      pickPlaster,
    },
  };
}
