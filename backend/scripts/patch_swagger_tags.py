#!/usr/bin/env python3
"""Inject root-level Swagger tags so Swagger UI groups Payment and Subscription correctly."""
import json
import sys
from pathlib import Path

TAG_META = [
    ("Guest", "Public marketplace browsing — no login required"),
    ("Customer", "Signed-in shopper — checkout, orders, addresses, reviews"),
    ("Vendor", "Vendor store operations — products, orders, profile"),
    ("Admin", "Platform administration — users, vendors, moderation"),
    ("Payment", "Paystack payments — order checkout, verification, and webhooks"),
    ("Subscription", "Vendor featured listing plans — catalog, checkout, and billing history"),
    ("Authentication", "Login, registration, and password recovery"),
    ("Users", "Profile and account settings (any signed-in role)"),
    ("Upload", "Image uploads"),
]

def used_tags(spec: dict) -> set[str]:
    found: set[str] = set()
    for methods in (spec.get("paths") or {}).values():
        if not isinstance(methods, dict):
            continue
        for op in methods.values():
            if isinstance(op, dict) and isinstance(op.get("tags"), list):
                found.update(op["tags"])
    return found

def main() -> int:
    path = Path(sys.argv[1] if len(sys.argv) > 1 else "docs/swagger.json")
    spec = json.loads(path.read_text(encoding="utf-8"))
    active = used_tags(spec)
    spec["tags"] = [
        {"name": name, "description": desc}
        for name, desc in TAG_META
        if name in active
    ]
    path.write_text(json.dumps(spec, indent=4) + "\n", encoding="utf-8")
    print(f"Patched {path} with {len(spec['tags'])} root tags")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
