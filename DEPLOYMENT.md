# FormForward Deployment Notes

FormForward has two runtime pieces:

- The Vercel deployment hosts the static web app.
- The local Node gateway (`node server.js`) runs the private APIs, file library, PDF extraction, and Gemma 4 proxy.

This keeps runner data and model inference on the user's machine. Vercel does not run the local Gemma model.

## Vercel + Local Gateway

1. Deploy the repository to Vercel as a static app.
2. On the machine that owns the running data and model, start the gateway:

```bash
node server.js
```

3. Open the Vercel app.
4. In AI Coach, keep the API mode set to `Vercel + Local Gateway`, or set `Local Hub (Direct)` with:

```text
http://localhost:5173
```

The gateway allows localhost and `*.vercel.app` origins via CORS.

## Gemma 4 Providers

The gateway now tries providers in this order:

1. Ollama at `http://127.0.0.1:11434`
2. Repository-local Hugging Face model at `local-models/gemma4`

Install the Ollama model:

```bash
ollama pull gemma4:latest
```

Then keep Ollama running while FormForward is open.

To use another Ollama host:

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434 node server.js
```

To restrict which browser origins can call the local gateway:

```bash
FORMFORWARD_ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:5173 node server.js
```

## What Vercel Can And Cannot Do

Vercel can serve the UI.

Vercel should not be expected to run:

- local Gemma model weights
- Ollama on the user's machine
- the user's private `data/fit` and `data/videos` library
- local PDF OCR dependencies

For a fully cloud-hosted backend, add a separate managed API service and update the gateway URL in the app.
