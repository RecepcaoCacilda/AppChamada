# Painel de Chamada – UBS Cacilda Fogaça de Almeida
Secretaria de Saúde de Iperó

## Como funciona
- **Consultórios** abrem `consultorio.html`, escolhem a sala (15 disponíveis, editáveis),
  informam o profissional e chamam pacientes.
- **Telões** abrem `telao.html` e exibem automaticamente a última chamada.
- Cada consultório só pode chamar um paciente por vez; o próximo só é liberado após
  o término da chamada anterior (8 segundos).

## Modos de sincronização
### 1) Modo local (padrão, sem configuração)
Funciona apenas entre abas do **mesmo navegador** (BroadcastChannel + localStorage).
Bom para testar.

### 2) Modo Firebase (recomendado para produção — multi-dispositivo)
1. Crie um projeto em https://console.firebase.google.com
2. Ative o **Realtime Database** (modo de teste).
3. Copie as credenciais e cole em `js/firebase-config.js`.
4. Pronto: todos os dispositivos sincronizam em tempo real.

## Personalizar as 15 salas
Na tela **"Selecione o Consultório"**, clique em **"editar"** em qualquer botão de sala
para alterar o **nome da sala** e o **profissional padrão**. As alterações ficam salvas
no navegador (localStorage).

## Sinal sonoro
Na tela de chamada há 5 opções de som (campainha, sino, bipe, alarme suave, notificação).
O telão reproduz o som escolhido. Nenhum arquivo MP3 é necessário — os sons são gerados
via Web Audio API.

## Voltar à página inicial
- Na tela do telão há um **botão redondo no canto inferior esquerdo** (⌂).
- Nas telas de consultório há o link **"← Voltar à Página Inicial"**.

## Estrutura
painel-ubs/
├── index.html          → Página inicial
├── consultorio.html    → Seleção + tela de chamada
├── telao.html          → Telão de chamadas
├── css/
│   ├── style.css       → Estilos globais
│   ├── consultorio.css → Estilos do consultório
│   └── telao.css       → Estilos do telão
├── js/
│   ├── firebase-config.js → Configuração Firebase (você preenche)
│   ├── sync.js            → Camada de sincronização (Firebase OU local)
│   ├── consultorio.js     → Lógica do consultório
│   └── telao.js           → Lógica do telão
├── assets/
│   └── logo.svg        → Logo da UBS (placeholder)
└── README.md