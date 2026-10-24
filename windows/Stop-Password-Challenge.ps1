$root = $PSScriptRoot
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object {
  $_.ExecutablePath -eq (Join-Path $root 'runtime/node.exe') -and $_.CommandLine -like '*server/index.mjs*'
} | ForEach-Object { Stop-Process -Id $_.ProcessId }
Write-Host 'Game server stopped. Close the Edge kiosk window with Alt+F4.'
