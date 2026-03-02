# Adiciona as variáveis de ambiente das notificações push no projeto Vercel.
# Pré-requisitos: vercel login, vercel link (na pasta NailCare), e definir SUPABASE_SERVICE_ROLE_KEY.
#
# Uso (PowerShell):
#   $env:SUPABASE_SERVICE_ROLE_KEY = "sua-service-role-key-do-supabase"
#   .\scripts\add-vercel-env.ps1

$ErrorActionPreference = "Stop"
$vars = @(
  @{ Name = "VAPID_PUBLIC_KEY"; Value = "BHzqNX5gwEWxCIC8n_BZbw5IQt3DGpBzr0PHRO4Bw4ATt1vnMslZrzqvoB6pweuXc6ZVP5RLO5UBKNFcDUtdJTM"; Sensitive = $false },
  @{ Name = "VAPID_PRIVATE_KEY"; Value = "E__psGswfYwrtLJfXEaYyos0p4jVG8-1MDRyPeSI3-w"; Sensitive = $true },
  @{ Name = "VITE_VAPID_PUBLIC_KEY"; Value = "BHzqNX5gwEWxCIC8n_BZbw5IQt3DGpBzr0PHRO4Bw4ATt1vnMslZrzqvoB6pweuXc6ZVP5RLO5UBKNFcDUtdJTM"; Sensitive = $false },
  @{ Name = "SUPABASE_URL"; Value = "https://dfsgxqwqhmgziziaabch.supabase.co"; Sensitive = $false },
  @{ Name = "CRON_SECRET"; Value = "W63oqyCbJ1My6fFzchbHrGAW6AFrfIFV"; Sensitive = $true }
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
