$root=Split-Path -Parent $MyInvocation.MyCommand.Path
$shell=New-Object -ComObject WScript.Shell
$desktop=[Environment]::GetFolderPath('Desktop')
$startup=[Environment]::GetFolderPath('Startup')
foreach($entry in @(@((Join-Path $desktop 'BotPress ChatGPT.lnk'),''),@((Join-Path $startup 'BotPress ChatGPT Services.lnk'),'-NoBrowser'))){
 $link=$shell.CreateShortcut($entry[0])
 $link.TargetPath=(Get-Command powershell.exe).Source
 $link.Arguments='-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "'+(Join-Path $root 'Start-BotPress.ps1')+'" '+$entry[1]
 $link.WorkingDirectory=$root
 $link.Save()
 Write-Host "Created $($entry[0])"
}
