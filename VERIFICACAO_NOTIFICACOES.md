# Verificação das notificações push

**Estado atual:** o cron de notificações foi **removido** de `vercel.json` (limite de cron na Vercel). As rotas `/api/subscribe` e `/api/notify-cron` continuam deployadas; a inscrição no cliente só roda se `VITE_PUSH_ENABLED=true`. Para reativar depois: adicione o bloco `crons` em `vercel.json`, defina as envs e `VITE_PUSH_ENABLED=true`, e use este doc para reexecutar os testes.

---

## Fazer o deploy das APIs (1 passo no dashboard)

A produção na Vercel ainda está em um commit antigo (sem a pasta `api/`). Para as rotas `/api/subscribe` e `/api/notify-cron` passarem a funcionar:

1. Abra o **Vercel Dashboard** → seu projeto **nail-care** → aba **Deployments**.
2. No deploy mais recente que tiver o commit **"chore(build): remover deps"** ou **"chore(security)"** (ou qualquer commit depois de **"feat(NailCare): notificações push"**), clique nos **três pontinhos (⋯)** → **Redeploy**.
3. Se não aparecer nenhum deploy desses commits, clique em **Create** → **Deploy** e escolha o branch `main` (isso faz um novo build a partir do GitHub).
4. Aguarde o deploy ficar **Ready** (1–2 min), depois rode na pasta do projeto:  
   `.\scripts\verify-notifications.ps1`  
   O esperado é: **OK 400** e **OK 401**.

---

## Resultado da última verificação

- **URL testada:** `https://nail-care-mu.vercel.app`
- **Data:** execução automática (verificação inicial)

| # | Verificação | Resultado |
|---|-------------|-----------|
| 1 | Migration 003 no Supabase | **OK** – tabela `push_subscriptions` e colunas `notified_1day_at` / `notified_1h_at` em `appointments` confirmadas. |
| 2 | Env vars na Vercel | Não verificada (dashboard). Confira em Settings → Environment Variables. |
| 3 | POST /api/subscribe (body inválido) | **405** – na URL atual a rota `/api/subscribe` está retornando Método Não Permitido; o deploy em produção pode estar servindo o SPA para `/api/*`. |
| 4 | GET /api/notify-cron sem auth | **200** (HTML) – esperado **401**. Resposta é o `index.html` do SPA, ou seja, as rotas `/api/*` não estão sendo atendidas pelas serverless functions. |
| 5 | GET /api/notify-cron com Bearer CRON_SECRET | **200** (HTML) – esperado **200** com JSON `{ "sent": n }`. Mesmo comportamento: SPA está respondendo. |
| 6 | Inscrição no Supabase | Não verificada. Após um deploy correto e uso do PWA com permissão, confira a tabela `push_subscriptions`. |
| 7 | Notificação aparece | Não testada. Use o script de teste manual após as APIs estarem ativas. |

**Cliente PWA:** O app em `https://nail-care-mu.vercel.app` carrega corretamente (Início, Agenda, Clientes, etc.). A inscrição push só funcionará após o redeploy que expor as rotas `/api/*` e com `VITE_VAPID_PUBLIC_KEY` no build; aí o browser pedirá permissão e o POST `/api/subscribe` aparecerá no DevTools.

**Conclusão:** É necessário um **redeploy** manual no dashboard da Vercel (veja a seção **"Fazer o deploy das APIs"** acima) para que as rotas `/api/*` passem a ser atendidas pelas serverless functions. Depois do deploy, rode `.\scripts\verify-notifications.ps1` e confira as variáveis de ambiente em Settings → Environment Variables.

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
set VAPID_PUBLIC_KEY=<sua-vapid-public-key>
set VAPID_PRIVATE_KEY=<sua-vapid-private-key>
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
