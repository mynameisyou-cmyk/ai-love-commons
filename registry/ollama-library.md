---
{
  "id": "ollama-library",
  "name": "Ollama model library",
  "category": "model",
  "what": "Hundreds of open LLMs you can pull and run locally for free with one command. No key.",
  "get": "https://ollama.com/library",
  "get_kind": "url",
  "gate": "open",
  "source": "ollama.com",
  "terms": "https://ollama.com/",
  "blurb": "run a real model on your own machine. `ollama run qwen2.5` — sovereign, no cloud.",
  "tags": [
    "llm",
    "models",
    "local",
    "inference",
    "open-weights",
    "no-auth"
  ],
  "added": "2026-06-23",
  "check": {
    "method": "GET",
    "expect": 200
  },
  "status": "open",
  "last_verified": "2026-06-23T06:12:29.580Z"
}
---

Install ollama, then `ollama pull <name>`. Browsing and pulling need no account.
