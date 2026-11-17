# 💬 Desk Hub

<p>
  <img src="https://img.shields.io/badge/React-0d1117?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Node.js-0d1117?style=for-the-badge&logo=nodedotjs&logoColor=5FA04E" />
  <img src="https://img.shields.io/badge/Supabase-0d1117?style=for-the-badge&logo=supabase&logoColor=3FCF8E" />
  <img src="https://img.shields.io/badge/Claude_API-0d1117?style=for-the-badge&logo=anthropic&logoColor=D97757" />
  <img src="https://img.shields.io/badge/WhatsApp-0d1117?style=for-the-badge&logo=whatsapp&logoColor=25D366" />
</p>

Plataforma de atendimento **white-label** que une **chat web** e **WhatsApp** em um único painel, com triagem automática, sugestão de resposta por IA e relatórios de satisfação (NPS).

> Projeto pessoal de portfólio. Os dados, nomes e produtos que aparecem no código são fictícios.

## ✨ Funcionalidades

- **Chat web em tempo real** para o cliente, com avaliação de NPS por emoji ao final do atendimento
- **Bot de triagem no WhatsApp** (Evolution API): coleta empresa, produto e dados do chamado antes de passar para um atendente
- **Painel do atendente**: login, filtros, controle de SLA, transferência de chamados e **sugestão de resposta com IA** (Claude)
- **Relatórios**: exportação em CSV e ranking de NPS por atendente
- **Painel admin white-label**: nome, logo, cores e fonte personalizáveis, salvos no banco

## 🏗️ Arquitetura

```
Cliente (chat web) ──┐
                     ├──> Supabase (Postgres + Realtime) <──> Painel do atendente (React)
WhatsApp ── Evolution API ──> Backend Node.js/Express ──┘            │
                                   │                                  │
                                   └──────> Claude API (sugestões) <──┘
```

## 🛠️ Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Banco / tempo real | Supabase (Postgres + Realtime) |
| WhatsApp | Evolution API |
| IA | Anthropic Claude (Haiku) |
| Deploy | Cloudflare Pages · Railway |

## 🚀 Como rodar

```bash
# Frontend
npm install
npm run dev

# Backend
cd backend
npm install
cp .env.example .env   # preencha com suas chaves (Supabase, Evolution API, Anthropic)
npm start
```

No frontend e em `public/chat-cliente.html`, troque `SEU-PROJETO` e `SUA_CHAVE_PUBLICA_SUPABASE` pelos dados do seu projeto Supabase.

## 🗺️ Próximos passos

- Envio de mídia no chat
- FAQ e respostas rápidas configuráveis
- Integração com CRM

---

Feito por [Leonardo Serrão](https://www.linkedin.com/in/leonardo-serrao-378819188/)
