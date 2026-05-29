<#
Run this from PowerShell in the ADKCompanion folder.
It will load environment variables from a local .env (if present), activate the virtualenv and run app.py.
#>

Param()

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptDir

$envFile = Join-Path $scriptDir '.env'
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -and ($_ -notmatch '^[ 	]*#')) {
            $parts = $_ -split '=', 2
            if ($parts.Count -eq 2) {
                $name = $parts[0].Trim()
                $value = $parts[1].Trim('"')
                # Remove surrounding quotes and whitespace and set env var for this process
                $value = $value.Trim()
                Set-Item -Path "Env:$name" -Value $value
            }
        }
    }
    Write-Host "Loaded environment variables from .env"
} else {
    Write-Warning ".env not found in $scriptDir — skipping .env load"
}

$venvActivate = Join-Path $scriptDir '.venv\Scripts\Activate.ps1'
if (Test-Path $venvActivate) {
    Write-Host "Activating virtual environment..."
    . $venvActivate
} else {
    Write-Warning ".venv activation script not found at $venvActivate — ensure virtualenv is created or activate manually"
}

Write-Host "Starting app.py"
# Prefer the venv python executable if present, otherwise try global 'python', then 'py'
$venvPython = Join-Path $scriptDir '.venv\Scripts\python.exe'
$pythonCmd = $null
if (Test-Path $venvPython) {
    $pythonCmd = $venvPython
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonCmd = (Get-Command python).Source
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    $pythonCmd = (Get-Command py).Source
}

if (-not $pythonCmd) {
    Write-Error "No Python executable found. Install Python or create a virtualenv (.venv)."
    Exit 1
}

Write-Host "Running with: $pythonCmd"
& $pythonCmd .\app.py
