import argparse
import os
import sys

from huggingface_hub import login, snapshot_download


def main():
    parser = argparse.ArgumentParser(description="Download a Gemma model into the repository.")
    parser.add_argument("--model", default="google/gemma-4-E2B-it", help="Hugging Face model id")
    parser.add_argument("--output", default="local-models/gemma4", help="Destination directory")
    parser.add_argument("--token", default=os.getenv("HF_TOKEN"), help="Hugging Face token with Gemma access")
    args = parser.parse_args()

    if not args.token:
        print("Missing Hugging Face token. Set HF_TOKEN or pass --token.", file=sys.stderr)
        sys.exit(2)

    login(token=args.token)
    path = snapshot_download(
        repo_id=args.model,
        local_dir=args.output,
        local_dir_use_symlinks=False,
        resume_download=True,
    )
    print(path)


if __name__ == "__main__":
    main()
