# CAIRN — Playbook de dropshipping

La tienda vende **prendas genéricas de proveedor** bajo la marca CAIRN (ediciones numeradas).
Tú no tocas inventario: llega el pedido → lo compras en el proveedor con la dirección del
cliente → el proveedor envía directo. Tu margen es la diferencia.

## El mapa producto → proveedor (LISTINGS ELEGIDOS POR ANDRÉ)

Catálogo v2 — streetwear. Listings exactos que André eligió; sus imágenes reales ya
viven en la tienda (`fotos/alb-*.jpg`, registro en `fotos/proveedores.json`).
Los precios "oferta" con ~$17 MXN son precio de usuario nuevo — el real es el de lista.

| CAIRN | Listing elegido | Costo aprox (MXN) | Precio CAIRN | Margen aprox |
|---|---|---|---|---|
| KARST SET — camo hoodie+pants | [1005009640742120](https://es.aliexpress.com/item/1005009640742120.html) | ~$600–800 | **$99 USD** | ~$55 USD |
| BOULDER — zip hoodie puff-print | [1005011924019719](https://es.aliexpress.com/item/1005011924019719.html) | ~$300–520 | **$59 USD** | ~$35 USD |
| RAVINE — flare pants graffiti | [1005012480699656](https://es.aliexpress.com/item/1005012480699656.html) | ~$250–400 | **$49 USD** | ~$30 USD |
| FLINT — boxy tee 3D | [1005011912504960](https://es.aliexpress.com/item/1005011912504960.html) | ~$100–260 | **$29 USD** | ~$20 USD |
| FERAL 88 — jersey tee | [1005012308179445](https://es.aliexpress.com/item/1005012308179445.html) | ~$110–300 | **$35 USD** | ~$25 USD |
| RIFT — panel tee | [1005009038309591](https://es.aliexpress.com/item/1005009038309591.html) | ~$85–230 | **$29 USD** | ~$21 USD |
| TRACE — panel tee sport | [1005010616842589](https://es.aliexpress.com/item/1005010616842589.html) | ~$90–230 | **$29 USD** | ~$21 USD |

**EXCLUIDO — jersey Majin Buu ([1005010701863186](https://es.aliexpress.com/item/1005010701863186.html))**:
es mercancía de personaje de Dragon Ball SIN licencia. Venderla es falsificación:
Stripe/PayPal/Shopify cierran cuentas por eso y Toei/Shueisha sí persiguen. Si quieres
ese estilo, búscalo como "jersey genérico número 01" sin arte del personaje.

## El flujo de un pedido (hoy, sin plataforma)

1. El cliente arma su carrito en la tienda y al pagar llena **nombre + dirección + contacto**.
2. Te llega el pedido completo por **WhatsApp** (piezas, tallas, números de edición, dirección, total).
3. Cobras por transferencia/link de pago y confirmas por el mismo chat.
4. Compras cada pieza en el listing fijado del proveedor con la **dirección del cliente** como envío.
5. Copias el tracking al cliente. Tiempo típico China→México: **2–4 semanas**.
6. Coses/mandas la etiqueta numerada aparte o la incluyes después (la "placa" de la edición
   puede ser una tarjeta numerada firmada que mandas tú por correo local — cuesta centavos
   y hace real el concepto).

## Reglas para que no truene

- **Pide muestras** de los listings elegidos antes de vender (1 de cada uno ≈ $150 total).
- Fija un solo listing por producto y guárdalo aquí; no compres "el más barato del día".
- Nunca prometas menos de 2 semanas de entrega. La página ya dice 2–4 semanas.
- Devoluciones: acepta cambio/reembolso 30 días — el costo real de un reembolso ocasional
  es menor que la reputación.
- El branding CAIRN vive en la página, el número de edición y tu servicio — las prendas
  llegan genéricas (sin logo), lo cual es consistente con "Cut, not branded".

## Siguiente nivel (cuando haya ventas)

1. **Stripe Payment Links** — cobra con tarjeta sin backend: creas 12 links (uno por
   producto) y la tienda los abre en vez de WhatsApp. Necesita tu cuenta Stripe.
2. **Shopify + CJ Dropshipping app** — fulfillment automático (el pedido se compra solo).
   Ya tienes el tema ALTAR como referencia de theme propio.
3. **Marca propia real**: con 50+ ventas, el mismo proveedor te borda/etiqueta CAIRN
   (private label, MOQ ~100 pzs) y dejas de ser genérico.

Fuentes: [AliExpress balaclava/ski](https://www.aliexpress.com/w/wholesale-balaclava-ski-mask.html) · [AliExpress hardshell](https://www.aliexpress.com/w/wholesale-waterproof-hardshell-jacket.html) · [AliExpress photochromic goggles](https://www.aliexpress.com/w/wholesale-photochromic-ski-goggles.html) · [CJ Dropshipping outerwear](https://cjdropshipping.com/list/wholesale-outerwear-jackets-l-773E0DBE-EEB6-40E9-984F-4ACFB0F58C9A.html) · [AliExpress Business (dropshipping)](https://inbusiness.aliexpress.com/easysale/en/Esqu%C3%AD-Mask)
