# Adiciona as variáveis de ambiente das notificações push no projeto Vercel.
# Pré-requisitos: vercel login, vercel link (na pasta NailCare), e definir:
# - SUPABASE_SERVICE_ROLE_KEY (Supabase Settings -> API -> service_role)
# - VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (npx web-push generate-vapid-keys)
# - CRON_SECRET (um secret aleatório)
#
# Uso (PowerShell):
#   $env:SUPABASE_SERVICE_ROLE_KEY = "sua-service-role-key-do-supabase"
#   $env:VAPID_PUBLIC_KEY = "sua-vapid-public-key"
#   $env:VAPID_PRIVATE_KEY = "sua-vapid-private-key"
#   $env:CRON_SECRET = "seu-cron-secret"
#   .\scripts\add-vercel-env.ps1

$ErrorActionPreference = "Stop"
$vapidPublic = $env:VAPID_PUBLIC_KEY
$vapidPrivate = $env:VAPID_PRIVATE_KEY
$cronSecret = $env:CRON_SECRET

if (-not $vapidPublic -or -not $vapidPrivate -or -not $cronSecret) {
  Write-Host "Defina VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e CRON_SECRET antes de rodar o script." -ForegroundColor Yellow
  exit 1
}

$vars = @(
  @{ Name = "VAPID_PUBLIC_KEY"; Value = $vapidPublic; Sensitive = $false },
  @{ Name = "VAPID_PRIVATE_KEY"; Value = $vapidPrivate; Sensitive = $true },
  @{ Name = "VITE_VAPID_PUBLIC_KEY"; Value = $vapidPublic; Sensitive = $false },
  @{ Name = "SUPABASE_URL"; Value = "https://dfsgxqwqhmgziziaabch.supabase.co"; Sensitive = $false },
  @{ Name = "CRON_SECRET"; Value = $cronSecret; Sensitive = $true }
)

$serviceRole = $env:SUPABASE_SERVICE_ROLE_KEY
if (-not $serviceRole) {
  Write-Host "Defina SUPABASE_SERVICE_ROLE_KEY antes de rodar o script:" -ForegroundColor Yellow
  Write-Host '  $env:SUPABASE_SERVICE_ROLE_KEY = "sua-chave-service-role"' -ForegroundColor Cyan
  exit 1
}

$envs = @("production", "preview")
foreach ($v in $vars) {
  foreach ($e in $envs) {
    if ($v.Sensitive) {
      $v.Value | vercel env add $v.Name $e --force --yes --sensitive
    } else {
      $v.Value | vercel env add $v.Name $e --force --yes
    }
  }
  Write-Host "OK $($v.Name)"
}
foreach ($e in $envs) {
  $serviceRole | vercel env add SUPABASE_SERVICE_ROLE_KEY $e --force --yes --sensitive
}
Write-Host "OK SUPABASE_SERVICE_ROLE_KEY"
Write-Host ""
Write-Host "Concluído. Faça um redeploy no Vercel para o build usar VITE_VAPID_PUBLIC_KEY." -ForegroundColor Green
