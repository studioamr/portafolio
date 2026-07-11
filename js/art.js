/* ===== OBRA — el viaje del cohete (protagonista) =====
   Empieza en la Tierra (día soleado, abajo). Despega, sale del planeta
   y entra al espacio. Cada sección es un destino en su trayectoria:
   Apps=Luna · E-commerce=Marte · [Sol: minar energía + asteroides] ·
   Branding=Júpiter · Games=la galaxia más cercana.
   Seguimos al cohete en todo momento. No se muestra lo que viene
   hasta que despega y llega. Scrubbeado al scroll. */
(function () {
  const canvas = document.getElementById("art");
  const ctx = canvas.getContext("2d", { alpha: false });
  const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
  let W, H, DPR, R, particles = [], bits = [], asteroids = [], t = 0, raf;
  let secEls = [], J = 0, rkx = 0.5, rky = 0.5;

  // el cursor vuelve a ser normal (el cohete ahora es el personaje del viaje)
  const cs = document.createElement("style");
  cs.textContent = "body{cursor:auto}.cursor{display:none!important}";
  document.head.appendChild(cs);

  const BONE = "#F4F1EA", ACCENT = "#FF5B2E", AMBER = "#F2A33C";
  const lowEnd = (navigator.hardwareConcurrency || 4) <= 4 || innerWidth < 760;
  const COUNT = lowEnd ? 650 : 1500;

  // destino por sección (hero, work, ecommerce, branding, games, about, contact)
  const STAGES = [
    { type: "earth",   tint: "rgba(90,150,255," },
    { type: "moon",    tint: "rgba(200,205,220," },
    { type: "mars",    tint: "rgba(230,110,70," },
    { type: "jupiter", tint: "rgba(220,170,110," },
    { type: "galaxy",  tint: "rgba(157,124,255," },
    { type: "galaxy",  tint: "rgba(124,176,255," },
    { type: "galaxy",  tint: "rgba(180,150,255," },
  ];

  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
  const ss = (a, b, x) => { const k = seg(x, a, b); return k * k * (3 - 2 * k); };
  const lerp = (a, b, k) => a + (b - a) * k;

  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = canvas.width = innerWidth * DPR;
    H = canvas.height = innerHeight * DPR;
    R = Math.min(W, H);
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
    ctx.fillStyle = "#09090C"; ctx.fillRect(0, 0, W, H);
    collectSections();
  }
  function collectSections() {
    secEls = [...document.querySelectorAll("header.hero, main section")]
      .filter((s) => !s.classList.contains("marquee"));
  }

  function flow(x, y, time) {
    const s = 0.0011;
    const a = Math.sin(x * s + time) * Math.cos(y * s * 1.3 - time * 0.8);
    const b = Math.cos(x * s * 0.7 - time * 0.6) * Math.sin(y * s + time * 0.4);
    return (a + b) * Math.PI;
  }
  function seed(pt, atVP) {
    if (atVP) { const a = Math.random() * 6.283, r = Math.random() * 26 * DPR; pt.x = W / 2 + Math.cos(a) * r; pt.y = H * 0.45 + Math.sin(a) * r; }
    else { pt.x = Math.random() * W; pt.y = Math.random() * H; }
    pt.life = 50 + Math.random() * 200;
    pt.c = Math.random() < 0.7 ? BONE : (Math.random() < 0.5 ? AMBER : "#9D7CFF");
    pt.w = (Math.random() < 0.16 ? 2.0 : 0.7) * DPR;
    pt.sp = 2.8 + Math.random() * 1.8;
  }
  for (let i = 0; i < COUNT; i++) { const p = {}; seed(p, false); particles.push(p); }

  // progreso continuo por secciones (0 .. N-1):
  // estable en cada destino mientras lees, y el SALTO ocurre al cruzar de sección
  function journey() {
    if (secEls.length < 2) return 0;
    const cur = (scrollY || 0) + innerHeight / 2;
    const n = secEls.length;
    const tops = secEls.map((s) => s.getBoundingClientRect().top + scrollY);
    const lastBot = (() => { const r = secEls[n - 1].getBoundingClientRect(); return r.top + scrollY + r.height; })();
    if (cur <= tops[0]) return 0;
    for (let i = 0; i < n; i++) {
      const hi = i < n - 1 ? tops[i + 1] : lastBot;
      if (cur < hi) { const prog = (cur - tops[i]) / Math.max(1, hi - tops[i]); return i + ss(0.68, 1.0, prog); }
    }
    return n - 1;
  }

  /* ---------- nebulosa de color ---------- */
  function nebula(tint, alpha) {
    if (alpha <= 0.002) return;
    const nx = 0.5 * W, ny = 0.4 * H, rad = 0.75 * Math.max(W, H);
    const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, rad);
    g.addColorStop(0, tint + alpha.toFixed(3) + ")");
    g.addColorStop(0.6, tint + (alpha * 0.3).toFixed(3) + ")");
    g.addColorStop(1, tint + "0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  /* ---------- esferas ---------- */
  function sphere(cx, cy, r, light, dark, glow, alpha, deco) {
    ctx.save(); ctx.globalAlpha = alpha;
    const gg = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r * 2);
    gg.addColorStop(0, glow + "0.4)"); gg.addColorStop(1, glow + "0)");
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(cx, cy, r * 2, 0, 7); ctx.fill();
    const bg = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.1, cx, cy, r);
    bg.addColorStop(0, light); bg.addColorStop(1, dark);
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.clip();
    if (deco) deco(cx, cy, r);
    ctx.restore();
    const tg = ctx.createRadialGradient(cx + r * 0.5, cy + r * 0.5, r * 0.2, cx, cy, r * 1.05);
    tg.addColorStop(0, "rgba(9,9,12,0)"); tg.addColorStop(1, "rgba(9,9,12,0.72)");
    ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    ctx.restore();
  }
  const decoCraters = (cx, cy, r) => {
    ctx.fillStyle = "rgba(120,120,132,0.5)";
    for (const c of [[-.3, -.2, .18], [.25, .1, .13], [-.1, .35, .1], [.35, -.35, .09]])
      { ctx.beginPath(); ctx.arc(cx + c[0] * r, cy + c[1] * r, c[2] * r, 0, 7); ctx.fill(); }
  };
  const decoBands = (col) => (cx, cy, r) => {
    ctx.strokeStyle = col; ctx.lineWidth = r * 0.11;
    for (let i = 0; i < 4; i++) {
      const yy = cy + Math.sin(t * 0.3 + i * 1.4) * r * 0.2 + (i - 1.5) * r * 0.4;
      ctx.beginPath(); ctx.moveTo(cx - r, yy);
      ctx.bezierCurveTo(cx - r * 0.3, yy - r * 0.12, cx + r * 0.3, yy + r * 0.12, cx + r, yy); ctx.stroke();
    }
  };

  function bodyPos(type) {
    if (type === "moon")    return { x: 0.77 * W, y: 0.30 * H, r: 0.12 * R };
    if (type === "mars")    return { x: 0.23 * W, y: 0.32 * H, r: 0.11 * R };
    if (type === "jupiter") return { x: 0.74 * W, y: 0.38 * H, r: 0.17 * R };
    return { x: 0.5 * W, y: 0.42 * H, r: 0.22 * R };   // galaxy
  }

  function drawBody(idx, alpha) {
    if (alpha <= 0.01) return;
    const type = STAGES[clamp(idx, 0, STAGES.length - 1)].type;
    if (type === "earth") { drawEarth(alpha); return; }
    const p = bodyPos(type);
    // emite datos (energía -> datos) desde el cuerpo hacia el cohete
    if (alpha > 0.6 && Math.random() < 0.5) emit(p.x, p.y, p.r, type === "moon");
    if (type === "moon") sphere(p.x, p.y, p.r, "#DADCE4", "#33343d", "rgba(200,205,220,", alpha, decoCraters);
    else if (type === "mars") sphere(p.x, p.y, p.r, "#E0703C", "#5a1f10", "rgba(230,110,70,", alpha, decoBands("rgba(120,50,30,0.35)"));
    else if (type === "jupiter") sphere(p.x, p.y, p.r, "#E7C79A", "#7a4a24", "rgba(220,170,110,", alpha, (cx, cy, r) => {
      decoBands("rgba(150,90,50,0.4)")(cx, cy, r);
      ctx.fillStyle = "rgba(200,80,50,0.8)"; ctx.beginPath(); ctx.ellipse(cx + r * 0.3, cy + r * 0.2, r * 0.22, r * 0.15, 0, 0, 7); ctx.fill();
    });
    else drawGalaxy(p.x, p.y, p.r, alpha);
  }

  function drawEarth(alpha) {
    const p = Math.min(1, J);
    const r = lerp(0.62 * H, 0.12 * R, ss(0, 0.85, p));
    const cy = lerp(1.16 * H, 1.5 * H, ss(0, 1, p));
    sphere(0.5 * W, cy, r, "#6fb0ff", "#0d2f5c", "rgba(90,150,255,", alpha, (cx, cyy, rr) => {
      ctx.fillStyle = "rgba(70,180,120,0.7)";
      for (const c of [[-.35, -.1, .3, .16], [.2, .25, .26, .14], [.1, -.35, .2, .1]]) {
        ctx.beginPath(); ctx.ellipse(cx + c[0] * rr, cyy + c[1] * rr, c[2] * rr, c[3] * rr, 0.4, 0, 7); ctx.fill();
      }
    });
  }

  function drawGalaxy(cx, cy, r, alpha) {
    ctx.save(); ctx.globalAlpha = alpha;
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.9);
    core.addColorStop(0, "rgba(244,241,234,0.9)"); core.addColorStop(0.3, "rgba(200,180,255,0.5)"); core.addColorStop(1, "rgba(157,124,255,0)");
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(cx, cy, r * 0.9, 0, 7); ctx.fill();
    const spin = t * 0.05;
    for (let arm = 0; arm < 2; arm++) {
      for (let i = 0; i < 340; i++) {
        const f = i / 340, ang = f * 6.5 + arm * Math.PI + spin, rad = f * r;
        const jit = (Math.sin(i * 12.9) * 0.5) * r * 0.08;
        const x = cx + Math.cos(ang) * rad + Math.cos(ang * 3) * jit;
        const y = cy + Math.sin(ang) * rad * 0.62 + Math.sin(ang * 3) * jit;
        ctx.globalAlpha = alpha * (1 - f) * 0.9;
        ctx.fillStyle = i % 5 === 0 ? "#C9B4FF" : BONE;
        ctx.fillRect(x, y, 1.6 * DPR, 1.6 * DPR);
      }
    }
    ctx.restore();
  }

  /* ---------- sol: pausa para minar energía + asteroides ---------- */
  function drawSun(cx, cy, r, alpha) {
    ctx.save(); ctx.globalAlpha = alpha;
    const co = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.4);
    co.addColorStop(0, "rgba(255,240,190,1)"); co.addColorStop(0.28, "rgba(255,170,60,0.9)");
    co.addColorStop(0.6, "rgba(255,91,46,0.35)"); co.addColorStop(1, "rgba(255,91,46,0)");
    ctx.fillStyle = co; ctx.beginPath(); ctx.arc(cx, cy, r * 2.4, 0, 7); ctx.fill();
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    bg.addColorStop(0, "#FFF6D8"); bg.addColorStop(0.7, "#FFB03C"); bg.addColorStop(1, "#FF7A2E");
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    ctx.restore();
  }

  function emit(bx, by, br, energy) {
    const a = Math.random() * 6.283, rr = br * (0.9 + Math.random() * 0.2);
    const sx = bx + Math.cos(a) * rr, sy = by + Math.sin(a) * rr;
    const dx = rkx * W - sx, dy = rky * H - sy, dl = Math.hypot(dx, dy) + 1;
    bits.push({
      x: sx, y: sy, vx: (dx / dl) * (0.8 + Math.random()) * DPR, vy: (dy / dl) * (0.8 + Math.random()) * DPR,
      life: 40 + Math.random() * 40, max: 80,
      c: energy ? (Math.random() < 0.5 ? "#DADCE4" : AMBER) : BONE,
      sz: (Math.random() < 0.5 ? 1.6 : 2.6) * DPR, energy
    });
  }
  function drawBits() {
    for (let i = bits.length - 1; i >= 0; i--) {
      const s = bits[i]; s.x += s.vx; s.y += s.vy; s.vx *= 0.99; s.vy *= 0.99; s.life--;
      const k = Math.max(0, s.life / s.max); ctx.globalAlpha = k * 0.9; ctx.fillStyle = s.c;
      if (s.energy && k > 0.6) { ctx.beginPath(); ctx.arc(s.x, s.y, s.sz, 0, 7); ctx.fill(); }
      else ctx.fillRect(s.x - s.sz / 2, s.y - s.sz / 2, s.sz, s.sz);
      if (s.life <= 0) bits.splice(i, 1);
    }
    ctx.globalAlpha = 1;
  }

  function drawAsteroids(alpha, drift) {
    if (asteroids.length === 0) for (let i = 0; i < 26; i++) asteroids.push({ x: Math.random(), y: Math.random(), s: 3 + Math.random() * 10, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.04 });
    ctx.save(); ctx.globalAlpha = alpha;
    for (const a of asteroids) {
      const x = ((a.x + drift * 0.3) % 1) * W, y = a.y * H;
      a.r += a.vr;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a.r);
      ctx.fillStyle = "#4a4640"; ctx.strokeStyle = "#6a655c"; ctx.lineWidth = DPR;
      ctx.beginPath();
      const n = 7, rr = a.s * DPR;
      for (let i = 0; i < n; i++) { const ang = (i / n) * 6.283, rad = rr * (0.7 + (Math.sin(i * 3) * 0.3)); ctx[i ? "lineTo" : "moveTo"](Math.cos(ang) * rad, Math.sin(ang) * rad); }
      ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }

  /* ---------- el cohete (protagonista) ---------- */
  function drawRocket(cx, cy, sc, ang, thrust) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
    const k = sc;
    ctx.shadowColor = ACCENT; ctx.shadowBlur = 12;
    const fl = (0.7 + thrust * 1.6 + Math.random() * 0.5) * k;
    const fg = ctx.createLinearGradient(0, k * 3.2, 0, k * 3.2 + fl * k * 3);
    fg.addColorStop(0, "rgba(255,194,74,0.95)"); fg.addColorStop(0.5, "rgba(255,91,46,0.8)"); fg.addColorStop(1, "rgba(255,91,46,0)");
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.moveTo(-k * 1.1, k * 3.2); ctx.quadraticCurveTo(0, k * (3.2 + fl * 3.6), k * 1.1, k * 3.2); ctx.closePath(); ctx.fill();
    // aletas
    ctx.fillStyle = ACCENT;
    ctx.beginPath(); ctx.moveTo(-k * 1.1, k * 2.4); ctx.lineTo(-k * 2.3, k * 3.6); ctx.lineTo(-k * 1.1, k * 3.2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(k * 1.1, k * 2.4); ctx.lineTo(k * 2.3, k * 3.6); ctx.lineTo(k * 1.1, k * 3.2); ctx.fill();
    // cuerpo
    ctx.fillStyle = BONE;
    ctx.beginPath();
    ctx.moveTo(0, -k * 4); ctx.bezierCurveTo(k * 2, -k * 2.4, k * 2, k * 1.6, k * 1.1, k * 3.2);
    ctx.lineTo(-k * 1.1, k * 3.2); ctx.bezierCurveTo(-k * 2, k * 1.6, -k * 2, -k * 2.4, 0, -k * 4); ctx.closePath(); ctx.fill();
    // ventana
    ctx.shadowBlur = 0; ctx.fillStyle = "#0A0A0B"; ctx.beginPath(); ctx.arc(0, -k * 0.6, k * 0.8, 0, 7); ctx.fill();
    ctx.strokeStyle = ACCENT; ctx.lineWidth = k * 0.28; ctx.stroke();
    ctx.restore();
  }

  /* ---------- loop ---------- */
  let jOverride = null;
  window.__setJ = (v) => { jOverride = v; };
  function render() {
    t += 0.004;
    J = jOverride != null ? jOverride : journey();
    const N = STAGES.length;
    const from = clamp(Math.floor(J), 0, N - 1), to = clamp(from + 1, 0, N - 1), frac = clamp(J - from, 0, 1);
    const isSun = from === 2 && to >= 3;          // Marte -> Júpiter: pasar por el Sol
    const stretch = ss(0.12, 0.4, frac) * (1 - ss(0.6, 0.92, frac));
    const flash = isSun ? 0 : Math.max(0, 1 - Math.abs(frac - 0.5) / 0.09);
    const sunny = 1 - ss(0, 0.45, J);             // día soleado al inicio

    ctx.fillStyle = "rgba(9,9,12," + (0.05 + 0.10 * stretch).toFixed(3) + ")";
    ctx.fillRect(0, 0, W, H);

    if (sunny > 0) {                              // resplandor cálido del sol al despegar
      const sg = ctx.createRadialGradient(0.82 * W, 0.14 * H, 0, 0.82 * W, 0.14 * H, 0.8 * Math.max(W, H));
      sg.addColorStop(0, "rgba(255,220,150," + (0.22 * sunny).toFixed(3) + ")");
      sg.addColorStop(1, "rgba(255,220,150,0)");
      ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
    }
    nebula(STAGES[from].tint, (1 - frac) * 0.13 * (1 - stretch * 0.6));
    nebula(STAGES[to].tint, frac * 0.13 * (1 - stretch * 0.6));

    // campo de estrellas / hiperespacio
    const vx0 = 0.5 * W, vy0 = 0.44 * H;
    for (const pt of particles) {
      if (stretch > 0.02) {
        const rx = pt.x - vx0, ry = pt.y - vy0, rl = Math.hypot(rx, ry) + 1, ru = rx / rl, rv = ry / rl;
        pt.x += ru * stretch * (7 + (rl / W) * 42) * DPR; pt.y += rv * stretch * (7 + (rl / W) * 42) * DPR;
        const len = stretch * (rl * 0.55 + 22 * DPR);
        ctx.strokeStyle = stretch > 0.55 ? BONE : pt.c; ctx.globalAlpha = 0.3 + 0.6 * stretch; ctx.lineWidth = pt.w;
        ctx.beginPath(); ctx.moveTo(pt.x - ru * len, pt.y - rv * len); ctx.lineTo(pt.x, pt.y); ctx.stroke();
        if (rl > Math.max(W, H) * 0.75) seed(pt, true);
      } else {
        const ang = flow(pt.x, pt.y, t);
        const nx = pt.x + Math.cos(ang) * pt.sp * DPR, ny = pt.y + Math.sin(ang) * pt.sp * DPR;
        ctx.strokeStyle = pt.c; ctx.globalAlpha = 0.2; ctx.lineWidth = pt.w;
        ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(nx, ny); ctx.stroke();
        pt.x = nx; pt.y = ny; pt.life--;
        if (pt.life < 0 || pt.x < -5 || pt.x > W + 5 || pt.y < -5 || pt.y > H + 5) seed(pt, false);
      }
    }
    ctx.globalAlpha = 1;

    // destinos: sólo el actual y (al llegar) el próximo — no se revela lo que viene antes
    const fromA = 1 - ss(0.12, 0.55, frac);
    const toA = ss(0.6, 0.95, frac);
    if (isSun) {
      drawBody(2, 1 - ss(0.02, 0.28, frac));                 // Marte se va
      const sunA = ss(0.15, 0.4, frac) * (1 - ss(0.62, 0.85, frac));
      if (sunA > 0.01) {                                     // Sol + minado
        drawSun(0.5 * W, 0.4 * H, 0.16 * R, sunA);
        if (frac > 0.28 && frac < 0.6) {                     // rayo de minado del cohete al sol
          ctx.save(); ctx.globalAlpha = sunA * (0.5 + 0.5 * Math.sin(t * 6));
          ctx.strokeStyle = AMBER; ctx.lineWidth = 2 * DPR;
          ctx.beginPath(); ctx.moveTo(rkx * W, rky * H); ctx.lineTo(0.5 * W, 0.4 * H); ctx.stroke(); ctx.restore();
          if (Math.random() < 0.8) emit(0.5 * W, 0.4 * H, 0.16 * R, true);
        }
      }
      drawAsteroids(ss(0.5, 0.72, frac) * (1 - ss(0.8, 0.95, frac)), frac);   // cinturón de asteroides
      drawBody(3, ss(0.78, 0.98, frac));                     // llega Júpiter
    } else {
      drawBody(from, fromA);
      drawBody(to, toA);
    }
    drawBits();

    // cohete protagonista — siempre centrado, lo seguimos
    const side = STAGES[Math.round(J)] ? bodyPos(STAGES[Math.round(J)].type).x / W : 0.5;
    const txr = STAGES[Math.round(J)] && STAGES[Math.round(J)].type !== "galaxy" && STAGES[Math.round(J)].type !== "earth"
      ? (side > 0.5 ? 0.40 : 0.60) : 0.5;
    rkx += (txr - rkx) * 0.05;
    const ty = J < 0.5 ? lerp(0.80, 0.52, ss(0, 0.42, J)) : 0.52;
    rky += (ty - rky) * 0.08;
    const sway = Math.sin(t * 1.4) * 0.06 + (isSun ? Math.atan2(0.4 * H - rky * H, 0.5 * W - rkx * W) + Math.PI / 2 : 0) * 0.15;
    const thrust = 0.4 + stretch * 1.6 + (J < 0.45 ? (1 - ss(0, 0.45, J)) * 1.5 : 0);
    drawRocket(rkx * W, rky * H, 5 * DPR, sway, thrust);

    if (flash > 0.01) {
      const fg = ctx.createRadialGradient(vx0, vy0, 0, vx0, vy0, Math.max(W, H) * 0.7);
      fg.addColorStop(0, "rgba(244,241,234," + (0.5 * flash).toFixed(3) + ")"); fg.addColorStop(1, "rgba(244,241,234,0)");
      ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H);
    }
  }
  function frame() { render(); raf = requestAnimationFrame(frame); }
  window.__render = render;

  function start() { if (!raf && !reduce) frame(); }
  function stop() { cancelAnimationFrame(raf); raf = null; }
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());
  addEventListener("resize", resize);
  resize();

  if (reduce) { render(); }
  else start();
})();
