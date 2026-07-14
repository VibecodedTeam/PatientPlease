// Thin canvas-2D rendering glue for the excision field. None of this is unit-tested (canvas
// pixel output isn't meaningfully assertable - the same call jsdom itself can't make, which is
// why HTMLCanvasElement.getContext('2d') returns null in tests); the testable logic it draws
// from (scoring, geometry, lesion placement) lives in the sibling internal/ pure-function
// modules instead, mirroring how PatientScene isolates its Three.js glue from pickDot/
// screenToNdc/deriveAttentionRegions.

function drawVessels(ctx, width, height, axis) {
  const cos = Math.cos(axis);
  const sin = Math.sin(axis);
  const nx = -sin;
  const ny = cos;
  const cx = width / 2;
  const cy = height / 2;
  for (let k = -3; k <= 3; k++) {
    const off = k * 118;
    ctx.beginPath();
    let first = true;
    for (let t = -760; t <= 760; t += 14) {
      const wob = Math.sin(t * 0.012 + k) * 9;
      const px = cx + cos * t + nx * (off + wob);
      const py = cy + sin * t + ny * (off + wob);
      if (first) {
        ctx.moveTo(px, py);
        first = false;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.strokeStyle = `rgba(92,118,150,${k % 2 ? 0.055 : 0.08})`;
    ctx.lineWidth = k % 2 ? 1.2 : 1.8;
    ctx.stroke();
  }
}

function drawBenignLesion(ctx, lesion) {
  const N = 48;
  const radiusAt = (a) =>
    lesion.r * (1 + Math.sin(a * 2 + lesion.seed) * lesion.irr * 0.4 + Math.sin(a * 3 + lesion.seed * 1.7) * lesion.irr * 0.28);
  const trace = (k) => {
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const r = radiusAt(a) * k;
      const x = lesion.x + Math.cos(a) * r;
      const y = lesion.y + Math.sin(a) * r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  };

  ctx.save();
  ctx.shadowColor = 'rgba(48,24,12,0.32)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 1.4;
  trace(1);
  const body = ctx.createRadialGradient(lesion.x - lesion.r * 0.28, lesion.y - lesion.r * 0.3, lesion.r * 0.1, lesion.x, lesion.y, lesion.r * 1.04);
  body.addColorStop(0, lesion.c2);
  body.addColorStop(0.5, lesion.c1);
  body.addColorStop(0.86, lesion.c1);
  body.addColorStop(1, 'rgba(120,70,40,0)');
  ctx.fillStyle = body;
  ctx.fill();
  ctx.restore();

  ctx.save();
  trace(0.95);
  ctx.clip();
  if (lesion.uneven) {
    for (const [dx, dy, rs, al] of [[-0.24, -0.16, 0.55, 0.34], [0.26, 0.2, 0.46, 0.26]]) {
      const px = lesion.x + lesion.r * dx;
      const py = lesion.y + lesion.r * dy;
      const patch = ctx.createRadialGradient(px, py, 1, px, py, lesion.r * rs);
      patch.addColorStop(0, `rgba(28,15,9,${al})`);
      patch.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = patch;
      ctx.beginPath();
      ctx.arc(px, py, lesion.r * rs, 0, 7);
      ctx.fill();
    }
  } else {
    const patch = ctx.createRadialGradient(lesion.x, lesion.y, 1, lesion.x, lesion.y, lesion.r * 0.72);
    patch.addColorStop(0, 'rgba(40,22,12,0.2)');
    patch.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = patch;
    ctx.beginPath();
    ctx.arc(lesion.x, lesion.y, lesion.r * 0.72, 0, 7);
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = 'rgba(255,242,228,0.18)';
  ctx.beginPath();
  ctx.ellipse(lesion.x - lesion.r * 0.3, lesion.y - lesion.r * 0.33, lesion.r * 0.24, lesion.r * 0.16, -0.6, 0, 7);
  ctx.fill();
}

function drawMelanomaLesion(ctx, mel) {
  const halo = ctx.createRadialGradient(mel.x, mel.y, mel.maxR * 0.6, mel.x, mel.y, mel.maxR * 1.9);
  halo.addColorStop(0, 'rgba(158,52,44,0.16)');
  halo.addColorStop(1, 'rgba(158,52,44,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(mel.x, mel.y, mel.maxR * 1.9, 0, 7);
  ctx.fill();

  const samples = mel.samples;
  const n = samples.length;
  const traceOutline = () => {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const s = samples[i % n];
      const x = mel.x + Math.cos(s.ang) * s.rad;
      const y = mel.y + Math.sin(s.ang) * s.rad;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  };

  ctx.save();
  ctx.shadowColor = 'rgba(30,8,4,0.5)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  traceOutline();
  const body = ctx.createRadialGradient(mel.x - mel.r * 0.2, mel.y - mel.r * 0.2, 2, mel.x, mel.y, mel.maxR);
  body.addColorStop(0, '#3a241c');
  body.addColorStop(0.55, '#241512');
  body.addColorStop(1, '#43201d');
  ctx.fillStyle = body;
  ctx.fill();
  ctx.restore();

  ctx.save();
  traceOutline();
  ctx.clip();
  const patches = [
    ['#0c0807', 0.85, -0.25, -0.1, 0.5],
    ['#5c1f1f', 0.5, 0.3, 0.28, 0.42],
    ['#6b4a2c', 0.4, 0.12, -0.35, 0.34],
    ['#100b09', 0.7, 0.28, -0.05, 0.3],
  ];
  for (const [col, al, dx, dy, rs] of patches) {
    ctx.globalAlpha = al;
    const px = mel.x + mel.r * dx;
    const py = mel.y + mel.r * dy;
    const patch = ctx.createRadialGradient(px, py, 1, px, py, mel.r * rs);
    patch.addColorStop(0, col);
    patch.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = patch;
    ctx.beginPath();
    ctx.arc(px, py, mel.r * rs, 0, 7);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  traceOutline();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = 'rgba(16,8,6,0.55)';
  ctx.stroke();
}

function drawScaleBar(ctx, width, height, mmToPx) {
  const x = 26;
  const y = height - 30;
  const len = mmToPx * 5;
  ctx.fillStyle = 'rgba(11,18,21,0.55)';
  ctx.fillRect(x - 8, y - 16, len + 58, 26);
  ctx.strokeStyle = '#eef6f5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + len, y);
  ctx.moveTo(x, y - 5);
  ctx.lineTo(x, y + 5);
  ctx.moveTo(x + len, y - 5);
  ctx.lineTo(x + len, y + 5);
  ctx.stroke();
  ctx.fillStyle = '#dfeceb';
  ctx.font = "600 12px 'IBM Plex Mono', monospace";
  ctx.fillText('5 mm', x + len + 8, y + 4);
}

/**
 * Paints the static operating field once per level into an offscreen canvas: skin tone,
 * texture, vessels, freckles, vignette, every lesion, and the mm scale bar. The caller
 * (Excisio.jsx) caches the result and blits it every frame instead of redrawing it live.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{width: number, height: number, mmToPx: number, axis: number, tone: string[], lesions: object[]}} params
 */
export function renderBaseField(ctx, { width, height, mmToPx, axis, tone, lesions }) {
  const gradient = ctx.createLinearGradient(0, 0, width * 0.3, height);
  gradient.addColorStop(0, tone[0]);
  gradient.addColorStop(0.5, tone[1]);
  gradient.addColorStop(1, tone[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const sheen = ctx.createRadialGradient(width * 0.42, height * 0.38, 30, width * 0.42, height * 0.38, width * 0.72);
  sheen.addColorStop(0, 'rgba(255,244,234,0.24)');
  sheen.addColorStop(1, 'rgba(255,244,234,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, width, height);

  drawVessels(ctx, width, height, axis);

  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = `rgba(110,64,44,${0.04 + Math.random() * 0.04})`;
    ctx.beginPath();
    const y = Math.random() * height;
    ctx.moveTo(-20, y);
    ctx.bezierCurveTo(
      width * 0.3, y + (Math.random() * 80 - 40),
      width * 0.7, y + (Math.random() * 80 - 40),
      width + 20, y + (Math.random() * 60 - 30)
    );
    ctx.stroke();
  }
  for (let i = 0; i < 5200; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    ctx.fillStyle =
      Math.random() < 0.5 ? `rgba(96,54,38,${0.03 + Math.random() * 0.05})` : `rgba(255,236,222,${0.02 + Math.random() * 0.05})`;
    ctx.fillRect(x, y, Math.random() < 0.86 ? 1 : 2, 1);
  }
  for (let i = 0; i < 28; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const fr = 1 + Math.random() * 2.4;
    const freckle = ctx.createRadialGradient(x, y, 0, x, y, fr);
    freckle.addColorStop(0, `rgba(120,72,48,${0.28 + Math.random() * 0.25})`);
    freckle.addColorStop(1, 'rgba(120,72,48,0)');
    ctx.fillStyle = freckle;
    ctx.beginPath();
    ctx.arc(x, y, fr, 0, 7);
    ctx.fill();
  }
  const vignette = ctx.createRadialGradient(width / 2, height / 2, height * 0.32, width / 2, height / 2, width * 0.72);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(26,10,4,0.3)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  for (const lesion of lesions) {
    if (lesion.type === 'mel') drawMelanomaLesion(ctx, lesion);
    else drawBenignLesion(ctx, lesion);
  }
  drawScaleBar(ctx, width, height, mmToPx);
}

/** Fading gauze-wipe marks left behind while disinfecting. */
export function renderSwabs(ctx, swabs, now) {
  const life = 1500;
  for (const s of swabs) {
    const age = now - (s.t || 0);
    if (age >= life) continue;
    const alpha = age < 200 ? age / 200 : Math.max(0, 1 - (age - 200) / (life - 200));
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, s.r);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.6, 'rgba(248,252,252,0.28)');
    g.addColorStop(1, 'rgba(248,252,252,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, 7);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Small red anesthesia injection dots. */
export function renderInjections(ctx, injections) {
  for (const it of injections) {
    const wheal = ctx.createRadialGradient(it.x, it.y, 1, it.x, it.y, 12);
    wheal.addColorStop(0, 'rgba(255,250,245,0.5)');
    wheal.addColorStop(0.6, 'rgba(255,245,238,0.22)');
    wheal.addColorStop(1, 'rgba(255,245,238,0)');
    ctx.fillStyle = wheal;
    ctx.beginPath();
    ctx.arc(it.x, it.y, 12, 0, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(178,40,40,0.85)';
    ctx.beginPath();
    ctx.arc(it.x, it.y, 2.1, 0, 7);
    ctx.fill();
  }
}

/** In-flight syringe-press animation for each injection, alive for ~600ms. */
export function renderInjectionEffects(ctx, injectFx, now) {
  const nx = 0.707;
  const ny = -0.707;
  const vx = 0.707;
  const vy = 0.707;
  for (const f of injectFx) {
    const age = now - f.t0;
    if (age >= 600) continue;
    const p = Math.max(0, Math.min(1, age / 540));
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.globalAlpha = (1 - p) * 0.5;
    const rr = 4 + p * 20;
    const bloom = ctx.createRadialGradient(0, 0, 1, 0, 0, rr);
    bloom.addColorStop(0, 'rgba(255,250,246,0.7)');
    bloom.addColorStop(1, 'rgba(255,244,236,0)');
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(0, 0, rr, 0, 7);
    ctx.fill();

    ctx.globalAlpha = Math.max(0, Math.min(1, 1.35 - p * 1.35));
    const nEnd = { x: nx * 15, y: ny * 15 };
    ctx.strokeStyle = '#c3cfce';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(nEnd.x, nEnd.y);
    ctx.stroke();

    const bLen = 26;
    const bw = 9;
    const be = { x: nEnd.x + nx * bLen, y: nEnd.y + ny * bLen };
    ctx.beginPath();
    ctx.moveTo(nEnd.x + (vx * bw) / 2, nEnd.y + (vy * bw) / 2);
    ctx.lineTo(be.x + (vx * bw) / 2, be.y + (vy * bw) / 2);
    ctx.lineTo(be.x - (vx * bw) / 2, be.y - (vy * bw) / 2);
    ctx.lineTo(nEnd.x - (vx * bw) / 2, nEnd.y - (vy * bw) / 2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(232,242,242,0.92)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,80,80,0.55)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const travel = 14;
    const off = travel * (1 - p);
    const pIn = { x: be.x + nx * off, y: be.y + ny * off };
    const pTop = { x: be.x + nx * (off + 5), y: be.y + ny * (off + 5) };
    ctx.strokeStyle = '#8fa6aa';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pIn.x, pIn.y);
    ctx.lineTo(pTop.x, pTop.y);
    ctx.stroke();
    ctx.strokeStyle = '#e8f2f2';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(pTop.x + vx * 6, pTop.y + vy * 6);
    ctx.lineTo(pTop.x - vx * 6, pTop.y - vy * 6);
    ctx.stroke();
    ctx.restore();
  }
}

/** The player's in-progress/finalized freehand cutting line. */
export function renderFreehandPath(ctx, points, result) {
  if (points.length < 2) return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (result) {
    ctx.strokeStyle = result.wrong ? '#ff6b6b' : result.tumorRays > 0 ? '#ffb020' : '#c9bdf7';
    ctx.lineWidth = 2.6;
  } else {
    ctx.shadowColor = 'rgba(139,110,246,0.5)';
    ctx.shadowBlur = 6;
    ctx.strokeStyle = '#8b6ef6';
    ctx.lineWidth = 3;
  }
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  ctx.restore();
}

/**
 * Once an excision is finalized: the raw red wound bed inside the cut line, a red glow if
 * tumor was left behind, the dashed ideal-margin ellipse guide, or (for a missed cut) a
 * dashed circle + "!" around the still-present melanoma.
 */
export function renderExcisionResultOverlay(ctx, { mel, points, axis, ellipseA, ellipseB, result }) {
  if (!result) return;
  const center = { x: mel.x, y: mel.y };

  if (!result.wrong) {
    if (points.length > 2) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.closePath();
      const bed = ctx.createRadialGradient(center.x, center.y, 2, center.x, center.y, mel.maxR * 1.4);
      bed.addColorStop(0, '#ad342c');
      bed.addColorStop(0.6, '#8f221c');
      bed.addColorStop(1, '#6d1611');
      ctx.fillStyle = bed;
      ctx.fill();
      ctx.strokeStyle = 'rgba(58,10,8,0.6)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.clip();
      ctx.fillStyle = 'rgba(255,150,138,0.2)';
      ctx.beginPath();
      ctx.ellipse(center.x - mel.r * 0.2, center.y - mel.r * 0.3, mel.maxR * 0.6, mel.maxR * 0.4, axis, 0, 7);
      ctx.fill();
      ctx.restore();
    }
    if (result.tumorRays > 0) {
      const glow = ctx.createRadialGradient(center.x, center.y, mel.maxR * 0.4, center.x, center.y, mel.maxR * 1.3);
      glow.addColorStop(0, 'rgba(255,60,60,0.35)');
      glow.addColorStop(1, 'rgba(255,60,60,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(center.x, center.y, mel.maxR * 1.3, 0, 7);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(axis);
    ctx.setLineDash([9, 7]);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#57e0c0';
    ctx.shadowColor = 'rgba(87,224,192,0.5)';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.ellipse(0, 0, ellipseA, ellipseB, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([4, 5]);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = 'rgba(87,224,192,0.55)';
    ctx.beginPath();
    ctx.moveTo(-ellipseA, 0);
    ctx.lineTo(ellipseA, 0);
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(mel.x, mel.y, mel.maxR + 16, 0, 7);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ff6b6b';
    ctx.font = "700 22px 'Space Grotesk', sans-serif";
    ctx.fillText('!', mel.x + mel.maxR + 22, mel.y - mel.maxR - 4);
    ctx.restore();
  }
}

function woundPoint(center, dir, normal, pos, q) {
  return { x: center.x + dir.x * pos + normal.x * q, y: center.y + dir.y * pos + normal.y * q };
}

function drawDeepStitches(ctx, deepStitches, isStitchValid, closeAmount) {
  const alpha = (1 - closeAmount) * 0.5 + 0.14;
  ctx.save();
  ctx.setLineDash([4, 3]);
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const s of deepStitches) {
    const bad = !isStitchValid(s);
    ctx.strokeStyle = bad ? `rgba(230,80,70,${(alpha + 0.2).toFixed(2)})` : `rgba(150,120,240,${alpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.moveTo(s.A.x, s.A.y);
    ctx.lineTo(s.B.x, s.B.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSkinStitches(ctx, skinStitches, isStitchValid) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.setLineDash([]);
  for (const s of skinStitches) {
    const A = s.A;
    const B = s.B;
    const bad = !isStitchValid(s);
    ctx.strokeStyle = bad ? '#b3352c' : '#1c2b33';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.stroke();

    const mx = (A.x + B.x) / 2;
    const my = (A.y + B.y) / 2;
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len;
    const py = dx / len;
    const o = 3;
    ctx.strokeStyle = bad ? 'rgba(140,40,34,0.8)' : 'rgba(28,43,51,0.8)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(mx + px * o, my + py * o);
    ctx.lineTo(mx - px * o, my - py * o);
    ctx.stroke();

    ctx.fillStyle = bad ? '#5c130f' : '#0f1a20';
    ctx.beginPath();
    ctx.arc(A.x, A.y, 2.1, 0, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(B.x, B.y, 2.1, 0, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(150,175,185,0.6)';
    ctx.beginPath();
    ctx.arc(A.x - 0.6, A.y - 0.6, 0.8, 0, 7);
    ctx.fill();
  }
  ctx.restore();
}

function drawCream(ctx, creamSwabs, creamFade) {
  if (!creamSwabs.length) return;
  const fade = creamFade != null ? creamFade : 1;
  if (fade <= 0) return;
  ctx.save();
  ctx.globalAlpha = fade;
  for (const s of creamSwabs) {
    const g = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, s.r);
    g.addColorStop(0, 'rgba(255,236,240,0.5)');
    g.addColorStop(0.55, 'rgba(252,232,236,0.28)');
    g.addColorStop(1, 'rgba(252,232,236,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, 7);
    ctx.fill();
    const shine = ctx.createRadialGradient(s.x - s.r * 0.3, s.y - s.r * 0.3, 1, s.x, s.y, s.r * 0.6);
    shine.addColorStop(0, 'rgba(255,255,255,0.5)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * 0.6, 0, 7);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Renders the whole post-excision wound: skin drawn together over the defect, the still-open
 * red gap (shrinking as `closeAmount` -> 1), deep/skin stitches, cream, the finished plaster
 * once picked, and the in-progress stitch-drag preview line.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} wound
 * @param {{x:number,y:number}} wound.center
 * @param {number} wound.axis
 * @param {number} wound.a - half-length along the wound
 * @param {number} wound.b - half-width across the wound
 * @param {{x:number,y:number}} wound.dir
 * @param {{x:number,y:number}} wound.normal
 * @param {number} wound.reveal - 0-1 reveal-in progress
 * @param {number} wound.closeAmount - 0-1 how closed the wound is
 * @param {string[]} wound.tone - skin gradient stops for this body part
 * @param {object[]} wound.deepStitches
 * @param {object[]} wound.skinStitches
 * @param {(stitch: object) => boolean} wound.isStitchValid
 * @param {object[]} wound.creamSwabs
 * @param {number} wound.creamFade
 * @param {HTMLImageElement|null} wound.plasterImage
 * @param {number} wound.plasterAlpha
 * @param {{x:number,y:number}|null} wound.stitchStart
 * @param {{x:number,y:number}|null} wound.stitchDrag
 */
export function renderWound(ctx, wound) {
  const { center, axis, a, b, reveal, closeAmount, tone } = wound;
  if (!center) return;

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(axis);

  ctx.globalAlpha = 0.22 * reveal;
  const halo = ctx.createRadialGradient(0, 0, b * 0.4, 0, 0, a + 16);
  halo.addColorStop(0, 'rgba(188,72,60,0.55)');
  halo.addColorStop(1, 'rgba(188,72,60,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.ellipse(0, 0, a + 16, b + 16, 0, 0, 7);
  ctx.fill();

  ctx.globalAlpha = reveal;
  const skin = ctx.createLinearGradient(0, -b, 0, b);
  skin.addColorStop(0, tone[0]);
  skin.addColorStop(0.5, tone[1]);
  skin.addColorStop(1, tone[2]);
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(0, 0, a, b, 0, 0, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,50,35,0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, 0, a, b, 0, 0, 7);
  ctx.stroke();

  const gy = b * (1 - closeAmount);
  if (gy > 0.8) {
    const gap = ctx.createLinearGradient(0, -gy, 0, gy);
    gap.addColorStop(0, '#7d1f1a');
    gap.addColorStop(0.5, '#ad342c');
    gap.addColorStop(1, '#6d1611');
    ctx.fillStyle = gap;
    ctx.beginPath();
    ctx.ellipse(0, 0, a * 0.99, gy, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,150,138,0.22)';
    ctx.beginPath();
    ctx.ellipse(-a * 0.08, -gy * 0.32, a * 0.52, gy * 0.4, 0, 0, 7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(58,10,8,0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-a * 0.88, 0);
    ctx.lineTo(a * 0.88, 0);
    ctx.stroke();
  }

  ctx.globalAlpha = reveal * closeAmount;
  ctx.strokeStyle = 'rgba(122,42,36,0.7)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-a, 0);
  ctx.lineTo(a, 0);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();

  drawDeepStitches(ctx, wound.deepStitches, wound.isStitchValid, closeAmount);
  drawSkinStitches(ctx, wound.skinStitches, wound.isStitchValid);
  drawCream(ctx, wound.creamSwabs, wound.creamFade);

  if (wound.plasterImage) {
    ctx.save();
    ctx.globalAlpha = wound.plasterAlpha != null ? wound.plasterAlpha : 1;
    ctx.translate(center.x, center.y);
    ctx.rotate(axis);
    const pw = 2 * a + 58;
    const ph = 2 * b + 42;
    ctx.shadowColor = 'rgba(0,0,0,0.32)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 5;
    ctx.drawImage(wound.plasterImage, -pw / 2, -ph / 2, pw, ph);
    ctx.restore();
  }

  if (wound.stitchStart && wound.stitchDrag) {
    ctx.save();
    ctx.strokeStyle = 'rgba(130,205,255,0.95)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(wound.stitchStart.x, wound.stitchStart.y);
    ctx.lineTo(wound.stitchDrag.x, wound.stitchDrag.y);
    ctx.stroke();
    ctx.restore();
  }
}

export { woundPoint };

const CONFETTI_COLORS = ['#57e0c0', '#a78bfa', '#f0a94d', '#ff6b6b', '#eef6f5', '#63e6c8'];

/** A burst of confetti particles for the perfect-score celebration. */
export function createConfettiBurst(width, height, count = 170) {
  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: width / 2 + (Math.random() * 2 - 1) * 80,
      y: height * 0.34,
      vx: (Math.random() * 2 - 1) * 8,
      vy: -6 - Math.random() * 9,
      g: 0.28 + Math.random() * 0.12,
      w: 5 + Math.random() * 7,
      h: 8 + Math.random() * 8,
      rot: Math.random() * 6.28,
      vr: (Math.random() * 2 - 1) * 0.35,
      col: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    });
  }
  return particles;
}

/**
 * Advances and paints one confetti frame in place. Returns whether the burst is still alive
 * (some particle still on/above-screen, and under the 3.6s cutoff) so the caller knows
 * whether to keep scheduling frames.
 */
export function stepConfetti(ctx, particles, width, height, elapsedMs) {
  ctx.clearRect(0, 0, width, height);
  let alive = false;
  for (const p of particles) {
    p.vy += p.g;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.vx *= 0.99;
    if (p.y < height + 30) alive = true;
    const alpha = elapsedMs > 2600 ? Math.max(0, 1 - (elapsedMs - 2600) / 900) : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.col;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }
  return alive && elapsedMs < 3600;
}
