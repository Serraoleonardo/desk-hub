import { Router } from "express";

const EVO_URL   = process.env.EVO_URL;
const EVO_KEY   = process.env.EVO_KEY;
const INSTANCIA = process.env.INSTANCIA;

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { telefone, mensagem } = req.body;
    if (!telefone || !mensagem) {
      return res.status(400).send("telefone e mensagem obrigatorios");
    }

    const evoRes = await fetch(`${EVO_URL}/message/sendText/${INSTANCIA}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVO_KEY },
      body: JSON.stringify({ number: telefone, text: mensagem }),
    });

    const data = await evoRes.json();
    return res.status(evoRes.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
