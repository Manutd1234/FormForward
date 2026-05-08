import json
import os
import sys


def fail(message):
    print(json.dumps({"error": message}))
    sys.exit(0)


def main():
    if len(sys.argv) < 2:
      fail("Missing payload.")
    try:
        payload = json.loads(sys.argv[1])
    except Exception as exc:
        fail(f"Invalid payload: {exc}")

    model_ref = payload.get("local_model_path") or payload.get("model")
    if not model_ref:
        fail("No local model path provided.")

    if not os.path.exists(model_ref) and "/" not in model_ref:
        fail(f"Local model path not found: {model_ref}")

    try:
        import torch
        from transformers import pipeline
    except Exception as exc:
        fail(
            "Local Gemma runtime requires Python packages `torch` and `transformers`. "
            f"Import failed: {exc}"
        )

    messages = payload.get("messages") or []
    prompt = messages
    generation = dict(
        max_new_tokens=((payload.get("options") or {}).get("num_predict") or 256),
        temperature=((payload.get("options") or {}).get("temperature") or 0.2),
        return_full_text=False,
    )

    try:
        pipe = pipeline(
            task="any-to-any",
            model=model_ref,
            device_map="auto",
            dtype="auto",
        )
        result = pipe(prompt, **generation)
    except Exception as exc:
        fail(f"Local Gemma generation failed: {exc}")

    generated = ""
    if isinstance(result, list) and result:
        first = result[0]
        generated = first.get("generated_text") if isinstance(first, dict) else str(first)
    else:
        generated = str(result)

    print(json.dumps({"message": {"content": generated}}))


if __name__ == "__main__":
    main()
