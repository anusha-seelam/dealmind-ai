# DealMind AI — Start Backend
# Run from the dealmind/ root directory

Write-Host "Starting DealMind AI Backend..." -ForegroundColor Cyan

$backendDir = "$PSScriptRoot\backend"
$python = "$backendDir\.venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
    Write-Host "Virtual environment not found. Setting it up..." -ForegroundColor Yellow
    Set-Location $backendDir
    python -m venv .venv
    & "$backendDir\.venv\Scripts\pip.exe" install -r requirements.txt
}

# Copy .env if not exists
$envFile = "$backendDir\.env"
$envExample = "$PSScriptRoot\.env.example"
if (-not (Test-Path $envFile) -and (Test-Path $envExample)) {
    Copy-Item $envExample $envFile
    Write-Host ".env created from .env.example — please fill in your API keys!" -ForegroundColor Yellow
}

# Seed demo data
Write-Host "Seeding demo data..." -ForegroundColor Green
Set-Location $backendDir
& $python seed_data.py

# Start server
Write-Host ""
Write-Host "Backend starting on http://localhost:8000" -ForegroundColor Green
Write-Host "API docs: http://localhost:8000/api/docs" -ForegroundColor Green
Write-Host ""
& "$backendDir\.venv\Scripts\uvicorn.exe" app.main:app --reload --host 0.0.0.0 --port 8000
