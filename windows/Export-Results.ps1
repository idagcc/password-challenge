$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$config = Get-Content 'config.json' -Raw | ConvertFrom-Json
$key = (Get-Content 'data/operator-key.txt' -Raw).Trim()
New-Item -ItemType Directory -Force 'exports' | Out-Null
$file = Join-Path $PSScriptRoot ("exports/password-challenge-" + (Get-Date -Format 'yyyy-MM-dd-HHmmss') + '.csv')
Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$($config.port)/api/operator/export" -Headers @{'X-Operator-Key'=$key} -OutFile $file
Write-Host "Results saved: $file"
