/* ============ NorthPoint · Media (fotos/videos en IndexedDB) ============ */
/* Guarda los blobs en IndexedDB (no en localStorage, para no reventar el cuota).
   Los registros (trades/notas) solo guardan [{id, type}] y aquí resolvemos el blob. */
const Media = (() => {
  const DB = 'northpoint-media', STORE = 'blobs';
  let _db = null;

  function open() {
    return new Promise((res, rej) => {
      if (_db) return res(_db);
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE); };
      r.onsuccess = () => { _db = r.result; res(_db); };
      r.onerror = () => rej(r.error);
    });
  }
  const uid = () => 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  async function put(blob) {
    const db = await open(); const id = uid();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(blob, id);
      tx.oncomplete = () => res(id); tx.onerror = () => rej(tx.error);
    });
  }
  async function get(id) {
    const db = await open();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readonly');
      const rq = tx.objectStore(STORE).get(id);
      rq.onsuccess = () => res(rq.result || null); rq.onerror = () => rej(rq.error);
    });
  }
  async function del(id) {
    const db = await open();
    return new Promise(res => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => res(); tx.onerror = () => res();
    });
  }

  // rellena <img>/<video data-media="id"> con object URLs desde IndexedDB
  async function hydrate(scope) {
    const els = (scope || document).querySelectorAll('[data-media]:not([data-hy])');
    for (const el of els) {
      el.setAttribute('data-hy', '1');
      try { const blob = await get(el.dataset.media); if (blob) el.src = URL.createObjectURL(blob); } catch (e) {}
    }
  }

  // comprime una imagen a JPEG (máx 1280px) para que pese poco
  function compressImage(file, max = 1280, q = 0.72) {
    return new Promise(res => {
      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          const sc = Math.min(1, max / Math.max(w, h));
          w = Math.round(w * sc); h = Math.round(h * sc);
          const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(img, 0, 0, w, h);
          cv.toBlob(b => res(b || file), 'image/jpeg', q);
        };
        img.onerror = () => res(file);
        img.src = fr.result;
      };
      fr.onerror = () => res(file);
      fr.readAsDataURL(file);
    });
  }

  return { put, get, del, hydrate, compressImage };
})();
