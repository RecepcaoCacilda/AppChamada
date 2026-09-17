/* ============================================================
   Telão de Chamadas (responsivo + leitura de voz)
   ============================================================ */
(function () {
  "use strict";

  const HIST_KEY = (window.UBS_SYNC_PREFIX || "ubs") + ":historico";

  const elPac   = document.getElementById("paciente-atual");
  const elProf  = document.getElementById("profissional-atual");
  const elSala  = document.getElementById("sala-atual");
  const elHist  = document.getElementById("historico-lista");
  const elHora  = document.getElementById("hora");
  const elData  = document.getElementById("data");
  const btnHome = document.getElementById("btn-voltar-home");
  const btnAudio= document.getElementById("btn-ativar-audio");

  const VOZ_CONFIG = {
    lang: "pt-BR",
    rate: 0.95,
    pitch: 1.0,
    volume: 1.0,
    repetir: 2,
    pausaEntreRepeticoes: 900,
    pausaAposSom: 700
  };

  let audioAtivado = false;
  let vozesDisponiveis = [];

  function carregarVozes() {
    if (!("speechSynthesis" in window)) return;
    vozesDisponiveis = window.speechSynthesis.getVoices();
  }
  if ("speechSynthesis" in window) {
    carregarVozes();
    window.speechSynthesis.onvoiceschanged = carregarVozes;
  }

  function escolherVoz() {
    if (!vozesDisponiveis.length) return null;
    return (
      vozesDisponiveis.find((v) => v.lang === "pt-BR") ||
      vozesDisponiveis.find((v) => v.lang && v.lang.startsWith("pt")) ||
      null
    );
  }

  function tick() {
    const d = new Date();
    elHora.textContent = d.toLocaleTimeString("pt-BR", { hour12: false });
    elData.textContent = d.toLocaleDateString("pt-BR", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric"
    });
  }
  setInterval(tick, 1000); tick();

  let audioCtx = null;
  function getCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
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
        case 1:
          beep(880, 0.25, "sine", 0); beep(660, 0.35, "sine", 0.28); break;
        case 2:
          beep(1046, 0.5, "triangle", 0); beep(1568, 0.6, "triangle", 0.05); break;
        case 3:
          beep(1200, 0.12, "square", 0, 0.18);
          beep(1200, 0.12, "square", 0.18, 0.18); break;
        case 4:
          beep(523, 0.35, "sine", 0); beep(659, 0.35, "sine", 0.35);
          beep(784, 0.5, "sine", 0.7); break;
        case 5:
          beep(1000, 0.15, "sine", 0); beep(1400, 0.15, "sine", 0.18);
          beep(1000, 0.2, "sine", 0.36); break;
        default:
          beep(880, 0.3, "sine", 0);
      }
    } catch (e) { console.warn("Áudio indisponível:", e); }
  }

  let elOuvindo = null;
  function mostrarIndicadorLeitura(ativo) {
    if (!elOuvindo) {
      elOuvindo = document.createElement("div");
      elOuvindo.className = "ouvindo";
      elOuvindo.innerHTML = '<span class="bolinha"></span> Lendo nome do paciente…';
      document.body.appendChild(elOuvindo);
    }
    elOuvindo.classList.toggle("ativo", !!ativo);
  }

  function falarNome(paciente, profissional, salaNome, repetir = 1) {
    if (!("speechSynthesis" in window)) return;
    if (!audioAtivado) return;

    const texto = repetir > 1 ? `${paciente}. ${paciente}.` : paciente;
    const utter = new SpeechSynthesisUtterance(texto);
    utter.lang   = VOZ_CONFIG.lang;
    utter.rate   = VOZ_CONFIG.rate;
    utter.pitch  = VOZ_CONFIG.pitch;
    utter.volume = VOZ_CONFIG.volume;

    const voz = escolherVoz();
    if (voz) utter.voice = voz;

    utter.onstart = () => mostrarIndicadorLeitura(true);
    utter.onend   = () => mostrarIndicadorLeitura(false);
    utter.onerror = () => mostrarIndicadorLeitura(false);

    try { window.speechSynthesis.cancel(); } catch (_) {}
    window.speechSynthesis.speak(utter);
  }

  function anunciarPaciente(call) {
    const som = Number(call.som || 1);
    tocarSom(som);
    setTimeout(() => {
      falarNome(call.paciente, call.profissional, call.salaNome, VOZ_CONFIG.repetir);
    }, VOZ_CONFIG.pausaAposSom);
  }

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

  let ultimoTs = 0;
  function aoReceber(call) {
    if (!call || !call.paciente) return;
    if (call.ts && call.ts === ultimoTs) return;
    ultimoTs = call.ts || Date.now();

    elPac.textContent  = call.paciente;
    elProf.textContent = call.profissional || "—";
    elSala.textContent = call.salaNome || ("Sala " + call.salaId);

    anunciarPaciente(call);
    atualizarHistorico(call);
  }

  Sync.onCall(aoReceber);

  Sync.ready().then(() => {
    Sync.fetchLast().then((last) => {
      if (last) {
        elPac.textContent  = last.paciente;
        elProf.textContent = last.profissional || "—";
        elSala.textContent = last.salaNome || ("Sala " + last.salaId);
        atualizarHistorico(last);
      }
    });
  });

  function ativarAudio() {
    audioAtivado = true;
    try {
      const ctx = getCtx();
      if (ctx.state === "suspended") ctx.resume();
    } catch (_) {}
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
    btnAudio.classList.add("oculto");
  }

  btnAudio.addEventListener("click", ativarAudio);
  document.addEventListener("click", () => {
    if (!audioAtivado) ativarAudio();
  }, { once: true });

  btnHome.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
})();