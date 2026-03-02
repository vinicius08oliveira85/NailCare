# Verificação das notificações push

Resultado da verificação conforme o [plano](.cursor/plans/verificar_notificações_push_59fb14cd.plan.md) e como reexecutar os testes.

---

## Resultado da última verificação

- **URL testada:** `https://nail-care-mu.vercel.app`
- **Data:** execução automática (verificação inicial)

| # | Verificação | Resultado |
|---|-------------|-----------|
| 1 | Migration 003 no Supabase | Não verificada (timeout no MCP). Confira no Dashboard: tabela `push_subscriptions` e colunas `notified_1day_at` / `notified_1h_at` em `appointments`. |
| 2 | Env vars na Vercel | Não verificada (dashboard). Confira em Settings → Environment Variables. |
| 3 | POST /api/subscribe (body inválido) | **405** – na URL atual a rota `/api/subscribe` está retornando Método Não Permitido; o deploy em produção pode estar servindo o SPA para `/api/*`. |
| 4 | GET /api/notify-cron sem auth | **200** (HTML) – esperado **401**. Resposta é o `index.html` do SPA, ou seja, as rotas `/api/*` não estão sendo atendidas pelas serverless functions. |
| 5 | GET /api/notify-cron com Bearer CRON_SECRET | **200** (HTML) – esperado **200** com JSON `{ "sent": n }`. Mesmo comportamento: SPA está respondendo. |
| 6 | Inscrição no Supabase | Não verificada. Após um deploy correto e uso do PWA com permissão, confira a tabela `push_subscriptions`. |
| 7 | Notificação aparece | Não testada. Use o script de teste manual após as APIs estarem ativas. |

**Cliente PWA:** O app em `https://nail-care-mu.vercel.app` carrega corretamente (Início, Agenda, Clientes, etc.). A inscrição push só funcionará após o redeploy que expor as rotas `/api/*` e com `VITE_VAPID_PUBLIC_KEY` no build; aí o browser pedirá permissão e o POST `/api/subscribe` aparecerá no DevTools.

**Conclusão:** É necessário um **redeploy** do projeto na Vercel com a pasta `api/` (e `vercel.json` com rewrites e crons) para que `POST /api/subscribe` e `GET /api/notify-cron` sejam atendidos pelas serverless functions. Depois do redeploy, rode novamente os scripts abaixo.

---

## Como reexecutar a verificação

### 1. APIs (PowerShell)

Na pasta do projeto:

```powershell
.\scripts\verify-notifications.ps1 -BaseUrl "https://nail-care-mu.vercel.app"
```

Para testar também o cron com autenticação (após configurar `CRON_SECRET` na Vercel):

```powershell
.\scripts\verify-notifications.ps1 -BaseUrl "https://nail-care-mu.vercel.app" -CronSecret "SEU_CRON_SECRET"
```

Resultado esperado após deploy correto:

- POST /api/subscribe com body `{}`: **400**
- GET /api/notify-cron sem header: **401**
- GET /api/notify-cron com `Authorization: Bearer CRON_SECRET`: **200** e corpo `{ "sent": 0 }` (ou outro número).

### 2. Teste manual de push (Node)

Para enviar uma notificação de teste ao dispositivo (inscrição já salva no Supabase):

1. Copie uma linha da tabela `push_subscriptions` (campos `endpoint`, `p256dh`, `auth`).
2. Defina as variáveis e execute:

```bash
set VAPID_PUBLIC_KEY=BHzqNX5gwEWxCIC8n_BZbw5IQt3DGpBzr0PHRO4Bw4ATt1vnMslZrzqvoB6pweuXc6ZVP5RLO5UBKNFcDUtdJTM
set VAPID_PRIVATE_KEY=E__psGswfYwrtLJfXEaYyos0p4jVG8-1MDRyPeSI3-w
set SUBSCRIPTION_JSON={"endpoint":"...","keys":{"p256dh":"...","auth":"..."}}
node scripts/send-test-push.mjs
```

Ou com variáveis separadas: `ENDPOINT`, `P256DH`, `AUTH`.

A notificação deve aparecer no dispositivo onde o PWA está instalado ou com o Service Worker ativo.

---

## Checklist rápido (pós redeploy)

1. Migration 003 aplicada no Supabase.
2. Variáveis configuradas na Vercel (incl. `VITE_VAPID_PUBLIC_KEY`); redeploy feito depois.
3. `.\scripts\verify-notifications.ps1` com e sem `-CronSecret`: 400 no subscribe inválido, 401 no cron sem auth, 200 + JSON no cron com auth.
4. Abrir o PWA em HTTPS, permitir notificações, conferir POST `/api/subscribe` 204 no DevTools → Network.
5. Pelo menos um registro em `push_subscriptions` no Supabase.
6. `node scripts/send-test-push.mjs` com uma inscrição válida: notificação aparece no dispositivo.
