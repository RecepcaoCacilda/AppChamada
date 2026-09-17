/* ============================================================
   Telão de Chamadas
   - Exibe APENAS a última chamada publicada
   - Toca o som escolhido pelo consultório (1 a 5)
   - Histórico das últimas 5 chamadas de QUALQUER sala
   - Relógio com data/hora
   - Botão pequeno canto inferior esquerdo → volta ao início
   ============================================================ */
(function () {
  const HIST_KEY = (window.UBS_SYNC_PREFIX || "ubs") + ":historico";

  const elPac  = document.getElementById("paciente-atual");
  const elProf = document.getElementById("profissional-atual");
  const elSala = document.getElementById("sala-atual");
  const elHist = document.getElementById("historico-lista");
  const elHora = document.getElementById("hora");
  const elData = document.getElementById("data");
  const btnHome= document.getElementById("btn-voltar-home");

  /* ---------- Relógio ---------- */
  function tick() {
    const d = new Date();
    elHora.textContent = d.toLocaleTimeString("pt-BR", { hour12: false });
    elData.textContent = d.toLocaleDateString("pt-BR", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric"
    });
  }
  setInterval(tick, 1000); tick();

  /* ---------- Sons (Web Audio API — sem precisar de arquivos) ---------- */
  let audioCtx = null;
  function getCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }
  function beep(freq, dur, type = "sine", when = 0, gainV = 0.25) {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gainV;
    osc.connect(g); g.connect(ctx.destination);
    const t = ctx.currentTime + when;
    osc.start(t);
    g.gain.setValueAtTime(gainV, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.stop(t + dur);
  }
  function tocarSom(n) {
    try {
      const ctx = getCtx();
      if (ctx.state === "suspended") ctx.resume();
      switch (Number(n)) {
        case 1: // campainha
          beep(880, 0.25, "sine", 0); beep(660, 0.35, "sine", 0.28); break;
        case 2: // sino
          beep(1046, 0.5, "triangle", 0); beep(1568, 0.6, "triangle", 0.05); break;
        case 3: // bipe curto duplo
          beep(1200, 0.12, "square", 0, 0.18);
          beep(1200, 0.12, "square", 0.18, 0.18); break;
        case 4: // alarme suave
          beep(523, 0.35, "sine", 0); beep(659, 0.35, "sine", 0.35);
          beep(784, 0.5, "sine", 0.7); break;
        case 5: // notificação
          beep(1000, 0.15, "sine", 0); beep(1400, 0.15, "sine", 0.18);
          beep(1000, 0.2, "sine", 0.36); break;
        default: beep(880, 0.3, "sine", 0);
      }
    } catch (e) { console.warn("Áudio indisponível:", e); }
  }

  /* ---------- Histórico (últimas 5 chamadas de qualquer sala) ---------- */
  function atualizarHistorico(call) {
    let hist = [];
    try { hist = JSON.parse(sessionStorage.getItem(HIST_KEY) || "[]"); } catch (_) {}
    hist.unshift({ ...call, ts: Date.now() });
    hist = hist.slice(0, 5);
    sessionStorage.setItem(HIST_KEY, JSON.stringify(hist));
    renderHistorico(hist);
  }
  function renderHistorico(hist) {
    if (!hist.length) {
      elHist.innerHTML = "<li style='opacity:.6'>Sem chamadas recentes</li>";
      return;
    }
    elHist.innerHTML = hist.map((c) => `
      <li>
        <span class="h-hora">${c.hora || ""}</span>
        <div class="h-pac">${escapeHtml(c.paciente || "")}</div>
        <div class="h-info">${escapeHtml(c.salaNome || "")} • ${escapeHtml(c.profissional || "")}</div>
      </li>
    `).join("");
  }

  /* ---------- Receber chamadas ---------- */
  let ultimoTs = 0;
  function aoReceber(call) {
    if (!call || !call.paciente) return;
    if (call.ts && call.ts === ultimoTs) return; // evita duplicar
    ultimoTs = call.ts || Date.now();

    elPac.textContent = call.paciente;
    elProf.textContent = call.profissional || "—";
    elSala.textContent = call.salaNome || ("Sala " + call.salaId);

    tocarSom(call.som || 1);
    atualizarHistorico(call);
  }

  Sync.onCall(aoReceber);

  Sync.ready().then(() => {
    Sync.fetchLast().then((last) => { if (last) aoReceber(last); });
  });

  /* ---------- Botão voltar ao início ---------- */
  btnHome.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  /* ---------- util ---------- */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
})();