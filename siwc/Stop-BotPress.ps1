$root=Split-Path -Parent $MyInvocation.MyCommand.Path
foreach($name in @('gateway.mjs','workbench.mjs')){
 $file=Join-Path $root $name
 Get-CimInstance Win32_Process -Filter "name='node.exe'" | Where-Object {$_.CommandLine -and $_.CommandLine.Contains($file)} | ForEach-Object {Stop-Process -Id $_.ProcessId -Force;Write-Host "Stopped $name"}
}
