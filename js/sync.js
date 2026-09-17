/* ============================================================
   Camada de sincronização
   - Se FIREBASE_CONFIG estiver preenchido → usa Firebase RTDB
   - Senão → usa BroadcastChannel + localStorage (mesmo navegador)
   ============================================================ */
(function () {
  const cfg = window.FIREBASE_CONFIG || {};
  const prefix = window.UBS_SYNC_PREFIX || "ubs";
  const useFirebase =
    cfg && cfg.databaseURL && cfg.databaseURL.startsWith("http");

  const handlers = new Set();

  function emit(event) {
    handlers.forEach((fn) => {
      try { fn(event); } catch (e) { console.error(e); }
    });
  }

  /* ---------------- FALLBACK LOCAL ---------------- */
  function initLocal() {
    const KEY = prefix + ":last-call";
    const BC = "BroadcastChannel" in window ? new BroadcastChannel(prefix) : null;

    if (BC) {
      BC.onmessage = (ev) => { if (ev.data) emit(ev.data); };
    }
    window.addEventListener("storage", (ev) => {
      if (ev.key === KEY && ev.newValue) {
        try { emit(JSON.parse(ev.newValue)); } catch (_) {}
      }
    });

    return {
      async publish(call) {
        const payload = { ...call, ts: Date.now() };
        localStorage.setItem(KEY, JSON.stringify(payload));
        if (BC) BC.postMessage(payload);
        emit(payload);
      },
      async fetchLast() {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
      },
      mode: "local"
    };
  }

  /* ---------------- FIREBASE ---------------- */
  function initFirebase() {
    // Carrega SDK via CDN dinamicamente (compat)
    return new Promise((resolve, reject) => {
      const s1 = document.createElement("script");
      s1.src = "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js";
      s1.onload = () => {
        const s2 = document.createElement("script");
        s2.src = "https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js";
        s2.onload = () => {
          try {
            firebase.initializeApp(cfg);
            const db = firebase.database();
            const ref = db.ref(prefix + "/last-call");

            ref.on("value", (snap) => {
              const v = snap.val();
              if (v) emit(v);
            });

            resolve({
              async publish(call) {
                const payload = { ...call, ts: Date.now() };
                await ref.set(payload);
              },
              async fetchLast() {
                const snap = await ref.once("value");
                return snap.val();
              },
              mode: "firebase"
            });
          } catch (e) { reject(e); }
        };
        s2.onerror = reject;
        document.head.appendChild(s2);
      };
      s1.onerror = reject;
      document.head.appendChild(s1);
    });
  }

  let backend = null;
  let ready = (async () => {
    if (useFirebase) {
      try { backend = await initFirebase(); }
      catch (e) {
        console.warn("Falha Firebase, usando modo local:", e);
        backend = initLocal();
      }
    } else {
      backend = initLocal();
    }
    return backend;
  })();

  window.Sync = {
    ready: () => ready,
    onCall(fn) { handlers.add(fn); },
    offCall(fn) { handlers.delete(fn); },
    async publish(call) { const b = await ready; return b.publish(call); },
    async fetchLast() { const b = await ready; return b.fetchLast(); },
    get mode() { return backend ? backend.mode : "?"; }
  };
})();