#!/usr/bin/env python3
"""Drive the film-enrich edge function and report what it did.

Registry enrichment for film_titles (Movie Night v4, pass 2): original_language,
origin_country, keywords, tmdb_fetched_at. The TMDB key never lands on this PC.
It is a Supabase secret (TMDB_API_KEY) read inside the edge function.

This script only needs a bearer token for the function:
  FILM_ENRICH_TOKEN   the cron secret from public.push_secrets.cron_secret,
                      or a Supabase JWT for Dixon's account.
Optional:
  SUPABASE_URL        defaults to the figgg project URL below.
  ENRICH_STALE_DAYS   defaults to 90. Rows fetched inside the window are skipped.
  ENRICH_LIMIT        max rows to consider in one call, defaults to 500.

Idempotent. Run it again and everything fresh is skipped.
"""

import json
import os
import sys
import urllib.error
import urllib.request

DEFAULT_URL = "https://swjqlfcqvcrnydpyjyog.supabase.co"


def main() -> int:
    token = os.environ.get("FILM_ENRICH_TOKEN")
    if not token:
        print("FILM_ENRICH_TOKEN is not set. Use the cron secret or a Dixon JWT.", file=sys.stderr)
        return 2

    base = os.environ.get("SUPABASE_URL", DEFAULT_URL).rstrip("/")
    payload = {
        "action": "enrich",
        "stale_days": int(os.environ.get("ENRICH_STALE_DAYS", "90")),
        "limit": int(os.environ.get("ENRICH_LIMIT", "500")),
    }
    req = urllib.request.Request(
        f"{base}/functions/v1/film-enrich",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=900) as res:
            body = json.loads(res.read().decode())
    except urllib.error.HTTPError as err:
        print(f"film-enrich {err.code}: {err.read().decode()[:300]}", file=sys.stderr)
        return 1

    if "error" in body:
        print(f"film-enrich error: {body['error']}", file=sys.stderr)
        return 1

    print(f"considered {body.get('considered', 0)} titles with a tmdb_id")
    print(f"fetched  {body.get('fetched', 0)}")
    print(f"skipped  {body.get('skipped', 0)} (fetched inside {body.get('stale_days')} days)")
    print(f"failed   {body.get('failed', 0)}")
    for f in body.get("failures", []):
        print(f"  {f['id']}: {f['error']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
