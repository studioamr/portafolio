# RACHA — Máquina de ventas + contenido automático

Plan para **captar clientes en automático** y vender el curso *De Cero a Payout* sin estar pegado al teléfono. Pensado para tu caso: trader real en Morelia, con prueba (11 payouts, $10.5K) y una app propia como gancho.

La idea en una línea:
> **Contenido (Reels/Shorts) → DM/comentario → WhatsApp automático → Landing RACHA → Pago → Comunidad.**

---

## 1. El embudo (cómo entra el dinero)

```
   ATENCIÓN              INTERÉS               DESEO                ACCIÓN
┌──────────────┐   ┌──────────────────┐   ┌────────────────┐   ┌──────────────┐
│ TikTok / IG  │ → │ Comentario "RACHA"│ → │ Landing del     │ → │ Pago         │
│ Reels / YT   │   │ → DM automático   │   │ curso + app     │   │ (Hotmart/    │
│ Shorts       │   │ (ManyChat) →      │   │ gratis de gancho│   │ MercadoPago) │
│              │   │ WhatsApp          │   │                 │   │ → Discord    │
└──────────────┘   └──────────────────┘   └────────────────┘   └──────────────┘
```

**Gancho regalado (lead magnet):** la app **RACHA gratis** + un mini-PDF "Checklist de sesión + las 3 reglas que me hacen rentable". Pides el contacto a cambio. Quien usa la app ya está medio convencido del curso.

---

## 2. Stack de herramientas (lo mínimo para automatizar)

| Función | Herramienta | Por qué |
|---|---|---|
| Auto-DM por comentario/keyword | **ManyChat** (IG + WhatsApp) | Comentas "RACHA" → te llega el link solo |
| Programar publicaciones | **Metricool** o **Buffer** | Subes 30 reels y se publican solos |
| Orquestar todo | **Make** (o n8n) | Conecta Sheet → IA → redes → CRM |
| Guion + ideas con IA | **Claude / ChatGPT** | Genera 30 guiones de un jalón |
| Voz en off | **ElevenLabs** (es-MX) | Reels "faceless" sin grabar tu voz |
| Edición | **CapCut** (plantillas) | Subtítulos y cortes rápidos |
| Cobro | **Hotmart / MercadoPago / Stripe** | Pago + acceso automático |
| Comunidad | **Discord / WhatsApp Community** | Entrega y retención |
| CRM simple | **Google Sheets** | Lista de leads y estado |

> Empieza con **ManyChat + Metricool + Hotmart**. Lo demás se agrega cuando ya facture.

---

## 3. Motor de contenido (la parte que "no se acaba")

### Pilares (rota entre estos 5)
1. **Prueba/resultados** — payout del día, calendario verde de RACHA, "mes en racha". *(El más viral.)*
2. **Educación** — qué es el ORB, killzones, gestión de riesgo, fondeo explicado simple.
3. **Detrás de cámara / lifestyle** — tu rutina 7–9 AM, disciplina, Morelia.
4. **Errores/mitos** — "por qué quemas cuentas", "el FOMO te arruina".
5. **Oferta suave** — "así llevo mi journal" → muestra RACHA → CTA al curso.

### Regla 80/20
80% valor/entretenimiento, 20% venta directa. Vendes **mostrando**, no rogando.

### Formato que escala (faceless + cara)
- **Faceless:** screen-recording de RACHA o de TradingView + voz IA + subtítulos. Produces 10 en una tarde.
- **Cara:** 1–2 por semana hablando a cámara (genera confianza, sube conversión).

---

## 4. Pipeline de contenido con IA (de idea a publicado)

```
[1] Banco de ideas (Google Sheet)
        │  (Make corre cada lunes)
        ▼
[2] IA escribe guion + hook + caption + hashtags
        │
        ▼
[3] Grabas pantalla de RACHA / b-roll  +  voz ElevenLabs
        │
        ▼
[4] CapCut: subtítulos + música
        │
        ▼
[5] Metricool agenda IG/TikTok/YT (3 al día)
        │
        ▼
[6] ManyChat responde comentarios → WhatsApp → Landing
```

### Prompt para generar 30 guiones (pégalo en Claude/ChatGPT)
```
Eres mi copywriter de contenido para un curso de trading de futuros con cuentas
de fondeo (público México, tono cercano y directo, sin promesas de hacerse rico).
Marca: RACHA. Curso: "De Cero a Payout".
Dame 30 ideas de Reel/Short. Para cada una:
- HOOK (primeros 3 seg, máx 8 palabras)
- Guion de 25–35 seg en español de México
- Texto en pantalla por escena
- Caption + 8 hashtags
- CTA: "Comenta RACHA y te mando la app gratis"
Reparte las ideas entre 5 pilares: prueba/resultados, educación, detrás de
cámara, errores/mitos, oferta suave. Evita garantizar ganancias; menciona el riesgo.
```

