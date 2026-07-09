# RACHA — Plataforma del curso "De Cero a Payout" + journal

Plataforma web de escritorio (vanilla JS, sin build, offline-first) con diseño tipo **TradeSyncer**: sidebar, tema azul oscuro, dashboard con tablas y gráficas. **Primero la educación (curso), después el journal.** Incluye la **landing** para vender el curso.

> Hermana de PARFECT, ACED, ITACATE e INVERNA: misma arquitectura vanilla, sin Node.

## Qué incluye (secciones del sidebar)
- **Academia** — el curso: 8 módulos / 25 lecciones con progreso, video por lección (pegas tu YouTube/Vimeo) y vista de lección con "marcar completada".
- **Inicio** — bienvenida + continuar curso + KPIs (PNL, win rate, payouts, RACHA Score) + calendario + metas.
- **Dashboard** (journal) — PNL, Profit Factor, **RACHA Score** (radar), PNL acumulado, drawdown, PNL por día, **calendario de P&L con columna semanal** y Trades History. Clon de tu TradeSyncer.
- **Trades** — Win rate / Profit factor / Best / Avg Win-Loss + tabla completa con paginación (Fecha, Símbolo, Cuenta, Lado, Qty, Entrada, Salida, P&L, %, Duración, Estado).
- **Calendario** — mes completo + neto / win rate / por setup.
- **Cuentas** — cuentas de fondeo por fase (EVAL → BUFFER → PAYOUT) + ledger de **payouts**.
- **Metas** — depa / coche / gastos con "≈ N payouts" para llegar.
- **Plan** — rutina NY, reglas, embudo, **contrato/compromiso**, checklist del día y bitácora.
- **Landing** — página de ventas del curso *De Cero a Payout* (botón "Página del curso" en el sidebar).

Datos de ejemplo = tu historial real de TradeSyncer (54 trades, +$7.7K, PF 1.52, 44.4% win, Jun 21 +$4.4K / Jun 22 +$3.3K) + 11 payouts ($10,500). Todo en `localStorage`. Exporta trades a Excel (.csv) o respaldo (.json) desde Ajustes.

## Cómo correrla
No necesita instalación. Cualquier servidor estático:

```bash
cd racha
python3 -m http.server 4184
# abre http://localhost:4184
```

Ya está configurada en `.claude/launch.json` como `racha` (puerto 4184).

## Publicarla gratis (para que tus alumnos la usen)
Es 100% estática → súbela tal cual a:
- **Netlify** / **Vercel** / **Cloudflare Pages** (arrastra la carpeta `racha/`), o
- **GitHub Pages**.

Al ser PWA, tus alumnos pueden "Agregar a inicio" y usarla como app.

## Personalizar
- **Tu WhatsApp y precio del curso:** edita `CFG` arriba de `js/views-landing.js`.
- **Renombrar la marca:** la palabra "RACHA" está en `index.html` (título), `manifest.json`, `js/ui.js` (logo) y los textos de las vistas. Busca y reemplaza.
- **Tus datos reales:** entra a la app, toca el **+** para registrar trades/cuentas/payouts, o en **Ajustes → Borrar todo** para empezar de cero. Los datos de ejemplo ya traen tu historial (abril Apex $4,500, mayo/junio Tradeify $3,000 c/u, 11 payouts).

## Estructura
```
racha/
├── index.html            · shell
├── css/styles.css        · tema azul oscuro (estilo TradeSyncer)
├── js/
│   ├── store.js          · caché local (localStorage)
│   ├── data.js           · catálogos, CURSO, plan (del PDF) y datos de ejemplo
│   ├── ui.js             · iconos, formato $, gráficas (área/barras/donut/score), calendario
│   ├── q.js              · métricas + progreso del curso
│   ├── forms.js          · formularios de captura
│   ├── views-landing.js  · página de ventas del curso
│   ├── views-academia.js · curso (hub de módulos + vista de lección)
│   ├── views-dash.js     · inicio, dashboard, trades, calendario, cuentas, metas
│   ├── views-plan.js     · plan, disciplina, bitácora, ajustes
│   └── app.js            · sidebar, router y acciones
├── manifest.json · sw.js · icon.svg
├── AUTOMATIZACION.md     · embudo de ventas + motor de contenido
└── curso/TEMARIO.md      · temario del curso
```

## Aviso
El trading de futuros implica riesgo de pérdida. La app y el curso son educativos; no son asesoría financiera.
