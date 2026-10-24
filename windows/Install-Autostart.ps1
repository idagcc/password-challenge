$ErrorActionPreference = 'Stop'
$startup = [Environment]::GetFolderPath('Startup')
$shell = New-Object -ComObject WScript.Shell
$link = $shell.CreateShortcut((Join-Path $startup 'Password Challenge.lnk'))
$link.TargetPath = Join-Path $PSScriptRoot 'Start-Password-Challenge.cmd'
$link.WorkingDirectory = $PSScriptRoot
$link.WindowStyle = 7
$link.Save()
Write-Host 'Password Challenge will start when this Windows user signs in. Remove its shortcut from the Startup folder to undo.'
