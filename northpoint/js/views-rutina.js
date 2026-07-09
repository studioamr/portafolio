/* ============ NorthPoint · Rutina de Sesión — co-piloto Jarvis ============
   Fases: PRE-MARKET → SESIÓN ACTIVA → CIERRE → STUDIO
   Voz: SpeechSynthesis en español (como Jarvis / Iron Man)
   Estado: sessionStorage por día de trading (se reinicia cada jornada)
   OBS: WebSocket localhost:4455 — auto-escenas + clips al agregar trades */

window.RutinaCtrl = (() => {
  const TODAY = new Date().toISOString().slice(0, 10);
  const SK = 'np_rutina_' + TODAY;

  const RULES = [
    { id: 'r1', text: 'Solo opero la apertura de NY (8:30–10:00 CT)' },
    { id: 'r2', text: 'Stop es sagrado — no lo muevo ni un tick' },
    { id: 'r3', text: 'Riesgo máximo 1% de la cuenta por trade' },
    { id: 'r4', text: 'Si pierdo 2 seguidos, apago la plataforma' },
    { id: 'r5', text: 'No entro por FOMO ni por revancha — nunca' },
    { id: 'r6', text: 'Solo entro en A+ setups (ORB + SMC confluencia)' },
    { id: 'r7', text: 'Sin trades 30 min antes de datos de alto impacto' },
    { id: 'r8', text: 'Registro el trade en el journal el mismo día' },
  ];

  function empty() {
    return { phase: 'pre', bias: null, sesgo: '', niveles: '',
      maxTrades: 3, maxLoss: 60, target: 100,
      rulesChecked: [], orbLo: '', orbHi: '', orbSet: false,
      sessionTrades: [], obsClips: [], sessionNote: '', startedAt: null };
  }

  function load() {
    try { const s = sessionStorage.getItem(SK); if (s) { const d = JSON.parse(s); if (!d.obsClips) d.obsClips = []; return d; } } catch(e) {}
    return empty();
  }

  let S = load();
  function persist() { try { sessionStorage.setItem(SK, JSON.stringify(S)); } catch(e) {} }

  /* ---- Jarvis voice (TTS) ---- */
  let _voices = [];
  if (window.speechSynthesis) {
    const grab = () => { _voices = window.speechSynthesis.getVoices(); };
    window.speechSynthesis.onvoiceschanged = grab;
    grab();
  }
  function say(text, delay) {
    if (!window.speechSynthesis) return;
    setTimeout(() => {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'es-MX'; u.rate = 0.87; u.pitch = 0.76;
      const v = _voices.find(v => v.lang === 'es-MX')
              || _voices.find(v => v.lang.startsWith('es')) || null;
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
    }, delay || 0);
  }

  /* ---- Session timer ---- */
  let _timer = null;
  function startTimer() {
    clearInterval(_timer);
    _timer = setInterval(() => {
      const el = document.getElementById('rt-timer'); if (!el || !S.startedAt) return;
      const sec = Math.floor((Date.now() - S.startedAt) / 1000);
      const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
      el.textContent = h > 0
        ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
        : `${m}:${String(s).padStart(2,'0')}`;
    }, 1000);
  }

  /* ---- Capture textarea/input values before re-renders ---- */
  function capture() {
    [['rutina-sesgo','sesgo'],['rutina-niveles','niveles'],['rutina-note','sessionNote']].forEach(([id,k]) => {
      const el = document.getElementById(id); if (el) S[k] = el.value;
    });
    const mt = document.getElementById('rutina-max-t'); if (mt && mt.value) S.maxTrades = parseInt(mt.value) || 3;
    const ml = document.getElementById('rutina-max-l'); if (ml && ml.value) S.maxLoss   = parseInt(ml.value) || 60;
    const tg = document.getElementById('rutina-target'); if (tg && tg.value) S.target    = parseInt(tg.value) || 100;
  }

  function stats() {
    const ts = S.sessionTrades;
    const pnl = ts.reduce((s, t) => s + (t.pnl || 0), 0);
    return { n: ts.length, pnl,
      wins:   ts.filter(t => t.r === 'win').length,
      losses: ts.filter(t => t.r === 'loss').length,
      bes:    ts.filter(t => t.r === 'be').length };
  }

  function rerender() { persist(); App.render(); }

  /* ---- Elapsed time from session start (for clip timestamps) ---- */
  function sessionElapsed() {
    if (!S.startedAt) return '0:00';
    const sec = Math.floor((Date.now() - S.startedAt) / 1000);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
  }

  /* ---- OBS WebSocket Client (OBS 28+, protocol v5) ---- */
  const OBS_KEY = 'np_obs_cfg';
  let _obsWs = null, _obsOk = false, _obsPend = {};

  function _obsCfgLoad() {
    try { return JSON.parse(localStorage.getItem(OBS_KEY) || '{}'); } catch(e) { return {}; }
  }
  let _obsCfg = _obsCfgLoad();

  async function _sha256b64(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }

  function _obsSend(data) {
    if (_obsWs && _obsWs.readyState === WebSocket.OPEN) _obsWs.send(JSON.stringify(data));
  }

  function _obsReq(type, data) {
    if (!_obsOk) return Promise.resolve(null);
    const id = (Math.random() * 1e9 | 0).toString(36);
    return new Promise(res => {
      _obsPend[id] = res;
      _obsSend({ op: 6, d: { requestType: type, requestId: id, requestData: data || {} } });
      setTimeout(() => { if (_obsPend[id]) { delete _obsPend[id]; res(null); } }, 3000);
    });
  }

  async function obsConnect(host, port, pass) {
    host = host || _obsCfg.host || 'localhost';
    port = port || _obsCfg.port || 4455;
    pass = (pass !== undefined) ? pass : (_obsCfg.password || '');
    if (_obsWs) { try { _obsWs.close(); } catch(e) {} _obsWs = null; }
    try {
      _obsWs = new WebSocket(`ws://${host}:${port}`);
      _obsWs.onmessage = async e => {
        const msg = JSON.parse(e.data);
        if (msg.op === 0) {             // Hello — send Identify with auth
          let auth;
          if (msg.d.authentication && pass) {
            const secret = await _sha256b64(pass + msg.d.authentication.salt);
            auth = await _sha256b64(secret + msg.d.authentication.challenge);
          }
          _obsSend({ op: 1, d: { rpcVersion: 1, ...(auth ? { authentication: auth } : {}) } });
        }
        if (msg.op === 2) {             // Identified — connection success
          _obsOk = true;
          _obsCfg = { host, port, password: pass };
          localStorage.setItem(OBS_KEY, JSON.stringify(_obsCfg));
          UI.toast('OBS conectado ✓');
          rerender();
        }
        if (msg.op === 7) {             // RequestResponse
          const cb = _obsPend[msg.d.requestId];
          if (cb) { cb(msg.d); delete _obsPend[msg.d.requestId]; }
        }
      };
      _obsWs.onclose = () => { _obsOk = false; rerender(); };
      _obsWs.onerror = () => { _obsOk = false; };
    } catch(e) { _obsOk = false; }
  }

  function obsScene(name) { _obsReq('SetCurrentProgramScene', { sceneName: name }); }
  function obsRecord(on)  { _obsReq(on ? 'StartRecord' : 'StopRecord'); }
  function obsReplay()    { _obsReq('SaveReplayBuffer'); }

  // Auto-reconnect if config exists from a previous session
  if (_obsCfg.host) obsConnect().catch(() => {});

  /* ---- Public API ---- */
  return {
    get S()            { return S; },
    get RULES()        { return RULES; },
    get obsConnected() { return _obsOk; },
    get obsCfg()       { return _obsCfg; },
    stats, say,

    hydrate() { if (S.phase === 'live' && S.startedAt) startTimer(); },

    welcome() {
      const msg = { pre: 'Sistema en línea. Buen día. Vamos a preparar el análisis pre-market.',
                    live: 'Sesión activa. Estamos operando. Enfoque total en el plan.',
                    close: 'Sesión cerrada. Revisando resultados juntos.',
                    studio: 'Revisando el contenido de hoy. Buen trabajo.' }[S.phase]
                 || 'Co-piloto en línea.';
      say(msg);
    },

    setBias(v) {
      capture(); S.bias = v;
      say(`Sesgo confirmado: ${v}. Ajustamos el plan.`);
      rerender();
    },

    toggleRule(id) {
      capture();
      if (S.rulesChecked.includes(id)) {
        S.rulesChecked = S.rulesChecked.filter(x => x !== id);
      } else {
        S.rulesChecked.push(id);
        if (S.rulesChecked.length === RULES.length)
          say('Todos los compromisos confirmados. Listos para activar la sesión.');
      }
      rerender();
    },

    goPhase(p) {
      capture();
      // Studio is a utility tab — always accessible from any phase
      if (p !== 'studio') {
        const order = { pre: 0, live: 1, close: 2 };
        if (order[p] > order[S.phase || 'pre']) return;
      }
      S.phase = p;
      if (p === 'live') startTimer();
      rerender();
    },

    startSession() {
      capture();
      if (!S.bias) return UI.toast('Define el sesgo del día primero');
      if (S.rulesChecked.length < RULES.length) return UI.toast('Confirma todos los compromisos');
      S.phase = 'live'; S.startedAt = Date.now();
      startTimer();
      obsScene('Trading en vivo');
      obsRecord(true);
      say('Sesión activa. Apertura de Nueva York. Esperamos el rango ORB. Sin prisa, sin ruido.');
      rerender();
    },

    setORB() {
      const lo = parseFloat(document.getElementById('orb-lo')?.value || '');
      const hi = parseFloat(document.getElementById('orb-hi')?.value || '');
      if (!lo || !hi || lo >= hi) return UI.toast('Ingresa Low y High del rango de apertura');
      S.orbLo = lo; S.orbHi = hi; S.orbSet = true;
      say(`Rango ORB marcado. ${lo} a ${hi}. ${(hi - lo).toFixed(2)} puntos. Ahora esperamos la ruptura con volumen.`);
      rerender();
    },

    addTrade() {
      const pnlEl   = document.getElementById('rt-pnl');
      const setupEl = document.getElementById('rt-setup');
      const res     = document.querySelector('.pick[data-g="rt-res"] .chip.on')?.dataset.v;
      if (!res) return UI.toast('Selecciona Win, Loss o BE');

      let pnl = parseFloat(pnlEl?.value || '0') || 0;
      if (res === 'loss') pnl = -Math.abs(pnl);
      if (res === 'win')  pnl =  Math.abs(pnl);
      if (res === 'be')   pnl = 0;

      const setup   = (setupEl?.value || '').trim();
      const time    = new Date().toTimeString().slice(0, 5);
      const elapsed = sessionElapsed();

      S.sessionTrades.push({ r: res, pnl, setup, time });
      S.obsClips.push({ time, elapsed, r: res, pnl, setup });
      obsReplay();   // save OBS replay buffer around this trade entry

      const st = stats();
      let consec = 0;
      for (let i = S.sessionTrades.length - 1; i >= 0; i--) {
        if (S.sessionTrades[i].r === 'loss') consec++; else break;
      }

      if (res === 'win') {
        say(`Trade ganador. P y L acumulado: ${st.pnl >= 0 ? 'más' : 'menos'} ${Math.abs(st.pnl).toFixed(0)} dólares.`);
      } else if (res === 'loss') {
        if (consec >= 2)
          say('Dos pérdidas seguidas. Regla cuatro. Cerramos la plataforma. Sin revancha.', 200);
        else
          say('Pérdida registrada. Sin revancha. Esperamos el siguiente A más setup.');
      } else {
        say('Breakeven. Capital protegido. Buena disciplina.');
      }

      if (st.pnl <= -S.maxLoss) say('Alerta. Stop de sesión alcanzado. Cierra la plataforma ahora.', 1800);
      if (st.pnl >= S.target)   say('Objetivo alcanzado. Misión cumplida. El mejor trade ahora es no operar más.', 1800);

      rerender();
    },

    closeSession() {
      capture(); S.phase = 'close'; clearInterval(_timer);
      obsScene('Resultado');
      const st = stats();
      const msg = st.pnl >= S.target
        ? `Sesión cerrada. Objetivo cumplido: ${st.pnl.toFixed(0)} dólares. Excelente ejecución.`
        : st.pnl > 0
        ? `Sesión cerrada con ganancia de ${st.pnl.toFixed(0)} dólares. Buen trabajo.`
        : `Sesión cerrada. Pérdida de ${Math.abs(st.pnl).toFixed(0)} dólares. Analizamos qué ajustar mañana.`;
      say(msg);
      rerender();
    },

    saveJournal() {
      const noteEl = document.getElementById('rutina-note');
      if (noteEl) S.sessionNote = noteEl.value;
      const st = stats();
      const date = new Date().toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric' });
      const note = [
        `📍 Sesión ${date} | Sesgo: ${S.bias || 'n/d'}`,
        `P&L: ${st.pnl >= 0 ? '+' : ''}$${st.pnl.toFixed(0)} | Trades: ${st.n} (${st.wins}W · ${st.losses}L)`,
        S.orbSet ? `ORB: ${S.orbLo} – ${S.orbHi} (${(S.orbHi - S.orbLo).toFixed(2)} pts)` : '',
        S.niveles ? `Niveles: ${S.niveles.slice(0, 120)}` : '',
        S.sessionNote ? `Notas: ${S.sessionNote}` : '',
      ].filter(Boolean).join('\n');

      App.db.journal.push({ id: Store.uid(), date: TODAY, tag: 'sesion', text: note, media: [] });
      App.save();
      say('Sesión guardada en el journal. Hasta mañana.');
      UI.toast('Guardado en journal ✓');
      rerender();
    },

    obsConnect(h, p, pw) { return obsConnect(h, p, pw); },

    copyClipTimestamps() {
      if (!S.obsClips.length) return UI.toast('Aún no hay clips — agrega trades primero');
      const lines = S.obsClips.map((c, i) => {
        const pnlStr = c.r === 'be' ? 'BE' : `${c.pnl >= 0 ? '+' : ''}$${Math.abs(c.pnl).toFixed(0)}`;
        return `Trade ${i+1} | ${c.time} CT | +${c.elapsed} desde inicio | ${c.r.toUpperCase()} ${pnlStr}${c.setup ? ' | ' + c.setup : ''}`;
      }).join('\n');
      navigator.clipboard?.writeText(lines).then(() => UI.toast('Timestamps copiados ✓'));
    },

    reset() {
      clearInterval(_timer);
      sessionStorage.removeItem(SK);
      S = empty();
      App.render();
    },
  };
})();

