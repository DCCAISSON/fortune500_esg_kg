import json
import re
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_FILE = ROOT / "assets" / "data" / "world500" / "workbench" / "method_nav_runtime.json"

PAGES = [
    ("index.html", "zh", "./assets/data/world500/workbench/method_nav_runtime.json"),
    ("zh/index.html", "zh", "../assets/data/world500/workbench/method_nav_runtime.json"),
    ("en/index.html", "en", "../assets/data/world500/workbench/method_nav_runtime.json"),
]

SCRIPT_RE = re.compile(
    r'(<script type="application/json" id="world500-method-nav-data">)(.*?)(</script>)',
    re.S,
)

LOADER_MARKER = "method_nav_runtime_loader_v1"

LOADER_BLOCK = f"""
    if (!Array.isArray(data.systems) && data.source) {{
      try {{
        const response = await fetch(data.source, {{ cache: 'no-store' }});
        if (!response.ok) throw new Error(`Failed to load ${{data.source}}: ${{response.status}}`);
        const runtime = await response.json();
        const runtimeLang = data.labels?.lang || document.documentElement.lang || 'zh';
        const localized = runtime.languages?.[runtimeLang] || runtime.languages?.zh || {{}};
        data = {{
          ...localized,
          defaultSystem: data.defaultSystem || localized.defaultSystem,
          displayCompanyLimit: data.displayCompanyLimit || localized.displayCompanyLimit,
        }};
      }} catch (error) {{
        console.error('Failed to load methodology navigation runtime data.', error);
        return;
      }}
    }}
    // {LOADER_MARKER}
"""

LOADER_RE = re.compile(
    r"\n    if \(!Array\.isArray\(data\.systems\) && data\.source\) \{.*?\n    // "
    + re.escape(LOADER_MARKER)
    + r"\n",
    re.S,
)


def parse_method_payload(path):
    text = path.read_text(encoding="utf-8")
    match = SCRIPT_RE.search(text)
    if not match:
        return None
    return json.loads(match.group(2))


def load_existing_runtime():
    if not OUTPUT_FILE.exists():
        return {}
    payload = json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))
    return payload.get("languages", {})


def collect_language_payloads():
    languages = {}
    for rel_path, lang, _ in PAGES:
        payload = parse_method_payload(ROOT / rel_path)
        if payload and isinstance(payload.get("systems"), list):
            languages[lang] = payload
    if languages:
        return languages
    languages = load_existing_runtime()
    if languages:
        return languages
    raise RuntimeError("No embedded methodology navigator payloads or existing runtime JSON were found.")


def write_runtime(languages):
    payload = {
        "schema_version": "method-nav-runtime-v1",
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "source_note": "Extracted from the previously embedded world500-method-nav-data payloads.",
        "languages": languages,
    }
    OUTPUT_FILE.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8", newline="\n")
    return payload


def method_config(lang, source):
    return {
        "version": "method_nav_runtime_config_v1",
        "source": source,
        "labels": {"lang": lang},
        "defaultSystem": "data_source_type",
        "displayCompanyLimit": 24,
    }


def patch_page(rel_path, lang, source):
    path = ROOT / rel_path
    text = path.read_text(encoding="utf-8")
    config = json.dumps(method_config(lang, source), ensure_ascii=False, separators=(",", ":"))
    text, count = SCRIPT_RE.subn(rf"\1{config}\3", text, count=1)
    if count != 1:
        raise RuntimeError(f"Failed to replace method nav payload in {rel_path}")
    text = LOADER_RE.sub("\n", text)
    if "async function initMethodologyNavigator() {" not in text:
        text = text.replace("function initMethodologyNavigator() {", "async function initMethodologyNavigator() {", 1)
    marker = "    const systems = Array.isArray(data.systems) ? data.systems : [];"
    method_start = text.find("async function initMethodologyNavigator() {")
    if method_start < 0:
        raise RuntimeError(f"Failed to locate initMethodologyNavigator in {rel_path}")
    marker_index = text.find(marker, method_start)
    if marker_index < 0:
        raise RuntimeError(f"Failed to locate methodology data marker in {rel_path}")
    text = text[:marker_index] + f"{LOADER_BLOCK}\n" + text[marker_index:]
    path.write_text(text, encoding="utf-8", newline="\n")


def main():
    languages = collect_language_payloads()
    write_runtime(languages)
    for rel_path, lang, source in PAGES:
        patch_page(rel_path, lang, source)
        print(f"Patched {rel_path}")
    print(f"Wrote {OUTPUT_FILE.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
