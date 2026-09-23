# -*- coding: utf-8 -*-
"""
Refresh data/ from Supabase in one command.

    python scripts/pull.py            # write every file, print what changed
    python scripts/pull.py --dry      # show what would change, write nothing

Calls the vault-pull edge function, which runs public.vault_pull() (the
canonical form of the queries in scripts/PULL.sql) and returns every data/
file keyed by filename. Each one is written verbatim, 1-space indent, the way
the files have always been formatted. Then run `npm run data`.

Auth: FILM_ENRICH_TOKEN, or the file ~/.vault-cron-token (the cron secret from
public.push_secrets; a Dixon JWT also works). Nothing else is needed; the
service key never leaves Supabase.

Refuses to write if a file the wall cannot live without comes back empty, so a
bad pull can never blank the wall.
"""
import argparse
import json
import os
import sys
from urllib.request import Request, urlopen

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)
DATA = os.path.join(BASE, "data")
URL = os.environ.get("SUPABASE_URL", "https://swjqlfcqvcrnydpyjyog.supabase.co").rstrip("/") + "/functions/v1/vault-pull"
REQUIRED = ["ledger_meta.json", "titles.json", "log_extra.json", "hot_takes.json", "ledger_panels.json"]


def token():
    t = os.environ.get("FILM_ENRICH_TOKEN")
    if t:
        return t.strip()
    p = os.path.expanduser("~/.vault-cron-token")
    if os.path.exists(p):
        with open(p, encoding="utf-8") as f:
            return f.read().strip()
    sys.exit("No token. Set FILM_ENRICH_TOKEN or write the cron secret to ~/.vault-cron-token.")


def size(v):
    if isinstance(v, dict):
        inner = [x for x in v.values() if isinstance(x, (dict, list))]
        return len(v) if not inner or len(v) > 3 else max(len(x) for x in inner)
    if isinstance(v, list):
        return len(v)
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry", action="store_true")
    a = ap.parse_args()

    req = Request(URL, data=b"{}", method="POST", headers={
        "Authorization": "Bearer " + token(), "Content-Type": "application/json"})
    with urlopen(req, timeout=60) as r:
        body = json.loads(r.read().decode("utf-8"))
    files = body.get("files") or {}
    if "error" in body or not files:
        sys.exit("pull failed: %s" % body.get("error", "no files"))

    for name in REQUIRED:
        if not files.get(name):
            sys.exit("refusing to write: %s came back empty" % name)

    print("pulled %s" % body.get("pulled_at"))
    for name in sorted(files):
        text = json.dumps(files[name], indent=1, ensure_ascii=False) + "\n"
        path = os.path.join(DATA, name)
        old = None
        if os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                old = f.read()
        if old is not None and json.loads(old) == files[name]:
            print("  same     %-20s %d" % (name, size(files[name])))
            continue
        was = size(json.loads(old)) if old else 0
        print("  %-8s %-20s %d -> %d" % ("new" if old is None else "changed", name, was, size(files[name])))
        if not a.dry:
            with open(path, "w", encoding="utf-8", newline="\n") as f:
                f.write(text)
    if a.dry:
        print("(dry run, nothing written)")
    else:
        print("next: npm run data")


if __name__ == "__main__":
    main()
