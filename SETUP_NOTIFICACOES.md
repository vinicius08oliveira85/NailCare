# Configuração das notificações push (NailCare)

Siga estes passos uma vez para ativar lembretes 1 dia e 1h antes dos atendimentos.

---

## 1. Supabase: aplicar a migration 003

O MCP Supabase pode ter dado timeout. Rode a migration manualmente:

1. Abra o [Supabase Dashboard](https://supabase.com/dashboard/project/dfsgxqwqhmgziziaabch) → **SQL Editor**.
2. Cole e execute o conteúdo do arquivo `supabase/migrations/003_push_notifications.sql`.

Isso cria a tabela `push_subscriptions` e as colunas `notified_1day_at` e `notified_1h_at` em `appointments`.

---

## 2. Chaves e variáveis já geradas (use estes valores)

Foram gerados para você:

| Variável | Valor |
|----------|--------|
| **VAPID_PUBLIC_KEY** | `BHzqNX5gwEWxCIC8n_BZbw5IQt3DGpBzr0PHRO4Bw4ATt1vnMslZrzqvoB6pweuXc6ZVP5RLO5UBKNFcDUtdJTM` |
| **VAPID_PRIVATE_KEY** | `E__psGswfYwrtLJfXEaYyos0p4jVG8-1MDRyPeSI3-w` |
| **CRON_SECRET** | `W63oqyCbJ1My6fFzchbHrGAW6AFrfIFV` |
| **SUPABASE_URL** | `https://dfsgxqwqhmgziziaabch.supabase.co` |

**SUPABASE_SERVICE_ROLE_KEY:** pegue em Supabase → **Settings** → **API** → **service_role** (secret). Não use a chave `anon` pública.

---

## 3. Vercel: configurar variáveis de ambiente

### Opção A – Script (depois de `vercel login` e `vercel link` na pasta NailCare)

```powershell
$env:SUPABASE_SERVICE_ROLE_KEY = "sua-service-role-key-do-supabase"
.\scripts\add-vercel-env.ps1
```

O script preenche todas as variáveis (incluindo as chaves e o CRON_SECRET da seção 2). Você só precisa da **service_role** do Supabase (Settings → API).

### Opção B – Manual no dashboard

No projeto [Vercel – nail-care](https://vercel.com/vinicius08oliveira85s-projects/nail-care):

1. **Settings** → **Environment Variables**.
2. Adicione (para **Production** e **Preview**):

| Name | Value | Observação |
|------|--------|------------|
| `VAPID_PUBLIC_KEY` | (valor da tabela acima) | |
| `VAPID_PRIVATE_KEY` | (valor da tabela acima) | Marque como **Sensitive** |
| `VITE_VAPID_PUBLIC_KEY` | **Mesmo valor** de `VAPID_PUBLIC_KEY` | Usado no build do front |
| `SUPABASE_URL` | `https://dfsgxqwqhmgziziaabch.supabase.co` | |
| `SUPABASE_SERVICE_ROLE_KEY` | (service_role do Supabase) | Marque como **Sensitive** |
| `CRON_SECRET` | (valor da tabela acima) | Marque como **Sensitive** |

3. Salve e faça um **redeploy** do projeto para o build pegar `VITE_VAPID_PUBLIC_KEY`.

**Desenvolvimento local:** para testar notificações no `npm run dev`, adicione no `.env.local`:
`VITE_VAPID_PUBLIC_KEY=BHzqNX5gwEWxCIC8n_BZbw5IQt3DGpBzr0PHRO4Bw4ATt1vnMslZrzqvoB6pweuXc6ZVP5RLO5UBKNFcDUtdJTM`

---

## 4. Conferir

- **Cron:** a cada 15 min a Vercel chama `GET /api/notify-cron` com `Authorization: Bearer <CRON_SECRET>`.
- **Push:** ao abrir o PWA, o app pede permissão de notificação e envia a inscrição para `POST /api/subscribe`.
- **Lembretes:** agendamentos com data “amanhã” (Brasília) ou “em ~1h” disparam notificação e atualizam `notified_1day_at` / `notified_1h_at`.

Se algo falhar, confira os logs em Vercel → **Functions** → `api/notify-cron` e `api/subscribe`, e no Supabase que a migration 003 foi aplicada.
