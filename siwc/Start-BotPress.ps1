param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$node = (Get-Command node.exe -ErrorAction Stop).Source
function Ensure-NodeService([string]$file, [int]$port) {
  $active = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
  if ($active) {
    $p = Get-CimInstance Win32_Process -Filter "ProcessId = $($active.OwningProcess)" -ErrorAction Stop
    if (-not $p.CommandLine -or -not $p.CommandLine.Contains($file)) {
      throw "TCP port $port is in use by another process (PID $($active.OwningProcess))."
    }
    Write-Host "Already running: $file"
    return
  }
  $logDir = Join-Path $env:LOCALAPPDATA 'BotPress\siwc\logs'
  New-Item -ItemType Directory -Path $logDir -Force | Out-Null
  $name = [IO.Path]::GetFileNameWithoutExtension($file)
  $out = Join-Path $logDir "$name.out.log"
  $err = Join-Path $logDir "$name.err.log"
  $p = Start-Process -FilePath $node -ArgumentList ('"{0}"' -f $file) -PassThru -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError $err
  Start-Sleep -Milliseconds 1200
  if ($p.HasExited) { throw "$name exited early; check $logDir" }
  Write-Host "Started: $name PID=$($p.Id)"
}
Ensure-NodeService (Join-Path $root 'gateway.mjs') 17455
Ensure-NodeService (Join-Path $root 'workbench.mjs') 17456
try {
  $s = Invoke-RestMethod 'http://127.0.0.1:17456/api/status' -TimeoutSec 6
  Write-Host "SIWC gateway connected: $($s.connected)"
} catch { Write-Warning $_.Exception.Message }
if (-not $NoBrowser) { Start-Process 'http://127.0.0.1:17456/' }
