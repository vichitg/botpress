$ErrorActionPreference='Stop'
$base='http://127.0.0.1:17455'
$s=Invoke-RestMethod "$base/status"
if ($s.connected -ne $false -and $s.connected -ne $true) { throw 'Invalid status' }
try { Invoke-RestMethod "$base/models" | Out-Null; if (-not $s.connected) {throw 'Unexpected models allowed'} } catch { if ($s.connected) {throw} }
try {
 Invoke-WebRequest "$base/login" -Method Post -Headers @{Origin='https://evil.example'} -ContentType 'application/json' -Body '{}' -UseBasicParsing | Out-Null
 throw 'Cross-origin request was not rejected'
} catch {if ($_.Exception.Response.StatusCode -ne [Net.HttpStatusCode]::Forbidden) {throw} }
'SIWC pre-auth security tests PASS'
