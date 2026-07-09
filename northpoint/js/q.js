/* ============ RACHA · Consultas, métricas y agregaciones ============ */
const Q = (() => {
  const db = () => App.db;
  const sum = (arr, f) => arr.reduce((s, x) => s + (f ? f(x) : x), 0);
  const ord = arr => arr.slice().sort((a, b) => { const ka = a.date + (a.time || ''), kb = b.date + (b.time || ''); return ka < kb ? 1 : ka > kb ? -1 : 0; });

  // ---- trades ----
  const allTrades = () => db().trades;
  const tradesDesc = () => ord(db().trades);
  const dayTrades = date => db().trades.filter(t => t.date === date);
  const monthTrades = key => db().trades.filter(t => UI.monthKey(t.date) === key);
  const accTrades = accId => db().trades.filter(t => t.accountId === accId);

  const pnl = arr => sum(arr, t => t.pnl || 0);
  const dayPnl = date => pnl(dayTrades(date));
  const monthPnl = key => pnl(monthTrades(key));

  // mapa fecha -> {pnl,n,w,l}
  function dayMap(key) {
    const m = {};
    monthTrades(key).forEach(t => {
      const e = (m[t.date] = m[t.date] || { pnl: 0, n: 0, w: 0, l: 0 });
      e.pnl += (t.pnl || 0); e.n++; if (t.result === 'win') e.w++; else if (t.result === 'loss') e.l++;
    });
    return m;
  }

  // filas semanales para la columna "Weekly" del calendario
  function weeklyRows(key) {
    const cells = UI.monthMatrix(key); const map = dayMap(key);
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) {
      const week = cells.slice(i, i + 7).filter(Boolean);
      let p = 0, n = 0; week.forEach(d => { if (map[d]) { p += map[d].pnl; n += map[d].n; } });
      rows.push({ pnl: p, n });
    }
    return rows;
  }

  function stats(arr) {
    const closed = arr.filter(t => t.result !== 'be');
    const wins = arr.filter(t => t.result === 'win');
    const losses = arr.filter(t => t.result === 'loss');
    const grossWin = sum(wins, t => t.pnl || 0);
    const grossLoss = Math.abs(sum(losses, t => t.pnl || 0));
    return {
      n: arr.length, net: pnl(arr), wins: wins.length, losses: losses.length,
      be: arr.filter(t => t.result === 'be').length,
      winRate: closed.length ? Math.round((wins.length / closed.length) * 1000) / 10 : 0,
      profitFactor: grossLoss > 0 ? Math.round((grossWin / grossLoss) * 100) / 100 : (grossWin > 0 ? Infinity : 0),
      avgWin: wins.length ? grossWin / wins.length : 0,
      avgLoss: losses.length ? grossLoss / losses.length : 0,
      expectancy: arr.length ? pnl(arr) / arr.length : 0,
      grossWin, grossLoss,
    };
  }
  function bestTrade(arr) { return arr.slice().sort((a, b) => (b.pnl || 0) - (a.pnl || 0))[0] || null; }
  function worstTrade(arr) { return arr.slice().sort((a, b) => (a.pnl || 0) - (b.pnl || 0))[0] || null; }

  // serie acumulada (para el área de PNL)
  function cumulative(arr) {
    const s = arr.slice().sort((a, b) => ((a.date + (a.time || '')) < (b.date + (b.time || '')) ? -1 : 1));
    let acc = 0; return s.map(t => (acc += (t.pnl || 0)));
  }
  function pnlByDay(key) {
    const m = dayMap(key); return Object.keys(m).sort().map(d => m[d].pnl);
  }

  function score() {
    const st = stats(allTrades());
    const win = Math.min(1, st.winRate / 60);
    const profit = Math.min(1, (st.profitFactor === Infinity ? 3 : st.profitFactor) / 2.5);
    const risk = Math.min(1, (st.avgLoss ? st.avgWin / st.avgLoss : 2) / 2.5);
    const value = Math.round((win * 0.3 + profit * 0.4 + risk * 0.3) * 100) + 3;
    return { value: Math.min(100, value), win, profit, risk };
  }

  // ---- cuentas ----
  const accById = id => db().accounts.find(a => a.id === id);
  const accPnl = accId => pnl(accTrades(accId));
  const accBalance = acc => (acc.size || 0) + accPnl(acc.id);
  const accountsActive = () => db().accounts.filter(a => a.status === 'activa');

  // ---- payouts ----
  const payoutsDesc = () => ord(db().payouts);
  const payoutsTotal = () => sum(db().payouts, p => p.amount || 0);
  const payoutsCount = () => db().payouts.length;
  const avgPayout = () => (db().payouts.length ? payoutsTotal() / db().payouts.length : 0);
  function payoutsByMonth() { const m = {}; db().payouts.forEach(p => { m[UI.monthKey(p.date)] = (m[UI.monthKey(p.date)] || 0) + (p.amount || 0); }); return Object.entries(m).sort((a, b) => (a[0] < b[0] ? 1 : -1)); }

  // ---- Cartera · gastos del mes y rentabilidad ----
  const money = () => db().money || Data.MONEY;
  const expenses = () => db().expenses || [];
  const expensesTotal = () => sum(expenses(), e => e.amount || 0);
  function expensesPie() {
    const tot = expensesTotal() || 1;
    return expenses().map(e => ({ name: e.name, color: e.color || '#5fd0ff', amount: e.amount || 0, pct: Math.round((e.amount || 0) / tot * 100) }));
  }
  const monthlyIncome = () => Math.round((avgPayout() > 0 ? avgPayout() : money().base) * (money().payoutsMes || 4));
  const freeCash = () => monthlyIncome() - expensesTotal();
  const savingsRate = () => { const i = monthlyIncome(); return i > 0 ? Math.round(freeCash() / i * 100) : 0; };

  // ---- metas (legacy) ----
  const oneTimeGoals = () => db().goals.filter(g => !g.monthly);
  const goalRemaining = g => Math.max(0, (g.target || 0) - (g.saved || 0));
  function goalPayouts(g) { const a = avgPayout(); return a > 0 ? Math.ceil(goalRemaining(g) / a) : null; }
  function freedomNumber() { return sum(oneTimeGoals(), g => goalRemaining(g)); }
  function freedomPayouts() { const a = avgPayout(); return a > 0 ? Math.ceil(freedomNumber() / a) : null; }

  // ---- por setup ----
  function bySetup(arr) {
    const map = {}; arr.forEach(t => { (map[t.setup] = map[t.setup] || []).push(t); });
    return Object.entries(map).map(([setup, ts]) => ({ setup, ...stats(ts) })).sort((a, b) => b.net - a.net);
  }

  // ---- curso ----
  const lessonDone = id => !!db().progress[id];
  function courseStats() { const all = Data.allLessons(); const done = all.filter(l => lessonDone(l.id)).length; return { done, total: all.length, pct: all.length ? Math.round((done / all.length) * 100) : 0 }; }
  function moduleStats(m) { const done = m.lessons.filter(l => lessonDone(l.id)).length; return { done, total: m.lessons.length, pct: m.lessons.length ? Math.round((done / m.lessons.length) * 100) : 0 }; }
  function nextLesson() { return Data.allLessons().find(l => !lessonDone(l.id)) || null; }

  return {
    db, sum, allTrades, tradesDesc, dayTrades, monthTrades, accTrades,
    pnl, dayPnl, monthPnl, dayMap, weeklyRows, stats, bestTrade, worstTrade, cumulative, pnlByDay, score,
    accById, accPnl, accBalance, accountsActive,
    payoutsDesc, payoutsTotal, payoutsCount, avgPayout, payoutsByMonth,
    money, expenses, expensesTotal, expensesPie, monthlyIncome, freeCash, savingsRate,
    oneTimeGoals, goalRemaining, goalPayouts, freedomNumber, freedomPayouts, bySetup,
    lessonDone, courseStats, moduleStats, nextLesson,
  };
})();
