# One-off: SDXL polaroid-front experiments for the Vault (hybrid ruling,
# 2026-08-01). Crown + top Nines only. Output lands in ComfyUI/output/,
# copied here as vaultexp_<slug>.png. Not part of the build pipeline.
import json, time, urllib.request, shutil, glob, os, sys

API = "http://127.0.0.1:8188"
OUT_DIR = os.path.dirname(os.path.abspath(__file__))
COMFY_OUT = r"C:\Users\bowle\AI\ComfyUI_windows_portable\ComfyUI\output"

STYLE = ("instant film photograph, square composition, harsh direct flash, "
         "subject dead center, warm chemical color cast, soft edge vignette, "
         "35mm grain, slightly overexposed highlights, 1990s snapshot, ")
NEG = ("text, letters, watermark, caption, cartoon, illustration, 3d render, "
       "painting, frame, border, low quality, deformed")

SCENES = {
  "memento": "a single polaroid photo lying on a floral motel bedspread next to a ballpoint pen, handwriting visible on its white border, top-down",
  "sicario": "night vision view, a line of soldiers in silhouette descending into a dark tunnel mouth in the desert at dusk, green-tinged monochrome",
  "br2049": "a lone man in a long coat seen from behind, standing tiny before a towering glowing orange hologram of a giant woman in dense fog",
  "darkknight": "a glowing bat symbol projected onto storm clouds above a dark city skyline at night, seen from a rooftop",
}

def graph(slug, prompt, seed):
    return {
      "1": {"class_type": "CheckpointLoaderSimple",
            "inputs": {"ckpt_name": "sd_xl_base_1.0.safetensors"}},
      "2": {"class_type": "CLIPTextEncode",
            "inputs": {"clip": ["1", 1], "text": STYLE + prompt}},
      "3": {"class_type": "CLIPTextEncode",
            "inputs": {"clip": ["1", 1], "text": NEG}},
      "4": {"class_type": "EmptyLatentImage",
            "inputs": {"width": 1024, "height": 1024, "batch_size": 1}},
      "5": {"class_type": "KSampler",
            "inputs": {"model": ["1", 0], "positive": ["2", 0],
                       "negative": ["3", 0], "latent_image": ["4", 0],
                       "seed": seed, "steps": 28, "cfg": 7.0,
                       "sampler_name": "dpmpp_2m", "scheduler": "karras",
                       "denoise": 1.0}},
      "6": {"class_type": "VAEDecode",
            "inputs": {"samples": ["5", 0], "vae": ["1", 2]}},
      "7": {"class_type": "SaveImage",
            "inputs": {"images": ["6", 0], "filename_prefix": "vaultexp_" + slug}},
    }

def post(path, payload):
    req = urllib.request.Request(API + path, json.dumps(payload).encode(),
                                 {"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req))

def wait_server(tries=60):
    for _ in range(tries):
        try:
            urllib.request.urlopen(API + "/system_stats", timeout=3)
            return True
        except Exception:
            time.sleep(3)
    return False

if not wait_server():
    sys.exit("ComfyUI never came up")

ids = {}
for i, (slug, prompt) in enumerate(SCENES.items()):
    r = post("/prompt", {"prompt": graph(slug, prompt, 20260801 + i)})
    ids[slug] = r["prompt_id"]
    print("queued", slug, r["prompt_id"])

pendingq = dict(ids)
deadline = time.time() + 1200
while pendingq and time.time() < deadline:
    time.sleep(6)
    for slug, pid in list(pendingq.items()):
        try:
            h = json.load(urllib.request.urlopen(API + "/history/" + pid, timeout=5))
        except Exception:
            continue
        if pid in h and h[pid].get("outputs"):
            print("done", slug)
            del pendingq[slug]
if pendingq:
    sys.exit("timed out on: " + ", ".join(pendingq))

for slug in SCENES:
    hits = sorted(glob.glob(os.path.join(COMFY_OUT, "vaultexp_%s_*.png" % slug)))
    if hits:
        shutil.copy(hits[-1], os.path.join(OUT_DIR, "vaultexp_%s.png" % slug))
        print("copied", slug)
print("all done")
