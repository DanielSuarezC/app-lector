# switch-env.ps1 — Cambia el entorno del bridge entre local y produccion
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('local', 'prod')]
    [string]$Env
)

$bridgeDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $bridgeDir ".env"

if ($Env -eq 'local') {
    Copy-Item (Join-Path $bridgeDir ".env.local") $envFile -Force
    Write-Host "[OK] Bridge configurado para LOCAL (http://localhost:3000)" -ForegroundColor Green
} else {
    # Restaurar .env de produccion desde .env.production si existe, si no, indicar
    $prodFile = Join-Path $bridgeDir ".env.production"
    if (Test-Path $prodFile) {
        Copy-Item $prodFile $envFile -Force
        Write-Host "[OK] Bridge configurado para PRODUCCION (Render)" -ForegroundColor Green
    } else {
        Write-Host "[INFO] No existe .env.production. Edita .env manualmente con la URL de Render." -ForegroundColor Yellow
    }
}

# Reiniciar PM2 si esta corriendo
$pm2Running = pm2 list 2>$null | Select-String "bridge-colina-real"
if ($pm2Running) {
    pm2 restart bridge-colina-real
    Write-Host "[OK] Bridge reiniciado con la nueva configuracion" -ForegroundColor Green
}
