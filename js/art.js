/* ===== OBRA — flow field + batalla de fondo: cohetes/naves vs ovnis,
   se persiguen y disparan láseres, explotan al ser derribados ===== */
(function () {
  const canvas = document.getElementById("art");
  const ctx = canvas.getContext("2d", { alpha: false });
  const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
  let W, H, DPR, particles = [], t = 0, raf, mx = 0.5, my = 0.5, frames = 0;

  const lowEnd = (navigator.hardwareConcurrency || 4) <= 4 || innerWidth < 760;
  const COUNT = lowEnd ? 650 : 1600;

  const ships = [];   // naves de ambos bandos
  const shots = [];   // láseres
  const sparks = [];  // chispas / debris de explosiones

  const ACCENT = "#FF5B2E", BONE = "#F4F1EA", PURPLE = "#9D7CFF", GREEN = "#3FD68C", AMBER = "#F2A33C";
  const PALETTE = [ACCENT, ACCENT, BONE, PURPLE, GREEN, AMBER];

  // dos bandos: 0 = humanos (cohete / caza), láser naranja · 1 = aliens (ovni), láser verde
  const LASER = ["#FF7A3C", "#5BE39A"];

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

  function flow(x, y, time) {
    const s = 0.0011;
    const a = Math.sin(x * s + time) * Math.cos(y * s * 1.3 - time * 0.8);
    const b = Math.cos(x * s * 0.7 - time * 0.6) * Math.sin(y * s + time * 0.4);
    const c = Math.sin((x + y) * s * 0.5 + time * 1.2) * 0.6;
    return (a + b + c) * Math.PI;
  }

  function seed(p) {
    p.x = Math.random() * W;
    p.y = Math.random() * H;
    p.life = 60 + Math.random() * 220;
    p.c = PALETTE[(Math.random() * PALETTE.length) | 0];
    p.w = (Math.random() < 0.18 ? 2.2 : 0.7) * DPR;
    p.sp = 2.6 + Math.random() * 1.8;
  }
  for (let i = 0; i < COUNT; i++) { const p = {}; seed(p); particles.push(p); }

  /* ---------- explosiones ---------- */
  function burst(x, y, n, tint) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (0.8 + Math.random() * 4.2) * DPR;
      sparks.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 20 + Math.random() * 38, max: 58,
        c: Math.random() < 0.5 ? BONE : (Math.random() < 0.6 ? tint : PALETTE[(Math.random() * PALETTE.length) | 0]),
        w: (Math.random() < 0.3 ? 2.0 : 1.0) * DPR
      });
    }
  }
  function drawSparks() {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.vx *= 0.95; s.vy *= 0.95;
      const px = s.x, py = s.y;
      s.x += s.vx; s.y += s.vy; s.life--;
      ctx.globalAlpha = Math.max(0, s.life / s.max) * 0.9;
      ctx.strokeStyle = s.c; ctx.lineWidth = s.w;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(s.x, s.y); ctx.stroke();
      if (s.life <= 0) sparks.splice(i, 1);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- naves ---------- */
  function spawnShip(faction, forceType) {
    if (ships.length > 9) return;
    const dir = faction === 0 ? 1 : -1;                 // humanos entran por la izq, aliens por la der
    const type = forceType || (faction === 0 ? (Math.random() < 0.55 ? "rocket" : "ship") : "ufo");
    const y = (0.14 + Math.random() * 0.66) * H;
    const sc = (type === "ufo" ? 2.0 : 1.8) * (0.95 + Math.random() * 0.45) * DPR;
    ships.push({
      type, faction, dir,
      x: dir > 0 ? -90 * DPR : W + 90 * DPR,
      y, base: y,
      vx: (1.0 + Math.random() * 1.2) * DPR * dir,
      vy: 0, ph: Math.random() * Math.PI * 2,
      sc, spin: 0, hp: type === "ufo" ? 3 : 2,
      cd: 30 + (Math.random() * 60 | 0), hit: 0
    });
  }

  function nearestEnemy(s) {
    let best = null, bd = 1e9;
    for (const o of ships) {
      if (o.faction === s.faction) continue;
      const d = (o.x - s.x) ** 2 + (o.y - s.y) ** 2;
      if (d < bd) { bd = d; best = o; }
    }
    return best ? { o: best, d: Math.sqrt(bd) } : null;
  }

  function fire(s, tx, ty) {
    const a = Math.atan2(ty - s.y, tx - s.x);
    const sp = 7.5 * DPR;
    const muzzle = 10 * s.sc;
    shots.push({
      x: s.x + Math.cos(a) * muzzle, y: s.y + Math.sin(a) * muzzle,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      faction: s.faction, life: 55, c: LASER[s.faction]
    });
  }

  function updateShips() {
    for (let i = ships.length - 1; i >= 0; i--) {
      const s = ships[i];
      s.ph += 0.05; s.spin += 0.02; if (s.hit > 0) s.hit--;

      // persigue verticalmente a su enemigo más cercano (da sensación de combate)
      const near = nearestEnemy(s);
      let vyTarget = Math.sin(s.ph) * 0.6 * DPR;
      if (near && near.d < 620 * DPR) {
        vyTarget += Math.sign(near.o.y - s.y) * 0.5 * DPR;
        // frena un poco al entrar en zona de combate para que se mezclen
        s.vx += (((s.dir > 0 ? 0.55 : -0.55) * DPR) - s.vx) * 0.02;
      }
      s.vy += (vyTarget - s.vy) * 0.06;
      s.x += s.vx; s.y = Math.max(40 * DPR, Math.min(H - 40 * DPR, s.y + s.vy));
      s.base = s.y;

      // dispara
      s.cd--;
      if (s.cd <= 0 && near && near.d < 560 * DPR) {
        fire(s, near.o.x, near.o.y);
        s.cd = 42 + (Math.random() * 48 | 0);
      }

      if (s.x < -140 * DPR || s.x > W + 140 * DPR) ships.splice(i, 1);
    }
  }

  function updateShots() {
    for (let i = shots.length - 1; i >= 0; i--) {
      const b = shots[i];
      b.x += b.vx; b.y += b.vy; b.life--;
      let dead = b.life <= 0;
      if (!dead) {
        for (const s of ships) {
          if (s.faction === b.faction) continue;
          const rr = (14 * s.sc) ** 2;
          if ((s.x - b.x) ** 2 + (s.y - b.y) ** 2 < rr) {
            s.hp--; s.hit = 6;
            burst(b.x, b.y, 6, b.c);
            if (s.hp <= 0) {
              burst(s.x, s.y, 30 + (Math.random() * 20 | 0), s.faction === 0 ? ACCENT : GREEN);
              const idx = ships.indexOf(s); if (idx >= 0) ships.splice(idx, 1);
            }
            dead = true; break;
          }
        }
      }
      if (dead) shots.splice(i, 1);
    }
  }

  function drawShots() {
    ctx.save();
    ctx.lineCap = "round";
    for (const b of shots) {
      ctx.shadowColor = b.c; ctx.shadowBlur = 10;
      ctx.globalAlpha = 0.98;
      ctx.strokeStyle = b.c; ctx.lineWidth = 2.6 * DPR;
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 2.2, b.y - b.vy * 2.2);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawShip(s) {
    ctx.save();
    ctx.translate(s.x, s.y);
    const k = s.sc;
    ctx.shadowColor = s.faction === 0 ? ACCENT : PURPLE;
    ctx.shadowBlur = s.hit > 0 ? 22 : 9;
    if (s.hit > 0) { ctx.globalAlpha = 0.9; }  // parpadeo al recibir daño

    if (s.type === "rocket") {
      const d = s.vx >= 0 ? 1 : -1; ctx.scale(d, 1);
      const fl = (7 + Math.random() * 6) * k;
      const fg = ctx.createLinearGradient(-6 * k - fl, 0, -6 * k, 0);
      fg.addColorStop(0, "rgba(255,91,46,0)"); fg.addColorStop(1, "rgba(255,170,60,0.9)");
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.moveTo(-6 * k, -2.2 * k); ctx.lineTo(-6 * k - fl, 0); ctx.lineTo(-6 * k, 2.2 * k); ctx.closePath(); ctx.fill();
      ctx.fillStyle = s.hit > 0 ? ACCENT : BONE;
      ctx.beginPath();
      ctx.moveTo(9 * k, 0); ctx.lineTo(0, -3 * k); ctx.lineTo(-6 * k, -3 * k); ctx.lineTo(-6 * k, 3 * k); ctx.lineTo(0, 3 * k); ctx.closePath(); ctx.fill();
      ctx.fillStyle = ACCENT;
      ctx.beginPath(); ctx.moveTo(-6 * k, -3 * k); ctx.lineTo(-9 * k, -5.5 * k); ctx.lineTo(-4 * k, -3 * k); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-6 * k, 3 * k); ctx.lineTo(-9 * k, 5.5 * k); ctx.lineTo(-4 * k, 3 * k); ctx.fill();
      ctx.beginPath(); ctx.arc(1.5 * k, 0, 1.5 * k, 0, Math.PI * 2); ctx.fill();

    } else if (s.type === "ship") {   // caza humano: flecha con motor
      const d = s.vx >= 0 ? 1 : -1; ctx.scale(d, 1);
      const eg = ctx.createLinearGradient(-5 * k - 8 * k, 0, -5 * k, 0);
      eg.addColorStop(0, "rgba(255,91,46,0)"); eg.addColorStop(1, "rgba(255,120,70,0.85)");
      ctx.fillStyle = eg;
      ctx.beginPath(); ctx.moveTo(-5 * k, -1.6 * k); ctx.lineTo(-5 * k - 8 * k, 0); ctx.lineTo(-5 * k, 1.6 * k); ctx.closePath(); ctx.fill();
      ctx.fillStyle = s.hit > 0 ? ACCENT : BONE;
      ctx.beginPath();
      ctx.moveTo(11 * k, 0); ctx.lineTo(-5 * k, -5 * k); ctx.lineTo(-2 * k, 0); ctx.lineTo(-5 * k, 5 * k); ctx.closePath(); ctx.fill();
      ctx.fillStyle = ACCENT; ctx.beginPath(); ctx.arc(3 * k, 0, 1.3 * k, 0, Math.PI * 2); ctx.fill();

    } else { // ufo
      ctx.fillStyle = s.hit > 0 ? "#fff" : "rgba(157,124,255,0.6)";
      ctx.beginPath(); ctx.ellipse(0, -3 * k, 6 * k, 5 * k, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = s.hit > 0 ? ACCENT : BONE;
      ctx.beginPath(); ctx.ellipse(0, 0, 15 * k, 5 * k, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(10,10,11,0.35)";
      ctx.beginPath(); ctx.ellipse(0, 1.4 * k, 15 * k, 3 * k, 0, 0, Math.PI * 2); ctx.fill();
      const cols = [ACCENT, GREEN, AMBER, PURPLE];
      for (let i = 0; i < 4; i++) {
        const bx = (-9 + i * 6) * k;
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(s.ph * 3 + i);
        ctx.fillStyle = cols[i];
        ctx.beginPath(); ctx.arc(bx, 2.6 * k, 1.3 * k, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  // población: mantiene la batalla viva
  function keepBattle() {
    const a = ships.filter(s => s.faction === 0).length;
    const b = ships.filter(s => s.faction === 1).length;
    if (frames % 45 === 0) {
      if (a < 4) spawnShip(0);
      if (b < 4) spawnShip(1);
    }
  }
  // arranca con algo de acción
  spawnShip(0, "rocket"); spawnShip(1, "ufo"); spawnShip(0, "ship"); spawnShip(1, "ufo");
  window.__art = { ships, shots, sparks };

  /* ---------- loop ---------- */
  function render() {
    frames++;
    t += 0.0026;
    ctx.fillStyle = "rgba(10,10,11,0.036)";
    ctx.fillRect(0, 0, W, H);

    const cx = mx * W, cy = my * H;
    for (const p of particles) {
      let ang = flow(p.x, p.y, t);
      const dx = cx - p.x, dy = cy - p.y, d = Math.hypot(dx, dy) + 1;
      if (d < 360 * DPR) ang += Math.atan2(dy, dx) * 0.28;
      const nx = p.x + Math.cos(ang) * p.sp * DPR;
      const ny = p.y + Math.sin(ang) * p.sp * DPR;
      ctx.strokeStyle = p.c; ctx.globalAlpha = 0.24; ctx.lineWidth = p.w;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
      p.x = nx; p.y = ny; p.life--;
      if (p.life < 0 || p.x < 0 || p.x > W || p.y < 0 || p.y > H) seed(p);
    }
    ctx.globalAlpha = 1;

    keepBattle();
    updateShips();
    updateShots();
    for (const s of ships) drawShip(s);
    drawShots();
    drawSparks();
  }
  function frame() { render(); raf = requestAnimationFrame(frame); }
  window.__render = render;

  function start() { if (!raf && !reduce) frame(); }
  function stop() { cancelAnimationFrame(raf); raf = null; }
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());

  if (reduce) {
    for (let k = 0; k < 120; k++) {
      for (const p of particles) {
        const ang = flow(p.x, p.y, t);
        const nx = p.x + Math.cos(ang) * 2.4 * DPR, ny = p.y + Math.sin(ang) * 2.4 * DPR;
        ctx.strokeStyle = p.c; ctx.globalAlpha = 0.18; ctx.lineWidth = p.w;
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
