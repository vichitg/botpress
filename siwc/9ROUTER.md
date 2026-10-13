# 9Router provider for BotPress

## Setup
1. Open http://127.0.0.1:20128/dashboard on MiniDev.
2. In 9Router, connect a provider account and create an API key in the dashboard. Do not paste it into chat or GitHub.
3. Save the key as a single line in `%LOCALAPPDATA%\BotPress\siwc\9router-api-key.txt`. Keep the file private to the current Windows user, for example:

```powershell
$folder=Join-Path $env:LOCALAPPDATA 'BotPress\siwc'
New-Item -ItemType Directory -Force $folder | Out-Null
$key=Read-Host 'Paste 9Router API Key' -AsSecureString
$bstr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($key)
try { $plain=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr); [IO.File]::WriteAllText((Join-Path $folder '9router-api-key.txt'),$plain) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr); Remove-Variable plain -ErrorAction SilentlyContinue }
```

Alternatively, supply `BOTPRESS_9ROUTER_API_KEY` in the Workbench server process environment. Never put keys in the repository.
4. Start/restart `siwc/Start-BotPress.ps1`. Open http://127.0.0.1:17456 and choose **9Router Local** in Provider.
5. Select a model. Listed models are a catalog and may require connecting their upstream provider. Test a short request.

## Architecture
- ChatGPT SIWC remains available and is the default. 9Router is optional.
- 9Router endpoint: `http://127.0.0.1:20128/v1/chat/completions`, using Bearer API key.
- Conversations use separate keys per provider and agent. Model selections are remembered for each provider.
- Showcase supports the same provider selection.
- 9Router is not a substitute for Rakazo routines/tool-calling; Workbench only supports sequential chat orchestration.
- Never commit `9router-api-key.txt`, tokens, or local chat history.

Official project: https://github.com/decolua/9router
