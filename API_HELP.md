# Gemini API Connectivity Test

If you are seeing errors when testing your API key in PowerShell, use the following corrected commands.

## 1. PowerShell One-Liner (Corrected)
Replace `YOUR_API_KEY` with your actual key. This command is a single line to avoid line-break errors in PowerShell.

```powershell
Invoke-RestMethod -Method Post -Uri "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=YOUR_API_KEY" -ContentType "application/json" -Body '{"contents": [{"parts":[{"text": "Write a short poem about AI."}]}]}'
```

## 2. Using the Project Script
The easiest way to test your key within this project:

### In AI Studio:
1. Ensure `GEMINI_API_KEY` is set in the **Settings** menu.
2. Run this command in the terminal:
   ```bash
   npm run test:api
   ```

### Locally (Windows PowerShell):
```powershell
$env:GEMINI_API_KEY="YOUR_API_KEY_HERE"; npm run test:api
```

## Error Troubleshooting
- **API_KEY_INVALID**: Your key is typed incorrectly or has expired.
- **Model not found**: Ensure you are using `gemini-1.5-flash` or `gemini-2.0-flash`.
- **Invoke-WebRequest errors**: PowerShell treats `curl` as an alias for `Invoke-WebRequest`. Use `Invoke-RestMethod` for better JSON handling as shown above.
