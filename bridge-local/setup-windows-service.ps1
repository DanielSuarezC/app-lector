# setup-windows-service.ps1
# Instala el bridge-local como servicio de Windows con PM2
# Ejecutar como Administrador en PowerShell 5.1+

param(
    [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'
$bridgeDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=== Bridge Colina Real - Instalador de Servicio Windows ===" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------------------
# Verificar Node.js
# ---------------------------------------------------------------------------
try {
    $nodeVersion = node --version 2>&1
    Write-Host "[OK] Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js no encontrado. Instala desde https://nodejs.org" -ForegroundColor Red
    exit 1
}

# ---------------------------------------------------------------------------
# Verificar / instalar PM2
# ---------------------------------------------------------------------------
$pm2Cmd = Get-Command pm2 -ErrorAction SilentlyContinue
if (-not $pm2Cmd) {
    Write-Host "[INFO] Instalando PM2 globalmente..." -ForegroundColor Yellow
    npm install -g pm2
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] No se pudo instalar PM2" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] PM2 instalado" -ForegroundColor Green
} else {
    Write-Host "[OK] PM2 disponible" -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# Verificar / instalar pm2-windows-service
# ---------------------------------------------------------------------------
$svcCmd = Get-Command pm2-service-install -ErrorAction SilentlyContinue
if (-not $svcCmd) {
    Write-Host "[INFO] Instalando pm2-windows-service globalmente..." -ForegroundColor Yellow
    npm install -g pm2-windows-service
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] No se pudo instalar pm2-windows-service" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] pm2-windows-service instalado" -ForegroundColor Green
} else {
    Write-Host "[OK] pm2-windows-service disponible" -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# Desinstalacion
# ---------------------------------------------------------------------------
if ($Uninstall) {
    Write-Host ""
    Write-Host "=== Desinstalando servicio ===" -ForegroundColor Yellow
    Set-Location $bridgeDir
    pm2 stop bridge-colina-real 2>$null
    pm2 delete bridge-colina-real 2>$null
    pm2-service-uninstall
    Write-Host "[OK] Servicio desinstalado." -ForegroundColor Green
    exit 0
}

# ---------------------------------------------------------------------------
# Verificar .env
# ---------------------------------------------------------------------------
$envFile = Join-Path $bridgeDir ".env"
if (-not (Test-Path $envFile)) {
    Write-Host ""
    Write-Host "[ADVERTENCIA] No se encontro .env en:" -ForegroundColor Yellow
    Write-Host "  $bridgeDir" -ForegroundColor Yellow
    $envLocal = Join-Path $bridgeDir ".env.local"
    if (Test-Path $envLocal) {
        Write-Host "  Copiando .env.local como base..." -ForegroundColor Yellow
        Copy-Item $envLocal $envFile
    }
    Write-Host ""
    Write-Host "  IMPORTANTE: Edita el archivo .env y configura:" -ForegroundColor Cyan
    Write-Host "    API_KEY  -> La clave del backend (Render Dashboard)" -ForegroundColor Cyan
    Write-Host "    API_URL  -> https://colina-real-backend.onrender.com (produccion)" -ForegroundColor Cyan
    Write-Host "                http://localhost:3000 (desarrollo local)" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Presiona Enter cuando hayas editado el .env para continuar"
}

# ---------------------------------------------------------------------------
# Instalar dependencias npm
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "[INFO] Instalando dependencias del bridge..." -ForegroundColor Yellow
Set-Location $bridgeDir
npm install --production
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] npm install fallo" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Dependencias instaladas" -ForegroundColor Green

# ---------------------------------------------------------------------------
# Crear directorio de logs
# ---------------------------------------------------------------------------
$logsDir = Join-Path $bridgeDir "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
    Write-Host "[OK] Directorio logs creado" -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# Iniciar con PM2
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "[INFO] Iniciando bridge con PM2..." -ForegroundColor Yellow
$ecosystemFile = Join-Path $bridgeDir "ecosystem.config.js"
pm2 start $ecosystemFile
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] PM2 no pudo iniciar el bridge" -ForegroundColor Red
    exit 1
}

# Guardar lista de procesos PM2
pm2 save
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARN] pm2 save fallo, el servicio podria no persistir" -ForegroundColor Yellow
} else {
    Write-Host "[OK] Configuracion PM2 guardada" -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# Instalar como servicio Windows
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "[INFO] Registrando como servicio de Windows..." -ForegroundColor Yellow
pm2-service-install --unattended
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] No se pudo registrar el servicio de Windows" -ForegroundColor Red
    Write-Host "  Asegurate de ejecutar este script como Administrador" -ForegroundColor Yellow
    exit 1
}

# ---------------------------------------------------------------------------
# Resultado final
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "=== Instalacion completada ===" -ForegroundColor Green
Write-Host ""
Write-Host "El bridge bridge-colina-real ahora:" -ForegroundColor White
Write-Host "  [x] Se ejecuta en segundo plano" -ForegroundColor Green
Write-Host "  [x] Inicia automaticamente con Windows" -ForegroundColor Green
Write-Host "  [x] Se reinicia si falla" -ForegroundColor Green
Write-Host ""
Write-Host "Comandos utiles:" -ForegroundColor Cyan
Write-Host "  pm2 status"
Write-Host "  pm2 logs bridge-colina-real"
Write-Host "  pm2 restart bridge-colina-real"
Write-Host "  pm2 stop bridge-colina-real"
Write-Host ""
Write-Host "Para cambiar de entorno (local / produccion):" -ForegroundColor Cyan
Write-Host "  .\switch-env.ps1 local"
Write-Host "  .\switch-env.ps1 prod"
Write-Host ""
$logsMsg = "Logs en: " + $logsDir
Write-Host $logsMsg -ForegroundColor DarkGray