/* ---- View rendering ---- */
window.Views = window.Views || {};
(() => {
  const V = window.Views;
  const C = () => window.RutinaCtrl;

  /* ════════════ PRE-MARKET ════════════ */
  function renderPre() {
    const S = C().S, RULES = C().RULES;
    const biasOpts = [
      { v: 'alcista', l: '↑ ALCISTA', col: 'var(--up)' },
      { v: 'bajista', l: '↓ BAJISTA', col: 'var(--down)' },
      { v: 'neutral',  l: '↔ NEUTRAL',  col: 'var(--muted)' },
    ];
    const biasBtns = biasOpts.map(b => `
      <button class="bias-btn ${S.bias === b.v ? 'on' : ''}" data-act="rutinaBias" data-v="${b.v}"
        style="${S.bias === b.v ? `border-color:${b.col};color:${b.col}` : ''}">${b.l}</button>`).join('');

    const ruleItems = RULES.map(r => {
      const on = S.rulesChecked.includes(r.id);
      return `<button class="rt-rule ${on ? 'on' : ''}" data-act="rutinaRule" data-id="${r.id}">
        <span class="rt-ric">${UI.icon(on ? 'checkc' : 'check', '', 16)}</span>
        <span>${UI.esc(r.text)}</span>
      </button>`;
    }).join('');

    const canStart = S.bias && S.rulesChecked.length === RULES.length;

    return `
      <div class="card">
        <div class="card-head"><div class="ch-t">${UI.icon('flag','',18)} Sesgo del día</div></div>
        <div class="rt-bias-row">${biasBtns}</div>
        <textarea class="input mt8" id="rutina-sesgo" rows="2"
          placeholder="¿Por qué? Daily bias, estructura HTF, niveles que defiendo hoy…">${UI.esc(S.sesgo)}</textarea>
      </div>

      <div class="card">
        <div class="card-head"><div class="ch-t">${UI.icon('candles','',18)} Niveles clave</div>
          <span class="muted small">HTF S/R · POI · liquidez</span></div>
        <textarea class="input" id="rutina-niveles" rows="3"
          placeholder="R1: 19800 · S1: 19650 · OB: 19720–19740 · Liquidez: 19790…">${UI.esc(S.niveles)}</textarea>
      </div>

      <div class="card">
        <div class="card-head"><div class="ch-t">${UI.icon('target','',18)} Plan de sesión</div></div>
        <div class="grid3">
          <div><div class="kpi-l mb6">Máx. trades</div>
            <input class="input" id="rutina-max-t" type="number" min="1" max="10" value="${S.maxTrades}" style="text-align:center"></div>
          <div><div class="kpi-l mb6">Stop sesión ($)</div>
            <input class="input" id="rutina-max-l" type="number" min="1" value="${S.maxLoss}" style="text-align:center"></div>
          <div><div class="kpi-l mb6">Objetivo ($)</div>
            <input class="input" id="rutina-target" type="number" min="1" value="${S.target}" style="text-align:center"></div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><div class="ch-t">${UI.icon('shield','',18)} Compromisos de sesión</div>
          <span class="muted small">${S.rulesChecked.length}/${RULES.length} confirmados</span></div>
        <div class="rt-rules">${ruleItems}</div>
      </div>

      <button class="btn btn-primary full" data-act="rutinaStartSession" ${canStart ? '' : 'disabled'}>
        ${UI.icon('bolt','',18)} Activar sesión en vivo →
      </button>
      ${!canStart ? '<p class="muted small center mt6">Define sesgo y confirma todos los compromisos</p>' : ''}`;
  }

  /* ════════════ SESIÓN ACTIVA ════════════ */
  function renderLive() {
    const S = C().S, st = C().stats();
    const pnlCls   = st.pnl >= 0 ? 'up' : 'down';
    const goalPct  = S.target > 0 ? Math.min(100, Math.max(0, st.pnl / S.target * 100)) : 0;
    const lossPct  = S.maxLoss > 0 ? Math.min(100, Math.max(0, Math.abs(Math.min(0, st.pnl)) / S.maxLoss * 100)) : 0;
    const lossHit  = st.pnl <= -S.maxLoss;
    const goalHit  = st.pnl >= S.target;
    const tradeFull = st.n >= S.maxTrades;

    const alert = lossHit
      ? `<div class="card rt-alert danger">${UI.icon('flame','',22)}
          <div><div class="bold">STOP DE SESIÓN — CIERRA LA PLATAFORMA</div>
          <div class="muted small">Límite alcanzado. Esta regla existe exactamente para este momento.</div></div></div>`
      : goalHit
      ? `<div class="card rt-alert success">${UI.icon('trophy','',22)}
          <div><div class="bold">OBJETIVO ALCANZADO — MISIÓN CUMPLIDA</div>
          <div class="muted small">El mejor trade ahora es no hacer ninguno más. Cierra.</div></div></div>`
      : '';

    const tradeLog = S.sessionTrades.length
      ? S.sessionTrades.slice().reverse().map((t, i) => {
          const n   = S.sessionTrades.length - i;
          const cls = t.r === 'win' ? 'up' : t.r === 'loss' ? 'down' : 'flat';
          const val = t.r === 'be' ? 'BE' : `${t.pnl >= 0 ? '+' : ''}$${Math.abs(t.pnl).toFixed(0)}`;
          return `<div class="rt-trow">
            <span class="muted small">#${n} · ${t.time}</span>
            <span class="${cls} bold">${val}</span>
            <span class="muted small">${UI.esc(t.setup || '–')}</span>
          </div>`;
        }).join('')
      : '<div class="muted small center" style="padding:12px 0">Sin trades aún</div>';

    return `
      ${alert}
      <div class="rt-hud card">
        <div class="rt-hud-col">
          <div class="muted small">TIEMPO</div>
          <div class="bold rt-timer" id="rt-timer">0:00</div>
        </div>
        <div class="rt-hud-col center">
          <div class="muted small">P&amp;L SESIÓN</div>
          <div class="${pnlCls}" style="font-family:'Sora',sans-serif;font-weight:800;font-size:2rem;line-height:1">
            ${st.pnl >= 0 ? '+' : ''}$${Math.abs(st.pnl).toFixed(0)}</div>
        </div>
        <div class="rt-hud-col" style="text-align:right">
          <div class="muted small">TRADES</div>
          <div class="bold">${st.n}<span class="muted"> /${S.maxTrades}</span></div>
        </div>
      </div>

      <div class="grid2">
        <div class="card kpi">
          <div class="kpi-l">Hacia objetivo ($${S.target})</div>
          <div class="kpi-v ${pnlCls}">${goalPct.toFixed(0)}%</div>
          ${UI.bar(goalPct, 100, 'var(--up)')}
        </div>
        <div class="card kpi">
          <div class="kpi-l">Stop usado (-$${S.maxLoss})</div>
          <div class="kpi-v ${lossPct > 70 ? 'down' : ''}">${lossPct.toFixed(0)}%</div>
          ${UI.bar(lossPct, 100, lossPct > 70 ? 'var(--down)' : 'var(--brand)')}
        </div>
      </div>

      <div class="card">
        <div class="card-head"><div class="ch-t">${UI.icon('candles','',18)} Rango ORB</div>
          ${S.orbSet ? `<span class="muted small">${S.orbLo} – ${S.orbHi} · ${(S.orbHi - S.orbLo).toFixed(2)} pts</span>` : ''}</div>
        <div class="grid2">
          <div><div class="kpi-l mb6">Low de apertura</div>
            <input class="input" id="orb-lo" type="number" step="0.25" placeholder="19680" value="${UI.esc(String(S.orbLo))}" style="text-align:center"></div>
          <div><div class="kpi-l mb6">High de apertura</div>
            <input class="input" id="orb-hi" type="number" step="0.25" placeholder="19740" value="${UI.esc(String(S.orbHi))}" style="text-align:center"></div>
        </div>
        <button class="btn btn-ghost full mt8" data-act="rutinaSetORB">Guardar rango ORB</button>
      </div>

      <div class="card">
        <div class="card-head"><div class="ch-t">${UI.icon('plus','',18)} Registrar trade</div>
          <span class="muted small">Rápido · detalla en Trades después</span></div>
        <div class="grid2 mb8">
          <div><div class="kpi-l mb6">Monto ($)</div>
            <input class="input" id="rt-pnl" type="number" step="1" placeholder="50" style="text-align:center"></div>
          <div><div class="kpi-l mb6">Setup</div>
            <input class="input" id="rt-setup" type="text" placeholder="ORB long breakout"></div>
        </div>
        <div class="pick rt-chips" data-g="rt-res">
          <button class="chip" data-pick data-v="win">✅ Win</button>
          <button class="chip" data-pick data-v="loss">❌ Loss</button>
          <button class="chip" data-pick data-v="be">➖ BE</button>
        </div>
        <button class="btn btn-primary full mt8" data-act="rutinaAddTrade" ${lossHit || tradeFull ? 'disabled' : ''}>
          ${UI.icon('plus','',16)} Agregar trade
        </button>
      </div>

      <div class="card">
        <div class="card-head"><div class="ch-t">${UI.icon('list','',18)} Log de sesión</div>
          <span class="muted small">${st.n} trades · ${st.wins}W ${st.losses}L</span></div>
        ${tradeLog}
      </div>

      <button class="btn btn-ghost full" data-act="rutinaCloseSession">
        Cerrar sesión y revisar →
      </button>`;
  }

  /* ════════════ CIERRE ════════════ */
  function renderClose() {
    const S = C().S, RULES = C().RULES, st = C().stats();
    const pnlCls  = st.pnl >= 0 ? 'up' : 'down';
    const goalOk  = st.pnl >= S.target;
    const lossOk  = st.pnl > -S.maxLoss;
    const allRules = S.rulesChecked.length === RULES.length;
    const verdict  = goalOk ? 'OBJETIVO CUMPLIDO' : st.pnl > 0 ? 'SESIÓN POSITIVA' : st.pnl === 0 ? 'SESIÓN BE' : 'SESIÓN NEGATIVA';

    return `
      <div class="card coach-hero glass">
        <div class="coach-hero-l">
          <div class="eyebrow">${UI.icon('cockpit','',15)} JARVIS — RESUMEN DE SESIÓN</div>
          <h1 class="${pnlCls}">${st.pnl >= 0 ? '+' : ''}$${st.pnl.toFixed(0)} · ${verdict}</h1>
          <p class="muted">${st.n} trades · ${st.wins} ganados · ${st.losses} perdidos · stop ${lossOk ? 'respetado ✓' : 'alcanzado'}</p>
        </div>
        <div class="coach-hero-r"><div class="coach-orb"><span></span><span></span><span></span></div></div>
      </div>

      <div class="grid4">
        <div class="card kpi"><div class="kpi-l">P&amp;L final</div>
          <div class="kpi-v ${pnlCls}">${st.pnl >= 0 ? '+' : ''}$${st.pnl.toFixed(0)}</div></div>
        <div class="card kpi"><div class="kpi-l">Objetivo</div>
          <div class="kpi-v ${goalOk ? 'up' : ''}">${goalOk ? '✓' : '✗'}&nbsp;$${S.target}</div></div>
        <div class="card kpi"><div class="kpi-l">Trades</div>
          <div class="kpi-v">${st.n}<span class="muted kpi-v" style="font-size:1rem"> / ${S.maxTrades}</span></div></div>
        <div class="card kpi"><div class="kpi-l">Compromisos</div>
          <div class="kpi-v ${allRules ? 'up' : 'down'}">${S.rulesChecked.length}/${RULES.length}</div></div>
      </div>

      <div class="card">
        <div class="card-head"><div class="ch-t">${UI.icon('book','',18)} Nota de cierre</div></div>
        <textarea class="input" id="rutina-note" rows="4"
          placeholder="¿Seguiste el plan? ¿Qué salió bien? ¿Qué ajustas mañana?">${UI.esc(S.sessionNote)}</textarea>
        <button class="btn btn-primary full mt8" data-act="rutinaSaveJournal">
          ${UI.icon('download','',16)} Guardar en journal
        </button>
      </div>

      <div class="card" style="border-color:var(--brand-dim);background:var(--surface-2)">
        <div class="muted small center">Cuando termines el journal → ve a <strong>Studio</strong> para editar y subir el contenido de hoy.</div>
      </div>

      <button class="dellink" style="display:block;text-align:center;margin-top:8px" data-act="rutinaReset">
        Reiniciar para la próxima sesión
      </button>`;
  }

  /* ════════════ CONTENT STUDIO ════════════ */
  function renderStudio() {
    const S  = C().S;
    const ctrl = C();
    const obsOk = ctrl.obsConnected;
    const cfg   = ctrl.obsCfg;
    const clips = S.obsClips;

    /* OBS panel */
    const obsPanel = obsOk
      ? `<div class="card obs-ok-card">
          <div class="card-head">
            <div class="ch-t"><span class="obs-dot on"></span> OBS Studio conectado</div>
            <span class="muted small">${UI.esc(cfg.host)}:${cfg.port}</span>
          </div>
          <p class="muted small">Las escenas cambian solas con cada fase. El replay buffer se guarda en cada trade.</p>
        </div>`
      : `<div class="card">
          <div class="card-head"><div class="ch-t"><span class="obs-dot off"></span> OBS desconectado</div>
            <span class="muted small">Abre OBS primero</span></div>
          <p class="muted small mb8">Herramientas → WebSocket Server → actívalo → anota el puerto y contraseña.</p>
          <div class="grid2 mb8">
            <div><div class="kpi-l mb6">Host</div>
              <input class="input" id="obs-host" value="${UI.esc(cfg.host || 'localhost')}" placeholder="localhost"></div>
            <div><div class="kpi-l mb6">Puerto</div>
              <input class="input" id="obs-port" type="number" value="${cfg.port || 4455}" style="text-align:center"></div>
          </div>
          <div class="mb8"><div class="kpi-l mb6">Contraseña WebSocket</div>
            <input class="input" id="obs-pass" type="password" value="${UI.esc(cfg.password || '')}" placeholder="la que pusiste en OBS"></div>
          <button class="btn btn-primary full" data-act="rutinaObsConnect">Conectar a OBS</button>
        </div>`;

    /* Clip list */
    const clipRows = clips.length
      ? clips.map((c, i) => {
          const cls    = c.r === 'win' ? 'up' : c.r === 'loss' ? 'down' : '';
          const pnlStr = c.r === 'be' ? 'BE' : `${c.pnl >= 0 ? '+' : ''}$${Math.abs(c.pnl).toFixed(0)}`;
          return `<div class="clip-row">
            <div class="clip-num">${i + 1}</div>
            <div style="flex:1;min-width:0">
              <div class="small bold">${c.time}&nbsp;CT · <span class="muted">+${c.elapsed} en grabación</span></div>
              ${c.setup ? `<div class="muted small">${UI.esc(c.setup)}</div>` : ''}
            </div>
            <div class="${cls} bold small">${pnlStr}</div>
          </div>`;
        }).join('')
      : '<div class="muted small center" style="padding:14px 0">Aún sin clips — agrega trades en la sesión activa</div>';

    const hasClips = clips.length > 0;

    /* CapCut step list — references actual clip timestamps if available */
    const capSteps = [
      ['1', 'Importa el video de OBS', 'Abre CapCut → Nuevo proyecto → importa el .mkv de hoy (Documentos, nombre con fecha y hora)'],
      ['2', 'Corta en los timestamps',
        hasClips ? clips.map((c, i) => `Clip ${i+1}: marca ${c.elapsed} (${c.r === 'be' ? 'BE' : (c.pnl >= 0 ? '+' : '') + '$' + Math.abs(c.pnl).toFixed(0)})`).join(' · ') : 'Agrega trades para ver los timestamps aquí'],
      ['3', 'Formato 9:16 vertical', 'Ratio → 9:16. Encuadra en TradingView, sin el dock lateral'],
      ['4', 'Agrega el hook de texto', 'Primera pantalla: el hook de tu TikTok del día (ve a la sección de abajo). Fuente blanca, bold, centrada'],
      ['5', 'Música sin copyright', 'CapCut tiene librería gratis. Algo enérgico, sin letra para el análisis. Con letra para el motivacional'],
      ['6', 'Exporta y publica', 'Exporta 1080p 30fps → TikTok → Instagram Reels → YouTube Shorts'],
    ];

    const capRows = capSteps.map(([n, act, det]) => `
      <div class="studio-step">
        <div class="studio-n">${n}</div>
        <div style="flex:1">
          <div class="small bold">${act}</div>
          <div class="muted small">${det}</div>
        </div>
      </div>`).join('');

    /* Publish checklist */
    const pubSteps = [
      'Edita el Reel en CapCut (~15–20 min)',
      'Sube a TikTok con hashtags del guion + pide comentar NORTE',
      'Republica en Instagram Reels',
      'Sube como YouTube Short',
      'Revisa ManyChat — confirma que el DM automático está activo para quien comente NORTE',
    ];

    return `
      <div class="studio-section-head">${UI.icon('settings','',16)} Conexión OBS Studio</div>
      ${obsPanel}

      <div class="studio-section-head">${UI.icon('film','',16)} Clips registrados
        ${hasClips ? `<button class="btn btn-ghost" style="font-size:.8rem;padding:4px 10px;margin-left:auto" data-act="rutinaCopyClips">Copiar timestamps</button>` : ''}</div>
      <div class="card">${clipRows}</div>

      <div class="studio-section-head">${UI.icon('cut','',16)} Guía CapCut — Reel de 60–90 seg</div>
      <div class="card">${capRows}</div>

      <div class="studio-section-head">${UI.icon('upload','',16)} Publicar contenido de hoy</div>
      <div class="card">
        <p class="muted small mb8">Tu calendario de TikToks está en:</p>
        <div class="obs-path">~/claude/northpoint-marketing/contenido/calendario.csv</div>
        <p class="muted small mt8 mb12">Abre el CSV y busca la fila con la fecha de hoy para ver el guion (hook, body, CTA).</p>
        <div style="border-top:.5px solid var(--border);padding-top:12px">
          ${pubSteps.map((s, i) => `
            <div class="pub-step">
              <div class="studio-n">${i + 1}</div>
              <div class="small">${s}</div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  /* ════════════ MAIN VIEW ════════════ */
  V.rutina = function () {
    const S = C().S;
    const phaseOrder = { pre: 0, live: 1, close: 2 };
    const cur = phaseOrder[S.phase] ?? -1;

    const TABS = [
      { id: 'pre',    icon: 'clock',   label: 'Pre-market' },
      { id: 'live',   icon: 'bolt',    label: 'En vivo' },
      { id: 'close',  icon: 'shield',  label: 'Cierre' },
      { id: 'studio', icon: 'film',    label: 'Studio' },
    ];

    const tabs = TABS.map((t, i) => {
      const isStudio = t.id === 'studio';
      const done = !isStudio && i < cur;
      const on   = t.id === S.phase;
      return `<button class="rt-tab ${on ? 'on' : ''} ${done ? 'done' : ''} ${isStudio ? 'studio' : ''}"
        data-act="rutinaGoPhase" data-p="${t.id}">
        ${done ? UI.icon('checkc','',15) : UI.icon(t.icon,'',15)} ${t.label}
      </button>`;
    }).join('');

    const body = S.phase === 'pre'    ? renderPre()
               : S.phase === 'live'   ? renderLive()
               : S.phase === 'close'  ? renderClose()
               :                       renderStudio();

    const obsOk = C().obsConnected;
    const obsBadge = obsOk
      ? '<span class="obs-badge on">● OBS</span>'
      : '<span class="obs-badge off">○ OBS</span>';

    return `<div class="page">
      <div class="card rt-jarvis">
        <div class="rt-j-left">
          <div class="rt-j-orb">${UI.icon('cockpit','',22)}</div>
          <div>
            <div class="bold" style="font-family:'Sora',sans-serif">JARVIS</div>
            <div class="muted small">Tu co-piloto de sesión · Operamos juntos</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          ${obsBadge}
          <button class="btn btn-ghost" style="font-size:.82rem;padding:6px 14px" data-act="rutinaVoice">
            ${UI.icon('bell','',14)} Voz
          </button>
        </div>
      </div>
      <div class="rt-tabs">${tabs}</div>
      ${body}
    </div>`;
  };
})();
