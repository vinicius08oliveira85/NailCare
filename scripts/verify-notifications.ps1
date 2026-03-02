# Verifica APIs de notificacoes. Uso: .\scripts\verify-notifications.ps1 [-BaseUrl "https://..."] [-CronSecret "xxx"]
param([string]$BaseUrl = "https://nail-care-mu.vercel.app", [string]$CronSecret = "")
$ErrorActionPreference = "Stop"
$failed = 0
Write-Host "Base: $BaseUrl"

Write-Host "1. POST /api/subscribe (esperado 400)..."
try {
  $r = Invoke-WebRequest -Uri "$BaseUrl/api/subscribe" -Method POST -ContentType "application/json" -Body "{}" -UseBasicParsing
  if ($r.StatusCode -ne 400) { Write-Host "   FALHA: $($r.StatusCode)"; $failed++ } else { Write-Host "   OK 400" -ForegroundColor Green }
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  if ($code -eq 400) { Write-Host "   OK 400" -ForegroundColor Green } else { Write-Host "   FALHA: $code (se 405, deploy pode nao ter api/)" -ForegroundColor Red; $failed++ }
}

Write-Host "2. GET /api/notify-cron sem auth (esperado 401)..."
try {
  $r = Invoke-WebRequest -Uri "$BaseUrl/api/notify-cron" -Method GET -UseBasicParsing
  Write-Host "   FALHA: 200 = SPA respondendo" -ForegroundColor Red; $failed++
} catch {
  if ($_.Exception.Response.StatusCode.value__ -eq 401) { Write-Host "   OK 401" -ForegroundColor Green } else { Write-Host "   FALHA: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red; $failed++ }
}

if ($CronSecret) {
  Write-Host "3. GET /api/notify-cron com auth (esperado 200 JSON)..."
  try {
    $r = Invoke-WebRequest -Uri "$BaseUrl/api/notify-cron" -Method GET -Headers @{ Authorization = "Bearer $CronSecret" } -UseBasicParsing
    if ($r.StatusCode -eq 200 -and $r.Content -match '"sent"') { Write-Host "   OK 200" -ForegroundColor Green } else { Write-Host "   FALHA: HTML ou inesperado" -ForegroundColor Red; $failed++ }
  } catch { Write-Host "   FALHA" -ForegroundColor Red; $failed++ }
}
if ($failed -gt 0) { Write-Host "Falhas: $failed" -ForegroundColor Yellow } else { Write-Host "OK" -ForegroundColor Green }
