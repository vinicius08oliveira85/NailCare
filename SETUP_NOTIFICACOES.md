# Configuração das notificações push (NailCare)

Siga estes passos uma vez para ativar lembretes 1 dia e 1h antes dos atendimentos.

---

## 1. Supabase: aplicar a migration 003

O MCP Supabase pode ter dado timeout. Rode a migration manualmente:

1. Abra o [Supabase Dashboard](https://supabase.com/dashboard/project/dfsgxqwqhmgziziaabch) → **SQL Editor**.
2. Cole e execute o conteúdo do arquivo `supabase/migrations/003_push_notifications.sql`.

Isso cria a tabela `push_subscriptions` e as colunas `notified_1day_at` e `notified_1h_at` em `appointments`.

---

## 2. Gerar chaves/segredos (obrigatório)

**Importante:** não commite chaves/segredos no repositório. Gere e configure somente no Supabase/Vercel.

### 2.1 Chaves VAPID (Web Push)

No seu computador, rode:

```bash
npx web-push generate-vapid-keys
```

Ele vai te retornar `Public Key` e `Private Key`.

### 2.2 CRON_SECRET

Gere um secret aleatório (exemplo Node):

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"
```

### 2.3 SUPABASE_URL e service_role

- `SUPABASE_URL`: URL do projeto no Supabase (Settings → API).
- `SUPABASE_SERVICE_ROLE_KEY`: pegue em Supabase → **Settings** → **API** → **service_role** (secret). Não use a chave `anon` pública.

**SUPABASE_SERVICE_ROLE_KEY:** pegue em Supabase → **Settings** → **API** → **service_role** (secret). Não use a chave `anon` pública.

---

## 3. Vercel: configurar variáveis de ambiente

### Opção A – Script (depois de `vercel login` e `vercel link` na pasta NailCare)

```powershell
$env:SUPABASE_SERVICE_ROLE_KEY = "sua-service-role-key-do-supabase"
$env:VAPID_PUBLIC_KEY = "sua-vapid-public-key"
$env:VAPID_PRIVATE_KEY = "sua-vapid-private-key"
$env:CRON_SECRET = "seu-cron-secret"
.\scripts\add-vercel-env.ps1
```

O script preenche todas as variáveis usando as envs acima (e `SUPABASE_URL` do projeto). Você só precisa da **service_role** do Supabase (Settings → API).

### Opção B – Manual no dashboard

No projeto [Vercel – nail-care](https://vercel.com/vinicius08oliveira85s-projects/nail-care):

1. **Settings** → **Environment Variables**.
2. Adicione (para **Production** e **Preview**):

| Name | Value | Observação |
|------|--------|------------|
| `VAPID_PUBLIC_KEY` | (gerado no passo 2.1) | |
| `VAPID_PRIVATE_KEY` | (gerado no passo 2.1) | Marque como **Sensitive** |
| `VITE_VAPID_PUBLIC_KEY` | **Mesmo valor** de `VAPID_PUBLIC_KEY` | Usado no build do front |
| `SUPABASE_URL` | (do Supabase, Settings → API) | |
| `SUPABASE_SERVICE_ROLE_KEY` | (service_role do Supabase) | Marque como **Sensitive** |
| `CRON_SECRET` | (gerado no passo 2.2) | Marque como **Sensitive** |

3. Salve e faça um **redeploy** do projeto para o build pegar `VITE_VAPID_PUBLIC_KEY`.

**Desenvolvimento local:** para testar notificações no `npm run dev`, adicione no `.env.local`:
`VITE_VAPID_PUBLIC_KEY=<sua-vapid-public-key>`

---

## 4. Conferir

- **Cron:** a cada 15 min a Vercel chama `GET /api/notify-cron` com `Authorization: Bearer <CRON_SECRET>`.
- **Push:** ao abrir o PWA, o app pede permissão de notificação e envia a inscrição para `POST /api/subscribe`.
- **Lembretes:** agendamentos com data “amanhã” (Brasília) ou “em ~1h” disparam notificação e atualizam `notified_1day_at` / `notified_1h_at`.

Se algo falhar, confira os logs em Vercel → **Functions** → `api/notify-cron` e `api/subscribe`, e no Supabase que a migration 003 foi aplicada.
