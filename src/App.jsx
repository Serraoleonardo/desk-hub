import { useState, useRef, useEffect } from "react";

// ── CONSTANTES ────────────────────────────────────────────────────────────────
const ATENDENTES = [
  { id: 1, nome: "Lucas", avatar: "LU", setor: "Suporte Acesso à conta",             status: "online"  },
  { id: 2, nome: "Lucas", avatar: "LU", setor: "Suporte Integrações",  status: "online"  },
  { id: 3, nome: "Lucas", avatar: "LU", setor: "Suporte Relatórios", status: "ocupado" },
  { id: 4, nome: "Júlia",   avatar: "JU", setor: "Suporte Financeiro",     status: "online"  },
];

const STATUS_ATENDENTE = {
  online:  { cor: "#10b981", label: "Online"  },
  ocupado: { cor: "#f59e0b", label: "Ocupado" },
  ausente: { cor: "#9ca3af", label: "Ausente" },
};

const PRODUTOS = [
  { id: 1, nome: "Financeiro"     },
  { id: 2, nome: "Acesso à conta"             },
  { id: 3, nome: "Integrações"  },
  { id: 4, nome: "Relatórios" },
];

const CANAL_CONFIG = {
  whatsapp: { cor: "#01f058", icon: "💬", label: "WhatsApp" },
  email:    { cor: "#e72413", icon: "✉️", label: "E-mail"   },
  chat:     { cor: "#ff00ea", icon: "🌐", label: "Chat"     },
};

const STATUS_CONFIG = {
  aberto:         { cor: "#f59e0b", label: "Aberto"         },
  em_atendimento: { cor: "#0088FF", label: "Em atendimento" },
  resolvido:      { cor: "#10b981", label: "Resolvido"      },
  triagem:        { cor: "#8b5cf6", label: "Triagem"        },
  aguardando_nps: { cor: "#f59e0b", label: "Aguardando NPS" },
};

const CATEGORIAS_FINALIZACAO = [
  { id: "correcao",     label: "Chamado de correção",    icone: "🔧", cor: "#000000" },
  { id: "habilitacao",  label: "Habilitação de usuários",icone: "👤", cor: "#000000" },
  { id: "priorizacao",  label: "Priorização",            icone: "⚡", cor: "#000000" },
  { id: "cancelamento", label: "Atualização de registro",           icone: "✕",  cor: "#000000" },
  { id: "duvida",       label: "Dúvidas Gerais",                 icone: "❓", cor: "#000000" },
  { id: "urgencia",     label: "Pedido de urgência",     icone: "🚨", cor: "#000000" },
];

const PRIORIDADE_CONFIG = {
  urgente: { label: "Urgente", cor: "#ef4444", bg: "#fef2f2", icone: "🔴", slaMin: 20  },
  alta:    { label: "Alta",    cor: "#f97316", bg: "#fff7ed", icone: "🟠", slaMin: 20  },
  normal:  { label: "Normal",  cor: "#3b82f6", bg: "#eff6ff", icone: "🔵", slaMin: 60  },
  baixa:   { label: "Baixa",   cor: "#9ca3af", bg: "#f9fafb", icone: "⚪", slaMin: 30  },
};

// Formata tempo em mm:ss ou hh:mm
const formatarTempo = (segundos) => {
  if (segundos < 3600) {
    const m = Math.floor(segundos / 60);
    const s = segundos % 60;
    return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  }
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  return `${h}h${String(m).padStart(2,"0")}`;
};

const getSlaStatus = (segundos, prio) => {
  const limiteSegundos = (PRIORIDADE_CONFIG[prio]?.slaMin || 30) * 60;
  const pct = segundos / limiteSegundos;
  if (pct >= 1)    return { cor: "#ef4444", label: "SLA vencido",  pisca: true  };
  if (pct >= 0.75) return { cor: "#f97316", label: "SLA crítico",  pisca: false };
  return               { cor: "#10b981", label: "No prazo",      pisca: false };
};

// Prioridade automática por tempo de espera (minutos)
const getPrioridadeAuto = (tempoResposta) => {
  if (tempoResposta >= 15) return "urgente";
  if (tempoResposta >= 8)  return "alta";
  if (tempoResposta >= 3)  return "normal";
  return "baixa";
};

// IDs dos produtos que NÃO exigem CARD (apenas Acesso à conta = id 2)
const PRODUTOS_SEM_CARD = [2];

// Etapas do bot de triagem
const TRIAGEM_ETAPAS = {
  inicio:   "inicio",
  assunto:  "assunto",
  card:     "card",
  concluido:"concluido",
};

const getSaudacao = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
};

const RESPOSTAS_RAPIDAS = [
  "Olá! Em que posso te ajudar hoje?",
  "Pode me informar o número do seu pedido?",
  "Vou verificar isso para você, um momento!",
  "Problema resolvido! Posso te ajudar com mais alguma coisa?",
  "Vou escalar para nossa equipe especializada.",
];

const CONTATOS_INICIAIS = [
  {
    id: 1, nome: "Ana Lima", canal: "whatsapp", status: "aberto", naoLidas: 3,
    avatar: "AL", ultimaMensagem: "Estou com dificuldade para assinar o documento.", hora: "09:14",
    atendente: ATENDENTES[0], produto: PRODUTOS[1], tempoResposta: 4,
    telefone: "(11) 98765-4321", email: "ana.lima@email.com", anotacoes: "",
    iniciadoEm: Date.now() - 4 * 60 * 1000,
    mensagens: [
      { id: 1, de: "cliente", texto: "Oi, boa tarde!", hora: "09:10" },
      { id: 2, de: "cliente", texto: "Estou com dificuldade para assinar o documento.", hora: "09:11" },
      { id: 3, de: "cliente", texto: "Olá, ainda aguardo retorno...", hora: "09:14" },
    ],
  },
  {
    id: 2, nome: "Bruno Souza", canal: "email", status: "aberto", naoLidas: 1,
    avatar: "BS", ultimaMensagem: "Preciso de suporte no registro", hora: "08:52",
    atendente: ATENDENTES[1], produto: PRODUTOS[2], tempoResposta: 7,
    telefone: "(21) 97654-3210", email: "bruno.souza@empresa.com.br", anotacoes: "",
    mensagens: [
      { id: 1, de: "cliente", texto: "Bom dia! Preciso de ajuda com o Integrações. O processo travou na etapa de validação.", hora: "08:52" },
    ],
  },
  {
    id: 3, nome: "Carol Mendes", canal: "chat", status: "em_atendimento", naoLidas: 0,
    avatar: "CM", ultimaMensagem: "Perfeito, obrigada! 😊", hora: "08:30",
    atendente: ATENDENTES[3], produto: PRODUTOS[0], tempoResposta: 3,
    telefone: "(31) 96543-2109", email: "carol.mendes@gmail.com", anotacoes: "Cliente VIP - atender com prioridade",
    mensagens: [
      { id: 1, de: "cliente", texto: "Oi! Não estou conseguindo acessar o Financeiro.", hora: "08:20" },
      { id: 2, de: "agente",  texto: "Olá Carol! Vou verificar aqui para você.", hora: "08:22" },
      { id: 3, de: "cliente", texto: "É urgente, preciso do relatório hoje.", hora: "08:25" },
      { id: 4, de: "agente",  texto: "Já identifiquei o problema. Estou resolvendo agora!", hora: "08:28" },
      { id: 5, de: "cliente", texto: "Perfeito, obrigada! 😊", hora: "08:30" },
    ],
  },
  {
    id: 4, nome: "Diego Ferreira", canal: "whatsapp", status: "resolvido", naoLidas: 0,
    avatar: "DF", ultimaMensagem: "Ok, pode fechar. Valeu!", hora: "07:45",
    atendente: ATENDENTES[2], produto: PRODUTOS[3], tempoResposta: 5,
    telefone: "(41) 95432-1098", email: "diego.ferreira@outlook.com", anotacoes: "",
    mensagens: [
      { id: 1, de: "cliente", texto: "Preciso de ajuda com o Relatórios.", hora: "07:40" },
      { id: 2, de: "agente",  texto: "Claro! Me informe o número do processo.", hora: "07:43" },
      { id: 3, de: "cliente", texto: "Ok, pode fechar. Valeu!", hora: "07:45" },
    ],
  },
  {
    id: 5, nome: "Elisa Rocha", canal: "chat", status: "aberto", naoLidas: 2,
    avatar: "ER", ultimaMensagem: "Quando fica pronto?", hora: "Agora",
    atendente: ATENDENTES[0], produto: PRODUTOS[1], tempoResposta: 2,
    telefone: "(51) 94321-0987", email: "elisa.rocha@empresa.com.br", anotacoes: "",
    mensagens: [
      { id: 1, de: "cliente", texto: "Quando fica pronto?", hora: "Agora" },
      { id: 2, de: "cliente", texto: "Já faz 2 dias que enviei o documento para assinar.", hora: "Agora" },
    ],
  },
];

// ── USUÁRIOS (login) ──────────────────────────────────────────────────────────
const USUARIOS_INICIAIS = [
  { id: 1, nome: "Lucas Martins", email: "lucas@empresa.com.br", senha: "demo123",  avatar: "LU", atendentesIds: [1, 2, 3], primeiroAcesso: false, admin: false },
  { id: 2, nome: "Júlia",          email: "julia@empresa.com.br",   senha: "demo123",  avatar: "JU", atendentesIds: [4],       primeiroAcesso: false, admin: false },
  { id: 99, nome: "Administrador",  email: "admin@empresa.com.br",    senha: "demo123",avatar: "AD", atendentesIds: [],        primeiroAcesso: false, admin: true  },
];

const SETORES_DISPONIVEIS = [
  "Suporte Acesso à conta",
  "Suporte Integrações",
  "Suporte Relatórios",
  "Suporte Financeiro",
  "Comercial",
  "Financeiro",
];


const HISTORICO = [
  { id: 101, nome: "Fábio Nunes",    canal: "whatsapp", produto: PRODUTOS[1], atendente: ATENDENTES[0], duracao: "8min",  data: "05/03", status: "resolvido",
    mensagens: [
      { id: 1, de: "cliente", texto: "Oi, não consigo assinar o contrato.", hora: "10:02" },
      { id: 2, de: "agente",  texto: "Olá Fábio! Me passa o número do documento.", hora: "10:04" },
      { id: 3, de: "cliente", texto: "É o doc #8821.", hora: "10:05" },
      { id: 4, de: "agente",  texto: "Encontrei. Havia um erro no certificado. Já corrigi!", hora: "10:08" },
      { id: 5, de: "cliente", texto: "Perfeito, consegui assinar. Obrigado!", hora: "10:10" },
      { id: 6, de: "agente",  texto: "Ótimo! Qualquer coisa estamos aqui. 😊", hora: "10:10" },
    ]},
  { id: 102, nome: "Rita Carvalho",  canal: "email",    produto: PRODUTOS[0], atendente: ATENDENTES[3], duracao: "12min", data: "05/03", status: "resolvido",
    mensagens: [
      { id: 1, de: "cliente", texto: "Preciso emitir 3 notas fiscais com urgência.", hora: "09:15" },
      { id: 2, de: "agente",  texto: "Olá Rita! Quais os números dos pedidos?", hora: "09:18" },
      { id: 3, de: "cliente", texto: "Rua das Flores 10, Av. Brasil 45 e Rua do Sol 88.", hora: "09:20" },
      { id: 4, de: "agente",  texto: "Solicitado para os 3. Prazo: 2h úteis.", hora: "09:25" },
      { id: 5, de: "cliente", texto: "Ótimo, obrigada!", hora: "09:27" },
    ]},
  { id: 103, nome: "Marcos Pinho",   canal: "chat",     produto: PRODUTOS[2], atendente: ATENDENTES[1], duracao: "5min",  data: "05/03", status: "resolvido",
    mensagens: [
      { id: 1, de: "cliente", texto: "Minha integração deu erro na validação.", hora: "14:00" },
      { id: 2, de: "agente",  texto: "Qual o número do protocolo, Marcos?", hora: "14:01" },
      { id: 3, de: "cliente", texto: "Protocolo 2024-3391.", hora: "14:02" },
      { id: 4, de: "agente",  texto: "Identificado! O CPF estava com dígito errado. Corrigido agora.", hora: "14:04" },
      { id: 5, de: "cliente", texto: "Resolvido, valeu!", hora: "14:05" },
    ]},
  { id: 104, nome: "Luana Teixeira", canal: "whatsapp", produto: PRODUTOS[3], atendente: ATENDENTES[2], duracao: "15min", data: "04/03", status: "resolvido",
    mensagens: [
      { id: 1, de: "cliente", texto: "Boa tarde! Não encontro meu relatório mensal.", hora: "16:10" },
      { id: 2, de: "agente",  texto: "Boa tarde Luana! Me passa o CNPJ da empresa.", hora: "16:12" },
      { id: 3, de: "cliente", texto: "12.345.678/0001-99", hora: "16:13" },
      { id: 4, de: "agente",  texto: "Localizado! O registro estava pendente de uma assinatura. Enviamos o link agora.", hora: "16:20" },
      { id: 5, de: "cliente", texto: "Assinei! Apareceu aqui. Muito obrigada!", hora: "16:25" },
    ]},
  { id: 105, nome: "Pedro Alves",    canal: "chat",     produto: PRODUTOS[1], atendente: ATENDENTES[0], duracao: "6min",  data: "04/03", status: "resolvido",
    mensagens: [
      { id: 1, de: "cliente", texto: "O sistema não aceita minha assinatura digital.", hora: "11:30" },
      { id: 2, de: "agente",  texto: "Olá Pedro! Qual o navegador você está usando?", hora: "11:31" },
      { id: 3, de: "cliente", texto: "Chrome, versão antiga.", hora: "11:32" },
      { id: 4, de: "agente",  texto: "Esse é o problema! Por favor atualize ou use o Edge. Funciona perfeitamente.", hora: "11:34" },
      { id: 5, de: "cliente", texto: "Funcionou no Edge! Obrigado.", hora: "11:36" },
    ]},
  { id: 106, nome: "Sônia Martins",  canal: "email",    produto: PRODUTOS[0], atendente: ATENDENTES[3], duracao: "9min",  data: "04/03", status: "resolvido",
    mensagens: [
      { id: 1, de: "cliente", texto: "Bom dia! Meus pedidos estão com atraso.", hora: "08:45" },
      { id: 2, de: "agente",  texto: "Bom dia Sônia! Verificando o pedido agora.", hora: "08:47" },
      { id: 3, de: "cliente", texto: "Número do pedido: C-4412.", hora: "08:48" },
      { id: 4, de: "agente",  texto: "Houve uma instabilidade no sistema. Os pedidos chegam até 12h de hoje.", hora: "08:52" },
      { id: 5, de: "cliente", texto: "Ok, aguardo. Obrigada pela atenção.", hora: "08:54" },
    ]},
  { id: 107, nome: "Gustavo Lima",   canal: "whatsapp", produto: PRODUTOS[2], atendente: ATENDENTES[1], duracao: "11min", data: "03/03", status: "resolvido",
    mensagens: [
      { id: 1, de: "cliente", texto: "Oi, o sistema rejeitou meu registro.", hora: "13:00" },
      { id: 2, de: "agente",  texto: "Olá Gustavo! Qual o motivo exibido na tela?", hora: "13:02" },
      { id: 3, de: "cliente", texto: "Diz: 'Documento fora do prazo de validade'.", hora: "13:04" },
      { id: 4, de: "agente",  texto: "Seu RG expirou. Você precisa anexar um documento válido.", hora: "13:08" },
      { id: 5, de: "cliente", texto: "Anexei a CNH. Aceitou! Obrigado.", hora: "13:11" },
    ]},
  { id: 108, nome: "Beatriz Costa",  canal: "chat",     produto: PRODUTOS[3], atendente: ATENDENTES[2], duracao: "4min",  data: "03/03", status: "resolvido",
    mensagens: [
      { id: 1, de: "cliente", texto: "Como faço para incluir um novo usuário na minha conta?", hora: "15:20" },
      { id: 2, de: "agente",  texto: "Olá Beatriz! Vá em Empresa > Sócios > Adicionar.", hora: "15:21" },
      { id: 3, de: "cliente", texto: "Aparece um erro ao salvar.", hora: "15:22" },
      { id: 4, de: "agente",  texto: "Precisa anexar o contrato social atualizado primeiro.", hora: "15:23" },
      { id: 5, de: "cliente", texto: "Consegui! Muito obrigada.", hora: "15:24" },
    ]},
  { id: 109, nome: "André Souza",    canal: "email",    produto: PRODUTOS[1], atendente: ATENDENTES[0], duracao: "7min",  data: "02/03", status: "resolvido",
    mensagens: [
      { id: 1, de: "cliente", texto: "Preciso assinar em lote, é possível?", hora: "10:00" },
      { id: 2, de: "agente",  texto: "Sim André! No menu Documentos > Assinatura em Lote.", hora: "10:02" },
      { id: 3, de: "cliente", texto: "Não aparece essa opção para mim.", hora: "10:04" },
      { id: 4, de: "agente",  texto: "Seu plano atual não inclui essa funcionalidade. Posso te passar as opções de upgrade.", hora: "10:06" },
      { id: 5, de: "cliente", texto: "Pode sim, manda as opções. Obrigado!", hora: "10:07" },
    ]},
  { id: 110, nome: "Patrícia Ramos", canal: "whatsapp", produto: PRODUTOS[0], atendente: ATENDENTES[3], duracao: "10min", data: "02/03", status: "resolvido",
    mensagens: [
      { id: 1, de: "cliente", texto: "Oi! Fiz um pedido há 3 dias e nada.", hora: "09:30" },
      { id: 2, de: "agente",  texto: "Olá Patrícia! Me passa o protocolo da solicitação.", hora: "09:32" },
      { id: 3, de: "cliente", texto: "Protocolo: 7742-B.", hora: "09:33" },
      { id: 4, de: "agente",  texto: "O fornecedor estava em recesso. Reativamos o pedido agora, prazo de 1h.", hora: "09:38" },
      { id: 5, de: "cliente", texto: "Chegou aqui! Obrigada pela agilidade.", hora: "09:40" },
    ]},
];

const GRAFICO_DADOS = [
  { dia: "Seg", total: 8,  resolvidos: 7  },
  { dia: "Ter", total: 12, resolvidos: 10 },
  { dia: "Qua", total: 9,  resolvidos: 8  },
  { dia: "Qui", total: 15, resolvidos: 13 },
  { dia: "Sex", total: 11, resolvidos: 9  },
  { dia: "Sáb", total: 4,  resolvidos: 4  },
  { dia: "Dom", total: 2,  resolvidos: 2  },
];

// ── AVATAR ────────────────────────────────────────────────────────────────────
function Avatar({ iniciais, canal }) {
  const cfg = CANAL_CONFIG[canal];
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg,${cfg.cor}33,${cfg.cor}66)`, border: `2px solid ${cfg.cor}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700, color: cfg.cor }}>{iniciais}</div>
      <div style={{ position: "absolute", bottom: -1, right: -1, width: 16, height: 16, borderRadius: "50%", background: "#fff", border: "1.5px solid #e8f0fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.55rem" }}>{cfg.icon}</div>
    </div>
  );
}

