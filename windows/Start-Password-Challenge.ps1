$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$config = Get-Content (Join-Path $PSScriptRoot 'config.json') -Raw | ConvertFrom-Json
$url = "http://127.0.0.1:$($config.port)"
$ready = $false
try { $health = Invoke-RestMethod "$url/api/health" -TimeoutSec 2; $ready = $health.ok -eq $true } catch {}
if (-not $ready) {
  $runtime = Join-Path $PSScriptRoot 'runtime/node.exe'
  if (-not (Test-Path $runtime)) { throw 'The bundled runtime is missing. Extract the entire Windows package before starting.' }
  New-Item -ItemType Directory -Force -Path (Join-Path $PSScriptRoot 'data') | Out-Null
  $server = Start-Process -FilePath $runtime -ArgumentList @('server/index.mjs') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot 'data/server.log') -RedirectStandardError (Join-Path $PSScriptRoot 'data/server-error.log') -PassThru
  for ($i=0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 500
    try { $health = Invoke-RestMethod "$url/api/health" -TimeoutSec 1; if ($health.ok) { $ready=$true; break } } catch {}
    if ($server.HasExited) { throw 'The game server could not start. Check data/server-error.log.' }
  }
  if (-not $ready) { throw 'The game server did not become ready. Check data/server-error.log.' }
}
$edgePaths = @(
  (Join-Path ${env:ProgramFiles(x86)} 'Microsoft/Edge/Application/msedge.exe'),
  (Join-Path $env:ProgramFiles 'Microsoft/Edge/Application/msedge.exe'),
  (Join-Path $env:LOCALAPPDATA 'Microsoft/Edge/Application/msedge.exe')
)
$edge = $edgePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { throw 'Microsoft Edge is required on the kiosk PC.' }
$profile = Join-Path $PSScriptRoot 'data/edge-kiosk-profile'
Start-Process -FilePath $edge -ArgumentList @('--kiosk', $url, '--edge-kiosk-type=fullscreen', '--no-first-run', '--disable-pinch', '--autoplay-policy=no-user-gesture-required', "--user-data-dir=`"$profile`"")
