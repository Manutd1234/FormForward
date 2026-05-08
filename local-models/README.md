# Repository-local Gemma setup

FormForward can now target a **local Gemma model directory** instead of only using Ollama.

Important:

- The **model weights are not committed into this repo**.
- Google’s official Gemma docs require you to **acknowledge the license and download the model separately**.
- The repo-local runner expects a Hugging Face-compatible Gemma model path and Python packages such as `torch` and `transformers`.

Suggested flow:

1. Download an official Gemma model to a folder on this machine.
2. Put that folder somewhere like:

```text
./local-models/gemma4
```

3. Install the Python runtime:

```bash
pip install torch transformers
```

4. Paste that folder path into the **Repository-local provider** field in the app.

Or download directly into this repo with the helper:

```bash
HF_TOKEN=your_token ./.venv/bin/python scripts/download_gemma_hf.py \
  --model google/gemma-4-E2B-it \
  --output local-models/gemma4
```

The backend will then try `scripts/local_gemma_runner.py` before falling back to Ollama.