### Prompt para el caption + hashtags de un clip ya grabado
```
Resume este clip en un caption de 2 líneas con gancho + 1 pregunta + CTA
"Comenta RACHA". Agrega 8 hashtags mexicanos de trading/fondeo. Tono cercano.
Clip: <describe lo que se ve>
```

---

## 5. Automatización clave #1 — Comentario → WhatsApp (ManyChat)

1. En el Reel pones: **"Comenta RACHA"**.
2. ManyChat detecta la palabra **RACHA** en comentarios.
3. Responde el comentario + manda DM: *"¡Va! Aquí tienes la app gratis 👉 [link] ¿Quieres el curso completo? Te cuento por WhatsApp."*
4. Botón → abre **WhatsApp** con mensaje pre-llenado (ya está en la landing: `CFG.whatsapp`).
5. En WhatsApp, un flujo automático manda: app + mini-PDF + precio + link de pago.

> Esto convierte cada comentario en un lead **sin que muevas un dedo**.

## Automatización clave #2 — Publicación automática desde un Sheet (Make)

1. Google Sheet con columnas: `fecha | pilar | video_url | caption | estado`.
2. **Make** lee filas con estado "listo".
3. Envía a **Metricool/Buffer** para programar en IG + TikTok + YT.
4. Marca la fila como "publicado" y te avisa por Telegram/WhatsApp.

## Automatización clave #3 — Post-venta (entrega sola)

Pago en Hotmart → webhook a Make → agrega al alumno a **Discord** + manda WhatsApp de bienvenida con acceso al curso y a RACHA. Cero intervención tuya.

---

## 6. Calendario de 30 días (plantilla, 1 reel/día)

| Semana | Lun | Mar | Mié | Jue | Vie | Sáb | Dom |
|---|---|---|---|---|---|---|---|
| 1 | Resultado | Educación | Detrás | Error/mito | Resultado | Oferta suave | Educación |
| 2 | Resultado | Educación | Detrás | Error/mito | Resultado | Oferta suave | Educación |
| 3 | Resultado | Educación | Detrás | Error/mito | Resultado | Oferta suave | Educación |
| 4 | Resultado | Educación | Detrás | Error/mito | Resultado | **Lanzamiento/cierre** | Testimonios |

- **Día de resultados** = screenshot real del calendario de RACHA (es tu mejor contenido).
- Repite ganadores: si un reel pega, hazle 3 variantes.

---

## 7. La oferta (para que cierre solo)

- **Precio ancla:** $7,990 → **hoy $4,990 MXN** (edítalo en `views-landing.js`).
- **Urgencia real:** "cupo a 50 alumnos" (tu meta de marketing). Cuando se llene, sube el precio.
- **Stack de valor:** curso + app RACHA + comunidad + plantillas + sesgo diario.
- **Garantía suave:** "si haces el módulo 1–5 y aplicas, o te ayudo 1-a-1 o no avanzas a pagar más". (Evita garantizar ganancias.)
- **Prueba social:** capturas de tus payouts y, en cuanto haya alumnos, sus journals.

---

## 8. Métricas (revisa cada lunes, 10 min)

| Métrica | Meta inicial |
|---|---|
| Reels publicados / semana | 7–14 |
| Comentarios "RACHA" / semana | 50+ |
| Leads a WhatsApp | 30+ |
| Conversación → venta | 3–5% |
| Ventas / mes | rumbo a 50 alumnos |

Si el contenido no jala → cambia **hooks**. Si jala pero no vende → cambia **oferta/landing**.

---

## 9. Arranque en 7 pasos

1. [ ] Pon tu **WhatsApp + precio** en `js/views-landing.js` (`CFG`).
2. [ ] Sube `racha/` a **Netlify/Vercel** (link público de la landing + app).
3. [ ] Crea **ManyChat** y el flujo keyword "RACHA".
4. [ ] Genera **30 guiones** con el prompt de arriba.
5. [ ] Graba/edita 10 reels faceless de RACHA + 2 a cámara.
6. [ ] Prográmalos con **Metricool** (3/día).
7. [ ] Conecta **Hotmart → Discord** para entregar solo.

> Regla de oro: **publica todos los días 30 días seguidos** antes de juzgar resultados. La constancia en el contenido es la misma disciplina que te da los payouts.

---

### Aviso de cumplimiento
Nada de "ganancias garantizadas" ni "ingresos asegurados" (te tumban anuncios y cuentas). Habla de **educación, sistema y disciplina**, y muestra el **riesgo**. Eso además vende mejor a largo plazo.
