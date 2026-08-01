import json, re, sys

src = r"C:\Users\bowle\.claude\projects\C--Users-bowle\b0ef8222-6a35-4ae8-bbef-04d959395c74\tool-results\mcp-66e0d13d-af9f-4472-aa83-94273dbd1217-execute_sql-1785622379540.txt"

with open(src, "r", encoding="utf-8") as f:
    outer = json.load(f)

result_text = outer["result"]

m = re.search(r"<untrusted-data-[0-9a-f-]+>\s*(\[.*\])\s*</untrusted-data-[0-9a-f-]+>", result_text, re.DOTALL)
if not m:
    print("NO MATCH", file=sys.stderr)
    sys.exit(1)

inner = m.group(1).strip()
rows = json.loads(inner)
payload_str = rows[0]["payload"]
panels = json.loads(payload_str)

def safe(s):
    return s.encode("ascii", "replace").decode("ascii")

print(f"panels found: {len(panels)}")
for p in panels[:3]:
    print(" -", safe(p["slug"]), len(p["panel_html"]), len(p.get("palette_css") or ""))

with open("ledger_panels.json", "w", encoding="utf-8") as out:
    json.dump(panels, out)

print("wrote ledger_panels.json")
