import { Router } from "express";

const SUPA_URL  = process.env.SUPA_URL;
const SUPA_KEY  = process.env.SUPA_KEY;
const EVO_URL   = process.env.EVO_URL;
const EVO_KEY   = process.env.EVO_KEY;
const INSTANCIA = process.env.INSTANCIA;

const supa = (path, opts = {}) =>
  fetch(`${SUPA_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      Prefer: "return=representation",
      ...opts.headers,
    },
  }).then((r) => r.json());

const enviarWpp = (telefone, texto) => {
  fetch(`${EVO_URL}/message/sendText/${INSTANCIA}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: EVO_KEY },
    body: JSON.stringify({ number: telefone, text: texto }),
  }).catch((e) => console.error("Erro enviarWpp:", e));
};

const NPS_EMOJIS = { 1: "😢", 2: "🙁", 3: "😐", 4: "🙂", 5: "😀" };
const NPS_LABELS = { 1: "Muito ruim", 2: "Ruim", 3: "Regular", 4: "Bom", 5: "Excelente" };

const PRODUTOS = [
  { id: 1, nome: "Financeiro",     campo: "Número do pedido",    pergunta: "Por favor, informe o *número do pedido*:" },
  { id: 2, nome: "Acesso à conta",             campo: null,                pergunta: null },
  { id: 3, nome: "Integrações",  campo: "Número do pedido",    pergunta: "Por favor, informe o *número do pedido*:" },
  { id: 4, nome: "Relatórios", campo: "Número do pedido",    pergunta: "Por favor, informe o *número do pedido*:" },
];

const MENU_PRODUTOS = `Sobre qual produto você precisa de suporte?\n\n1️⃣ Financeiro\n2️⃣ Acesso à conta\n3️⃣ Integrações\n4️⃣ Relatórios\n\nResponda com o *número* da opção desejada.`;

const getSaudacao = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
};

const router = Router();

