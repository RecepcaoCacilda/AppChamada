/* ============================================================
   CONFIGURAÇÃO DO FIREBASE (opcional)
   ------------------------------------------------------------
   Se você preencher os dados abaixo, o sistema sincroniza
   em tempo real ENTRE DISPOSITIVOS (celulares, computadores)
   através do Firebase Realtime Database (gratuito).

   Se deixar em branco, o sistema funciona apenas entre abas
   do MESMO navegador (modo local, ideal para testes).

   COMO CONFIGURAR (5 minutos):
   1) Acesse https://console.firebase.google.com
   2) Crie um projeto (ex.: painel-ubs-ipero)
   3) Vá em "Criar banco de dados" → Realtime Database → Iniciar em modo de teste
   4) Vá em Configurações do Projeto → Seus apps → Web (</>)
   5) Copie os valores e cole abaixo.
   ============================================================ */

window.FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

/* PREFIXO ÚNICO PARA ESTA UBS (não precisa mudar) */
window.UBS_SYNC_PREFIX = "ubs-cacilda-fogaca-ipero";