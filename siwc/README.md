# BotPress SIWC gateway (prototype)

This is a separate, local-only SIWC / Responses API **prototype**, not a fully integrated Rakazo provider. BotPress's existing 15-agent backend is unchanged.

## Run
From PowerShell:
```powershell
node C:\Labs\botpress\siwc\gateway.mjs
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:17455/login -ContentType application/json -Body '{}'
```
Finish **Continue with ChatGPT** consent in your browser. The authorization scope must include `chatgpt.tokens.use.direct`. Check:
```powershell
Invoke-RestMethod http://127.0.0.1:17455/status
Invoke-RestMethod http://127.0.0.1:17455/models
```
For a model returned by `/models`:
```powershell
$body = @{ model='REPLACE_WITH_MODEL_SLUG'; input='Say hello in Thai' } | ConvertTo-Json
Invoke-RestMethod -Uri http://127.0.0.1:17455/responses -Method Post -ContentType application/json -Body $body
```

## Security and limitations
- OAuth uses dynamic-client registration, PKCE S256, nonce, state, callback validation and OpenAI JWKS-backed RS256 ID-token verification.
- Only binds 127.0.0.1:17455; rejects cross-origin browser calls. Do NOT expose or forward this port.
- No tokens are written to disk; signing in again is required after a restart. A stable host UUID is saved at %LOCALAPPDATA%\BotPress\siwc\host-id.
- Tokens are kept in RAM; refresh is best-effort, not serialized for concurrent refresh. Only one process and account are supported.
- Requests use store=false and stream=true, and require response.completed.
- This prototype returns a text-only response; it does **not** translate Rakazo tools, tool calls, images, or conversation state. There is no direct integration into BotPress UI yet.
- Running automatic agents requires configuring/porting Rakazo separately and reworking its provider/tool bridge for SIWC response streaming and official field restrictions.
- Nothing here bypasses ChatGPT subscription limits. You must consent and receive the required scope; permitted models come from the signed-in account.

Docs: https://developers.openai.com/siwc/token-sharing-open-source/
