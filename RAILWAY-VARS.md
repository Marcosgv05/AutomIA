# 🔧 Variáveis de Ambiente - Railway

Copie e cole estas variáveis no Railway (Settings → Variables → Raw Editor).

## Backend (API)

```env
# Ambiente
NODE_ENV=production

# Banco de Dados (copie do serviço PostgreSQL)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# IA - Gemini (OBRIGATÓRIO)
# Obtenha em: https://aistudio.google.com/apikey
GEMINI_API_KEY=sua_chave_aqui

# Segurança
JWT_SECRET=gere_um_valor_aleatorio_aqui
CORS_ORIGIN=https://seu-frontend.railway.app
FRONTEND_URL=https://seu-frontend.railway.app

# Google OAuth (opcional - para Calendar)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://seu-backend.railway.app/calendar/oauth/callback
GOOGLE_AUTH_REDIRECT_URI=https://seu-backend.railway.app/auth/google/callback
```

## Frontend (Web)

```env
# URL da API backend
VITE_API_URL=https://seu-backend.railway.app
```

---

## 🔑 Como gerar JWT_SECRET

Execute no terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copie o resultado e cole no `JWT_SECRET`.

---

## 📋 Checklist de Variáveis

### Backend (Obrigatórias)
- [ ] `DATABASE_URL` - Referência ao PostgreSQL: `${{Postgres.DATABASE_URL}}`
- [ ] `GEMINI_API_KEY` - Chave da API Gemini
- [ ] `JWT_SECRET` - String aleatória gerada
- [ ] `CORS_ORIGIN` - URL do frontend
- [ ] `FRONTEND_URL` - URL do frontend

### Backend (Opcionais)
- [ ] `GOOGLE_CLIENT_ID` - Para integração com Google Calendar
- [ ] `GOOGLE_CLIENT_SECRET` - Para integração com Google Calendar
- [ ] `GOOGLE_REDIRECT_URI` - Callback do Calendar
- [ ] `GOOGLE_AUTH_REDIRECT_URI` - Callback de login Google

### Frontend (Obrigatórias)
- [ ] `VITE_API_URL` - URL do backend

---

## ⚡ Variáveis Automáticas do Railway

O Railway configura automaticamente:

| Variável | Descrição |
|----------|-----------|
| `PORT` | Porta do servidor |
| `RAILWAY_ENVIRONMENT` | Ambiente atual |
| `RAILWAY_PROJECT_ID` | ID do projeto |
| `RAILWAY_SERVICE_ID` | ID do serviço |

---

## 🔗 Referenciando o PostgreSQL

No Railway, você pode referenciar variáveis de outros serviços:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Isso conecta automaticamente ao banco PostgreSQL do mesmo projeto.
