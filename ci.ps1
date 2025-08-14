# Music Tab App - CI/CD PowerShell Script
param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

function Show-Help {
    Write-Host "Available commands:" -ForegroundColor Green
    Write-Host "  install  - Install all dependencies (Node.js + Python)" -ForegroundColor Yellow
    Write-Host "  fmt      - Format all code (Prettier + Black)" -ForegroundColor Yellow
    Write-Host "  lint     - Lint all code (ESLint + Ruff)" -ForegroundColor Yellow
    Write-Host "  test     - Run all tests (Jest + Pytest)" -ForegroundColor Yellow
    Write-Host "  ci       - Run full CI pipeline (fmt + lint + test)" -ForegroundColor Yellow
    Write-Host "  clean    - Clean build artifacts and dependencies" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Usage: .\ci.ps1 <command>" -ForegroundColor Cyan
}

function Install-Dependencies {
    Write-Host "Installing Node.js dependencies..." -ForegroundColor Blue
    npm install
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    
    Write-Host "Installing Python dependencies..." -ForegroundColor Blue
    poetry install
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    
    Write-Host "Dependencies installed successfully!" -ForegroundColor Green
}

function Format-Code {
    Write-Host "Formatting JavaScript/TypeScript code..." -ForegroundColor Blue
    npm run format
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    
    Write-Host "Formatting Python code..." -ForegroundColor Blue
    poetry run black .
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    
    Write-Host "Code formatting completed!" -ForegroundColor Green
}

function Lint-Code {
    Write-Host "Linting JavaScript/TypeScript code..." -ForegroundColor Blue
    npm run lint
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    
    Write-Host "Linting Python code..." -ForegroundColor Blue
    poetry run ruff check .
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    
    Write-Host "Code linting completed!" -ForegroundColor Green
}

function Run-Tests {
    Write-Host "Running JavaScript/TypeScript tests..." -ForegroundColor Blue
    npm run test
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    Write-Host "Running Python tests..." -ForegroundColor Blue
    # Allow pytest to pass when no tests are found
    poetry run pytest --tb=short -q
    # pytest returns 5 when no tests are collected, which is OK for now
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 5) { exit $LASTEXITCODE }

    Write-Host "All tests completed!" -ForegroundColor Green
}

function Run-CI {
    Write-Host "Starting CI pipeline..." -ForegroundColor Magenta
    Format-Code
    Lint-Code
    Run-Tests
    Write-Host "✅ CI pipeline completed successfully!" -ForegroundColor Green
}

function Clean-Artifacts {
    Write-Host "Cleaning Node.js artifacts..." -ForegroundColor Blue
    if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }
    if (Test-Path "package-lock.json") { Remove-Item -Force "package-lock.json" }
    
    Write-Host "Cleaning Python artifacts..." -ForegroundColor Blue
    poetry env remove --all 2>$null
    if (Test-Path ".pytest_cache") { Remove-Item -Recurse -Force ".pytest_cache" }
    Get-ChildItem -Recurse -Name "__pycache__" | Remove-Item -Recurse -Force
    Get-ChildItem -Recurse -Name "*.pyc" | Remove-Item -Force
    
    Write-Host "Clean completed!" -ForegroundColor Green
}

# Main command dispatcher
switch ($Command.ToLower()) {
    "help" { Show-Help }
    "install" { Install-Dependencies }
    "fmt" { Format-Code }
    "lint" { Lint-Code }
    "test" { Run-Tests }
    "ci" { Run-CI }
    "clean" { Clean-Artifacts }
    default { 
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        Show-Help
        exit 1
    }
}
