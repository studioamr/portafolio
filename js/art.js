/* ===== OBRA — generative flow field ===== */
(function () {
  const canvas = document.getElementById("art");
  const ctx = canvas.getContext("2d", { alpha: false });
  const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
  let W, H, DPR, particles = [], t = 0, raf, mx = 0.5, my = 0.5;

  const lowEnd = (navigator.hardwareConcurrency || 4) <= 4 || innerWidth < 760;
  const COUNT = lowEnd ? 380 : 950;

  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = canvas.width = innerWidth * DPR;
    H = canvas.height = innerHeight * DPR;
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
    ctx.fillStyle = "#0A0A0B";
    ctx.fillRect(0, 0, W, H);
  }
  resize();
  addEventListener("resize", resize);
  addEventListener("pointermove", (e) => { mx = e.clientX / innerWidth; my = e.clientY / innerHeight; });

  // cheap layered-sine flow field -> angle
  function flow(x, y, time) {
    const s = 0.0016;
    const a = Math.sin(x * s + time) * Math.cos(y * s * 1.3 - time * 0.8);
    const b = Math.cos(x * s * 0.7 - time * 0.6) * Math.sin(y * s + time * 0.4);
    return (a + b) * Math.PI;
  }

  const PALETTE = ["#FF5B2E", "#F4F1EA", "#9D7CFF", "#3FD68C", "#F2A33C"];

  function seed(p) {
    p.x = Math.random() * W;
    p.y = Math.random() * H;
    p.life = 40 + Math.random() * 160;
    p.c = PALETTE[(Math.random() * PALETTE.length) | 0];
    p.w = (Math.random() < 0.12 ? 1.4 : 0.55) * DPR;
  }
  for (let i = 0; i < COUNT; i++) { const p = {}; seed(p); particles.push(p); }

  function frame() {
    t += 0.0016;
    // soft fade for trails
    ctx.fillStyle = "rgba(10,10,11,0.055)";
    ctx.fillRect(0, 0, W, H);

    const cx = mx * W, cy = my * H;
    for (const p of particles) {
      let ang = flow(p.x, p.y, t);
      // gentle pull toward cursor for life
      const dx = cx - p.x, dy = cy - p.y, d = Math.hypot(dx, dy) + 1;
      if (d < 260 * DPR) ang += Math.atan2(dy, dx) * 0.12;

      const nx = p.x + Math.cos(ang) * 1.5 * DPR;
      const ny = p.y + Math.sin(ang) * 1.5 * DPR;

      ctx.strokeStyle = p.c;
      ctx.globalAlpha = 0.16;
      ctx.lineWidth = p.w;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(nx, ny);
      ctx.stroke();

      p.x = nx; p.y = ny; p.life--;
      if (p.life < 0 || p.x < 0 || p.x > W || p.y < 0 || p.y > H) seed(p);
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }

  function start() { if (!raf && !reduce) frame(); }
  function stop() { cancelAnimationFrame(raf); raf = null; }
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());

  if (reduce) {
    // static single pass
    for (let k = 0; k < 90; k++) frameStatic();
    function frameStatic() {
      for (const p of particles) {
        const ang = flow(p.x, p.y, t);
        const nx = p.x + Math.cos(ang) * 2 * DPR, ny = p.y + Math.sin(ang) * 2 * DPR;
        ctx.strokeStyle = p.c; ctx.globalAlpha = 0.12; ctx.lineWidth = p.w;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
        p.x = nx; p.y = ny;
      }
      t += 0.02;
    }
    ctx.globalAlpha = 1;
  } else {
    start();
  }
})();
