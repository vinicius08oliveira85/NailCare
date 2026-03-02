<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/9d781359-6319-43d7-bea0-10c6800aae3a

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy no Vercel

- Configure no projeto (Settings → Environment Variables):
  - `VITE_SUPABASE_URL` – URL do projeto Supabase (ex.: `https://xxxx.supabase.co`)
  - `VITE_SUPABASE_ANON_KEY` – chave anônima (anon key) do Supabase
- Após alterar variáveis, faça um novo deploy para o build embutir os valores.

### Erro 401 em `manifest.webmanifest`

Se o navegador reportar **401** ao carregar `/manifest.webmanifest`, a causa é a **Proteção de Deployment** do Vercel (senha ou Vercel Authentication) ativa para aquele deployment. A requisição do manifest não envia o cookie de auth e recebe 401.

**Solução (apenas no Vercel, sem mudar código):**

1. Dashboard Vercel → projeto NailCare → **Settings** → **Deployment Protection**
2. Para **Production**: desative a proteção (ou use apenas o que não bloqueie GET a assets) se quiser PWA/manifest na URL de produção
3. Para **Preview**: se estiver testando em URLs de preview (`...-xxx.vercel.app`), desative ou relaxe a proteção para Preview para o manifest carregar

Não é possível liberar só o manifest; a proteção vale para todo o deployment. Use produção sem proteção (ou preview sem proteção) para instalação PWA e manifest sem 401.
