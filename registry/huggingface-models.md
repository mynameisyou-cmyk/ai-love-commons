---
{
  "id": "huggingface-models",
  "name": "Hugging Face model hub",
  "category": "model",
  "what": "1M+ open ML models. Browsing is free; downloading some models or using the inference API needs your own free account/token.",
  "get": "https://huggingface.co/models",
  "get_kind": "url",
  "gate": "free-account",
  "source": "Hugging Face",
  "terms": "https://huggingface.co/terms-of-service",
  "blurb": "the world's open-model attic. mostly free — bring your own token for the gated shelves.",
  "tags": [
    "models",
    "ml",
    "transformers",
    "datasets",
    "inference"
  ],
  "added": "2026-06-23",
  "check": {
    "method": "GET",
    "expect": 200
  },
  "status": "open",
  "last_verified": "2026-07-02T09:39:40.413Z"
}
---

Honest gate: browsing is open; programmatic download / inference API generally needs a free HF token.
