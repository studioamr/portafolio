/* ===== OBRA — historia de fondo guiada por scroll =====
   Un planeta en calma · una nave se acerca · manda una señal ·
   el planeta la recibe y lanza su flota · persecución · viaje por
   el universo (hiperespacio) · llegamos al planeta de ellos.
   Todo scrubbeado al progreso de scroll (0 arriba -> 1 abajo). */
(function () {
  const canvas = document.getElementById("art");
  const ctx = canvas.getContext("2d", { alpha: false });
  const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
  let W, H, DPR, particles = [], t = 0, raf, mx = 0.5, my = 0.5, frames = 0;
  let P = 0, pOverride = null, curWarp = 0, VPx = 0, VPy = 0;

  const lowEnd = (navigator.hardwareConcurrency || 4) <= 4 || innerWidth < 760;
  const COUNT = lowEnd ? 600 : 1400;

  const ACCENT = "#FF5B2E", BONE = "#F4F1EA", PURPLE = "#9D7CFF", GREEN = "#3FD68C", AMBER = "#F2A33C";
  const PALETTE = [ACCENT, BONE, BONE, PURPLE, GREEN, AMBER];

  const seg = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const lerp = (a, b, k) => a + (b - a) * k;

  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = canvas.width = innerWidth * DPR;
    H = canvas.height = innerHeight * DPR;
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
    VPx = 0.6 * W; VPy = 0.42 * H;
    ctx.fillStyle = "#0A0A0B"; ctx.fillRect(0, 0, W, H);
  }
  resize();
  addEventListener("resize", resize);
  addEventListener("pointermove", (e) => { mx = e.clientX / innerWidth; my = e.clientY / innerHeight; });

  function flow(x, y, time) {
    const s = 0.0011;
    const a = Math.sin(x * s + time) * Math.cos(y * s * 1.3 - time * 0.8);
    const b = Math.cos(x * s * 0.7 - time * 0.6) * Math.sin(y * s + time * 0.4);
    const c = Math.sin((x + y) * s * 0.5 + time * 1.2) * 0.6;
    return (a + b + c) * Math.PI;
  }

  function seed(pt) {
    if (curWarp > 0.4 && Math.random() < curWarp) {   // en hiperespacio nacen cerca del punto de fuga
      const a = Math.random() * 6.283, r = Math.random() * 40 * DPR;
      pt.x = VPx + Math.cos(a) * r; pt.y = VPy + Math.sin(a) * r;
    } else {
      pt.x = Math.random() * W; pt.y = Math.random() * H;
    }
    pt.life = 60 + Math.random() * 220;
    pt.c = PALETTE[(Math.random() * PALETTE.length) | 0];
    pt.w = (Math.random() < 0.18 ? 2.0 : 0.7) * DPR;
    pt.sp = 2.4 + Math.random() * 1.6;
  }
  for (let i = 0; i < COUNT; i++) { const p = {}; seed(p); particles.push(p); }

  function scrollP() {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    return Math.min(1, Math.max(0, (scrollY || 0) / max));
  }

  /* ---------- cuerpos ---------- */
  function planet(cx, cy, r, rot, o) {
    ctx.save();
    // halo / atmósfera
    const gg = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r * 1.9);
    gg.addColorStop(0, o.glow + "0.4)"); gg.addColorStop(1, o.glow + "0)");
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(cx, cy, r * 1.9, 0, 7); ctx.fill();
    // cuerpo con lado iluminado
    const bg = ctx.createRadialGradient(cx - r * 0.42, cy - r * 0.42, r * 0.1, cx, cy, r);
    bg.addColorStop(0, o.light); bg.addColorStop(1, o.dark);
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    // bandas de superficie (giran)
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.clip();
    ctx.strokeStyle = o.band; ctx.lineWidth = r * 0.12;
    for (let i = 0; i < 3; i++) {
      const yy = cy + Math.sin(rot + i * 1.6) * r * 0.28 + (i - 1) * r * 0.42;
      ctx.beginPath(); ctx.moveTo(cx - r, yy);
      ctx.bezierCurveTo(cx - r * 0.3, yy - r * 0.14, cx + r * 0.3, yy + r * 0.14, cx + r, yy);
      ctx.stroke();
    }
    ctx.restore();
    // terminador (sombra)
    const tg = ctx.createRadialGradient(cx + r * 0.55, cy + r * 0.55, r * 0.2, cx, cy, r * 1.05);
    tg.addColorStop(0, "rgba(10,10,11,0)"); tg.addColorStop(1, "rgba(10,10,11,0.72)");
    ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    ctx.restore();
  }

  function drawScout(x, y, sc, ang, pulse) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    const u = sc * DPR * 7;
    // motor
    ctx.shadowColor = PURPLE; ctx.shadowBlur = 12;
    const eg = ctx.createLinearGradient(-2.4 * u, 0, -0.6 * u, 0);
    eg.addColorStop(0, "rgba(157,124,255,0)"); eg.addColorStop(1, "rgba(157,124,255,0.9)");
    ctx.fillStyle = eg;
    ctx.beginPath(); ctx.moveTo(-0.6 * u, -0.5 * u); ctx.lineTo(-2.4 * u, 0); ctx.lineTo(-0.6 * u, 0.5 * u); ctx.closePath(); ctx.fill();
    // casco alado
    ctx.fillStyle = "#2b2544";
    ctx.beginPath();
    ctx.moveTo(2 * u, 0); ctx.lineTo(-1.3 * u, -1.4 * u); ctx.lineTo(-0.5 * u, 0); ctx.lineTo(-1.3 * u, 1.4 * u);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = PURPLE; ctx.lineWidth = 0.16 * u; ctx.stroke();
    // ojo verde
    ctx.shadowColor = GREEN; ctx.shadowBlur = 10;
    ctx.fillStyle = GREEN; ctx.globalAlpha = 0.65 + 0.35 * Math.sin(pulse);
    ctx.beginPath(); ctx.arc(0.5 * u, 0, 0.34 * u, 0, 7); ctx.fill();
    ctx.restore();
  }

  function drawRocket(x, y, sc, ang) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    const k = sc * DPR * 7;
    ctx.shadowColor = ACCENT; ctx.shadowBlur = 9;
    const fl = (0.9 + Math.random() * 0.7) * k;
    const fg = ctx.createLinearGradient(-0.85 * k - fl, 0, -0.85 * k, 0);
    fg.addColorStop(0, "rgba(255,91,46,0)"); fg.addColorStop(1, "rgba(255,170,60,0.9)");
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.moveTo(-0.85 * k, -0.32 * k); ctx.lineTo(-0.85 * k - fl, 0); ctx.lineTo(-0.85 * k, 0.32 * k); ctx.closePath(); ctx.fill();
    ctx.fillStyle = BONE;
    ctx.beginPath();
    ctx.moveTo(1.3 * k, 0); ctx.lineTo(0, -0.42 * k); ctx.lineTo(-0.85 * k, -0.42 * k);
    ctx.lineTo(-0.85 * k, 0.42 * k); ctx.lineTo(0, 0.42 * k); ctx.closePath(); ctx.fill();
    ctx.fillStyle = ACCENT;
    ctx.beginPath(); ctx.moveTo(-0.85 * k, -0.42 * k); ctx.lineTo(-1.3 * k, -0.8 * k); ctx.lineTo(-0.55 * k, -0.42 * k); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-0.85 * k, 0.42 * k); ctx.lineTo(-1.3 * k, 0.8 * k); ctx.lineTo(-0.55 * k, 0.42 * k); ctx.fill();
    ctx.beginPath(); ctx.arc(0.2 * k, 0, 0.2 * k, 0, 7); ctx.fill();
    ctx.restore();
  }

  function signal(sx, sy, hx, hy, a) {
    if (a <= 0) return;
    ctx.save();
    // haz hacia el planeta
    const grad = ctx.createLinearGradient(sx, sy, hx, hy);
    grad.addColorStop(0, "rgba(91,227,154,0)");
    grad.addColorStop(1, "rgba(91,227,154," + (0.35 * a).toFixed(3) + ")");
    ctx.strokeStyle = grad; ctx.lineWidth = 1.4 * DPR; ctx.setLineDash([6 * DPR, 7 * DPR]);
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.setLineDash([]);
    // ondas que emanan de la nave
    ctx.strokeStyle = GREEN;
    for (let i = 0; i < 3; i++) {
      const fr = ((t * 0.5 + i / 3) % 1);
      ctx.globalAlpha = (1 - fr) * 0.5 * a;
      ctx.lineWidth = 1.4 * DPR;
      ctx.beginPath(); ctx.arc(sx, sy, fr * 130 * DPR, 0, 7); ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- escena ---------- */
  function scene(p) {
    const R = Math.min(W, H);
    const HR = 0.13 * R, HPx = 0.13 * W, HPy = 0.84 * H;

    // 1) planeta de origen (en calma) — recede al entrar al viaje
    const recede = ease(seg(p, 0.5, 0.72));
    const hSc = 1 - recede;
    const hx = HPx - recede * 0.12 * W, hy = HPy + recede * 0.14 * H;
    if (hSc > 0.03) {
      planet(hx, hy, HR * hSc, t * 0.06, { glow: "rgba(242,163,60,", light: "#F6C879", dark: "#4a2f10", band: "rgba(255,222,170,0.16)" });
    }

    // 3) nave que se acerca / huye
    const A0x = 0.95 * W, A0y = 0.08 * H, A1x = 0.44 * W, A1y = 0.56 * H;
    let sx, sy, ssc, tgx, tgy;
    if (p < 0.34) {
      const u = ease(seg(p, 0.05, 0.30));
      sx = lerp(A0x, A1x, u); sy = lerp(A0y, A1y, u); ssc = lerp(1.1, 0.95, u);
      tgx = A1x; tgy = A1y;
    } else {
      const u = ease(seg(p, 0.34, 0.9));
      sx = lerp(A1x, VPx, u); sy = lerp(A1y, VPy, u); ssc = lerp(0.95, 0.12, u);
      tgx = VPx; tgy = VPy;
    }

    // 4) señal (la nave manda, el planeta recibe)
    const sigA = seg(p, 0.20, 0.24) * (1 - seg(p, 0.34, 0.38));
    signal(sx, sy, hx, hy, sigA);
    // pulso del planeta al recibir
    if (sigA > 0.15 && hSc > 0.03) {
      ctx.save(); ctx.globalAlpha = 0.4 * sigA * (0.6 + 0.4 * Math.sin(t * 4));
      ctx.strokeStyle = GREEN; ctx.lineWidth = 2 * DPR;
      ctx.beginPath(); ctx.arc(hx, hy, HR * hSc * 1.25, 0, 7); ctx.stroke(); ctx.restore();
    }

    // 5) flota del planeta persiguiendo (sale tras recibir la señal)
    for (let i = 0; i < 3; i++) {
      const u = ease(seg(p, 0.40 + i * 0.035, 0.92));
      if (u <= 0) continue;
      const fx = lerp(hx, VPx, u), fy = lerp(hy - (i - 1) * 0.03 * H, VPy, u);
      const fsc = lerp(1.0, 0.12, u);
      drawRocket(fx, fy, fsc, Math.atan2(VPy - fy, VPx - fx));
    }

    // nave (por encima), apuntando a su objetivo
    if (p > 0.02 && p < 0.995) drawScout(sx, sy, ssc, Math.atan2(tgy - sy, tgx - sx), t * 5);

    // 7) planeta de ellos — crece al llegar
    const arr = ease(seg(p, 0.8, 1.0));
    if (arr > 0) {
      planet(VPx, VPy, 0.24 * R * arr, -t * 0.05, { glow: "rgba(157,124,255,", light: "#B9A6FF", dark: "#20323a", band: "rgba(63,214,140,0.20)" });
    }
  }

  /* ---------- loop ---------- */
  function render() {
    frames++; t += 0.0026;
    const target = pOverride != null ? pOverride : scrollP();
    P += (target - P) * (pOverride != null ? 1 : 0.07);
    const p = P;
    VPx = 0.6 * W; VPy = 0.42 * H;
    curWarp = ease(seg(p, 0.5, 0.85));

    ctx.fillStyle = "rgba(10,10,11,0.05)";
    ctx.fillRect(0, 0, W, H);

    const cx = mx * W, cy = my * H;
    for (const pt of particles) {
      let ang = flow(pt.x, pt.y, t);
      const dx = cx - pt.x, dy = cy - pt.y, d = Math.hypot(dx, dy) + 1;
      if (d < 300 * DPR) ang += Math.atan2(dy, dx) * 0.2 * (1 - curWarp);
      let vx = Math.cos(ang) * pt.sp, vy = Math.sin(ang) * pt.sp;
      if (curWarp > 0) {
        const rx = pt.x - VPx, ry = pt.y - VPy, rl = Math.hypot(rx, ry) + 1;
        const ws = (2.5 + (rl / W) * 11) * curWarp;
        vx = vx * (1 - curWarp) + (rx / rl) * ws;
        vy = vy * (1 - curWarp) + (ry / rl) * ws;
      }
      const nx = pt.x + vx * DPR, ny = pt.y + vy * DPR;
      ctx.strokeStyle = pt.c; ctx.globalAlpha = 0.22 + 0.5 * curWarp; ctx.lineWidth = pt.w;
      ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(nx, ny); ctx.stroke();
      pt.x = nx; pt.y = ny; pt.life--;
      if (pt.life < 0 || pt.x < -5 || pt.x > W + 5 || pt.y < -5 || pt.y > H + 5) seed(pt);
    }
    ctx.globalAlpha = 1;

    scene(p);
  }
  function frame() { render(); raf = requestAnimationFrame(frame); }
  window.__render = render;
  window.__setP = (v) => { pOverride = v; };

  function start() { if (!raf && !reduce) frame(); }
  function stop() { cancelAnimationFrame(raf); raf = null; }
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());

  if (reduce) {
    for (let k = 0; k < 60; k++) {
      for (const pt of particles) {
        const ang = flow(pt.x, pt.y, t);
        const nx = pt.x + Math.cos(ang) * 2.2 * DPR, ny = pt.y + Math.sin(ang) * 2.2 * DPR;
        ctx.strokeStyle = pt.c; ctx.globalAlpha = 0.16; ctx.lineWidth = pt.w;
        ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(nx, ny); ctx.stroke();
        pt.x = nx; pt.y = ny;
      }
      t += 0.02;
    }
    ctx.globalAlpha = 1;
    scene(0.03);
  } else {
    start();
  }
})();
