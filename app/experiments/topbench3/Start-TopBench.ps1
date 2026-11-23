param(
    [ValidateSet('preview','run','evaluate','all','export','status')][string]$Command='all',
    [int]$Start=1,
    [int]$Count=20,
    [switch]$Execute
)
$ErrorActionPreference='Stop'
$repoRoot=(Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$taskPython=Join-Path (Split-Path $repoRoot -Parent) 'codedepth/.venv/Scripts/python.exe'
if ($Execute -and -not $env:CODEDEPTH_RELAY_API_KEY) {
    . (Join-Path (Split-Path $repoRoot -Parent) 'codedepth/scripts/Enter-RelayKey.ps1')
}
$taskArgs=@('-X','utf8',(Join-Path $PSScriptRoot 'runner.py'),$Command,'--start',"$Start",'--count',"$Count")
if ($Execute) {$taskArgs+='--execute'}
& $taskPython @taskArgs
if ($LASTEXITCODE -ne 0) {throw "TOP-Bench controller exited with code $LASTEXITCODE"}