function Badge({ n }) {
  if (!n) return null;
  return <div style={{ background: "#f43f5e", color: "#fff", borderRadius: 99, minWidth: 18, height: 18, fontSize: "0.65rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{n}</div>;
}

// ── HISTÓRICO COM FILTROS ─────────────────────────────────────────────────────
function HistoricoFiltrado({ contatos, historicoSupa = [], carregando = false, onVerConversa, onReabrirConversa }) {
  const [busca,        setBusca]        = useState("");
  const [filtroCanal,  setFiltroCanal]  = useState("todos");
  const [filtroProduto,setFiltroProduto]= useState("todos");
  const [filtroAtend,  setFiltroAtend]  = useState("todos");
  const [filtroCateg,  setFiltroCateg]  = useState("todos");

  // Converte dados do Supabase para o formato do histórico
  const historicoConvertido = historicoSupa.map(h => ({
    id: h.id,
    supabaseId: h.id,
    nome: h.nome || "—",
    canal: h.canal || "chat",
    produto: PRODUTOS.find(p => p.id === h.produto_id) || PRODUTOS[0],
    atendente: ATENDENTES.find(a => a.id === h.atendente_id) || ATENDENTES[0],
    duracao: "—",
    data: h.created_at ? new Date(h.created_at).toLocaleDateString("pt-BR") : "—",
    mensagens: [],
    categoria: null,
    email: h.email || "",
    telefone: h.telefone || "",
    empresa: h.empresa || "",
    card: (h.card && !["aguardando_empresa","aguardando_produto","aguardando_codigo","concluido"].includes(h.card)) ? h.card : null,
    nps: h.nps || null,
  }));

  // Resolvidos da sessão atual
  const resolvidosSessao = contatos.filter(c => c.status === "resolvido").map(c => ({
    id: c.id, nome: c.nome, canal: c.canal, produto: c.produto,
    atendente: c.atendente, duracao: `${c.tempoResposta || 5}min`,
    data: "Hoje", mensagens: c.mensagens, categoria: c.categoria || null,
  }));

  // Junta tudo — sessão primeiro, depois Supabase (sem duplicar)
  const idsSessao = new Set(resolvidosSessao.map(c => c.id));
  const todos = [...resolvidosSessao, ...historicoConvertido.filter(h => !idsSessao.has(h.id))];

  const filtrados = todos.filter(h => {
    if (busca && !h.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtroCanal !== "todos" && h.canal !== filtroCanal) return false;
    if (filtroProduto !== "todos" && h.produto.id !== parseInt(filtroProduto)) return false;
    if (filtroAtend !== "todos" && h.atendente.id !== parseInt(filtroAtend)) return false;
    if (filtroCateg !== "todos" && (!h.categoria || h.categoria.id !== filtroCateg)) return false;
    return true;
  });

  const temFiltro = busca || filtroCanal !== "todos" || filtroProduto !== "todos" || filtroAtend !== "todos" || filtroCateg !== "todos";
  const limpar = () => { setBusca(""); setFiltroCanal("todos"); setFiltroProduto("todos"); setFiltroAtend("todos"); setFiltroCateg("todos"); };

  const exportarCSV = () => {
    const cabecalho = ["Cliente", "Empresa", "Produto", "Número do pedido", "Demanda Solicitada", "Canal", "Atendente", "Categoria", "NPS", "Data"];
    const linhas = filtrados.map(h => {
      // Busca primeira mensagem do cliente como demanda
      const primeiraMsgCliente = (h.mensagens || []).find(m => m.de === "cliente")?.texto || "—";
      return [
        h.nome,
        h.empresa || "—",
        h.produto?.nome || "—",
        h.card || "—",
        primeiraMsgCliente,
        CANAL_CONFIG[h.canal]?.label || h.canal,
        h.atendente?.nome || "—",
        h.categoria?.label || "—",
        h.nps ? `${h.nps}/5` : "—",
        h.data || "—",
      ];
    });
    const conteudo = [cabecalho, ...linhas]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["\uFEFF" + conteudo], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-deskhub-${new Date().toLocaleDateString("pt-BR").replace(/\//g,"-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={r.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={r.cardTitulo}>🗂️ Histórico de conversas</div>
          {carregando && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#e91e8c", animation: "pulse 1.5s infinite" }} />}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{filtrados.length} registro(s)</div>
          <button onClick={exportarCSV}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "0.35rem 0.9rem", background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 700, color: "#166534" }}>
            📥 Exportar Excel
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
        <div style={{ position: "relative", gridColumn: "1 / -1" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>🔍</span>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome do cliente..."
            style={{ width: "100%", padding: "0.5rem 0.8rem 0.5rem 2rem", border: "1.5px solid #e8f0fe", borderRadius: 10, fontSize: "0.82rem", fontFamily: "inherit", outline: "none", color: "#111827", boxSizing: "border-box" }} />
        </div>
        <select value={filtroCanal} onChange={e => setFiltroCanal(e.target.value)}
          style={{ padding: "0.45rem 0.7rem", border: "1.5px solid #e8f0fe", borderRadius: 10, fontSize: "0.78rem", fontFamily: "inherit", outline: "none", color: "#374151", background: "#fff" }}>
          <option value="todos">📡 Todos os canais</option>
          {Object.entries(CANAL_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
        <select value={filtroProduto} onChange={e => setFiltroProduto(e.target.value)}
          style={{ padding: "0.45rem 0.7rem", border: "1.5px solid #e8f0fe", borderRadius: 10, fontSize: "0.78rem", fontFamily: "inherit", outline: "none", color: "#374151", background: "#fff" }}>
          <option value="todos">📦 Todos os produtos</option>
          {PRODUTOS.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <select value={filtroAtend} onChange={e => setFiltroAtend(e.target.value)}
          style={{ padding: "0.45rem 0.7rem", border: "1.5px solid #e8f0fe", borderRadius: 10, fontSize: "0.78rem", fontFamily: "inherit", outline: "none", color: "#374151", background: "#fff" }}>
          <option value="todos">👤 Todos os atendentes</option>
          {ATENDENTES.map(a => <option key={a.id} value={a.id}>{a.nome} · {a.setor.replace("Suporte ","")}</option>)}
        </select>
        <select value={filtroCateg} onChange={e => setFiltroCateg(e.target.value)}
          style={{ padding: "0.45rem 0.7rem", border: "1.5px solid #e8f0fe", borderRadius: 10, fontSize: "0.78rem", fontFamily: "inherit", outline: "none", color: "#374151", background: "#fff" }}>
          <option value="todos">🏷️ Todas as categorias</option>
          {CATEGORIAS_FINALIZACAO.map(c => <option key={c.id} value={c.id}>{c.icone} {c.label}</option>)}
        </select>
        {temFiltro && (
          <button onClick={limpar}
            style={{ padding: "0.45rem 0.7rem", border: "1.5px solid #fecaca", borderRadius: 10, fontSize: "0.78rem", fontFamily: "inherit", cursor: "pointer", color: "#dc2626", background: "#fef2f2", fontWeight: 600 }}>
            ✕ Limpar filtros
          </button>
        )}
      </div>

      {/* Tabela */}
      {carregando && todos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#9ca3af", fontSize: "0.85rem" }}>Carregando histórico...</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#9ca3af", fontSize: "0.85rem" }}>Nenhum resultado encontrado.</div>
      ) : (
        <table style={r.tabela}>
          <thead>
            <tr>{["Cliente","Empresa","Produto","Pedido","Canal","Atendente","Categoria","NPS","Data",""].map((h,i) => <th key={i} style={r.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtrados.map((h, i) => (
              <tr key={h.id} className="hist-row" style={{ background: i % 2 === 0 ? "#f8faff" : "#fff", cursor: "pointer" }} onClick={() => onVerConversa(h)}>
                <td style={r.td}><strong>{h.nome}</strong></td>
                <td style={r.td}><span style={{ fontSize: "0.82rem", color: "#374151" }}>{h.empresa || "—"}</span></td>
                <td style={r.td}><span style={r.tagProduto}>📦 {h.produto?.nome}</span></td>
                <td style={r.td}><span style={{ fontSize: "0.78rem", color: h.card && !["aguardando_empresa","aguardando_produto","aguardando_codigo","concluido"].includes(h.card) ? "#1a237e" : "#9ca3af", fontWeight: h.card ? 600 : 400 }}>{h.card && !["aguardando_empresa","aguardando_produto","aguardando_codigo","concluido"].includes(h.card) ? h.card : "—"}</span></td>
                <td style={r.td}><span style={{ color: CANAL_CONFIG[h.canal]?.cor }}>{CANAL_CONFIG[h.canal]?.icon} {CANAL_CONFIG[h.canal]?.label}</span></td>
                <td style={r.td}>{h.atendente?.nome} <span style={{ color: "#9ca3af", fontSize: "0.72rem" }}>· {h.atendente?.setor?.replace("Suporte ","")}</span></td>
                <td style={r.td}>
                  {h.categoria
                    ? <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: h.categoria.cor + "18", color: h.categoria.cor, border: `1px solid ${h.categoria.cor}33` }}>{h.categoria.icone} {h.categoria.label}</span>
                    : <span style={{ color: "#d1d5db", fontSize: "0.72rem" }}>—</span>}
                </td>
                <td style={r.td}>
                  {h.nps ? <span style={{ fontSize: "0.82rem", fontWeight: 700, color: h.nps >= 4 ? "#10b981" : h.nps === 3 ? "#f59e0b" : "#ef4444" }}>{["","😢","🙁","😐","🙂","😀"][h.nps]} {h.nps}/5</span> : <span style={{ color: "#d1d5db", fontSize: "0.72rem" }}>—</span>}
                </td>
                <td style={r.td}>{h.data}</td>
                <td style={r.td}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={r.verBtn}>Ver →</span>
                    {h.supabaseId && onReabrirConversa && (
                      <span
                        style={{ fontSize: "0.72rem", color: "#f59e0b", fontWeight: 600, background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 99, padding: "2px 10px", whiteSpace: "nowrap", cursor: "pointer" }}
                        onClick={e => { e.stopPropagation(); onReabrirConversa(h); }}
                      >↩ Reabrir</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── ABA DE RELATÓRIOS ─────────────────────────────────────────────────────────
function Relatorios({ contatos }) {
  const [conversaAberta, setConversaAberta] = useState(null);
  const [historicoSupa,  setHistoricoSupa]  = useState([]);
  const [graficoDados,   setGraficoDados]   = useState([]);
  const [carregando,     setCarregando]     = useState(true);
  const fimModalRef = useRef(null);

  useEffect(() => {
    fimModalRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversaAberta]);

  // Carrega dados reais do Supabase
  useEffect(() => {
    const carregar = async () => {
      setCarregando(true);
      try {
        // Busca conversas resolvidas do Supabase
        const data = await supaFetch("conversas?status=eq.resolvido&order=created_at.desc&select=*");
        if (data) setHistoricoSupa(data);

        // Monta gráfico dos últimos 7 dias
        const hoje = new Date();
        const dias = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(hoje);
          d.setDate(hoje.getDate() - (6 - i));
          return { dia: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""), data: d.toISOString().slice(0, 10), total: 0, resolvidos: 0 };
        });
        // Todas conversas dos últimos 7 dias
        const dataInicio = dias[0].data;
        const todas = await supaFetch(`conversas?created_at=gte.${dataInicio}T00:00:00&select=*`);
        if (todas) {
          todas.forEach(c => {
            const diaStr = c.created_at?.slice(0, 10);
            const d = dias.find(d => d.data === diaStr);
            if (d) { d.total++; if (c.status === "resolvido") d.resolvidos++; }
          });
        }
        setGraficoDados(dias);
      } catch(e) { console.error(e); }
      setCarregando(false);
    };
    carregar();
  }, []);

  // KPIs: mistura dados do Supabase + sessão atual
  const resolvidosSessao = contatos.filter(c => c.status === "resolvido");
  const totalAtend   = historicoSupa.length + resolvidosSessao.length;
  const totalAbertos = contatos.filter(c => c.status === "aberto").length;
  const totalEmAtend = contatos.filter(c => c.status === "em_atendimento").length;
  const tmrSessao    = contatos.length > 0 ? Math.round(contatos.reduce((a, c) => a + (c.tempoResposta || 5), 0) / contatos.length) : 0;

  // Por produto (dados reais)
  const porProduto = PRODUTOS.map(p => {
    const nSupa = historicoSupa.filter(h => h.produto_id === p.id).length;
    const nSessao = resolvidosSessao.filter(c => c.produto.id === p.id).length;
    return { nome: p.nome, total: nSupa + nSessao };
  });
  const maxProduto = Math.max(...porProduto.map(p => p.total), 1);

  // Ranking atendentes (dados reais)
  const ranking = ATENDENTES.map(a => {
    const resolvidos = historicoSupa.filter(h => h.atendente_id === a.id).length + resolvidosSessao.filter(c => c.atendente.id === a.id).length;
    const ativos = contatos.filter(c => c.atendente.id === a.id && c.status !== "resolvido").length;
    return { ...a, resolvidos, ativos };
  }).sort((a, b) => b.resolvidos - a.resolvidos);
  const maxRanking = Math.max(...ranking.map(r => r.resolvidos), 1);
  const maxGrafico = Math.max(...graficoDados.map(d => d.total), 1);

  // NPS médio (apenas conversas com nota)
  const npsEmojis = { 5: "😀", 4: "🙂", 3: "😐", 2: "🙁", 1: "😢" };
  const conversasComNps = historicoSupa.filter(h => h.nps && h.nps >= 1 && h.nps <= 5);
  const npsMedia = conversasComNps.length > 0
    ? (conversasComNps.reduce((acc, h) => acc + h.nps, 0) / conversasComNps.length).toFixed(1)
    : null;
  const npsEmoji = npsMedia ? npsEmojis[Math.round(parseFloat(npsMedia))] : "—";
  const npsDistribuicao = [5,4,3,2,1].map(n => ({
    nota: n, emoji: npsEmojis[n],
    total: conversasComNps.filter(h => h.nps === n).length,
  }));

  return (
    <div style={r.wrap}>
      {/* Cabeçalho */}
      <div style={r.header}>
        <div>
          <div style={r.titulo}>Relatórios</div>
          <div style={r.subtitulo}>Dados reais — últimos 7 dias</div>
        </div>
        {carregando && (
          <div style={{ fontSize: "0.75rem", color: "#9ca3af", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#e91e8c", animation: "pulse 1.5s infinite" }} />
            Carregando dados...
          </div>
        )}
      </div>

      {/* KPIs */}
      <div style={{ ...r.kpiRow, gridTemplateColumns: "repeat(5,1fr)" }}>
        {[
          { label: "Total atendidos", valor: totalAtend,   cor: "#1a237e", icon: "📋" },
          { label: "Em aberto",       valor: totalAbertos, cor: "#f59e0b", icon: "🕐" },
          { label: "Em atendimento",  valor: totalEmAtend, cor: "#0088FF", icon: "💬" },
          { label: "TMR (min)",       valor: tmrSessao,    cor: "#10b981", icon: "⚡" },
        ].map((k, i) => (
          <div key={i} style={r.kpiCard}>
            <div style={r.kpiIcon}>{k.icon}</div>
            <div style={{ ...r.kpiValor, color: k.cor }}>{k.valor}</div>
            <div style={r.kpiLabel}>{k.label}</div>
          </div>
        ))}
        {/* Card NPS */}
        <div style={r.kpiCard}>
          <div style={r.kpiIcon}>😊</div>
          <div style={{ ...r.kpiValor, color: "#e91e8c", fontSize: "1.8rem" }}>{npsEmoji}</div>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#e91e8c" }}>{npsMedia ? `${npsMedia}/5` : "—"}</div>
          <div style={r.kpiLabel}>Satisfação média</div>
          <div style={{ fontSize: "0.65rem", color: "#9ca3af" }}>{conversasComNps.length} avaliações</div>
        </div>
      </div>

      {/* Distribuição NPS */}
      {conversasComNps.length > 0 && (
        <div style={r.card}>
          <div style={r.cardTitulo}>😊 Distribuição de satisfação</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {npsDistribuicao.map(({ nota, emoji, total }) => {
              const pct = conversasComNps.length > 0 ? Math.round((total / conversasComNps.length) * 100) : 0;
              return (
                <div key={nota} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: "1.2rem", width: 28 }}>{emoji}</span>
                  <div style={{ flex: 1, height: 12, background: "#f0f4ff", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: nota >= 4 ? "#10b981" : nota === 3 ? "#f59e0b" : "#ef4444", borderRadius: 99, transition: "width 0.6s ease" }} />
                  </div>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#1a237e", width: 28, textAlign: "right" }}>{total}</span>
                  <span style={{ fontSize: "0.72rem", color: "#9ca3af", width: 36 }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={r.grid2}>
        {/* Gráfico de barras — dados reais */}
        <div style={r.card}>
          <div style={r.cardTitulo}>📊 Atendimentos por dia (últimos 7 dias)</div>
          {carregando ? (
            <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "0.8rem" }}>Carregando...</div>
          ) : (
            <div style={r.grafico}>
              {graficoDados.map((d, i) => (
                <div key={i} style={r.barraWrap}>
                  <div style={r.barraContainer}>
                    <div style={{ ...r.barra, height: `${(d.total / maxGrafico) * 100}%`, background: "#1a237e" }}>
                      {d.total > 0 && <span style={r.barraValor}>{d.total}</span>}
                    </div>
                    <div style={{ ...r.barra, height: `${(d.resolvidos / maxGrafico) * 100}%`, background: "#e91e8c", opacity: 0.6, marginTop: 2 }} />
                  </div>
                  <div style={r.barraLabel}>{d.dia}</div>
                </div>
              ))}
            </div>
          )}
          <div style={r.legenda}>
            <span style={r.legendaItem}><span style={{ ...r.legendaDot, background: "#1a237e" }} />Total</span>
            <span style={r.legendaItem}><span style={{ ...r.legendaDot, background: "#e91e8c" }} />Resolvidos</span>
          </div>
        </div>

        {/* Por produto — dados reais */}
        <div style={r.card}>
          <div style={r.cardTitulo}>📦 Atendimentos por produto</div>
          <div style={r.produtoLista}>
            {porProduto.map((p, i) => (
              <div key={i} style={r.produtoRow}>
                <div style={r.produtoNome}>{p.nome}</div>
                <div style={r.produtoBarraWrap}>
                  <div style={{ ...r.produtoBarra, width: `${(p.total / maxProduto) * 100}%` }} />
                </div>
                <div style={r.produtoNum}>{p.total}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ranking atendentes — dados reais */}
      <div style={r.card}>
        <div style={r.cardTitulo}>🏆 Ranking de atendentes</div>
        <div style={r.rankingGrid}>
          {ranking.map((a, i) => (
            <div key={a.id} style={r.rankingCard}>
              <div style={{ ...r.rankingPos, background: i === 0 ? "#fbbf24" : i === 1 ? "#9ca3af" : i === 2 ? "#b45309" : "#e8f0fe", color: i < 3 ? "#fff" : "#1a237e" }}>#{i + 1}</div>
              <div style={r.rankingAvatar}>{a.avatar}</div>
              <div style={r.rankingInfo}>
                <div style={r.rankingNome}>{a.nome}</div>
                <div style={r.rankingSetor}>{a.setor}</div>
                <div style={r.rankingBarraWrap}>
                  <div style={{ ...r.rankingBarra, width: `${(a.resolvidos / maxRanking) * 100}%` }} />
                </div>
              </div>
              <div style={r.rankingStats}>
                <div style={r.rankingStat}><span style={{ color: "#10b981", fontWeight: 700 }}>{a.resolvidos}</span><span style={r.rankingStatLabel}>resolvidos</span></div>
                <div style={r.rankingStat}><span style={{ color: "#0088FF", fontWeight: 700 }}>{a.ativos}</span><span style={r.rankingStatLabel}>ativos</span></div>
              </div>
              <div style={{ ...r.statusBadge, background: STATUS_ATENDENTE[a.status].cor + "22", color: STATUS_ATENDENTE[a.status].cor }}>
                {STATUS_ATENDENTE[a.status].label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Histórico — dados reais do Supabase */}
      <HistoricoFiltrado contatos={contatos} historicoSupa={historicoSupa} carregando={carregando} onVerConversa={setConversaAberta} onReabrirConversa={async (h) => {
        if (!window.confirm(`Reabrir atendimento de ${h.nome}?`)) return;
        try {
          await supaFetch(`conversas?id=eq.${h.supabaseId}`, {
            method: "PATCH",
            body: JSON.stringify({ status: "aberto" }),
          });
          setHistoricoSupa(prev => prev.filter(c => c.id !== h.supabaseId));
          alert("✓ Atendimento reaberto! Aparecerá na lista de atendimentos.");
        } catch(e) { console.error(e); alert("Erro ao reabrir."); }
      }} />

      {/* MODAL CONVERSA */}
      {conversaAberta && (
        <div style={r.modalOverlay} onClick={() => setConversaAberta(null)}>
          <div style={r.modalConversa} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={r.modalConversaHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={r.modalAvatar}>{conversaAberta.nome.split(" ").map(n => n[0]).join("").slice(0,2)}</div>
                <div>
                  <div style={r.modalConversaNome}>{conversaAberta.nome}</div>
                  <div style={r.modalConversaSub}>
                    <span style={{ color: CANAL_CONFIG[conversaAberta.canal].cor }}>{CANAL_CONFIG[conversaAberta.canal].icon} {CANAL_CONFIG[conversaAberta.canal].label}</span>
                    <span style={{ color: "#c7d9fb" }}>·</span>
                    <span style={r.tagProdutoModal}>📦 {conversaAberta.produto.nome}</span>
                    <span style={{ color: "#c7d9fb" }}>·</span>
                    <span>⏱ {conversaAberta.duracao}</span>
                    <span style={{ color: "#c7d9fb" }}>·</span>
                    <span>📅 {conversaAberta.data}</span>
                  </div>
                </div>
              </div>
              <button style={r.modalFecharBtn} onClick={() => setConversaAberta(null)}>✕</button>
            </div>

            {/* Atendente */}
            <div style={r.modalAtendenteBar}>
              <span style={{ fontSize: "0.72rem", color: SUAVE }}>Atendente:</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#e8f0fe", border: "1px solid #c7d9fb", borderRadius: 99, padding: "2px 10px" }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#1a237e", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.5rem", fontWeight: 700 }}>{conversaAberta.atendente.avatar}</div>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#1a237e" }}>{conversaAberta.atendente.nome}</span>
                <span style={{ fontSize: "0.68rem", color: SUAVE }}>· {conversaAberta.atendente.setor}</span>
              </div>
              <div style={{ marginLeft: "auto", background: "#d1fae5", color: "#065f46", border: "1px solid #6ee7b7", borderRadius: 99, fontSize: "0.68rem", fontWeight: 700, padding: "2px 10px" }}>✓ Resolvido</div>
            </div>

            {/* Mensagens */}
            <div style={r.modalMensagens}>
              {conversaAberta.mensagens.map((m, i) => (
                <div key={m.id} style={{ ...r.modalMsgWrap, justifyContent: m.de === "agente" ? "flex-end" : "flex-start", animationDelay: `${i * 0.05}s` }}>
                  <div style={{ ...r.modalMsgBolha, ...(m.de === "agente" ? r.modalMsgAgente : r.modalMsgCliente) }}>
                    {m.de === "agente" && <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.7)", fontWeight: 700, marginBottom: 3 }}>{conversaAberta.atendente.nome}</div>}
                    {m.texto}
                    <div style={{ fontSize: "0.6rem", marginTop: 4, textAlign: "right", color: m.de === "agente" ? "rgba(255,255,255,0.5)" : "#aaa" }}>{m.hora}</div>
                  </div>
                </div>
              ))}
              <div ref={fimModalRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TELA DE LOGIN ─────────────────────────────────────────────────────────────
function Login({ onLogin, usuarios }) {
  // Recupera email salvo se "lembrar" estava ativo
  const emailSalvo = (() => { try { return sessionStorage.getItem("deskhub_email") || ""; } catch { return ""; } })();
  const lembrarSalvo = (() => { try { return sessionStorage.getItem("deskhub_lembrar") === "true"; } catch { return false; } })();

  const [email, setEmail]       = useState(emailSalvo);
  const [senha, setSenha]       = useState("");
  const [erro, setErro]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [verSenha, setVerSenha] = useState(false);
  const [lembrar, setLembrar]   = useState(lembrarSalvo);
  const [telaEsqueciSenha, setTelaEsqueciSenha] = useState(false);
  const [emailRecupera, setEmailRecupera]       = useState("");
  const [msgRecupera, setMsgRecupera]           = useState("");
  // primeiro acesso
  const [primeiroAcesso, setPrimeiroAcesso] = useState(null);
  const [novaSenha, setNovaSenha]           = useState("");
  const [confirmSenha, setConfirmSenha]     = useState("");

  const entrar = () => {
    if (!email || !senha) { setErro("Preencha e-mail e senha."); return; }
    setLoading(true); setErro("");
    setTimeout(() => {
      const user = usuarios.find(u => u.email === email.trim().toLowerCase() && u.senha === senha);
      if (user) {
        // Salva email se lembrar estiver ativo
        try {
          if (lembrar) {
            sessionStorage.setItem("deskhub_email", email.trim().toLowerCase());
            sessionStorage.setItem("deskhub_lembrar", "true");
          } else {
            sessionStorage.removeItem("deskhub_email");
            sessionStorage.removeItem("deskhub_lembrar");
          }
        } catch {}
        if (user.primeiroAcesso) { setPrimeiroAcesso(user); setLoading(false); }
        else { onLogin(user); }
      } else { setErro("E-mail ou senha incorretos."); setLoading(false); }
    }, 900);
  };

  const recuperarSenha = () => {
    const user = usuarios.find(u => u.email === emailRecupera.trim().toLowerCase());
    if (!user) { setMsgRecupera("erro"); return; }
    setMsgRecupera("ok");
  };

  const definirSenha = () => {
    if (novaSenha.length < 6) { setErro("Senha deve ter ao menos 6 caracteres."); return; }
    if (novaSenha !== confirmSenha) { setErro("As senhas não coincidem."); return; }
    const atualizado = { ...primeiroAcesso, senha: novaSenha, primeiroAcesso: false };
    onLogin(atualizado, atualizado);
  };

  if (primeiroAcesso) return (
    <div style={l.wrap}>
      <style>{cssLogin}</style>
      <div style={l.card}>
        <div style={l.logo}>Desk Hub</div>
        <div style={l.subtitulo}>Bem-vindo(a), {primeiroAcesso.nome}! 👋</div>
        <div style={l.divider} />
        <div style={{ fontSize: "0.82rem", color: "#374151", marginBottom: 16, background: "#f0f4ff", borderRadius: 10, padding: "0.7rem 1rem", borderLeft: "3px solid #e91e8c" }}>
          Este é seu primeiro acesso. Crie uma senha para continuar.
        </div>
        <div style={l.label}>Nova senha</div>
        <input style={l.input} type="password" placeholder="Mínimo 6 caracteres"
          value={novaSenha} onChange={e => { setNovaSenha(e.target.value); setErro(""); }} />
        <div style={{ ...l.label, marginTop: 14 }}>Confirmar senha</div>
        <input style={l.input} type="password" placeholder="Repita a senha"
          value={confirmSenha} onChange={e => { setConfirmSenha(e.target.value); setErro(""); }}
          onKeyDown={e => e.key === "Enter" && definirSenha()} />
        {erro && <div style={l.erro}>{erro}</div>}
        <button style={l.btnEntrar} className="btn-entrar" onClick={definirSenha}>
          Definir senha e entrar →
        </button>
      </div>
    </div>
  );

  // Tela esqueci senha
  if (telaEsqueciSenha) return (
    <div style={l.wrap}>
      <style>{cssLogin}</style>
      <div style={l.card}>
        <div style={l.logo}>Desk Hub</div>
        <div style={l.subtitulo}>Recuperar senha</div>
        <div style={l.divider} />
        {msgRecupera === "ok" ? (
          <div style={{ background: "#f0fdf4", border: "1px solid #86efac", color: "#166534", borderRadius: 10, padding: "0.8rem 1rem", fontSize: "0.84rem", marginBottom: 16 }}>
            ✓ Sua senha é: <strong>{usuarios.find(u => u.email === emailRecupera.trim().toLowerCase())?.senha}</strong>
            <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 4 }}>Recomendamos alterar sua senha após o login.</div>
          </div>
        ) : msgRecupera === "erro" ? (
          <div style={l.erro}>E-mail não encontrado.</div>
        ) : null}
        <div style={l.label}>Seu e-mail</div>
        <input style={l.input} type="email" placeholder="seu@email.com"
          value={emailRecupera} onChange={e => { setEmailRecupera(e.target.value); setMsgRecupera(""); }}
          onKeyDown={e => e.key === "Enter" && recuperarSenha()} autoFocus />
        <button style={{ ...l.btnEntrar, marginTop: 16 }} className="btn-entrar" onClick={recuperarSenha}>
          Recuperar senha →
        </button>
        <button onClick={() => setTelaEsqueciSenha(false)}
          style={{ width: "100%", background: "transparent", border: "none", color: "#9ca3af", fontSize: "0.8rem", cursor: "pointer", marginTop: 10, fontFamily: "inherit" }}>
          ← Voltar ao login
        </button>
      </div>
    </div>
  );

  return (
    <div style={l.wrap}>
      <style>{cssLogin}</style>
      <div style={l.card}>
        <div style={l.logo}>Desk Hub</div>
        <div style={l.subtitulo}>Painel de Atendimento</div>
        <div style={l.divider} />
        <div style={l.label}>E-mail</div>
        <input style={l.input} type="email" placeholder="seu@email.com"
          value={email} onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === "Enter" && entrar()} autoFocus />
        <div style={{ ...l.label, marginTop: 14 }}>Senha</div>
        <div style={{ position: "relative" }}>
          <input style={l.input} type={verSenha ? "text" : "password"} placeholder="••••••"
            value={senha} onChange={e => setSenha(e.target.value)}
            onKeyDown={e => e.key === "Enter" && entrar()} />
          <button style={l.verSenhaBtn} onClick={() => setVerSenha(v => !v)}>
            {verSenha ? "🙈" : "👁️"}
          </button>
        </div>
        {/* Lembrar + Esqueci */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "0.78rem", color: "#6b7280" }}>
            <input type="checkbox" checked={lembrar} onChange={e => setLembrar(e.target.checked)}
              style={{ width: 14, height: 14, accentColor: "#e91e8c", cursor: "pointer" }} />
            Lembrar e-mail
          </label>
          <button onClick={() => { setTelaEsqueciSenha(true); setMsgRecupera(""); setEmailRecupera(email); }}
            style={{ background: "transparent", border: "none", color: "#e91e8c", fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
            Esqueci minha senha
          </button>
        </div>
        {erro && <div style={l.erro}>{erro}</div>}
        <button style={{ ...l.btnEntrar, opacity: loading ? 0.7 : 1 }}
          className="btn-entrar" onClick={entrar} disabled={loading}>
          {loading ? "Entrando..." : "Entrar →"}
        </button>
        <div style={l.rodape}>Acesso restrito à equipe Desk Hub.</div>
      </div>
    </div>
  );
}

// ── ESTILOS LOGIN ─────────────────────────────────────────────────────────────
const l = {
  wrap: { minHeight: "100vh", background: "linear-gradient(135deg, #1a237e 0%, #0d1657 60%, #1a1a2e 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans','Segoe UI',sans-serif" },
  card: { background: "#fff", borderRadius: 20, padding: "2.5rem 2rem", width: 380, maxWidth: "90vw", boxShadow: "0 24px 60px rgba(0,0,0,0.35)" },
  logo: { fontSize: "2rem", fontWeight: 800, color: "#1a237e", letterSpacing: "-0.03em", textAlign: "center" },
  subtitulo: { fontSize: "0.82rem", color: "#6b7280", textAlign: "center", marginTop: 4, marginBottom: 8 },
  divider: { height: 1, background: "#dde5f5", margin: "1.2rem 0" },
  label: { fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: 6 },
  input: { width: "100%", padding: "0.7rem 1rem", border: "1.5px solid #dde5f5", borderRadius: 10, fontSize: "0.9rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s", color: "#111827" },
  verSenhaBtn: { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", fontSize: "1rem", padding: "0 4px" },
  erro: { background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 8, padding: "0.5rem 0.8rem", fontSize: "0.8rem", marginTop: 12 },
  btnEntrar: { width: "100%", padding: "0.8rem", background: "#e91e8c", border: "none", borderRadius: 12, color: "#fff", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", marginTop: 20, fontFamily: "inherit", transition: "all 0.2s" },
  rodape: { textAlign: "center", fontSize: "0.7rem", color: "#9ca3af", marginTop: 20 },
};

const cssLogin = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .btn-entrar:hover:not(:disabled) { background: #c91878 !important; transform: translateY(-1px); box-shadow: 0 4px 20px rgba(233,30,140,0.4); }
  input:focus { border-color: #e91e8c !important; background: #fff !important; }
`;

// ── BACKEND (Railway) CONFIG ──────────────────────────────────────────────────
const API_URL = "https://SEU-BACKEND.up.railway.app";
// ── SUPABASE CONFIG ───────────────────────────────────────────────────────────
const SUPA_URL = "https://SEU-PROJETO.supabase.co";
const SUPA_KEY = "SUA_CHAVE_PUBLICA_SUPABASE";

const supaFetch = async (path, options = {}) => {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPA_KEY,
      "Authorization": `Bearer ${SUPA_KEY}`,
      "Prefer": "return=representation",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const dbBuscarUsuarios    = () => supaFetch("usuarios?select=*");
const dbInserirUsuario    = (u) => supaFetch("usuarios", { method: "POST", body: JSON.stringify(u) });
const dbAtualizarUsuario  = (id, dados) => supaFetch(`usuarios?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(dados) });
const dbDeletarUsuario    = (id) => supaFetch(`usuarios?id=eq.${id}`, { method: "DELETE" });

// ── CHAT REALTIME ──
const dbBuscarConversas   = () => supaFetch("conversas?select=*&status=eq.aberto&order=created_at.desc");
const dbBuscarMensagens   = (convId) => supaFetch(`mensagens?conversa_id=eq.${convId}&order=created_at.asc`);
const dbEnviarMensagem = async (convId, de, texto, nomeAtendente = null) => {
  const body = { conversa_id: convId, de, texto };
  if (nomeAtendente) body.nome_atendente = nomeAtendente;
  try {
    return await supaFetch("mensagens", { method: "POST", body: JSON.stringify(body) });
  } catch(e) {
    // Se falhar com nome_atendente, tenta sem
    if (nomeAtendente) return await supaFetch("mensagens", { method: "POST", body: JSON.stringify({ conversa_id: convId, de, texto }) });
    throw e;
  }
};
const dbAtualizarConversa = (id, dados) => supaFetch(`conversas?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(dados) });

// Supabase Realtime via WebSocket
const supaRealtime = (() => {
  let socket = null;
  let listeners = [];
  const connect = () => {
    const wsUrl = `wss://SEU-PROJETO.supabase.co/realtime/v1/websocket?apikey=${SUPA_KEY}&vsn=1.0.0`;
    socket = new WebSocket(wsUrl);
    socket.onopen = () => {
      // Inscreve na tabela conversas
      socket.send(JSON.stringify({ topic: "realtime:public:conversas", event: "phx_join", payload: {}, ref: "1" }));
      // Inscreve na tabela mensagens
      socket.send(JSON.stringify({ topic: "realtime:public:mensagens", event: "phx_join", payload: {}, ref: "2" }));
      // Heartbeat
      setInterval(() => socket.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: "hb" })), 25000);
    };
    socket.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.event === "INSERT" || msg.event === "UPDATE") {
          listeners.forEach(fn => fn(msg));
        }
      } catch(_) {}
    };
    socket.onclose = () => setTimeout(connect, 3000); // reconecta
  };
  return {
    start: connect,
    onChange: (fn) => { listeners.push(fn); return () => { listeners = listeners.filter(l => l !== fn); }; },
  };
})();


const EMAILJS_SERVICE  = "SEU_SERVICE_ID";
const EMAILJS_TEMPLATE = "SEU_TEMPLATE_ID";
const EMAILJS_KEY      = "SUA_CHAVE_PUBLICA_EMAILJS";

const enviarEmailBoasVindas = async (nome, email, senhaTemp) => {
  const params = {
    nome,
    para_email: email,
    senha_temp: senhaTemp,
    link: "https://SEU-FRONTEND.vercel.app",
  };
  const url = `https://api.emailjs.com/api/v1.0/email/send`;
  const body = JSON.stringify({
    service_id:  EMAILJS_SERVICE,
    template_id: EMAILJS_TEMPLATE,
    user_id:     EMAILJS_KEY,
    template_params: params,
  });
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (!res.ok) throw new Error("Falha ao enviar e-mail");
};


function PainelAdmin({ onLogout, onVoltarAtendente, usuarios, setUsuarios, dbInserirUsuario, dbDeletarUsuario, recarregarUsuarios, dbAtualizarUsuario }) {
  const [tela, setTela]           = useState("dashboard");
  const [nome, setNome]           = useState("");
  const [email, setEmail]         = useState("");
  const [setor, setSetor]         = useState("");
  const [erro, setErro]           = useState("");
  const [sucesso, setSucesso]     = useState("");
  const [enviando, setEnviando]   = useState(false);

  // Dados simulados para métricas e gráfico
  const totalAtendimentos = 47;
  const resolvidos        = 38;
  const emAndamento       = 6;
  const abertos           = 3;
  const tempoMedio        = "6min";
  const satisfacao        = "94%";

  const dadosGrafico = [
    { dia: "Seg", total: 8  },
    { dia: "Ter", total: 12 },
    { dia: "Qua", total: 7  },
    { dia: "Qui", total: 10 },
    { dia: "Sex", total: 6  },
    { dia: "Sáb", total: 4  },
    { dia: "Dom", total: 2  },
  ];
  const maxGrafico = Math.max(...dadosGrafico.map(d => d.total));

  const atendimentosAoVivo = [
    { id: 1, cliente: "Ana Lima",      canal: "whatsapp", status: "em_atendimento", atendente: "Lucas", produto: "Acesso à conta",             tempo: "4min"  },
    { id: 2, cliente: "Bruno Souza",   canal: "email",    status: "aberto",         atendente: "Lucas", produto: "Integrações",      tempo: "8min"  },
    { id: 3, cliente: "Carol Mendes",  canal: "chat",     status: "em_atendimento", atendente: "Júlia",   produto: "Financeiro",     tempo: "3min"  },
    { id: 4, cliente: "Elisa Rocha",   canal: "chat",     status: "aberto",         atendente: "Lucas", produto: "Acesso à conta",             tempo: "2min"  },
    { id: 5, cliente: "Fábio Nunes",   canal: "whatsapp", status: "em_atendimento", atendente: "Lucas", produto: "Relatórios",     tempo: "11min" },
  ];

  const gerarSenhaTemp = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from({length: 8}, () => chars[Math.floor(Math.random()*chars.length)]).join("");
  };

  const cadastrar = async () => {
    if (!nome || !email || !setor) { setErro("Preencha todos os campos."); return; }
    if (usuarios.find(u => u.email === email.trim().toLowerCase())) { setErro("E-mail já cadastrado."); return; }
    const temp = gerarSenhaTemp();
    setEnviando(true);
    try {
      await dbInserirUsuario({ nome: nome.trim(), email: email.trim().toLowerCase(), senha: temp, avatar: nome.trim().slice(0,2).toUpperCase(), setor, admin: false, primeiro_acesso: true, atendentes_ids: [] });
      await recarregarUsuarios();
      await enviarEmailBoasVindas(nome.trim(), email.trim().toLowerCase(), temp);
      setSucesso(`✓ Usuário cadastrado! E-mail enviado para ${email.trim()}`);
    } catch(e) {
      setSucesso(`✓ Usuário cadastrado! Senha temporária: ${temp}`);
    }
    setEnviando(false);
    setErro(""); setNome(""); setEmail(""); setSetor("");
  };

  const excluir = async (id) => {
    if (!window.confirm("Excluir este usuário?")) return;
    await dbDeletarUsuario(id);
    await recarregarUsuarios();
  };

  const ABAS = [
    { id: "dashboard", label: "📊 Dashboard" },
    { id: "aovivo",    label: "🔴 Ao vivo"   },
    { id: "usuarios",  label: "👥 Usuários"  },
    { id: "novo",      label: "➕ Novo"       },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <style>{cssLogin}</style>

      {/* Topbar */}
      <div style={{ background: "linear-gradient(135deg,#1a237e,#0d1657)", padding: "0 2rem", display: "flex", alignItems: "center", gap: 24, height: 56, boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", flexShrink: 0 }}>Desk Hub</div>
        <div style={{ fontSize: "0.75rem", color: "#8fa8e0", flexShrink: 0 }}>Admin</div>
        <div style={{ display: "flex", gap: 4, flex: 1 }}>
          {ABAS.map(a => (
            <button key={a.id} onClick={() => { setTela(a.id); setErro(""); setSucesso(""); }}
              style={{ padding: "0.35rem 0.9rem", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: "0.78rem", transition: "all 0.15s",
                background: tela === a.id ? "rgba(233,30,140,0.9)" : "rgba(255,255,255,0.08)",
                color: tela === a.id ? "#fff" : "#8fa8e0" }}>
              {a.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {onVoltarAtendente && (
            <button onClick={onVoltarAtendente} style={{ background: "rgba(233,30,140,0.15)", border: "1px solid rgba(233,30,140,0.3)", color: "#e91e8c", borderRadius: 8, padding: "0.35rem 0.9rem", cursor: "pointer", fontSize: "0.78rem", fontFamily: "inherit", fontWeight: 600 }}>💬 Ir para atendimentos</button>
          )}
          <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "#8fa8e0", borderRadius: 8, padding: "0.35rem 0.9rem", cursor: "pointer", fontSize: "0.78rem", fontFamily: "inherit" }}>⏻ Sair</button>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "1.5rem 1rem" }}>

        {/* DASHBOARD */}
        {tela === "dashboard" && (<>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1a237e", marginBottom: "1.2rem" }}>Visão geral — hoje</div>

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: "1.5rem" }}>
            {[
              { label: "Total atendimentos", valor: totalAtendimentos, cor: "#1a237e", bg: "#e8f0fe", icone: "💬" },
              { label: "Resolvidos",         valor: resolvidos,        cor: "#10b981", bg: "#d1fae5", icone: "✅" },
              { label: "Em andamento",       valor: emAndamento,       cor: "#0088FF", bg: "#e0f0ff", icone: "⏳" },
              { label: "Aguardando",         valor: abertos,           cor: "#f59e0b", bg: "#fef3c7", icone: "🔔" },
              { label: "Tempo médio",        valor: tempoMedio,        cor: "#8b5cf6", bg: "#ede9fe", icone: "⏱"  },
              { label: "Satisfação",         valor: satisfacao,        cor: "#e91e8c", bg: "#fce4ec", icone: "⭐" },
            ].map(k => (
              <div key={k.label} style={{ background: "#fff", borderRadius: 14, padding: "1rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: `1px solid ${k.bg}` }}>
                <div style={{ fontSize: "1.4rem", marginBottom: 4 }}>{k.icone}</div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: k.cor }}>{k.valor}</div>
                <div style={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: 500 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Gráfico */}
          <div style={{ background: "#fff", borderRadius: 16, padding: "1.4rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 700, color: "#1a237e", fontSize: "0.9rem", marginBottom: "1.2rem" }}>📈 Atendimentos por dia (últimos 7 dias)</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 120 }}>
              {dadosGrafico.map(d => (
                <div key={d.dia} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#1a237e" }}>{d.total}</div>
                  <div style={{ width: "100%", background: "linear-gradient(180deg,#e91e8c,#1a237e)", borderRadius: "6px 6px 0 0", height: `${(d.total / maxGrafico) * 90}px`, transition: "height 0.3s", minHeight: 4 }} />
                  <div style={{ fontSize: "0.7rem", color: "#9ca3af", fontWeight: 600 }}>{d.dia}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Atendentes online */}
          <div style={{ background: "#fff", borderRadius: 16, padding: "1.4rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ fontWeight: 700, color: "#1a237e", fontSize: "0.9rem", marginBottom: "1rem" }}>👥 Status dos operadores</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {usuarios.filter(u => !u.admin).map(u => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#f8faff", borderRadius: 10, padding: "0.5rem 0.9rem", border: "1px solid #e8f0fe" }}>
                  <div style={{ position: "relative" }}>
                    {u.foto
                      ? <img src={u.foto} alt="foto" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
                      : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#1a237e,#e91e8c)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700 }}>{u.avatar}</div>
                    }
                    <div style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderRadius: "50%", background: STATUS_OPERADOR[u.status || "online"].cor, border: "1.5px solid #fff" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#111827" }}>{u.nome}</div>
                    <div style={{ fontSize: "0.68rem", color: STATUS_OPERADOR[u.status || "online"].cor, fontWeight: 600 }}>{STATUS_OPERADOR[u.status || "online"].label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>)}

        {/* AO VIVO */}
        {tela === "aovivo" && (<>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.2rem" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#e91e8c", animation: "pulse 1.5s infinite" }} />
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1a237e" }}>Atendimentos em tempo real</div>
            <div style={{ marginLeft: "auto", background: "#e8f0fe", color: "#1a237e", borderRadius: 99, padding: "0.2rem 0.8rem", fontSize: "0.75rem", fontWeight: 700 }}>{atendimentosAoVivo.length} ativos</div>
          </div>
          <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            {/* Header tabela */}
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 0.8fr", gap: 12, padding: "0.7rem 1.2rem", background: "#f8faff", borderBottom: "1px solid #e8f0fe", fontSize: "0.7rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              <span>Cliente</span><span>Canal</span><span>Status</span><span>Atendente</span><span>Tempo</span>
            </div>
            {atendimentosAoVivo.map(a => (
              <div key={a.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 0.8fr", gap: 12, padding: "0.85rem 1.2rem", borderBottom: "1px solid #f9f9f9", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#111827" }}>{a.cliente}</div>
                  <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>{a.produto}</div>
                </div>
                <span style={{ fontSize: "0.78rem", color: CANAL_CONFIG[a.canal].cor, fontWeight: 600 }}>{CANAL_CONFIG[a.canal].icon} {CANAL_CONFIG[a.canal].label}</span>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: 99, background: STATUS_CONFIG[a.status].cor + "18", color: STATUS_CONFIG[a.status].cor, width: "fit-content" }}>{STATUS_CONFIG[a.status].label}</span>
                <span style={{ fontSize: "0.82rem", color: "#374151", fontWeight: 500 }}>{a.atendente}</span>
                <span style={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: 600 }}>⏱ {a.tempo}</span>
              </div>
            ))}
          </div>
        </>)}

        {/* USUÁRIOS */}
        {tela === "usuarios" && (<>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1a237e", marginBottom: "1.2rem" }}>Usuários cadastrados ({usuarios.filter(u => !u.admin).length})</div>
          <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            {usuarios.filter(u => !u.admin).map(u => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.9rem 1.2rem", borderBottom: "1px solid #f9f9f9" }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  {u.foto
                    ? <img src={u.foto} alt="foto" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "2px solid #e8f0fe" }} />
                    : <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#1a237e,#e91e8c)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700 }}>{u.avatar}</div>
                  }
                  <div style={{ position: "absolute", bottom: 0, right: 0, width: 11, height: 11, borderRadius: "50%", background: STATUS_OPERADOR[u.status || "online"].cor, border: "2px solid #fff" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#111827" }}>{u.nome}</div>
                  <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>{u.email} · {u.setor || "Sem setor"}</div>
                </div>
                <div style={{ fontSize: "0.7rem", padding: "0.2rem 0.7rem", borderRadius: 99, background: u.primeiroAcesso ? "#fef3c7" : "#d1fae5", color: u.primeiroAcesso ? "#92400e" : "#065f46", fontWeight: 700 }}>
                  {u.primeiroAcesso ? "⏳ Aguardando" : "✓ Ativo"}
                </div>
                <div style={{ fontSize: "0.72rem", padding: "0.2rem 0.7rem", borderRadius: 99, background: STATUS_OPERADOR[u.status || "online"].cor + "18", color: STATUS_OPERADOR[u.status || "online"].cor, fontWeight: 700 }}>
                  {STATUS_OPERADOR[u.status || "online"].label}
                </div>
                <button
                  title={u.adminAtendente ? "Remover acesso admin" : "Dar acesso admin"}
                  onClick={async (e) => {
                    e.stopPropagation();
                    const novo = !u.adminAtendente;
                    // Atualiza localmente primeiro para resposta imediata
                    setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, adminAtendente: novo } : x));
                    await dbAtualizarUsuario(u.id, { admin_atendente: novo });
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 5, background: u.adminAtendente ? "#fce4ec" : "#f3f4f6", border: `1px solid ${u.adminAtendente ? "#e91e8c44" : "#e5e7eb"}`, borderRadius: 8, padding: "0.3rem 0.7rem", cursor: "pointer", fontSize: "0.72rem", fontFamily: "inherit", fontWeight: 600, color: u.adminAtendente ? "#e91e8c" : "#6b7280" }}>
                  ⚡ {u.adminAtendente ? "Admin ativo" : "Dar admin"}
                </button>
                <button onClick={() => excluir(u.id)} style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 8, padding: "0.3rem 0.7rem", cursor: "pointer", fontSize: "0.75rem", fontFamily: "inherit" }}>✕ Excluir</button>
              </div>
            ))}
            {usuarios.filter(u => !u.admin).length === 0 && (
              <div style={{ padding: "2.5rem", textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}>Nenhum usuário cadastrado ainda.</div>
            )}
          </div>
        </>)}

        {/* NOVO USUÁRIO */}
        {tela === "novo" && (
          <div style={{ maxWidth: 480 }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1a237e", marginBottom: "1.2rem" }}>Cadastrar novo usuário</div>
            <div style={{ background: "#fff", borderRadius: 16, padding: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <div style={l.label}>Nome completo</div>
              <input style={{ ...l.input, marginBottom: 12 }} placeholder="Ex: João Silva" value={nome} onChange={e => { setNome(e.target.value); setErro(""); setSucesso(""); }} />
              <div style={l.label}>E-mail</div>
              <input style={{ ...l.input, marginBottom: 12 }} type="email" placeholder="joao@empresa.com.br" value={email} onChange={e => { setEmail(e.target.value); setErro(""); setSucesso(""); }} />
              <div style={l.label}>Setor de atendimento</div>
              <select style={{ ...l.input, marginBottom: 12, background: "#fff" }} value={setor} onChange={e => setSetor(e.target.value)}>
                <option value="">Selecione o setor...</option>
                {SETORES_DISPONIVEIS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {erro && <div style={l.erro}>{erro}</div>}
              {sucesso && (
                <div style={{ background: "#f0fdf4", border: "1px solid #86efac", color: "#166534", borderRadius: 8, padding: "0.7rem 1rem", fontSize: "0.82rem", marginTop: 8 }}>
                  {sucesso}<br/>
                  <span style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 4, display: "block" }}>O usuário criará sua própria senha no primeiro acesso.</span>
                </div>
              )}
              <button style={l.btnEntrar} className="btn-entrar" onClick={cadastrar} disabled={enviando}>
                {enviando ? "Enviando e-mail..." : "Cadastrar e enviar e-mail →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MODAL CONFIGURAÇÕES ───────────────────────────────────────────────────────
const STATUS_OPERADOR = {
  online:  { cor: "#10b981", label: "Online",  icone: "🟢" },
  ocupado: { cor: "#f59e0b", label: "Ocupado", icone: "🟡" },
  offline: { cor: "#9ca3af", label: "Offline", icone: "⚫" },
};

// ── MODAL TRIAGEM (BOT DE ENTRADA) ────────────────────────────────────────────
// Triagem por produto: cada produto tem sua própria pergunta de identificação
const TRIAGEM_PRODUTO = {
  1: { pergunta: "Para agilizar o seu atendimento, preciso do ID do Protocolo. Por favor, me informe abaixo. 🪪", placeholder: "Ex: ID-7742",    campo: "ID do Protocolo" },
  2: { pergunta: null,                                                                                              placeholder: null,             campo: null              },
  3: { pergunta: "Para agilizar o seu atendimento, preciso do número do pedido. Por favor, me informe abaixo. 🪪",   placeholder: "Ex: PED-4821",  campo: "Número do pedido"  },
  4: { pergunta: "Para agilizar o seu atendimento, preciso do número do pedido. Por favor, me informe abaixo. 🪪",   placeholder: "Ex: PED-4821",  campo: "Número do pedido"  },
};

function ModalTriagem({ onFechar, onCriar, atendentes }) {
  const CANAIS_OPC = ["whatsapp", "chat", "email"];

  const [etapa,   setEtapa]   = useState("dados");   // dados → produto → codigo → confirmar
  const [nome,    setNome]    = useState("");
  const [canal,   setCanal]   = useState("whatsapp");
  const [produto, setProduto] = useState(null);
  const [codigo,  setCodigo]  = useState("");
  const [erro,    setErro]    = useState("");

  const triagem = produto ? TRIAGEM_PRODUTO[produto.id] : null;
  const precisaCodigo = !!(triagem && triagem.pergunta);

  const steps = ["Dados", "Produto", ...(precisaCodigo ? ["Identificação"] : []), "Confirmar"];
  const stepIdx = etapa === "dados" ? 0 : etapa === "produto" ? 1 : etapa === "codigo" ? 2 : steps.length - 1;

  const avancar = () => {
    setErro("");
    if (etapa === "dados") {
      if (!nome.trim()) { setErro("Informe o nome do cliente."); return; }
      setEtapa("produto");
    } else if (etapa === "produto") {
      if (!produto) { setErro("Selecione o produto."); return; }
      setEtapa(precisaCodigo ? "codigo" : "confirmar");
    } else if (etapa === "codigo") {
      if (!codigo.trim()) { setErro(`Informe o ${triagem.campo}.`); return; }
      setEtapa("confirmar");
    } else if (etapa === "confirmar") {
      const atendente = atendentes[0] || ATENDENTES[0];
      const msgBot = [
        { id: 1, de: "sistema", texto: `🤖 ${getSaudacao()}, tudo bem? Seja bem-vindo ao nosso suporte. Estou aqui para te ajudar!`, hora: "Agora" },
        { id: 2, de: "sistema", texto: `🤖 Sobre qual produto você precisa de suporte? É só digitar o número da opção:\n1 · Financeiro\n2 · Acesso à conta\n3 · Integrações\n4 · Relatórios`, hora: "Agora" },
        { id: 3, de: "cliente", texto: produto.nome, hora: "Agora" },
        ...(precisaCodigo ? [
          { id: 4, de: "sistema", texto: `🤖 Perfeito! Vou te direcionar para o suporte de ${produto.nome}.`, hora: "Agora" },
          { id: 5, de: "sistema", texto: `🤖 ${triagem.pergunta}`, hora: "Agora" },
          { id: 6, de: "cliente", texto: codigo, hora: "Agora" },
          { id: 7, de: "sistema", texto: `🤖 Anotado! ✅ Estou te conectando com um de nossos atendentes. Em instantes alguém vai te atender! 🙏`, hora: "Agora" },
        ] : [
          { id: 4, de: "sistema", texto: `🤖 Ótimo! Vou te direcionar para o suporte do ${produto.nome}.`, hora: "Agora" },
        ]),
      ];
      onCriar({
        id: Date.now(), nome, canal, status: "aberto", naoLidas: msgBot.length,
        avatar: nome.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase(),
        ultimaMensagem: precisaCodigo ? `${triagem.campo}: ${codigo}` : `Suporte ${produto.nome}`,
        hora: "Agora", atendente, produto, tempoResposta: 1,
        telefone: "", email: "", anotacoes: precisaCodigo ? `${triagem.campo}: ${codigo}` : "",
        card: precisaCodigo ? codigo : null,
        iniciadoEm: Date.now(),
        mensagens: msgBot,
      });
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onFechar}>
      <div style={{ background: "#fff", borderRadius: 20, width: 440, maxWidth: "95vw", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#1a237e,#283593)", padding: "1.2rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1rem", color: "#fff" }}>🤖 Triagem de atendimento</div>
            <div style={{ fontSize: "0.72rem", color: "#8fa8e0", marginTop: 2 }}>Simula a entrada do cliente pelo bot</div>
          </div>
          <button onClick={onFechar} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: "1rem" }}>✕</button>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", gap: 4, padding: "0.8rem 1.5rem 0" }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 99, background: i <= stepIdx ? "#e91e8c" : "#e8f0fe" }} />
          ))}
        </div>

        {/* Conteúdo */}
        <div style={{ padding: "1.2rem 1.5rem" }}>
          {etapa === "dados" && (<>
            <div style={{ fontWeight: 700, marginBottom: 12, color: "#111827" }}>📋 Dados do cliente</div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Nome do cliente</label>
              <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Ana Lima" autoFocus
                style={{ width: "100%", padding: "0.55rem 0.8rem", border: "1.5px solid #e8f0fe", borderRadius: 10, fontSize: "0.85rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Canal</label>
              <div style={{ display: "flex", gap: 8 }}>
                {CANAIS_OPC.map(c => (
                  <button key={c} onClick={() => setCanal(c)}
                    style={{ flex: 1, padding: "0.5rem", border: `2px solid ${canal === c ? CANAL_CONFIG[c].cor : "#e8f0fe"}`, borderRadius: 10, background: canal === c ? CANAL_CONFIG[c].cor + "15" : "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: "0.8rem", fontWeight: 600, color: canal === c ? CANAL_CONFIG[c].cor : "#6b7280" }}>
                    {CANAL_CONFIG[c].icon} {CANAL_CONFIG[c].label}
                  </button>
                ))}
              </div>
            </div>
          </>)}

          {etapa === "produto" && (<>
            <div style={{ background: "#f8faff", border: "1px solid #e8f0fe", borderRadius: 12, padding: "1rem", marginBottom: 14, fontSize: "0.85rem", color: "#374151", lineHeight: 1.5 }}>
              🤖 <strong>Bot:</strong> Olá <strong>{nome}</strong>, tudo bem? Sobre qual produto você precisa de suporte?
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PRODUTOS.map(p => {
                const t = TRIAGEM_PRODUTO[p.id];
                return (
                  <button key={p.id} onClick={() => setProduto(p)}
                    style={{ padding: "0.7rem 1rem", border: `2px solid ${produto?.id === p.id ? "#e91e8c" : "#e8f0fe"}`, borderRadius: 12, background: produto?.id === p.id ? "#fce4ec" : "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: "0.85rem", fontWeight: 600, color: produto?.id === p.id ? "#e91e8c" : "#374151", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.15s" }}>
                    <span>📦 {p.nome}</span>
                    {t.pergunta
                      ? <span style={{ fontSize: "0.65rem", background: "#fef3c7", color: "#92400e", padding: "1px 7px", borderRadius: 99, fontWeight: 700 }}>🪪 {t.campo}</span>
                      : <span style={{ fontSize: "0.65rem", background: "#d1fae5", color: "#065f46", padding: "1px 7px", borderRadius: 99, fontWeight: 700 }}>✓ Sem código</span>}
                  </button>
                );
              })}
            </div>
          </>)}

          {etapa === "codigo" && (<>
            <div style={{ fontWeight: 700, marginBottom: 4, color: "#111827" }}>🪪 {triagem.campo}</div>
            <div style={{ background: "#f8faff", border: "1px solid #e8f0fe", borderRadius: 12, padding: "1rem", marginBottom: 16, fontSize: "0.85rem", color: "#374151", lineHeight: 1.5 }}>
              🤖 <strong>Bot:</strong> {triagem.pergunta}
            </div>
            <input value={codigo} onChange={e => setCodigo(e.target.value)} placeholder={triagem.placeholder} autoFocus
              style={{ width: "100%", padding: "0.6rem 0.9rem", border: "2px solid #e91e8c", borderRadius: 10, fontSize: "0.95rem", fontFamily: "inherit", outline: "none", fontWeight: 700, boxSizing: "border-box" }} />
            <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: 6 }}>Este código será registrado no histórico do atendimento.</div>
          </>)}

          {etapa === "confirmar" && (<>
            <div style={{ fontWeight: 700, marginBottom: 12, color: "#111827" }}>✅ Pronto para encaminhar</div>
            {[
              ["Cliente", nome],
              ["Canal", `${CANAL_CONFIG[canal].icon} ${CANAL_CONFIG[canal].label}`],
              ["Produto", `📦 ${produto.nome}`],
              ...(codigo ? [[triagem.campo, codigo]] : [["Identificação", "Não necessária"]]),
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "0.45rem 0", borderBottom: "1px solid #f3f4f6", fontSize: "0.83rem" }}>
                <span style={{ color: "#6b7280" }}>{k}</span>
                <span style={{ fontWeight: 700, color: "#111827" }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "0.7rem 1rem", fontSize: "0.78rem", color: "#166534" }}>
              ✓ O chamado será criado e encaminhado ao atendente responsável pelo <strong>{produto.nome}</strong>.
            </div>
          </>)}

          {erro && <div style={{ marginTop: 10, fontSize: "0.78rem", color: "#ef4444", fontWeight: 600 }}>⚠️ {erro}</div>}
        </div>

        {/* Footer */}
        <div style={{ padding: "0 1.5rem 1.2rem", display: "flex", gap: 8 }}>
          {etapa !== "dados" && (
            <button onClick={() => {
              if (etapa === "produto") setEtapa("dados");
              else if (etapa === "codigo") setEtapa("produto");
              else if (etapa === "confirmar") setEtapa(precisaCodigo ? "codigo" : "produto");
            }}
              style={{ flex: 1, padding: "0.6rem", border: "1.5px solid #e8f0fe", borderRadius: 10, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: "0.85rem", fontWeight: 600, color: "#6b7280" }}>
              ← Voltar
            </button>
          )}
          <button onClick={avancar}
            style={{ flex: 2, padding: "0.6rem", border: "none", borderRadius: 10, background: "linear-gradient(135deg,#e91e8c,#c2185b)", cursor: "pointer", fontFamily: "inherit", fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>
            {etapa === "confirmar" ? "✓ Criar conversa" : "Continuar →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MODAL CONFIGURAÇÕES ───────────────────────────────────────────────────────
function ModalConfig({ usuario, onClose, tema, setTema, notifSom, setNotifSom, notifBannerAtivo, setNotifBannerAtivo, onSalvar }) {
  const [aba, setAba]               = useState("perfil");
  const [nome, setNome]             = useState(usuario.nome);
  const [avatar, setAvatar]         = useState(usuario.avatar || "");
  const [foto, setFoto]             = useState(usuario.foto || null);
  const [status, setStatus]         = useState(usuario.status || "online");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha]   = useState("");
  const [confSenha, setConfSenha]   = useState("");
  const [erro, setErro]             = useState("");
  const [salvando, setSalvando]     = useState(false);
  const fileRef = useRef(null);

  const salvar = async () => {
    if (aba === "senha") {
      if (!senhaAtual) { setErro("Digite a senha atual."); return; }
      if (senhaAtual !== usuario.senha) { setErro("Senha atual incorreta."); return; }
      if (novaSenha.length < 6) { setErro("Nova senha deve ter ao menos 6 caracteres."); return; }
      if (novaSenha !== confSenha) { setErro("As senhas não coincidem."); return; }
    }
    setSalvando(true);
    await onSalvar({ nome, avatar, foto, status, novaSenha: aba === "senha" ? novaSenha : null });
    setSalvando(false);
  };

  const handleFoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setErro("Imagem deve ter menos de 5MB."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      // Comprime a imagem para máximo 100x100px e qualidade 60%
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max = 100;
        const ratio = Math.min(max / img.width, max / img.height);
        canvas.width  = img.width  * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        const comprimida = canvas.toDataURL("image/jpeg", 0.6);
        setFoto(comprimida);
        setErro("");
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const AVATARES = ["😊","👨‍💼","👩‍💼","🧑‍💻","👨‍💻","👩‍💻","🦸","🧑‍🎨","😎","🤝"];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 20, width: 460, maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 60px rgba(0,0,0,0.3)", fontFamily: "'DM Sans','Segoe UI',sans-serif", overflow: "hidden" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#1a237e,#0d1657)", padding: "1.2rem 1.4rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>⚙️ Configurações</div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: 8, width: 28, height: 28, cursor: "pointer", fontSize: "0.85rem" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #f0f0f0" }}>
          {[["perfil","👤 Perfil"],["senha","🔑 Senha"],["notif","🔔 Notif."],["tema","🎨 Tema"]].map(([k,v]) => (
            <button key={k} onClick={() => { setAba(k); setErro(""); }}
              style={{ flex: 1, padding: "0.7rem 0.3rem", border: "none", background: "transparent", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, fontFamily: "inherit",
                color: aba === k ? "#1a237e" : "#9ca3af",
                borderBottom: aba === k ? "2px solid #e91e8c" : "2px solid transparent" }}>
              {v}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div style={{ padding: "1.4rem", overflowY: "auto", maxHeight: "60vh" }}>

          {/* Perfil */}
          {aba === "perfil" && <>
            {/* Foto */}
            <div style={{ textAlign: "center", marginBottom: "1.2rem" }}>
              <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto 0.6rem" }}>
                {foto
                  ? <img src={foto} alt="foto" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "3px solid #e91e8c" }} />
                  : <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,#1a237e,#e91e8c)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: avatar.length > 2 ? "1.8rem" : "1.4rem", fontWeight: 700, border: "3px solid #e8f0fe" }}>
                      {avatar || usuario.avatar}
                    </div>
                }
                {/* Indicador de status */}
                <div style={{ position: "absolute", bottom: 2, right: 2, width: 18, height: 18, borderRadius: "50%", background: STATUS_OPERADOR[status].cor, border: "2px solid #fff" }} />
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFoto} />
              <button onClick={() => fileRef.current.click()}
                style={{ background: "#f0f4ff", border: "1px solid #dde5f5", borderRadius: 8, padding: "0.4rem 1rem", fontSize: "0.78rem", fontWeight: 600, color: "#1a237e", cursor: "pointer", fontFamily: "inherit" }}>
                📷 Enviar foto
              </button>
              {foto && <button onClick={() => setFoto(null)} style={{ marginLeft: 8, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "0.4rem 0.8rem", fontSize: "0.78rem", color: "#dc2626", cursor: "pointer", fontFamily: "inherit" }}>✕ Remover</button>}
            </div>

            {/* Avatar emoji (só se não tiver foto) */}
            {!foto && <>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", textAlign: "center", marginBottom: 6 }}>Ou escolha um avatar:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: "1rem" }}>
                {AVATARES.map(a => (
                  <button key={a} onClick={() => setAvatar(a)}
                    style={{ width: 36, height: 36, borderRadius: "50%", border: avatar === a ? "2px solid #e91e8c" : "2px solid #e8f0fe", background: avatar === a ? "#fce4ec" : "#f8faff", cursor: "pointer", fontSize: "1.1rem" }}>
                    {a}
                  </button>
                ))}
              </div>
            </>}

            {/* Status */}
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: 8 }}>Status</div>
            <div style={{ display: "flex", gap: 8, marginBottom: "1rem" }}>
              {Object.entries(STATUS_OPERADOR).map(([k, v]) => (
                <button key={k} onClick={() => setStatus(k)}
                  style={{ flex: 1, padding: "0.5rem", borderRadius: 10, border: `2px solid ${status === k ? v.cor : "#e8f0fe"}`, background: status === k ? v.cor + "18" : "#f8faff", cursor: "pointer", fontFamily: "inherit", fontSize: "0.78rem", fontWeight: 600, color: status === k ? v.cor : "#6b7280" }}>
                  {v.icone} {v.label}
                </button>
              ))}
            </div>

            {/* Nome */}
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: 6 }}>Nome</div>
            <input style={mc.input} value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" />
          </>}

          {/* Senha */}
          {aba === "senha" && <>
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: 6 }}>Senha atual</div>
            <input style={mc.input} type="password" value={senhaAtual} onChange={e => { setSenhaAtual(e.target.value); setErro(""); }} placeholder="••••••" />
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151", margin: "12px 0 6px" }}>Nova senha</div>
            <input style={mc.input} type="password" value={novaSenha} onChange={e => { setNovaSenha(e.target.value); setErro(""); }} placeholder="Mínimo 6 caracteres" />
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151", margin: "12px 0 6px" }}>Confirmar nova senha</div>
            <input style={mc.input} type="password" value={confSenha} onChange={e => { setConfSenha(e.target.value); setErro(""); }} placeholder="Repita a senha" />
          </>}

          {/* Notificações */}
          {aba === "notif" && <>
            {[
              { label: "🔊 Som ao receber mensagem", val: notifSom, set: setNotifSom },
              { label: "📌 Banner de notificação", val: notifBannerAtivo, set: setNotifBannerAtivo },
            ].map(({ label, val, set }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.8rem 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ fontSize: "0.88rem", color: "#374151" }}>{label}</span>
                <button onClick={() => set(v => !v)} style={{ width: 44, height: 24, borderRadius: 99, border: "none", cursor: "pointer", background: val ? "#e91e8c" : "#d1d5db", position: "relative", transition: "background 0.2s" }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: val ? 23 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                </button>
              </div>
            ))}
          </>}

          {/* Tema */}
          {aba === "tema" && <>
            <div style={{ fontSize: "0.82rem", color: "#6b7280", marginBottom: "1rem" }}>Escolha o tema do painel:</div>
            {[["escuro","🌙 Escuro (padrão)"],["claro","☀️ Claro (em breve)"]].map(([k,v]) => (
              <div key={k} onClick={() => k === "escuro" && setTema(k)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.8rem 1rem", borderRadius: 12, border: `2px solid ${tema === k ? "#e91e8c" : "#e8f0fe"}`, marginBottom: 8, cursor: k === "claro" ? "not-allowed" : "pointer", opacity: k === "claro" ? 0.5 : 1 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${tema === k ? "#e91e8c" : "#d1d5db"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {tema === k && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#e91e8c" }} />}
                </div>
                <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#374151" }}>{v}</span>
              </div>
            ))}
          </>}

          {erro && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 8, padding: "0.5rem 0.8rem", fontSize: "0.8rem", marginTop: 10 }}>{erro}</div>}

          {aba !== "notif" && aba !== "tema" && (
            <button onClick={salvar} disabled={salvando}
              style={{ width: "100%", padding: "0.75rem", background: "#e91e8c", border: "none", borderRadius: 12, color: "#fff", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", marginTop: 16, fontFamily: "inherit", opacity: salvando ? 0.7 : 1 }}>
              {salvando ? "Salvando..." : "Salvar alterações"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const mc = {
  input: { width: "100%", padding: "0.65rem 0.9rem", border: "1.5px solid #dde5f5", borderRadius: 10, fontSize: "0.88rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box", color: "#111827" },
};

// ── APP PRINCIPAL ─────────────────────────────────────────────────────────────
export default function App() {
  const [usuarios, setUsuarios] = useState(USUARIOS_INICIAIS);
  const [usuariosCarregados, setUsuariosCarregados] = useState(false);

  // Restaura sessão do sessionStorage ao carregar
  const sessaoSalva = (() => {
    try { return JSON.parse(sessionStorage.getItem("deskhub_user") || "null"); }
    catch { return null; }
  })();
  const [usuarioLogado, setUsuarioLogado] = useState(sessaoSalva);

  // Salva/remove sessão quando usuário loga/desloga
  const logarUsuario = (user) => {
    try { sessionStorage.setItem("deskhub_user", JSON.stringify(user)); } catch {}
    setUsuarioLogado(user);
  };
  const deslogarUsuario = () => {
    try { sessionStorage.removeItem("deskhub_user"); } catch {}
    setUsuarioLogado(null);
  };

  // Carrega usuários do Supabase + garante que os iniciais existam
  useEffect(() => {
    const inicializar = async () => {
      try {
        const dados = await dbBuscarUsuarios();
        if (dados && dados.length > 0) {
          // Converte snake_case do banco para camelCase
          const convertidos = dados.map(u => ({
            id: u.id, nome: u.nome, email: u.email, senha: u.senha,
            avatar: u.avatar, setor: u.setor, admin: u.admin,
            adminAtendente: u.admin_atendente || false,
            primeiroAcesso: u.primeiro_acesso,
            atendentesIds: u.atendentes_ids || [],
            foto: u.foto || null,
            status: u.status || "online",
          }));
          setUsuarios(convertidos);
        } else {
          // Banco vazio — insere os usuários iniciais
          for (const u of USUARIOS_INICIAIS) {
            await dbInserirUsuario({
              nome: u.nome, email: u.email, senha: u.senha,
              avatar: u.avatar, setor: u.setor || "", admin: u.admin,
              primeiro_acesso: u.primeiroAcesso, atendentes_ids: u.atendentesIds,
            });
          }
          const novos = await dbBuscarUsuarios();
          if (novos) setUsuarios(novos.map(u => ({
            id: u.id, nome: u.nome, email: u.email, senha: u.senha,
            avatar: u.avatar, setor: u.setor, admin: u.admin,
            primeiroAcesso: u.primeiro_acesso, atendentesIds: u.atendentes_ids || [],
          })));
        }
      } catch(e) {
        console.error("Erro Supabase:", e);
      }
      setUsuariosCarregados(true);
    };
    inicializar();
  }, []);

  const [contatos, setContatos]           = useState([]);
  const [contatosCarregados, setContatosCarregados] = useState(false);

  // ── CARREGA CONVERSAS DO SUPABASE (incluindo WhatsApp) ────────────────────────
  const carregarConversas = async () => {
    setContatosCarregados(false);
    try {
      const dados = await supaFetch("conversas?select=*&status=neq.resolvido&order=created_at.desc");
      if (dados && dados.length > 0) {
        const convertidas = await Promise.all(dados.map(async (c) => {
          const produto = PRODUTOS.find(p => p.id === c.produto_id) || PRODUTOS[0];
          const atendente = ATENDENTES.find(a => a.id === c.atendente_id) || ATENDENTES[0];
          const conv = {
            id: c.id,
            supabaseId: c.id,
            nome: c.nome || c.telefone || "Cliente",
            canal: c.canal || "chat",
            status: c.status || "aberto",
            naoLidas: 0,
            avatar: (c.nome || "??").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase(),
            ultimaMensagem: c.canal === "whatsapp" ? "Mensagem via WhatsApp" : "Chat web",
            hora: "Agora",
            atendente,
            produto,
            tempoResposta: 0,
            telefone: c.telefone || "",
            email: c.email || "",
            empresa: c.empresa || "",
            anotacoes: c.empresa ? `Empresa: ${c.empresa}` : "",
            card: c.card || null,
            iniciadoEm: new Date(c.created_at).getTime(),
            mensagens: [],
          };
          try {
            const msgs = await dbBuscarMensagens(c.id);
            if (msgs && msgs.length > 0) {
              conv.mensagens = msgs.map((m, i) => ({
                id: i + 1,
                de: m.de === "atendente" ? "agente" : m.de,
                texto: m.texto,
                hora: new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
              }));
              conv.ultimaMensagem = conv.mensagens[conv.mensagens.length - 1].texto;
              conv.naoLidas = conv.mensagens.filter(m => m.de === "cliente").length;
            }
          } catch (_) {}
          return conv;
        }));
        setContatos(convertidas);
      } else {
        setContatos([]);
      }
    } catch (e) {
      console.error("Erro ao carregar conversas:", e);
    }
    setContatosCarregados(true);
  };

  useEffect(() => { carregarConversas(); }, []);
  const [selecionado, setSelecionado]     = useState(null);
  const [input, setInput]                 = useState("");
  const [sugestaoIA, setSugestaoIA]       = useState("");
  const [loadingIA, setLoadingIA]         = useState(false);
  const [filtroCanal, setFiltroCanal]     = useState("todos");
  const [filtroStatus, setFiltroStatus]   = useState("em_andamento");
  const [mostrarRapidas, setMostrarRapidas] = useState(false);
  const [digitando, setDigitando]         = useState(false);
  const [clienteDigitando, setClienteDigitando] = useState(false);
  const clienteDigitandoTimer = useRef(null);
  const [sidebar, setSidebar]             = useState(true);
  const [modalTransferir, setModalTransferir] = useState(false);
  const [buscaAtendente, setBuscaAtendente]   = useState("");
  const [transferindo, setTransferindo]   = useState(false);
  const [toastMsg, setToastMsg]           = useState(null);
  const [mostrarProdutos, setMostrarProdutos] = useState(false);
  const [aba, setAba]                     = useState("atendimento");
  const [notifBanner, setNotifBanner]     = useState(null);
  const [buscaCliente, setBuscaCliente]   = useState("");
  const [modalConfig, setModalConfig]     = useState(false);
  const [mostrarMenuStatus, setMostrarMenuStatus] = useState(false);
  const [painelDetalhes, setPainelDetalhes]       = useState(false);
  const [modoAdmin, setModoAdmin]                 = useState(false);
  const [mostrarCategorias, setMostrarCategorias] = useState(false);
  const [mostrarPrioridade, setMostrarPrioridade] = useState(null);
  const [agora, setAgora] = useState(Date.now());
  const [modalTriagem,      setModalTriagem]      = useState(false); // id do contato
  const [temaClaroEscuro, setTemaClaroEscuro] = useState("escuro");
  const [notifSom, setNotifSom]           = useState(true);
  const [notifBannerAtivo, setNotifBannerAtivo] = useState(true);
  const fimRef = useRef(null);

  const contatosDoUsuario = usuarioLogado
    ? contatos.filter(c => usuarioLogado.atendentesIds.includes(c.atendente.id))
    : [];

  const contato = contatosDoUsuario.find(c => c.id === selecionado);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [contato?.mensagens]);

  useEffect(() => {
    if (!mostrarMenuStatus) return;
    const close = () => setMostrarMenuStatus(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [mostrarMenuStatus]);

  useEffect(() => {
    if (!mostrarProdutos) return;
    const close = () => setMostrarProdutos(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [mostrarProdutos]);

  useEffect(() => {
    if (usuarioLogado) {
      const meus = contatos.filter(c => usuarioLogado.atendentesIds.includes(c.atendente.id));
      if (meus.length > 0) setSelecionado(meus[0].id);
    } else {
      setSelecionado(null);
    }
  }, [usuarioLogado]);

  useEffect(() => {
    const total = contatosDoUsuario.reduce((acc, c) => acc + (c.naoLidas || 0), 0);
    document.title = total > 0 ? `(${total}) Desk Hub | Painel` : `Desk Hub | Painel`;
  }, [contatosDoUsuario]);

  // Timer global — atualiza a cada segundo
  useEffect(() => {
    const interval = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Realtime — escuta novas conversas e mensagens do chat
  useEffect(() => {
    supaRealtime.start();
    const unsub = supaRealtime.onChange(async (msg) => {
      const tabela = msg.topic?.replace("realtime:public:", "");
      const registro = msg.payload?.record;
      if (!registro) return;

      if (tabela === "conversas" && msg.event === "INSERT") {
        // Nova conversa vinda do chat web — usa nome oficial do produto pelo id
        const produto = PRODUTOS.find(p => p.id === registro.produto_id) || PRODUTOS[0];
        const nomeProdutoOficial = produto.nome;
        const atendente = ATENDENTES.find(a => a.setor?.toLowerCase().includes(produto.nome.toLowerCase().split(" ")[0])) || ATENDENTES[0];
        const novaConversa = {
          id: registro.id,
          supabaseId: registro.id,
          nome: registro.nome,
          canal: registro.canal || "chat",
          status: "aberto",
          naoLidas: 1,
          avatar: registro.nome.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase(),
          ultimaMensagem: `Chat web — ${nomeProdutoOficial}`,
          hora: "Agora",
          atendente,
          produto,
          tempoResposta: 0,
          telefone: registro.telefone || "",
          email: registro.email || "",
          anotacoes: registro.empresa ? `Empresa: ${registro.empresa}${registro.card ? ` | Card: ${registro.card}` : ""}` : "",
          card: registro.card || null,
          iniciadoEm: Date.now(),
          mensagens: [],
        };
        // Busca mensagens já existentes
        try {
          const msgs = await dbBuscarMensagens(registro.id);
          if (msgs) novaConversa.mensagens = msgs.map((m, i) => ({ id: i+1, de: m.de === "bot" ? "sistema" : m.de, texto: `🤖 ${m.texto}`, hora: "Agora" }));
        } catch(_) {}
        // Corrige nome do produto no banco para o nome oficial
        try {
          await supaFetch(`conversas?id=eq.${registro.id}`, { method: "PATCH", body: JSON.stringify({ produto_nome: nomeProdutoOficial }) });
        } catch(_) {}
        setContatos(prev => [novaConversa, ...prev]);
        dispararNotificacao(novaConversa, `Nova conversa via chat — ${nomeProdutoOficial}`);
      }

      if (tabela === "mensagens" && msg.event === "INSERT") {
        // Nova mensagem do cliente em conversa existente
        if (registro.de === "digitando") {
          setClienteDigitando(true);
          if (clienteDigitandoTimer.current) clearTimeout(clienteDigitandoTimer.current);
          clienteDigitandoTimer.current = setTimeout(() => setClienteDigitando(false), 3000);
          return;
        }

        // Cliente encerrou ou saiu do site
        if (registro.de === "encerrado") {
          setClienteDigitando(false);
          setContatos(prev => prev.map(c => {
            if (c.supabaseId !== registro.conversa_id) return c;
            const novaMsg = { id: Date.now(), de: "sistema", texto: registro.texto, hora: "Agora" };
            return { ...c, mensagens: [...(c.mensagens || []), novaMsg], status: "resolvido", ultimaMensagem: registro.texto };
          }));
          // Dispara notificação sonora e banner
          const contatoEnc = contatos.find(c => c.supabaseId === registro.conversa_id);
          if (contatoEnc) dispararNotificacao(contatoEnc, registro.texto);
          return;
        }

        if (registro.de !== "cliente") return;
        setClienteDigitando(false);
        if (clienteDigitandoTimer.current) clearTimeout(clienteDigitandoTimer.current);
        setContatos(prev => {
          const updated = prev.map(c => {
            if (c.supabaseId !== registro.conversa_id) return c;
            const novaMsg = { id: Date.now(), de: "cliente", texto: registro.texto, hora: "Agora", lida: false };
            return { ...c, mensagens: [...(c.mensagens || []), novaMsg], naoLidas: (c.naoLidas || 0) + 1, ultimaMensagem: registro.texto };
          });
          const contatoAtualizado = updated.find(c => c.supabaseId === registro.conversa_id);
          if (contatoAtualizado) setTimeout(() => gerarSugestaoIA(contatoAtualizado), 500);
          return updated;
        });
      }
    });
    return unsub;
  }, []);

  // Alerta sonoro SLA vencido
  useEffect(() => {
    const vencidos = contatos.filter(c => {
      if (c.status === "resolvido" || !c.iniciadoEm) return false;
      const prio = c.prioridade || getPrioridadeAuto(c.tempoResposta || 5);
      const limite = (PRIORIDADE_CONFIG[prio]?.slaMin || 30) * 60 * 1000;
      return (agora - c.iniciadoEm) >= limite && !(c.slaAlertado);
    });
    if (vencidos.length > 0) {
      setContatos(prev => prev.map(c =>
        vencidos.find(v => v.id === c.id) ? { ...c, slaAlertado: true } : c
      ));
    }
  }, [agora]);

  const atualizarUsuarioNoBanco = async (id, dados) => {
    try {
      await dbAtualizarUsuario(id, dados);
      const novos = await dbBuscarUsuarios();
      if (novos) setUsuarios(novos.map(u => ({
        id: u.id, nome: u.nome, email: u.email, senha: u.senha,
        avatar: u.avatar, setor: u.setor, admin: u.admin,
        primeiroAcesso: u.primeiro_acesso, atendentesIds: u.atendentes_ids || [],
      })));
    } catch(e) { console.error(e); }
  };

  if (!usuariosCarregados) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#1a237e,#0d1657)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ textAlign: "center", color: "#fff" }}>
        <div style={{ fontSize: "2rem", fontWeight: 800, marginBottom: 12 }}>Desk Hub</div>
        <div style={{ fontSize: "0.9rem", color: "#8fa8e0" }}>Carregando...</div>
      </div>
    </div>
  );

  if (!usuarioLogado) return <Login onLogin={async (user, atualizado) => {
    if (atualizado) {
      await atualizarUsuarioNoBanco(atualizado.id, {
        senha: atualizado.senha, primeiro_acesso: false
      });
    }
    logarUsuario(user.primeiroAcesso ? { ...user, primeiroAcesso: false } : user);
    // Recarrega conversas ao fazer login
    carregarConversas();
  }} usuarios={usuarios} />;

  // Admin puro (sem perfil atendente) → vai direto para o painel admin
  if (usuarioLogado.admin && !usuarioLogado.adminAtendente) return <PainelAdmin
    onLogout={() => deslogarUsuario()}
    usuarios={usuarios}
    setUsuarios={setUsuarios}
    dbInserirUsuario={dbInserirUsuario}
    dbDeletarUsuario={dbDeletarUsuario}
    dbAtualizarUsuario={dbAtualizarUsuario}
    recarregarUsuarios={async () => {
      const dados = await dbBuscarUsuarios();
      if (dados) setUsuarios(dados.map(u => ({
        id: u.id, nome: u.nome, email: u.email, senha: u.senha,
        avatar: u.avatar, setor: u.setor, admin: u.admin,
        adminAtendente: u.admin_atendente || false,
        primeiroAcesso: u.primeiro_acesso, atendentesIds: u.atendentes_ids || [],
        foto: u.foto || null, status: u.status || "online",
      })));
    }}
  />;

  const recarregarUsuariosCompleto = async () => {
    const dados = await dbBuscarUsuarios();
    if (dados) setUsuarios(dados.map(u => ({
      id: u.id, nome: u.nome, email: u.email, senha: u.senha,
      avatar: u.avatar, setor: u.setor, admin: u.admin,
      adminAtendente: u.admin_atendente || false,
      primeiroAcesso: u.primeiro_acesso, atendentesIds: u.atendentes_ids || [],
      foto: u.foto || null, status: u.status || "online",
    })));
  };

  // Perfil duplo em modo admin
  if (modoAdmin && usuarioLogado.adminAtendente) return <PainelAdmin
    onLogout={() => deslogarUsuario()}
    onVoltarAtendente={() => setModoAdmin(false)}
    usuarios={usuarios}
    setUsuarios={setUsuarios}
    dbInserirUsuario={dbInserirUsuario}
    dbDeletarUsuario={dbDeletarUsuario}
    recarregarUsuarios={recarregarUsuariosCompleto}
    dbAtualizarUsuario={dbAtualizarUsuario}
  />;

  // Alerta sonoro SLA vencido - movido para antes dos returns condicionais
  const tocarSom = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
      g.gain.setValueAtTime(0.3, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.4);
    } catch(e) {}
  };

  const dispararNotificacao = (c, texto) => {
    tocarSom();
    setNotifBanner({ nome: c.nome, texto, canal: c.canal });
    setTimeout(() => setNotifBanner(null), 4000);
    let piscando = true;
    const intervalo = setInterval(() => {
      document.title = piscando ? `🔔 Nova mensagem!` : `Desk Hub | Painel`;
      piscando = !piscando;
    }, 800);
    setTimeout(() => clearInterval(intervalo), 6000);
  };

  const gerarSugestaoIA = async (contatoAtual) => {
    if (!contatoAtual) return;
    setLoadingIA(true);
    setSugestaoIA("");
    try {
      const historico = (contatoAtual.mensagens || [])
        .filter(m => m.de === "cliente" || m.de === "agente")
        .slice(-10)
        .map(m => `${m.de === "cliente" ? contatoAtual.nome.split(" ")[0] : "Atendente"}: ${m.texto}`)
        .join("\n");

      const contexto = [
        `Produto: ${contatoAtual.produto?.nome || "—"}`,
        contatoAtual.card ? `Pedido/Protocolo: ${contatoAtual.card}` : null,
        contatoAtual.nome ? `Cliente: ${contatoAtual.nome}` : null,
        contatoAtual.anotacoes ? `Empresa: ${contatoAtual.anotacoes}` : null,
      ].filter(Boolean).join(" | ");

      const res = await fetch(`${API_URL}/ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 300,
          system: `Você é um assistente de suporte ao cliente de uma empresa especializada em: Financeiro, Acesso à conta, Integrações e Relatórios.
Sua função é sugerir UMA resposta curta e profissional para o atendente enviar ao cliente.
Contexto: ${contexto}
Regras:
- Responda APENAS com o texto da mensagem, sem aspas, sem prefixo
- Tom profissional mas cordial
- Máximo 2 frases
- Em português do Brasil`,
          messages: [{ role: "user", content: `Histórico:\n${historico || "Sem histórico ainda."}\n\nSugira uma resposta para o atendente:` }],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Erro API:", res.status, errText);
        setSugestaoIA("⚠️ Erro ao conectar com a IA. Tente novamente.");
        setLoadingIA(false);
        return;
      }

      const data = await res.json();
      const texto = data?.content?.[0]?.text?.trim();
      setSugestaoIA(texto || "⚠️ Resposta vazia da IA. Tente novamente.");
    } catch(e) {
      console.error("Erro IA:", e);
      setSugestaoIA("⚠️ Erro de conexão. Verifique a internet e tente novamente.");
    }
    setLoadingIA(false);
  };

  const enviar = (texto) => {
    const msg = texto || input.trim();
    if (!msg) return;
    setInput(""); setMostrarRapidas(false);
    const contatoAtual = contatos.find(c => c.id === selecionado);
    setContatos(prev => prev.map(c => c.id === selecionado ? {
      ...c,
      mensagens: [
        ...c.mensagens.map(m => m.de === "cliente" ? { ...m, lida: true } : m),
        { id: Date.now(), de: "agente", texto: msg, hora: "Agora", lida: false, enviando: false }
      ],
      ultimaMensagem: msg, hora: "Agora", status: c.status === "aberto" ? "em_atendimento" : c.status,
    } : c));
    // Se conversa tem supabaseId → salva no Supabase
    if (contatoAtual?.supabaseId) {
      dbEnviarMensagem(contatoAtual.supabaseId, "atendente", msg, usuarioLogado?.nome || contatoAtual.atendente?.nome || "Atendente").catch(console.error);
      // Se canal for WhatsApp → envia via Evolution API com nome do atendente
      if (contatoAtual.canal === "whatsapp" && contatoAtual.telefone) {
        const nomeAtendente = usuarioLogado?.nome || contatoAtual.atendente?.nome || "Atendente";
        const msgComNome = `*${nomeAtendente}:*\n${msg}`;
        console.log("Enviando WhatsApp para:", contatoAtual.telefone);
        fetch(`${API_URL}/enviar-whatsapp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telefone: contatoAtual.telefone, mensagem: msgComNome }),
        })
          .then(r => r.json())
          .then(d => console.log("WhatsApp enviado:", d))
          .catch(e => console.error("Erro ao enviar WhatsApp:", e));
      }
    } else {
      // Simulação para conversas locais
      setDigitando(true);
      setTimeout(() => {
        setDigitando(false);
        const rs = ["Entendido, obrigado!", "Ok, aguardo.", "Perfeito! 🙏", "Tá bom, obrigada!"];
        const r = rs[Math.floor(Math.random() * rs.length)];
        setContatos(prev => prev.map(c => c.id === selecionado ? {
          ...c, mensagens: [...c.mensagens, { id: Date.now() + 1, de: "cliente", texto: r, hora: "Agora" }],
          ultimaMensagem: r, naoLidas: c.id !== selecionado ? (c.naoLidas || 0) + 1 : 0,
        } : c));
        const c = contatos.find(x => x.id === selecionado);
        if (c) dispararNotificacao(c, r);
      }, 1800);
    }
  };

  const fecharConversa = async (categoria) => {
    const contatoAtual = contatos.find(c => c.id === selecionado);
    setContatos(prev => prev.map(c => c.id === selecionado ? {
      ...c, status: "resolvido", categoria,
      mensagens: [...c.mensagens, { id: Date.now(), de: "sistema", texto: `✓ Atendimento encerrado · ${categoria.icone} ${categoria.label}`, hora: "Agora" }],
    } : c));
    setMostrarCategorias(false);
    setToastMsg(`✓ Resolvido · ${categoria.icone} ${categoria.label}`);
    setTimeout(() => setToastMsg(null), 3000);

    const msgNps = `✅ Seu atendimento foi encerrado!\n\nGostaríamos de saber sua opinião. Como você avalia o atendimento que recebeu?\n\n1 - 😢 Muito ruim\n2 - 🙁 Ruim\n3 - 😐 Regular\n4 - 🙂 Bom\n5 - 😀 Excelente`;

    if (contatoAtual?.supabaseId) {
      try {
        // Atualiza status para aguardando_nps no WhatsApp
        if (contatoAtual.canal === "whatsapp") {
          await dbAtualizarConversa(contatoAtual.supabaseId, { status: "aguardando_nps" });
          // Envia NPS via WhatsApp
          fetch(`${API_URL}/enviar-whatsapp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ telefone: contatoAtual.telefone, mensagem: msgNps }),
          }).catch(console.error);
        } else {
          // Chat web — envia NPS via Supabase Realtime
          await dbEnviarMensagem(contatoAtual.supabaseId, "encerrado", msgNps);
          await dbAtualizarConversa(contatoAtual.supabaseId, { status: "resolvido" });
        }
      } catch(e) { console.error(e); }
    }
  };

  const transferir = (atendente) => {
    setTransferindo(true);
    setTimeout(() => {
      setContatos(prev => prev.map(c => c.id === selecionado ? {
        ...c, atendente, mensagens: [...c.mensagens, { id: Date.now(), de: "sistema", texto: `Conversa transferida para ${atendente.nome} (${atendente.setor})`, hora: "Agora" }],
      } : c));
      setTransferindo(false); setModalTransferir(false); setBuscaAtendente("");
      setToastMsg(`✓ Transferido para ${atendente.nome}`);
      setTimeout(() => setToastMsg(null), 3000);
    }, 900);
  };

  const trocarProduto = (produto) => {
    setContatos(prev => prev.map(c => c.id === selecionado ? { ...c, produto } : c));
    setMostrarProdutos(false);
    setToastMsg(`✓ Produto: ${produto.nome}`);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const filtrados = contatosDoUsuario.filter(c => {
    if (filtroCanal !== "todos" && c.canal !== filtroCanal) return false;
    if (filtroStatus === "em_andamento" && c.status === "resolvido") return false;
    if (filtroStatus === "resolvido" && c.status !== "resolvido") return false;
    if (buscaCliente.trim() && !c.nome.toLowerCase().includes(buscaCliente.toLowerCase())) return false;
    return true;
  });

  const nAbertos     = contatosDoUsuario.filter(c => c.status === "aberto").length;
  const nAtendimento = contatosDoUsuario.filter(c => c.status === "em_atendimento").length;
  const nResolvidos  = contatosDoUsuario.filter(c => c.status === "resolvido").length;

  return (
    <div style={s.root}>
      <style>{css}</style>

      {/* SIDEBAR */}
      <div style={{ ...s.sidebar, ...(sidebar ? {} : { width: 0, overflow: "hidden" }) }}>
        <div style={s.sidebarTop}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={s.logoText}>Desk Hub</div>
              <div style={s.logoSub}>Painel de atendimento</div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {usuarioLogado.adminAtendente && (
                <button style={{ ...s.logoutBtn, fontSize: "0.65rem", width: "auto", padding: "0 8px", color: "#e91e8c", borderColor: "#e91e8c44" }} className="logout-btn" onClick={() => setModoAdmin(true)} title="Ir para painel admin">⚡ Admin</button>
              )}
              <button style={s.logoutBtn} className="logout-btn" onClick={() => { deslogarUsuario(); setSelecionado(null); }} title="Sair">⏻</button>
            </div>
          </div>
          <div style={s.userChip}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              {usuarioLogado.foto
                ? <img src={usuarioLogado.foto} alt="foto" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: "2px solid #e91e8c" }} />
                : <div style={s.userAvatar}>{usuarioLogado.avatar || usuarioLogado.nome?.slice(0,2).toUpperCase()}</div>
              }
              <div style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderRadius: "50%", background: STATUS_OPERADOR[usuarioLogado.status || "online"].cor, border: "1.5px solid #1a237e" }} />
            </div>
            <span style={s.userNome}>{usuarioLogado.nome}</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 4, alignItems: "center" }}>
              {/* Botão status rápido */}
              <div style={{ position: "relative" }}>
                <button
                  style={{ background: STATUS_OPERADOR[usuarioLogado.status || "online"].cor + "33", border: `1px solid ${STATUS_OPERADOR[usuarioLogado.status || "online"].cor}`, color: STATUS_OPERADOR[usuarioLogado.status || "online"].cor, borderRadius: 8, padding: "0.15rem 0.5rem", cursor: "pointer", fontSize: "0.68rem", fontWeight: 700, fontFamily: "inherit", whiteSpace: "nowrap" }}
                  onClick={() => setMostrarMenuStatus(v => !v)}>
                  {STATUS_OPERADOR[usuarioLogado.status || "online"].icone} {STATUS_OPERADOR[usuarioLogado.status || "online"].label}
                </button>
                {mostrarMenuStatus && (
                  <div style={{ position: "absolute", top: "110%", right: 0, background: "#fff", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", zIndex: 100, overflow: "hidden", minWidth: 130, border: "1px solid #e8f0fe" }}>
                    {Object.entries(STATUS_OPERADOR).map(([k, v]) => (
                      <button key={k} onClick={async () => {
                        setMostrarMenuStatus(false);
                        const updated = { ...usuarioLogado, status: k };
                        logarUsuario(updated);
                        await atualizarUsuarioNoBanco(usuarioLogado.id, { status: k });
                      }} style={{ width: "100%", padding: "0.55rem 0.9rem", border: "none", background: usuarioLogado.status === k ? "#f0f4ff" : "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: "0.8rem", fontWeight: 600, color: v.cor, textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: v.cor, flexShrink: 0 }} />
                        {v.label}
                        {usuarioLogado.status === k && <span style={{ marginLeft: "auto", fontSize: "0.7rem" }}>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button style={s.configBtn} className="logout-btn" onClick={() => setModalConfig(true)} title="Configurações">⚙️</button>
            </div>
          </div>
          <div style={s.metricas}>
            <div style={s.metricaItem}><span style={{ ...s.metricaNum, color: "#f59e0b" }}>{nAbertos}</span><span style={s.metricaLabel}>Abertos</span></div>
            <div style={s.metricaDivider} />
            <div style={s.metricaItem}><span style={{ ...s.metricaNum, color: "#60a5fa" }}>{nAtendimento}</span><span style={s.metricaLabel}>Em atend.</span></div>
            <div style={s.metricaDivider} />
            <div style={s.metricaItem}><span style={{ ...s.metricaNum, color: "#10b981" }}>{nResolvidos}</span><span style={s.metricaLabel}>Resolvidos</span></div>
          </div>
        </div>

        {/* Abas nav */}
        <div style={s.abas}>
          <button className="aba-btn" style={{ ...s.abaBtn, ...(aba === "atendimento" ? s.abaBtnAtivo : {}) }} onClick={() => setAba("atendimento")}>💬 Atendimentos</button>
          <button className="aba-btn" style={{ ...s.abaBtn, ...(aba === "relatorios" ? s.abaBtnAtivo : {}) }} onClick={() => setAba("relatorios")}>📊 Relatórios</button>
        </div>

        {/* Botão nova conversa */}
        {aba === "atendimento" && (
          <div style={{ padding: "0.6rem 0.8rem 0" }}>
            <button onClick={() => setModalTriagem(true)}
              style={{ width: "100%", background: "linear-gradient(135deg,#e91e8c,#c2185b)", border: "none", borderRadius: 10, padding: "0.55rem", cursor: "pointer", fontFamily: "inherit", fontSize: "0.8rem", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              ＋ Simular nova conversa
            </button>
          </div>
        )}

        {/* Botão de status */}
        <div style={{ padding: "0.6rem 0.8rem 0", position: "relative" }}>
          <div style={{ fontSize: "0.68rem", color: "#8fa8e0", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Meu status</div>
          <button onClick={e => { e.stopPropagation(); setMostrarMenuStatus(v => !v); }}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, background: STATUS_OPERADOR[usuarioLogado.status || "online"].cor + "22", border: `1.5px solid ${STATUS_OPERADOR[usuarioLogado.status || "online"].cor}55`, borderRadius: 10, padding: "0.5rem 0.8rem", cursor: "pointer", fontFamily: "inherit" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: STATUS_OPERADOR[usuarioLogado.status || "online"].cor, flexShrink: 0 }} />
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: STATUS_OPERADOR[usuarioLogado.status || "online"].cor }}>
              {STATUS_OPERADOR[usuarioLogado.status || "online"].label}
            </span>
            <span style={{ marginLeft: "auto", color: "#8fa8e0", fontSize: "0.7rem" }}>▾</span>
          </button>
          {mostrarMenuStatus && (
            <div style={{ position: "absolute", top: "100%", left: "0.8rem", right: "0.8rem", background: "#fff", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 100, overflow: "hidden", border: "1px solid #e8f0fe" }} onClick={e => e.stopPropagation()}>
              {Object.entries(STATUS_OPERADOR).map(([k, v]) => (
                <button key={k} onClick={async () => {
                  setMostrarMenuStatus(false);
                  setUsuarioLogado(prev => ({ ...prev, status: k }));
                  await atualizarUsuarioNoBanco(usuarioLogado.id, { status: k });
                }} style={{ width: "100%", padding: "0.65rem 1rem", border: "none", background: (usuarioLogado.status || "online") === k ? v.cor + "12" : "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: "0.85rem", fontWeight: 600, color: "#111827", textAlign: "left", display: "flex", alignItems: "center", gap: 10, borderBottom: k !== "offline" ? "1px solid #f3f4f6" : "none" }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: v.cor, flexShrink: 0 }} />
                  <span style={{ color: v.cor }}>{v.label}</span>
                  {(usuarioLogado.status || "online") === k && <span style={{ marginLeft: "auto", color: v.cor }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {aba === "atendimento" && (<>
          {/* Campo de busca */}
          <div style={{ padding: "0.6rem 0.8rem 0", }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: "0.85rem", color: "#8fa8e0" }}>🔍</span>
              <input
                style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "0.5rem 0.8rem 0.5rem 2rem", color: "#fff", fontSize: "0.82rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box", caretColor: "#fff" }}
                placeholder="Buscar cliente..."
                value={buscaCliente}
                onChange={e => setBuscaCliente(e.target.value)}
              />
              {buscaCliente && (
                <button onClick={() => setBuscaCliente("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#8fa8e0", cursor: "pointer", fontSize: "0.8rem" }}>✕</button>
              )}
            </div>
          </div>
          <div style={s.filtrosBox}>
            <div style={s.filtroRow}>
              {["todos","whatsapp","chat","email"].map(f => (
                <button key={f} className="filtro-pill" style={{ ...s.filtroPill, ...(filtroCanal === f ? s.filtroPillAtivo : {}) }} onClick={() => setFiltroCanal(f)}>
                  {f === "todos" ? "Todos" : CANAL_CONFIG[f].icon + " " + CANAL_CONFIG[f].label}
                </button>
              ))}
            </div>
            <div style={s.filtroRow}>
              {[
                { val: "em_andamento", label: "Em andamento" },
                { val: "resolvido",    label: "Resolvido" },
              ].map(f => (
                <button key={f.val} className="filtro-pill" style={{ ...s.filtroPill, ...(filtroStatus === f.val ? s.filtroPillAtivo : {}) }} onClick={() => setFiltroStatus(f.val)}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div style={s.listaContatos}>
            {filtrados.map(c => {
              const prioAuto = getPrioridadeAuto(c.tempoResposta || 5);
              const prio = c.prioridade || prioAuto;
              const prioCfg = PRIORIDADE_CONFIG[prio];
              const segundos = c.iniciadoEm && c.status !== "resolvido" ? Math.floor((agora - c.iniciadoEm) / 1000) : null;
              const sla = segundos !== null ? getSlaStatus(segundos, prio) : null;
              return (
                <div key={c.id} className="contato-item"
                  style={{ ...s.contatoItem, borderLeftColor: c.status !== "resolvido" ? prioCfg.cor : "transparent", ...(selecionado === c.id ? s.contatoItemAtivo : {}), ...(sla?.pisca ? { animation: "piscaSLA 1s infinite" } : {}) }}
                  onClick={() => { setSelecionado(c.id); setSugestaoIA(""); setContatos(prev => prev.map(x => x.id === c.id ? { ...x, naoLidas: 0 } : x)); setMostrarPrioridade(null); }}>
                  <Avatar iniciais={c.avatar} canal={c.canal} />
                  <div style={s.contatoInfo}>
                    <div style={s.contatoNomeRow}>
                      <span style={s.contatoNome}>{c.nome}</span>
                      {segundos !== null && (
                        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: sla.cor, fontVariantNumeric: "tabular-nums" }}>⏱ {formatarTempo(segundos)}</span>
                      )}
                    </div>
                    <div style={s.contatoMsgRow}><span style={s.contatoMsg}>{c.ultimaMensagem}</span><Badge n={c.naoLidas} /></div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5, flexWrap: "wrap" }}>
                      <span style={{ ...s.statusDot, background: STATUS_CONFIG[c.status].cor }}>{STATUS_CONFIG[c.status].label}</span>
                      {c.status !== "resolvido" && sla && (
                        <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: sla.cor + "18", color: sla.cor, border: `1px solid ${sla.cor}33` }}>
                          {sla.label}
                        </span>
                      )}
                      {c.status !== "resolvido" && (
                        <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => setMostrarPrioridade(mostrarPrioridade === c.id ? null : c.id)}
                            style={{ fontSize: "0.65rem", fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: prioCfg.bg, color: prioCfg.cor, border: `1px solid ${prioCfg.cor}44`, cursor: "pointer", fontFamily: "inherit" }}>
                            {prioCfg.icone} {prioCfg.label} ▾
                          </button>
                          {mostrarPrioridade === c.id && (
                            <div style={{ position: "absolute", top: "110%", left: 0, background: "#fff", borderRadius: 10, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", zIndex: 300, overflow: "hidden", minWidth: 140, border: "1px solid #e8f0fe" }}>
                              {Object.entries(PRIORIDADE_CONFIG).map(([k, v]) => (
                                <button key={k} onClick={() => { setContatos(prev => prev.map(x => x.id === c.id ? { ...x, prioridade: k } : x)); setMostrarPrioridade(null); }}
                                  style={{ width: "100%", padding: "0.45rem 0.8rem", border: "none", background: prio === k ? v.bg : "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: "0.78rem", fontWeight: 600, color: v.cor, textAlign: "left", display: "flex", alignItems: "center", gap: 6 }}>
                                  {v.icone} {v.label} <span style={{ fontSize: "0.6rem", color: "#9ca3af", marginLeft: "auto" }}>{v.slaMin}min</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <span style={s.produtoTag}>📦 {c.produto.nome}</span>
                      {c.categoria && <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: c.categoria.cor + "18", color: c.categoria.cor, border: `1px solid ${c.categoria.cor}33` }}>{c.categoria.icone} {c.categoria.label}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>)}

        {aba === "relatorios" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem", color: "#8fa8e0", fontSize: "0.78rem", textAlign: "center", paddingTop: "2rem" }}>
            Visualizando relatórios →
          </div>
        )}
      </div>

      {/* ÁREA PRINCIPAL */}
      <div style={s.chat}>
        {aba === "relatorios" ? (
          <Relatorios contatos={contatos} />
        ) : (<>
          {contato && (
            <div style={s.chatHeader}>
              <button className="icon-btn" style={s.iconBtn} onClick={() => setSidebar(v => !v)}>☰</button>
              <Avatar iniciais={contato.avatar} canal={contato.canal} />
              <div style={s.chatHeaderInfo}>
                <div style={s.chatHeaderNome}>{contato.nome}</div>
                <div style={s.chatHeaderSub}>
                  <span style={{ color: CANAL_CONFIG[contato.canal].cor }}>{CANAL_CONFIG[contato.canal].icon} {CANAL_CONFIG[contato.canal].label}</span>
                  <span style={s.dot}>·</span>
                  <span style={{ color: STATUS_CONFIG[contato.status].cor }}>{STATUS_CONFIG[contato.status].label}</span>
                  <span style={s.dot}>·</span>
                  <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
                    <button style={s.produtoTagBtn} onClick={() => setMostrarProdutos(v => !v)}>📦 {contato.produto.nome} ▾</button>
                    {mostrarProdutos && (
                      <div style={s.produtoDropdown}>
                        <div style={s.produtoDropdownTitulo}>Alterar produto</div>
                        {PRODUTOS.map(p => (
                          <button key={p.id} className="produto-opt"
                            style={{ ...s.produtoOpt, ...(contato.produto.id === p.id ? { background: "#e8f0fe", color: "#1a237e", fontWeight: 700 } : {}) }}
                            onClick={() => trocarProduto(p)}>
                            <span style={s.produtoOptDot} />{p.nome}
                            {contato.produto.id === p.id && <span style={{ marginLeft: "auto" }}>✓</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div style={s.chatHeaderAcoes}>
                <button className="icon-btn" style={{ ...s.iconBtn, color: painelDetalhes ? "#e91e8c" : "#888", fontSize: "1.1rem" }} onClick={() => setPainelDetalhes(v => !v)} title="Detalhes do cliente">👤</button>
                {contato.status !== "resolvido" && (<>
                  <button className="btn-transferir" style={s.btnTransferir} onClick={() => setModalTransferir(true)}>⇄ Transferir</button>
                  <div style={{ position: "relative" }} tabIndex={0} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setMostrarCategorias(false); }}>
                    <button className="btn-resolver" style={s.btnResolver} onClick={() => setMostrarCategorias(v => !v)}>
                      ✓ Resolver ▾
                    </button>
                    {mostrarCategorias && (
                      <div style={{ position: "absolute", top: "110%", right: 0, background: "#fff", borderRadius: 14, boxShadow: "0 8px 30px rgba(0,0,0,0.15)", zIndex: 200, overflow: "hidden", minWidth: 220, border: "1px solid #e8f0fe" }}>
                        <div style={{ padding: "0.6rem 1rem", fontSize: "0.7rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #f3f4f6" }}>Categoria do chamado</div>
                        {CATEGORIAS_FINALIZACAO.map(cat => (
                          <button key={cat.id} onClick={() => fecharConversa(cat)}
                            style={{ width: "100%", padding: "0.6rem 1rem", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: "0.82rem", fontWeight: 600, color: "#111827", textAlign: "left", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #f9f9f9" }}
                            onMouseEnter={e => e.currentTarget.style.background = cat.cor + "12"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            <span style={{ fontSize: "1rem" }}>{cat.icone}</span>
                            <span style={{ color: cat.cor }}>{cat.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>)}
              </div>
            </div>
          )}

          <div style={s.mensagensArea}>
            {contato?.mensagens.map((m, i) =>
              m.de === "sistema" ? (
                <div key={m.id} style={s.msgSistema}><span style={s.msgSistemaTexto}>🔄 {m.texto}</span></div>
              ) : (
                <div key={m.id} className="msg-wrap" style={{ ...s.msgWrap, justifyContent: m.de === "agente" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 7, animationDelay: `${i * 0.04}s` }}>
                  {/* Avatar do cliente (lado esquerdo) */}
                  {m.de === "cliente" && (
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#1a237e,#3949ab)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 700, flexShrink: 0 }}>
                      {contato.avatar}
                    </div>
                  )}
                  <div style={{ ...s.msgBolha, ...(m.de === "agente" ? s.msgAgente : s.msgCliente) }}>
                    {m.de === "agente" && <div style={s.msgDe}>Você</div>}
                    {m.texto}
                    <div style={{ ...s.msgHora, color: m.de === "agente" ? "rgba(255,255,255,0.5)" : "#aaa", display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}>
                      {m.hora}
                      {/* confirmação para mensagens do agente */}
                      {m.de === "agente" && (
                        <span style={{
                          fontSize: "0.7rem",
                          marginLeft: 2,
                          color: m.lida ? "#60b4f6" : "rgba(255,255,255,0.55)",
                          letterSpacing: "-2px",
                          fontWeight: 600,
                        }}>
                          {m.enviando ? "⏱" : "✓✓"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
            {/* Indicador cliente digitando */}
            {clienteDigitando && (
              <div style={{ ...s.msgWrap, justifyContent: "flex-start", alignItems: "flex-end", gap: 7 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#1a237e,#3949ab)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 700, flexShrink: 0 }}>
                  {contato?.avatar}
                </div>
                <div style={{ ...s.msgBolha, ...s.msgCliente, padding: "8px 14px", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: "0.72rem", color: "#64748b", fontStyle: "italic" }}>{contato?.nome?.split(" ")[0]} está digitando</span>
                  <div style={s.digitando}><span /><span /><span /></div>
                </div>
              </div>
            )}
            {/* Indicador agente digitando (simulações locais) */}
            {digitando && (
              <div style={{ ...s.msgWrap, justifyContent: "flex-start" }}>
                <div style={{ ...s.msgBolha, ...s.msgCliente }}><div style={s.digitando}><span /><span /><span /></div></div>
              </div>
            )}
            <div ref={fimRef} />
          </div>

          {contato && (
            <div style={s.atendenteBar}>
              <span style={s.atendenteLabel}>Atendente responsável:</span>
              <div style={s.atendenteChip}>
                <div style={s.atendenteAvatar}>{contato.atendente.avatar}</div>
                <span style={s.atendenteNome}>{contato.atendente.nome}</span>
                {contato.atendente.setor && <span style={s.atendenteSetor}>· {contato.atendente.setor}</span>}
              </div>
            </div>
          )}

          {mostrarRapidas && (
            <div style={s.rapidasBox}>
              <div style={s.rapidasTitulo}>⚡ Respostas rápidas</div>
              {RESPOSTAS_RAPIDAS.map((rr, i) => (
                <button key={i} className="rapida-btn" style={s.rapidaBtn} onClick={() => enviar(rr)}>{rr}</button>
              ))}
            </div>
          )}

          {/* SUGESTÃO IA */}
          {contato && contato.status !== "resolvido" && (sugestaoIA || loadingIA) && (
            <div style={{ padding: "8px 16px 4px", borderTop: "1px solid #e8f0fe", background: "#fafbff" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#6366f1", display: "flex", alignItems: "center", gap: 5 }}>
                  ✨ Sugestão da IA
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => gerarSugestaoIA(contato)}
                    style={{ fontSize: "0.65rem", padding: "2px 8px", border: "1px solid #c7d2fe", borderRadius: 99, background: "#eef2ff", color: "#4f46e5", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                    🔄 Nova
                  </button>
                  <button onClick={() => setSugestaoIA("")}
                    style={{ fontSize: "0.65rem", padding: "2px 8px", border: "1px solid #e2e8f0", borderRadius: 99, background: "#f8fafc", color: "#9ca3af", cursor: "pointer", fontFamily: "inherit" }}>
                    ✕
                  </button>
                </div>
              </div>
              {loadingIA ? (
                <div style={{ display: "flex", gap: 4, padding: "4px 0 8px" }}>
                  {[0, 0.15, 0.3].map((d, i) => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", animation: `bounce 1.2s ${d}s infinite` }} />
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, paddingBottom: 6 }}>
                  <div style={{ flex: 1, fontSize: "0.8rem", color: "#374151", lineHeight: 1.5, background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 10, padding: "7px 11px" }}>
                    {sugestaoIA}
                  </div>
                  <button onClick={() => { setInput(sugestaoIA); setSugestaoIA(""); }}
                    style={{ flexShrink: 0, padding: "6px 12px", background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", borderRadius: 10, color: "#fff", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                    Usar →
                  </button>
                </div>
              )}
            </div>
          )}

          {contato && contato.status !== "resolvido" && !sugestaoIA && !loadingIA && (
            <div style={{ padding: "5px 16px 2px", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => gerarSugestaoIA(contato)}
                style={{ fontSize: "0.65rem", padding: "3px 10px", border: "1px solid #c7d2fe", borderRadius: 99, background: "#eef2ff", color: "#4f46e5", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                ✨ Sugerir resposta
              </button>
            </div>
          )}

          {contato && (
            <div style={s.inputArea}>
              <button className="icon-btn" style={{ ...s.iconBtn, color: mostrarRapidas ? "#e91e8c" : "#888" }} onClick={() => setMostrarRapidas(v => !v)}>⚡</button>
              <textarea style={{ ...s.inputMsg, resize: "none", minHeight: 36, maxHeight: 100, overflowY: "auto", lineHeight: 1.5, paddingTop: 8, paddingBottom: 8 }}
                placeholder="Digite sua mensagem..."
                value={input} onChange={e => setInput(e.target.value)}
                rows={1}
                onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px"; }}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
                }}
                disabled={contato.status === "resolvido"} />
              <button className="btn-enviar" style={s.btnEnviar} onClick={() => enviar()} disabled={contato.status === "resolvido" || !input.trim()}>Enviar →</button>
            </div>
          )}
        </>)}
      </div>

      {/* PAINEL DETALHES DO CLIENTE */}
      {painelDetalhes && contato && (
        <div style={{ width: 280, flexShrink: 0, background: "#fff", borderLeft: "1px solid #e8f0fe", display: "flex", flexDirection: "column", fontFamily: "'DM Sans','Segoe UI',sans-serif", overflowY: "auto" }}>
          {/* Header */}
          <div style={{ background: "linear-gradient(135deg,#1a237e,#0d1657)", padding: "1rem 1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.88rem" }}>👤 Detalhes do cliente</span>
            <button onClick={() => setPainelDetalhes(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: 6, width: 24, height: 24, cursor: "pointer", fontSize: "0.78rem" }}>✕</button>
          </div>

          <div style={{ padding: "1.2rem", flex: 1 }}>
            {/* Avatar e nome */}
            <div style={{ textAlign: "center", marginBottom: "1.2rem" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#1a237e,#e91e8c)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", fontWeight: 700, margin: "0 auto 0.5rem" }}>{contato.avatar}</div>
              <div style={{ fontWeight: 700, color: "#111827", fontSize: "0.95rem" }}>{contato.nome}</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 5 }}>
                <span style={{ background: CANAL_CONFIG[contato.canal].cor + "18", color: CANAL_CONFIG[contato.canal].cor, border: `1px solid ${CANAL_CONFIG[contato.canal].cor}44`, borderRadius: 99, padding: "2px 8px", fontSize: "0.7rem", fontWeight: 600 }}>{CANAL_CONFIG[contato.canal].icon} {CANAL_CONFIG[contato.canal].label}</span>
                <span style={{ background: STATUS_CONFIG[contato.status].cor + "18", color: STATUS_CONFIG[contato.status].cor, border: `1px solid ${STATUS_CONFIG[contato.status].cor}44`, borderRadius: 99, padding: "2px 8px", fontSize: "0.7rem", fontWeight: 600 }}>{STATUS_CONFIG[contato.status].label}</span>
              </div>
            </div>

            {/* Dados de contato */}
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Contato</div>
              {[
                { icone: "📞", label: "Telefone", valor: contato.telefone || "Não informado", editavel: false },
                { icone: "✉️", label: "E-mail",   valor: contato.email    || "Não informado", editavel: false },
              ].map(({ icone, label, valor }) => (
                <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: "0.85rem", marginTop: 1 }}>{icone}</span>
                  <div>
                    <div style={{ fontSize: "0.68rem", color: "#9ca3af", fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: "0.82rem", color: "#111827", fontWeight: 500 }}>{valor}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Produto */}
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Produto</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f0f4ff", borderRadius: 8, padding: "0.5rem 0.8rem" }}>
                <span>📦</span>
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1a237e" }}>{contato.produto.nome}</span>
              </div>
            </div>

            {/* Atendente */}
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Atendente responsável</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f0f4ff", borderRadius: 8, padding: "0.5rem 0.8rem" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1a237e", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, flexShrink: 0 }}>{contato.atendente.avatar}</div>
                <div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1a237e" }}>{contato.atendente.nome}</div>
                  <div style={{ fontSize: "0.68rem", color: "#6b7280" }}>{contato.atendente.setor}</div>
                </div>
              </div>
            </div>

            {/* Anotações */}
            <div>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>📝 Anotações internas</div>
              <textarea
                rows={4}
                placeholder="Adicione observações sobre este cliente..."
                value={contato.anotacoes || ""}
                onChange={e => setContatos(prev => prev.map(c => c.id === contato.id ? { ...c, anotacoes: e.target.value } : c))}
                style={{ width: "100%", borderRadius: 10, border: "1.5px solid #dde5f5", padding: "0.6rem 0.8rem", fontSize: "0.8rem", fontFamily: "inherit", resize: "none", outline: "none", color: "#111827", boxSizing: "border-box", lineHeight: 1.5 }}
              />
              <div style={{ fontSize: "0.68rem", color: "#9ca3af", marginTop: 4 }}>Visível apenas para a equipe</div>
            </div>
          </div>
        </div>
      )}
      {modalTransferir && (
        <div style={s.modalOverlay} onClick={() => { setModalTransferir(false); setBuscaAtendente(""); }}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div><div style={s.modalTitulo}>Transferir atendimento</div><div style={s.modalSub}>Cliente: <strong>{contato?.nome}</strong></div></div>
              <button style={s.modalFechar} onClick={() => { setModalTransferir(false); setBuscaAtendente(""); }}>✕</button>
            </div>
            <input style={s.modalBusca} placeholder="Buscar por nome ou setor..." value={buscaAtendente} onChange={e => setBuscaAtendente(e.target.value)} autoFocus />
            <div style={s.modalLista}>
              {ATENDENTES.filter(a => a.nome.toLowerCase().includes(buscaAtendente.toLowerCase()) || a.setor.toLowerCase().includes(buscaAtendente.toLowerCase())).map(a => (
                <button key={a.id} className="atendente-row" style={s.atendenteRow} onClick={() => !transferindo && transferir(a)}>
                  <div style={s.atendenteRowAvatar}>{a.avatar}</div>
                  <div style={{ flex: 1 }}><div style={s.atendenteRowNome}>{a.nome}</div><div style={s.atendenteRowSetor}>{a.setor}</div></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_ATENDENTE[a.status].cor }} />
                    <span style={{ fontSize: "0.72rem", color: STATUS_ATENDENTE[a.status].cor }}>{STATUS_ATENDENTE[a.status].label}</span>
                  </div>
                </button>
              ))}
            </div>
            {transferindo && <div style={s.transferindoMsg}>Transferindo...</div>}
          </div>
        </div>
      )}

      {toastMsg && <div style={s.toast}>{toastMsg}</div>}

      {/* MODAL CONFIGURAÇÕES */}
      {modalConfig && <ModalConfig
        usuario={usuarioLogado}
        onClose={() => setModalConfig(false)}
        tema={temaClaroEscuro}
        setTema={setTemaClaroEscuro}
        notifSom={notifSom}
        setNotifSom={setNotifSom}
        notifBannerAtivo={notifBannerAtivo}
        setNotifBannerAtivo={setNotifBannerAtivo}
        onSalvar={async (dados) => {
          try {
            await atualizarUsuarioNoBanco(usuarioLogado.id, {
              nome: dados.nome,
              avatar: dados.avatar,
              foto: dados.foto || null,
              status: dados.status,
              ...(dados.novaSenha ? { senha: dados.novaSenha } : {}),
            });
            const updatedUser = { ...usuarioLogado, nome: dados.nome, avatar: dados.avatar, foto: dados.foto || null, status: dados.status };
            logarUsuario(updatedUser);
            setToastMsg("✓ Configurações salvas!");
          } catch(e) {
            setToastMsg("❌ Erro ao salvar. Tente novamente.");
          }
          setTimeout(() => setToastMsg(null), 3000);
          setModalConfig(false);
        }}
      />}

      {/* MODAL TRIAGEM */}
      {modalTriagem && <ModalTriagem
        onFechar={() => setModalTriagem(false)}
        onCriar={(novaConversa) => {
          setContatos(prev => [novaConversa, ...prev]);
          setSelecionado(novaConversa.id);
          setModalTriagem(false);
          setAba("atendimento");
        }}
        atendentes={usuarioLogado.atendentesIds.map(id => ATENDENTES.find(a => a.id === id)).filter(Boolean)}
      />}

      {/* BANNER NOTIFICAÇÃO */}
      {notifBanner && (
        <div style={s.notifBanner} onClick={() => setNotifBanner(null)}>
          <div style={s.notifIcone}>{CANAL_CONFIG[notifBanner.canal].icon}</div>
          <div>
            <div style={s.notifNome}>💬 {notifBanner.nome}</div>
            <div style={s.notifTexto}>{notifBanner.texto}</div>
          </div>
          <button style={s.notifFechar}>✕</button>
        </div>
      )}
    </div>
  );
}

// ── ESTILOS PAINEL ────────────────────────────────────────────────────────────
const AZUL = "#e91e8c", AZUL_LIGHT = "#fce4f3", AZUL_MID = "#f4a8d8";
const BG = "#f4f6fb", SIDEBAR_BG = "#1a237e", BRANCO = "#ffffff";
const TEXTO = "#111827", SUAVE = "#6b7280", BORDA = "#dde5f5";

const s = {
  root: { display: "flex", height: "100vh", background: BG, fontFamily: "'DM Sans','Segoe UI',sans-serif", overflow: "hidden", color: TEXTO },
  sidebar: { width: 300, flexShrink: 0, background: SIDEBAR_BG, display: "flex", flexDirection: "column", transition: "width 0.3s ease" },
  logoutBtn: { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#8fa8e0", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" },
  configBtn: { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#8fa8e0", borderRadius: 8, width: 26, height: 26, cursor: "pointer", fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", marginLeft: "auto", flexShrink: 0 },
  userChip: { display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "0.45rem 0.7rem", marginTop: 10, marginBottom: "0.9rem", border: "1px solid rgba(255,255,255,0.12)" },
  userAvatar: { width: 26, height: 26, borderRadius: "50%", background: "#e91e8c", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, flexShrink: 0 },
  userNome: { fontSize: "0.8rem", fontWeight: 600, color: "#e8eeff" },
  sidebarTop: { padding: "1.2rem 1rem 0.9rem", borderBottom: "1px solid #ffffff18" },
  logoText: { fontSize: "1.25rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", display: "flex", alignItems: "center", gap: 2 },
  logoSub: { fontSize: "0.72rem", color: "#8fa8e0", marginBottom: "0.9rem" },
  metricas: { display: "flex", background: "#ffffff10", borderRadius: 10, overflow: "hidden", border: "1px solid #ffffff18" },
  metricaItem: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "0.5rem 0" },
  metricaNum: { fontSize: "1.1rem", fontWeight: 700 },
  metricaLabel: { fontSize: "0.63rem", color: "#8fa8e0", marginTop: 1 },
  metricaDivider: { width: 1, background: "#ffffff18", margin: "6px 0" },
  abas: { display: "flex", borderBottom: "1px solid #ffffff18" },
  abaBtn: { flex: 1, padding: "0.65rem 0", background: "transparent", border: "none", color: "#8fa8e0", fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit", fontWeight: 500, transition: "all 0.15s", borderBottom: "2px solid transparent" },
  abaBtnAtivo: { color: "#fff", borderBottomColor: "#e91e8c", background: "#ffffff08" },
  filtrosBox: { padding: "0.7rem 0.8rem", borderBottom: "1px solid #ffffff18", display: "flex", flexDirection: "column", gap: 6 },
  filtroRow: { display: "flex", gap: 4, flexWrap: "wrap" },
  filtroPill: { background: "#ffffff12", border: "1px solid #ffffff20", borderRadius: 99, padding: "0.22rem 0.6rem", fontSize: "0.7rem", cursor: "pointer", color: "#8fa8e0", transition: "all 0.15s", fontFamily: "inherit" },
  filtroPillAtivo: { background: "#e91e8c", borderColor: "#e91e8c", color: "#fff" },
  listaContatos: { flex: 1, overflowY: "auto", padding: "0.5rem 0" },
  contatoItem: { display: "flex", gap: 10, alignItems: "flex-start", padding: "0.75rem 1rem", cursor: "pointer", transition: "background 0.15s", borderLeft: "3px solid transparent" },
  contatoItemAtivo: { background: "#ffffff14", borderLeftColor: "#e91e8c" },
  contatoInfo: { flex: 1, minWidth: 0 },
  contatoNomeRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  contatoNome: { fontSize: "0.88rem", fontWeight: 600, color: "#e8eeff" },
  contatoHora: { fontSize: "0.65rem", color: "#8fa8e0" },
  contatoMsgRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 },
  contatoMsg: { fontSize: "0.75rem", color: "#8fa8e0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 130 },
  statusDot: { display: "inline-block", borderRadius: 99, fontSize: "0.6rem", color: "#fff", fontWeight: 700, padding: "1px 6px", opacity: 0.9 },
  produtoTag: { display: "inline-block", borderRadius: 99, fontSize: "0.6rem", fontWeight: 600, padding: "1px 7px", background: "#e8f0fe", color: "#1a237e", border: "1px solid #c7d9fb" },
  chat: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" },
  chatHeader: { display: "flex", alignItems: "center", gap: 12, padding: "0.85rem 1.2rem", borderBottom: `1px solid ${BORDA}`, background: BRANCO, boxShadow: "0 1px 4px rgba(26,35,126,0.06)", flexShrink: 0 },
  chatHeaderInfo: { flex: 1, minWidth: 0 },
  chatHeaderNome: { fontSize: "0.95rem", fontWeight: 700, color: TEXTO },
  chatHeaderSub: { fontSize: "0.72rem", color: SUAVE, display: "flex", gap: 6, alignItems: "center", marginTop: 2, flexWrap: "wrap" },
  dot: { color: BORDA },
  chatHeaderAcoes: { display: "flex", gap: 8, flexShrink: 0 },
  btnTransferir: { background: "#e8f0fe", border: "1px solid #c7d9fb", color: "#1a237e", borderRadius: 8, padding: "0.35rem 0.9rem", fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, transition: "all 0.2s" },
  btnResolver: { background: "#d1fae5", border: "1px solid #6ee7b7", color: "#065f46", borderRadius: 8, padding: "0.35rem 0.9rem", fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, transition: "all 0.2s" },
  iconBtn: { background: "transparent", border: "none", color: "#8fa8e0", fontSize: "1.1rem", cursor: "pointer", borderRadius: 8, padding: "0.3rem 0.5rem", transition: "color 0.15s" },
  produtoTagBtn: { borderRadius: 99, fontSize: "0.72rem", fontWeight: 600, padding: "2px 9px", cursor: "pointer", background: "#e8f0fe", color: "#1a237e", border: "1px solid #c7d9fb", fontFamily: "inherit" },
  produtoDropdown: { position: "absolute", top: "calc(100% + 6px)", left: 0, background: BRANCO, borderRadius: 12, minWidth: 220, boxShadow: "0 8px 30px rgba(26,35,126,0.15)", border: `1px solid ${BORDA}`, zIndex: 50, overflow: "hidden" },
  produtoDropdownTitulo: { fontSize: "0.68rem", fontWeight: 700, color: SUAVE, letterSpacing: "0.08em", textTransform: "uppercase", padding: "0.6rem 0.9rem 0.3rem" },
  produtoOpt: { display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "0.55rem 0.9rem", background: "transparent", border: "none", borderBottom: `1px solid ${BORDA}`, cursor: "pointer", fontSize: "0.82rem", color: TEXTO, fontFamily: "inherit", transition: "background 0.12s", textAlign: "left" },
  produtoOptDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: "#1a237e" },
  mensagensArea: { flex: 1, overflowY: "auto", padding: "1.2rem", display: "flex", flexDirection: "column", gap: 8, background: BG },
  msgWrap: { display: "flex", animation: "fadeUp 0.25s ease both" },
  msgBolha: { maxWidth: "68%", borderRadius: 14, padding: "0.65rem 0.9rem", fontSize: "0.875rem", lineHeight: 1.5 },
  msgCliente: { background: BRANCO, border: `1px solid ${BORDA}`, color: TEXTO, borderBottomLeftRadius: 4, boxShadow: "0 1px 3px rgba(26,86,219,0.06)" },
  msgAgente: { background: AZUL, border: "none", color: "#fff", borderBottomRightRadius: 4, boxShadow: "0 2px 8px rgba(233,30,140,0.25)" },
  msgDe: { fontSize: "0.63rem", color: "rgba(255,255,255,0.7)", fontWeight: 700, marginBottom: 3 },
  msgHora: { fontSize: "0.6rem", marginTop: 4, textAlign: "right" },
  msgSistema: { display: "flex", justifyContent: "center", margin: "4px 0" },
  msgSistemaTexto: { background: "#fff3e0", border: "1px solid #ffe0b2", borderRadius: 99, padding: "0.3rem 1rem", fontSize: "0.75rem", color: "#e65100" },
  digitando: { display: "flex", gap: 4, padding: "4px 2px", alignItems: "center" },
  atendenteBar: { display: "flex", alignItems: "center", gap: 8, padding: "0.5rem 1.2rem", borderTop: `1px solid ${BORDA}`, background: "#f8faff", flexShrink: 0 },
  atendenteLabel: { fontSize: "0.72rem", color: SUAVE },
  atendenteChip: { display: "flex", alignItems: "center", gap: 6, background: AZUL_LIGHT, border: `1px solid ${AZUL_MID}`, borderRadius: 99, padding: "0.2rem 0.7rem" },
  atendenteAvatar: { width: 20, height: 20, borderRadius: "50%", background: AZUL, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.55rem", fontWeight: 700 },
  atendenteNome: { fontSize: "0.75rem", fontWeight: 600, color: AZUL },
  atendenteSetor: { fontSize: "0.7rem", color: SUAVE },
  rapidasBox: { background: BRANCO, borderTop: `1px solid ${BORDA}`, padding: "0.75rem 1.2rem", display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto", flexShrink: 0 },
  rapidasTitulo: { fontSize: "0.7rem", color: SUAVE, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" },
  rapidaBtn: { background: AZUL_LIGHT, border: `1px solid ${AZUL_MID}`, color: AZUL, borderRadius: 8, padding: "0.45rem 0.8rem", fontSize: "0.8rem", cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all 0.15s" },
  inputArea: { display: "flex", gap: 8, padding: "0.85rem 1.2rem", borderTop: `1px solid ${BORDA}`, background: BRANCO, alignItems: "center", flexShrink: 0 },
  inputMsg: { flex: 1, background: BG, border: `1.5px solid ${BORDA}`, borderRadius: 10, padding: "0.6rem 0.9rem", color: TEXTO, fontSize: "0.875rem", fontFamily: "inherit", outline: "none", transition: "border-color 0.2s" },
  btnEnviar: { background: AZUL, border: "none", color: "#fff", borderRadius: 10, padding: "0.6rem 1.1rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", whiteSpace: "nowrap" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modalBox: { background: BRANCO, borderRadius: 16, width: 420, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(26,35,126,0.2)", overflow: "hidden" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "1.2rem 1.2rem 0.8rem", borderBottom: `1px solid ${BORDA}` },
  modalTitulo: { fontSize: "1rem", fontWeight: 700, color: TEXTO },
  modalSub: { fontSize: "0.78rem", color: SUAVE, marginTop: 2 },
  modalFechar: { background: "transparent", border: "none", color: SUAVE, fontSize: "1rem", cursor: "pointer", padding: "0.2rem 0.4rem", borderRadius: 6 },
  modalBusca: { display: "block", width: "100%", padding: "0.7rem 1.2rem", border: "none", borderBottom: `1px solid ${BORDA}`, fontSize: "0.875rem", color: TEXTO, fontFamily: "inherit", outline: "none", background: "#f8faff", boxSizing: "border-box" },
  modalLista: { maxHeight: 300, overflowY: "auto" },
  atendenteRow: { display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "0.8rem 1.2rem", background: "transparent", border: "none", borderBottom: `1px solid ${BORDA}`, cursor: "pointer", textAlign: "left", transition: "background 0.15s", fontFamily: "inherit" },
  atendenteRowAvatar: { width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#c7d9fb,#e8f0fe)", border: "2px solid #c7d9fb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, color: "#1a237e", flexShrink: 0 },
  atendenteRowNome: { fontSize: "0.875rem", fontWeight: 600, color: TEXTO },
  atendenteRowSetor: { fontSize: "0.72rem", color: SUAVE, marginTop: 1 },
  transferindoMsg: { padding: "0.8rem 1.2rem", textAlign: "center", fontSize: "0.82rem", color: AZUL, fontStyle: "italic" },
  toast: { position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#1a237e", color: "#fff", borderRadius: 99, padding: "0.6rem 1.4rem", fontSize: "0.85rem", fontWeight: 600, boxShadow: "0 4px 20px rgba(26,35,126,0.35)", zIndex: 200, whiteSpace: "nowrap" },
  notifBanner: { position: "fixed", top: 20, right: 20, background: "#fff", borderRadius: 14, padding: "0.9rem 1rem", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 8px 30px rgba(26,35,126,0.2)", border: "1px solid #dde5f5", zIndex: 300, cursor: "pointer", animation: "slideIn 0.3s ease", maxWidth: 320, borderLeft: "4px solid #e91e8c" },
  notifIcone: { fontSize: "1.4rem", flexShrink: 0 },
  notifNome: { fontSize: "0.82rem", fontWeight: 700, color: "#1a237e" },
  notifTexto: { fontSize: "0.78rem", color: "#6b7280", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 },
  notifFechar: { background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "0.8rem", marginLeft: "auto", flexShrink: 0 },
};

// ── ESTILOS RELATÓRIOS ────────────────────────────────────────────────────────
const r = {
  wrap: { flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: 20, background: BG },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 },
  titulo: { fontSize: "1.3rem", fontWeight: 800, color: "#1a237e", letterSpacing: "-0.02em" },
  subtitulo: { fontSize: "0.78rem", color: SUAVE, marginTop: 2 },
  periodo: { display: "flex", gap: 6 },
  periodoBtn: { background: BRANCO, border: `1px solid ${BORDA}`, borderRadius: 8, padding: "0.35rem 0.8rem", fontSize: "0.78rem", cursor: "pointer", color: SUAVE, fontFamily: "inherit", transition: "all 0.15s" },
  periodoBtnAtivo: { background: "#1a237e", color: "#fff", borderColor: "#1a237e" },
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 },
  kpiCard: { background: BRANCO, borderRadius: 14, padding: "1rem", border: `1px solid ${BORDA}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, boxShadow: "0 2px 8px rgba(26,35,126,0.05)" },
  kpiIcon: { fontSize: "1.3rem" },
  kpiValor: { fontSize: "1.6rem", fontWeight: 800 },
  kpiLabel: { fontSize: "0.7rem", color: SUAVE, textAlign: "center" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  card: { background: BRANCO, borderRadius: 14, padding: "1.2rem", border: `1px solid ${BORDA}`, boxShadow: "0 2px 8px rgba(26,35,126,0.05)" },
  cardTitulo: { fontSize: "0.85rem", fontWeight: 700, color: "#1a237e", marginBottom: "1rem" },
  grafico: { display: "flex", alignItems: "flex-end", gap: 6, height: 120, padding: "0 4px" },
  barraWrap: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%" },
  barraContainer: { flex: 1, width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 2 },
  barra: { width: "100%", borderRadius: "4px 4px 0 0", transition: "height 0.5s ease", position: "relative", minHeight: 4 },
  barraValor: { position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", fontSize: "0.6rem", fontWeight: 700, color: "#1a237e", whiteSpace: "nowrap" },
  barraLabel: { fontSize: "0.65rem", color: SUAVE, fontWeight: 600 },
  legenda: { display: "flex", gap: 16, marginTop: 12, justifyContent: "center" },
  legendaItem: { display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: SUAVE },
  legendaDot: { width: 10, height: 10, borderRadius: 3 },
  produtoLista: { display: "flex", flexDirection: "column", gap: 12 },
  produtoRow: { display: "flex", alignItems: "center", gap: 10 },
  produtoNome: { fontSize: "0.78rem", color: TEXTO, width: 160, flexShrink: 0, fontWeight: 500 },
  produtoBarraWrap: { flex: 1, height: 10, background: "#f0f4ff", borderRadius: 99, overflow: "hidden" },
  produtoBarra: { height: "100%", background: "linear-gradient(90deg,#1a237e,#e91e8c)", borderRadius: 99, transition: "width 0.6s ease" },
  produtoNum: { fontSize: "0.8rem", fontWeight: 700, color: "#1a237e", width: 24, textAlign: "right" },
  rankingGrid: { display: "flex", flexDirection: "column", gap: 10 },
  rankingCard: { display: "flex", alignItems: "center", gap: 12, padding: "0.75rem 1rem", background: "#f8faff", borderRadius: 12, border: `1px solid ${BORDA}` },
  rankingPos: { width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 800, flexShrink: 0 },
  rankingAvatar: { width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#c7d9fb,#e8f0fe)", border: "2px solid #c7d9fb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, color: "#1a237e", flexShrink: 0 },
  rankingInfo: { flex: 1, minWidth: 0 },
  rankingNome: { fontSize: "0.85rem", fontWeight: 700, color: TEXTO },
  rankingSetor: { fontSize: "0.68rem", color: SUAVE, marginTop: 1 },
  rankingBarraWrap: { height: 4, background: "#e8f0fe", borderRadius: 99, overflow: "hidden", marginTop: 6 },
  rankingBarra: { height: "100%", background: "linear-gradient(90deg,#1a237e,#e91e8c)", borderRadius: 99, transition: "width 0.6s ease" },
  rankingStats: { display: "flex", gap: 12, flexShrink: 0 },
  rankingStat: { display: "flex", flexDirection: "column", alignItems: "center", fontSize: "0.82rem" },
  rankingStatLabel: { fontSize: "0.6rem", color: SUAVE },
  statusBadge: { borderRadius: 99, fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", flexShrink: 0 },
  tabela: { width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" },
  th: { padding: "0.6rem 0.8rem", textAlign: "left", fontSize: "0.7rem", fontWeight: 700, color: SUAVE, letterSpacing: "0.05em", textTransform: "uppercase", borderBottom: `2px solid ${BORDA}` },
  td: { padding: "0.65rem 0.8rem", borderBottom: `1px solid ${BORDA}`, color: TEXTO, verticalAlign: "middle" },
  tagProduto: { display: "inline-block", borderRadius: 99, fontSize: "0.65rem", fontWeight: 600, padding: "1px 7px", background: "#e8f0fe", color: "#1a237e", border: "1px solid #c7d9fb" },
  verBtn: { fontSize: "0.72rem", color: "#1a237e", fontWeight: 600, background: "#e8f0fe", border: "1px solid #c7d9fb", borderRadius: 99, padding: "2px 10px", whiteSpace: "nowrap" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, animation: "fadeUp 0.2s ease" },
  modalConversa: { background: "#fff", borderRadius: 20, width: 520, maxWidth: "92vw", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(26,35,126,0.25)", overflow: "hidden" },
  modalConversaHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 1.2rem", background: "#1a237e", gap: 12 },
  modalAvatar: { width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700, color: "#fff", flexShrink: 0 },
  modalConversaNome: { fontSize: "0.95rem", fontWeight: 700, color: "#fff" },
  modalConversaSub: { display: "flex", gap: 7, alignItems: "center", marginTop: 3, fontSize: "0.72rem", color: "#c7d9fb", flexWrap: "wrap" },
  tagProdutoModal: { background: "rgba(255,255,255,0.15)", color: "#fff", borderRadius: 99, padding: "1px 7px", fontSize: "0.68rem", fontWeight: 600 },
  modalFecharBtn: { background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: 28, height: 28, borderRadius: "50%", cursor: "pointer", fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  modalAtendenteBar: { display: "flex", alignItems: "center", gap: 8, padding: "0.6rem 1.2rem", borderBottom: "1px solid #dde5f5", background: "#f8faff" },
  modalMensagens: { flex: 1, overflowY: "auto", padding: "1rem 1.2rem", display: "flex", flexDirection: "column", gap: 8, background: "#f4f6fb" },
  modalMsgWrap: { display: "flex", animation: "fadeUp 0.2s ease both" },
  modalMsgBolha: { maxWidth: "72%", borderRadius: 14, padding: "0.6rem 0.85rem", fontSize: "0.85rem", lineHeight: 1.5 },
  modalMsgCliente: { background: "#fff", border: "1px solid #dde5f5", color: "#111827", borderBottomLeftRadius: 4 },
  modalMsgAgente: { background: "#e91e8c", color: "#fff", borderBottomRightRadius: 4, boxShadow: "0 2px 8px rgba(233,30,140,0.25)" },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #c7d9fb; border-radius: 4px; }
  .logout-btn:hover { background: rgba(233,30,140,0.3) !important; color: #fff !important; border-color: #e91e8c !important; }
  .contato-item:hover { background: #ffffff18 !important; }
  @keyframes piscaSLA {
    0%, 100% { background: transparent; }
    50%       { background: rgba(239,68,68,0.08); }
  }
  @keyframes widgetPop {
    from { opacity: 0; transform: scale(0.92) translateY(10px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes bounce {
    0%, 60%, 100% { transform: translateY(0); }
    30%           { transform: translateY(-5px); }
  }
  input[placeholder="Buscar cliente..."] { color: #fff !important; }
  input[placeholder="Buscar cliente..."]::placeholder { color: rgba(255,255,255,0.4) !important; }
  input[placeholder="Buscar cliente..."]:focus { border-color: rgba(233,30,140,0.5) !important; background: rgba(255,255,255,0.12) !important; }
  .aba-btn:hover { color: #fff !important; background: #ffffff08 !important; }
  .filtro-pill:hover { color: #c7d9fb !important; border-color: #ffffff44 !important; }
  .btn-transferir:hover { background: #c7d9fb !important; }
  .btn-resolver:hover { background: #a7f3d0 !important; }
  .btn-enviar:hover:not(:disabled) { background: #c91878 !important; transform: translateY(-1px); }
  .btn-enviar:disabled { opacity: 0.35; cursor: not-allowed; }
  .rapida-btn:hover { background: #f4a8d8 !important; }
  .icon-btn:hover { color: #e91e8c !important; background: #fce4f3 !important; }
  .produto-opt:hover { background: #f0f4ff !important; }
  .atendente-row:hover { background: #f0f4ff !important; }
  .hist-row:hover td { background: #eef2ff !important; }
  .hist-row:hover .ver-btn { background: #1a237e; color: #fff; }
  input:focus { border-color: #e91e8c !important; background: #fff !important; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideIn { from { opacity:0; transform:translateX(60px); } to { opacity:1; transform:translateX(0); } }
  @keyframes bounce { 0%,80%,100% { transform:translateY(0); opacity:0.4; } 40% { transform:translateY(-5px); opacity:1; } }
  .msg-wrap { animation: fadeUp 0.25s ease both; }
  div[style*="digitando"] span { display:inline-block; width:7px; height:7px; background:#9ab4e8; border-radius:50%; animation:bounce 1.2s infinite; }
  div[style*="digitando"] span:nth-child(2) { animation-delay:0.2s; }
  div[style*="digitando"] span:nth-child(3) { animation-delay:0.4s; }
`;
