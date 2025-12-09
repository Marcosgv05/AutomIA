# 🚀 Deploy no Railway

Este guia explica como fazer deploy do AutomIA no Railway.

## Estrutura do Projeto

O projeto é um **monorepo** com dois serviços:

- **Backend (API)** - Pasta raiz (`/`)
- **Frontend (Web)** - Pasta `/web`

---

## 📋 Pré-requisitos

1. Conta no [Railway](https://railway.app)
2. Repositório Git (GitHub/GitLab) com o código

---

## 🗄️ Passo 1: Criar Banco de Dados

1. No Railway, crie um novo projeto
2. Clique em **"New"** → **"Database"** → **"PostgreSQL"**
3. Aguarde a criação do banco
4. Clique no banco e copie a **DATABASE_URL** (aba Variables)

---

## ⚙️ Passo 2: Deploy do Backend (API)

1. No mesmo projeto, clique em **"New"** → **"GitHub Repo"**
2. Selecione o repositório do AutomIA
3. Railway detectará o `railway.json` automaticamente
4. Vá em **Variables** → **Raw Editor** e cole:

```env
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
GEMINI_API_KEY=sua_chave_aqui
JWT_SECRET=gere_valor_aleatorio
CORS_ORIGIN=https://seu-frontend.railway.app
FRONTEND_URL=https://seu-frontend.railway.app
```

> 💡 **Dica:** `${{Postgres.DATABASE_URL}}` referencia automaticamente o PostgreSQL!

### Gerar JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Variáveis do Google OAuth (opcional):

| Variável | Descrição |
|----------|-----------|
| `GOOGLE_CLIENT_ID` | Client ID do Google Cloud |
| `GOOGLE_CLIENT_SECRET` | Client Secret |
| `GOOGLE_REDIRECT_URI` | `https://SUA-API.railway.app/calendar/oauth/callback` |
| `GOOGLE_AUTH_REDIRECT_URI` | `https://SUA-API.railway.app/auth/google/callback` |

5. O Railway fará build e deploy automaticamente

---

## 🌐 Passo 3: Deploy do Frontend (Web)

1. No mesmo projeto, clique em **"New"** → **"GitHub Repo"**
2. Selecione o **mesmo repositório**
3. Na configuração, defina:
   - **Root Directory**: `web`
4. Vá em **Variables** → **Raw Editor** e cole:

```env
VITE_API_URL=https://seu-backend.railway.app
```

5. Aguarde o build

---

## 🔗 Passo 4: Configurar Domínios

### Backend:
1. Clique no serviço do backend
2. Vá em **Settings** → **Networking** → **Generate Domain**
3. Copie o domínio gerado (ex: `automia-api.up.railway.app`)

### Frontend:
1. Clique no serviço do frontend
2. Vá em **Settings** → **Networking** → **Generate Domain**
3. Copie o domínio gerado (ex: `automia-web.up.railway.app`)

---

## 🔄 Passo 5: Atualizar Variáveis

Volte ao backend e atualize:

| Variável | Valor |
|----------|-------|
| `FRONTEND_URL` | URL do frontend (ex: `https://automia-web.up.railway.app`) |
| `CORS_ORIGIN` | URL do frontend (ex: `https://automia-web.up.railway.app`) |

---

## ✅ Verificação

1. Acesse a URL do frontend
2. Faça login ou crie uma conta
3. Verifique se a conexão com WhatsApp funciona
4. Teste o chat

---

## ✅ Sessões WhatsApp Persistentes

As sessões do WhatsApp são salvas no **PostgreSQL**, garantindo que as conexões sobrevivam a deploys e restarts no Railway.

**Funcionamento:**
- Credenciais são salvas na tabela `WhatsappAuth`
- Reconexão automática após restart
- Keep-alive de 30s para manter conexão ativa

---

## 🔧 Troubleshooting

### Erro de CORS
- Verifique se `CORS_ORIGIN` está correto no backend
- Não use `*` em produção

### Erro de Database
- Verifique se `DATABASE_URL` está correto
- O formato deve ser: `postgresql://user:pass@host:port/db`

### Frontend não conecta à API
- Verifique se `VITE_API_URL` está correto
- Certifique-se de que tem `https://` no início

### Migrations não rodam
- O Railway executa `npx prisma migrate deploy` no start
- Verifique os logs para erros

---

## 📊 Custos Estimados (Railway)

- **Hobby Plan**: $5/mês (inclui $5 de crédito)
- **PostgreSQL**: ~$0.01/hora
- **Backend**: ~$0.01/hora
- **Frontend**: ~$0.01/hora

Total estimado: **~$5-15/mês** para uso leve

---

## 🎉 Pronto!

Seu AutomIA está rodando no Railway!
