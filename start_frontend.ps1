# DealMind AI — Start Frontend
# Run from the dealmind/ root directory

Write-Host "Starting DealMind AI Frontend..." -ForegroundColor Cyan

$frontendDir = "$PSScriptRoot\frontend"

if (-not (Test-Path "$frontendDir\node_modules")) {
    Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
    Set-Location $frontendDir
    npm install
}

Write-Host ""
Write-Host "Frontend starting on http://localhost:5173" -ForegroundColor Green
Write-Host ""
Set-Location $frontendDir
npm run dev
