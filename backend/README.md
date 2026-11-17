# Desk Hub — Backend

Backend do Desk Hub, migrado de Netlify/Cloudflare Pages Functions para um servidor Express comum, pensado para rodar no Railway junto com a Evolution API.

## Rotas

- `POST /whatsapp` — webhook da Evolution API (recebe mensagens do WhatsApp)
- `POST /enviar-whatsapp` — envia mensagem via WhatsApp (usado pelo painel)
- `POST /ia` — proxy para a API da Anthropic (sugestão de resposta por IA)
- `GET /keep-alive` — chamada manual de keep-alive (também roda sozinho a cada 10 min via cron interno)

## Deploy no Railway

1. Crie um novo serviço no Railway, apontando para esta pasta `backend/` como raiz do projeto (Railway detecta Node.js automaticamente pelo `package.json`).
2. Configure as variáveis de ambiente no painel do Railway (Settings → Variables), usando o `.env.example` como referência:
   - `SUPA_URL`, `SUPA_KEY`
   - `EVO_URL`, `EVO_KEY`, `INSTANCIA`
   - `ANTHROPIC_API_KEY`
   - `FRONTEND_URL` (a URL do Cloudflare Pages, ex: `https://SEU-FRONTEND.pages.dev`)
3. O Railway vai rodar `npm install` e depois `npm start` automaticamente.
4. Depois do deploy, copie a URL pública gerada pelo Railway (algo como `https://SEU-BACKEND.up.railway.app`).
5. Cole essa URL na constante `API_URL` em `src/App.jsx` (linha marcada com `// TODO`), no projeto do frontend, e refaça o deploy do frontend no Cloudflare Pages.
6. Atualize o webhook da Evolution API para apontar para `SUA_URL_RAILWAY/whatsapp`.

## Rodando localmente

```bash
cp .env.example .env
# preencha as chaves reais no .env
npm install
npm run dev
```