router.post("/", async (req, res) => {
  try {
    const body = req.body;
    console.log("BODY:", JSON.stringify(body));

    const { event: tipo, data } = body;
    if (tipo !== "MESSAGES_UPSERT" && tipo !== "messages.upsert") {
      return res.status(200).send("ignored: " + tipo);
    }

    let msg = null;
    if (Array.isArray(data?.messages) && data.messages.length > 0) msg = data.messages[0];
    else if (data?.key) msg = data;
    else if (Array.isArray(data) && data.length > 0) msg = data[0];

    if (!msg) return res.status(200).send("no message");
    if (msg.key?.fromMe) return res.status(200).send("own message");

    const remoteJid = msg.key?.remoteJid || "";
    if (remoteJid.includes("@g.us")) return res.status(200).send("group ignored");

    const telefone = remoteJid.replace("@s.whatsapp.net", "").replace(/\D/g, "");
    if (!telefone) return res.status(200).send("no phone");

    const texto = (
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      msg.message?.videoMessage?.caption ||
      msg.message?.documentMessage?.caption ||
      "[mídia]"
    ).trim();

    const nomeContato = msg.pushName || telefone;

    const conversas = await supa(
      `conversas?telefone=eq.${telefone}&status=neq.resolvido&canal=eq.whatsapp&order=created_at.desc&limit=1`
    );
    const conv = conversas && !conversas.error && conversas.length > 0 ? conversas[0] : null;

    // AGUARDANDO NPS
    if (conv && conv.status === "aguardando_nps") {
      const nota = parseInt(texto);
      if (!nota || nota < 1 || nota > 5) {
        enviarWpp(telefone, "Por favor, responda com um número de 1 a 5:\n\n1 - 😢 Muito ruim\n2 - 🙁 Ruim\n3 - 😐 Regular\n4 - 🙂 Bom\n5 - 😀 Excelente");
        return res.status(200).send("nps invalido");
      }
      const emoji = NPS_EMOJIS[nota];
      const label = NPS_LABELS[nota];
      await supa(`conversas?id=eq.${conv.id}`, { method: "PATCH", body: JSON.stringify({ status: "resolvido", nps: nota }) });
      await supa("mensagens", { method: "POST", body: JSON.stringify({ conversa_id: conv.id, de: "bot", texto: `NPS: ${nota}/5 ${emoji} ${label}` }) });
      enviarWpp(telefone, `${emoji} Obrigado pela avaliação! Até a próxima! 😊`);
      return res.status(200).send("nps salvo");
    }

    // ATENDIMENTO NORMAL
    if (conv && conv.status !== "triagem") {
      await supa("mensagens", { method: "POST", body: JSON.stringify({ conversa_id: conv.id, de: "cliente", texto, nome_atendente: nomeContato }) });
      return res.status(200).send("ok");
    }

    // TRIAGEM EM ANDAMENTO
    if (conv && conv.status === "triagem") {
      const etapa = conv.card || "aguardando_empresa";

      if (etapa === "aguardando_empresa") {
        await supa(`conversas?id=eq.${conv.id}`, { method: "PATCH", body: JSON.stringify({ empresa: texto, card: "aguardando_produto" }) });
        await supa("mensagens", { method: "POST", body: JSON.stringify({ conversa_id: conv.id, de: "bot", texto: `Empresa: ${texto}` }) });
        enviarWpp(telefone, MENU_PRODUTOS);
        return res.status(200).send("empresa salva");
      }

      if (etapa === "aguardando_produto") {
        const num = parseInt(texto);
        const produto = PRODUTOS.find((p) => p.id === num);
        if (!produto) {
          enviarWpp(telefone, "Por favor, responda com o número da opção desejada (1, 2, 3 ou 4).");
          return res.status(200).send("aguardando produto");
        }
        await supa(`conversas?id=eq.${conv.id}`, { method: "PATCH", body: JSON.stringify({ produto_id: produto.id, produto_nome: produto.nome, card: produto.campo ? "aguardando_codigo" : "concluido" }) });
        await supa("mensagens", { method: "POST", body: JSON.stringify({ conversa_id: conv.id, de: "bot", texto: `Produto: ${produto.nome}` }) });
        if (produto.campo) {
          enviarWpp(telefone, produto.pergunta);
        } else {
          await supa(`conversas?id=eq.${conv.id}`, { method: "PATCH", body: JSON.stringify({ status: "aberto", card: null }) });
          enviarWpp(telefone, "Tudo certo! Em breve um atendente irá te responder. 🙏");
        }
        return res.status(200).send("produto selecionado");
      }

      if (etapa === "aguardando_codigo") {
        const produto = PRODUTOS.find((p) => p.id === conv.produto_id) || PRODUTOS[0];
        await supa(`conversas?id=eq.${conv.id}`, { method: "PATCH", body: JSON.stringify({ card: texto, status: "aberto" }) });
        await supa("mensagens", { method: "POST", body: JSON.stringify({ conversa_id: conv.id, de: "bot", texto: `${produto.campo}: ${texto}` }) });
        enviarWpp(telefone, `Pedido registrado: *${texto}*\n\nEm breve um atendente irá te responder. 🙏`);
        return res.status(200).send("card salvo");
      }
    }

    // NOVA CONVERSA
    const nova = await supa("conversas", {
      method: "POST",
      body: JSON.stringify({ nome: nomeContato, telefone, email: "", empresa: "", produto_id: 1, produto_nome: "WhatsApp", card: "aguardando_empresa", status: "triagem", canal: "whatsapp" }),
    });
    if (nova?.error) return res.status(500).send("erro ao criar conversa");
    const conversaId = nova?.[0]?.id;
    if (!conversaId) return res.status(500).send("no conversa id");

    await supa("mensagens", { method: "POST", body: JSON.stringify({ conversa_id: conversaId, de: "cliente", texto, nome_atendente: nomeContato }) });

    const boasVindas = `${getSaudacao()}, *${nomeContato}*! 👋\n\nSou o assistente virtual de atendimento. Para te atender melhor, por favor informe o *nome da sua empresa*:`;
    enviarWpp(telefone, boasVindas);
    await supa("mensagens", { method: "POST", body: JSON.stringify({ conversa_id: conversaId, de: "bot", texto: boasVindas }) });

    return res.status(200).send("triagem iniciada");
  } catch (e) {
    console.error("Erro webhook:", e);
    return res.status(500).send(e.message);
  }
});

export default router;
