/* ============================================================
   Painel do Consultório
   - Seleção de sala (15 salas editáveis)
   - Chamada de paciente com bloqueio de 8 segundos
   - Histórico local das últimas chamadas desta sala
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Constantes ---------- */
  const DURACAO_CHAMADA_MS = 8000;
  const SALAS_KEY  = (window.UBS_SYNC_PREFIX || "ubs") + ":salas";
  const PROF_KEY   = (window.UBS_SYNC_PREFIX || "ubs") + ":profissional";
  const HIST_KEY   = (window.UBS_SYNC_PREFIX || "ubs") + ":historico-sala";

  const SALAS_PADRAO = [
    { id: 1,  nome: "Consultório 1"  },
    { id: 2,  nome: "Consultório 2"  },
    { id: 3,  nome: "Consultório 3"  },
    { id: 4,  nome: "Consultório 4"  },
    { id: 5,  nome: "Consultório 5"  },
    { id: 6,  nome: "Consultório 6"  },
    { id: 7,  nome: "Consultório 7"  },
    { id: 8,  nome: "Consultório 8"  },
    { id: 9,  nome: "Consultório 9"  },
    { id: 10, nome: "Consultório 10" },
    { id: 11, nome: "Consultório 11" },
    { id: 12, nome: "Consultório 12" },
    { id: 13, nome: "Consultório 13" },
    { id: 14, nome: "Consultório 14" },
    { id: 15, nome: "Consultório 15" }
  ];

  /* ---------- Elementos ---------- */
  const telaSelecao   = document.getElementById("tela-selecao");
  const telaChamada   = document.getElementById("tela-chamada");
  const gridSalas     = document.getElementById("grid-salas");
  const formProf      = document.getElementById("form-profissional");
  const inputProf     = document.getElementById("input-profissional");
  const chkLembrar    = document.getElementById("chk-lembrar");
  const cabSala       = document.getElementById("cab-sala");
  const cabProf       = document.getElementById("cab-profissional");
  const btnTrocar     = document.getElementById("btn-trocar");
  const inputPac      = document.getElementById("input-paciente");
  const btnChamar     = document.getElementById("btn-chamar");
  const btnRepetir    = document.getElementById("btn-repetir");
  const statusEnvio   = document.getElementById("status-envio");
  const listaHistorico= document.getElementById("lista-historico");

  const modalBloqueio = document.getElementById("modal-bloqueio");
  const modalTexto    = document.getElementById("modal-texto");

  /* ---------- Estado ---------- */
  let salas = carregarSalas();
  let salaSelecionada = null;
  let profissional = "";
  let chamadaEmAndamento = false;
  let timeoutLiberacao = null;
  let ultimaChamada = null;

  /* ---------- Persistência ---------- */
  function carregarSalas() {
    try {
      const raw = localStorage.getItem(SALAS_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) return arr;
      }
    } catch (_) {}
    return SALAS_PADRAO.slice();
  }
  function salvarSalas() {
    try { localStorage.setItem(SALAS_KEY, JSON.stringify(salas)); } catch (_) {}
  }
  function carregarHistorico() {
    try {
      const raw = sessionStorage.getItem(HIST_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return [];
  }
  function salvarHistorico(hist) {
    try { sessionStorage.setItem(HIST_KEY, JSON.stringify(hist)); } catch (_) {}
  }

  /* ---------- Renderização: grid de salas ---------- */
  function renderGrid() {
    gridSalas.innerHTML = "";
    salas.forEach((sala) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-sala";
      btn.innerHTML = `
        <span class="num">SALA ${String(sala.id).padStart(2, "0")}</span>
        <span class="nome">${escapeHtml(sala.nome)}</span>
        <span class="edit" data-edit="${sala.id}">editar</span>
      `;
      btn.addEventListener("click", (ev) => {
        if (ev.target.dataset.edit) {
          ev.stopPropagation();
          abrirEdicaoSala(sala.id);
          return;
        }
        selecionarSala(sala.id);
      });
      gridSalas.appendChild(btn);
    });
  }

  /* ---------- Seleção de sala ---------- */
  function selecionarSala(id) {
    salaSelecionada = salas.find((s) => s.id === id) || null;
    if (!salaSelecionada) return;

    // Marca visualmente
    [...gridSalas.children].forEach((b, idx) => {
      b.classList.toggle("ativo", salas[idx].id === id);
    });

    formProf.hidden = false;
    inputProf.value = profissional || "";
    inputProf.focus();
  }

  /* ---------- Edição de sala ---------- */
  function abrirEdicaoSala(id) {
    const sala = salas.find((s) => s.id === id);
    if (!sala) return;

    const overlay = document.createElement("div");
    overlay.className = "edit-modal aberto";
    overlay.innerHTML = `
      <div class="box">
        <h3>Editar Sala ${String(sala.id).padStart(2, "0")}</h3>
        <label>Nome da sala</label>
        <input type="text" id="edit-nome" value="${escapeAttr(sala.nome)}" />
        <label>Profissional padrão (opcional)</label>
        <input type="text" id="edit-prof" value="${escapeAttr(sala.profissional || "")}" />
        <div class="row">
          <button class="btn-secondary" data-acao="cancelar">Cancelar</button>
          <button class="btn-primary" data-acao="salvar">Salvar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (ev) => {
      if (ev.target === overlay || ev.target.dataset.acao === "cancelar") {
        overlay.remove();
        return;
      }
      if (ev.target.dataset.acao === "salvar") {
        const novoNome = overlay.querySelector("#edit-nome").value.trim();
        const novoProf = overlay.querySelector("#edit-prof").value.trim();
        if (novoNome) sala.nome = novoNome;
        sala.profissional = novoProf;
        salvarSalas();
        renderGrid();
        overlay.remove();
      }
    });
  }

  /* ---------- Confirmação do profissional ---------- */
  formProf.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const nome = inputProf.value.trim();
    if (!nome || !salaSelecionada) return;

    profissional = nome;

    if (chkLembrar.checked) {
      try { localStorage.setItem(PROF_KEY, nome); } catch (_) {}
    } else {
      try { localStorage.removeItem(PROF_KEY); } catch (_) {}
    }

    entrarNaChamada();
  });

  function entrarNaChamada() {
    telaSelecao.hidden = true;
    telaChamada.hidden = false;
    cabSala.textContent = salaSelecionada.nome;
    cabProf.textContent = profissional;
    inputPac.value = "";
    inputPac.focus();
    renderHistorico();
    limparStatus();
  }

  /* ---------- Trocar consultório ---------- */
  btnTrocar.addEventListener("click", () => {
    if (chamadaEmAndamento) return; // evita trocar no meio de uma chamada
    telaChamada.hidden = true;
    telaSelecao.hidden = false;
    formProf.hidden = true;
    salaSelecionada = null;
    [...gridSalas.children].forEach((b) => b.classList.remove("ativo"));
  });

  /* ---------- Envio de chamada ---------- */
  function somSelecionado() {
    const el = document.querySelector('input[name="som"]:checked');
    return el ? Number(el.value) : 1;
  }

  function limparStatus() {
    statusEnvio.textContent = "";
    statusEnvio.classList.remove("erro");
  }

  function mostrarStatus(msg, erro = false) {
    statusEnvio.textContent = msg;
    statusEnvio.classList.toggle("erro", erro);
  }

  btnChamar.addEventListener("click", () => {
    if (chamadaEmAndamento) return;
    const paciente = inputPac.value.trim();
    if (!paciente) {
      mostrarStatus("Digite o nome do paciente.", true);
      inputPac.focus();
      return;
    }
    publicarChamada(paciente);
  });

  btnRepetir.addEventListener("click", () => {
    if (chamadaEmAndamento) return;
    if (!ultimaChamada) return;
    publicarChamada(ultimaChamada.paciente, true);
  });

  async function publicarChamada(paciente, repetir = false) {
    const agora = new Date();
    const hora = agora.toLocaleTimeString("pt-BR", { hour12: false });

    const chamada = {
      paciente,
      profissional,
      salaId: salaSelecionada.id,
      salaNome: salaSelecionada.nome,
      som: somSelecionado(),
      hora
    };

    try {
      await Sync.publish(chamada);
      ultimaChamada = chamada;
      mostrarStatus(repetir
        ? `Chamada repetida: ${paciente}`
        : `Chamando: ${paciente}`);
      adicionarHistorico(chamada);
      bloquearProxima();
    } catch (e) {
      console.error(e);
      mostrarStatus("Falha ao enviar chamada. Tente novamente.", true);
    }
  }

  /* ---------- Bloqueio entre chamadas ---------- */
  function bloquearProxima() {
    chamadaEmAndamento = true;
    btnChamar.disabled = true;
    btnRepetir.disabled = true;
    modalTexto.textContent =
      "Aguardando o término da chamada anterior para liberar o próximo paciente…";
    modalBloqueio.classList.add("aberto");

    clearTimeout(timeoutLiberacao);
    timeoutLiberacao = setTimeout(() => {
      chamadaEmAndamento = false;
      btnChamar.disabled = false;
      btnRepetir.disabled = false;
      modalBloqueio.classList.remove("aberto");
      inputPac.value = "";
      inputPac.focus();
      limparStatus();
    }, DURACAO_CHAMADA_MS);
  }

  /* ---------- Histórico local ---------- */
  function adicionarHistorico(chamada) {
    const hist = carregarHistorico();
    hist.unshift({ ...chamada, ts: Date.now() });
    const cortado = hist.slice(0, 10);
    salvarHistorico(cortado);
    renderHistorico();
  }

  function renderHistorico() {
    const hist = carregarHistorico();
    if (!hist.length) {
      listaHistorico.innerHTML =
        "<li style='opacity:.6;justify-content:center'>Sem chamadas recentes</li>";
      return;
    }
    listaHistorico.innerHTML = hist.map((c) => `
      <li>
        <span>${escapeHtml(c.paciente)}</span>
        <span class="hora">${escapeHtml(c.hora || "")}</span>
      </li>
    `).join("");
  }

  /* ---------- Recupera profissional lembrado ---------- */
  (function init() {
    try {
      const salvo = localStorage.getItem(PROF_KEY);
      if (salvo) {
        profissional = salvo;
        chkLembrar.checked = true;
      }
    } catch (_) {}
    renderGrid();
  })();

  /* ---------- Utilitários ---------- */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, "&quot;");
  }
})();