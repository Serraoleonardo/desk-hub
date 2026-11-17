import "dotenv/config";
import express from "express";
import cors from "cors";
import cron from "node-cron";

import whatsappRouter from "./routes/whatsapp.js";
import enviarWhatsappRouter from "./routes/enviarWhatsapp.js";
import iaRouter from "./routes/ia.js";
import { keepAlive } from "./routes/keepAlive.js";

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());

app.get("/", (req, res) => res.send("Desk Hub backend no ar."));

app.use("/whatsapp", whatsappRouter);
app.use("/enviar-whatsapp", enviarWhatsappRouter);
app.use("/ia", iaRouter);

// Endpoint manual de keep-alive (além do cron abaixo)
app.get("/keep-alive", async (req, res) => {
  try {
    await keepAlive();
    res.send("ok");
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// Substitui o schedule "*/10 * * * *" que existia no netlify.toml
cron.schedule("*/10 * * * *", () => {
  keepAlive().catch((e) => console.error("Erro no cron keep-alive:", e));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Desk Hub backend rodando na porta ${PORT}`));
