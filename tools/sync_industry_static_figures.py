# /// script
# requires-python = ">=3.11"
# dependencies = ["Pillow"]
# ///
# How to run:
#   python tools/sync_industry_static_figures.py
from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path
from typing import Final

from PIL import Image, ImageDraw, ImageFont


ROOT: Final = Path(__file__).resolve().parents[1]
WB: Final = ROOT / "assets" / "data" / "world500" / "workbench"
FIGURES: Final = ROOT / "assets" / "figures"
MANIFEST: Final = FIGURES / "reporting_static_figures_manifest.json"
PALETTE: Final = {
    "bg": "#f3ecdf",
    "paper": "#fffdf8",
    "ink": "#17313e",
    "muted": "#667782",
    "line": "#d8ccba",
    "ghg": "#2f6f63",
    "iso": "#315f8c",
    "gb": "#c76b2d",
    "warn": "#9b3b2f",
}


def read_rows(name: str) -> list[dict[str, str | int | float | list[str]]]:
    payload = json.loads((WB / f"{name}.json").read_text(encoding="utf-8"))
    return payload["rows"]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


@lru_cache(maxsize=None)
def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/msyhbd.ttc" if bold else "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def wrap(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.ImageFont, width: int, max_lines: int = 2) -> list[str]:
    value = " ".join(str(text or "").split())
    if not value:
        return []
    lines: list[str] = []
    current = ""
    chars = list(value) if any("\u4e00" <= char <= "\u9fff" for char in value) else value.split()
    joiner = "" if chars and len(chars[0]) == 1 else " "
    for token in chars:
        probe = f"{current}{joiner}{token}".strip()
        if draw.textbbox((0, 0), probe, font=fnt)[2] <= width:
            current = probe
        else:
            if current:
                lines.append(current)
            current = token
    if current:
        lines.append(current)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = f"{lines[-1].rstrip(' .,;')}..."
    return lines


def text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], value: str, size: int, color: str, width: int, bold: bool = False) -> None:
    x, y = xy
    fnt = font(size, bold)
    for index, line in enumerate(wrap(draw, value, fnt, width, 2)):
        draw.text((x, y + index * (size + 7)), line, font=fnt, fill=color)


def rounded(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: str, outline: str = PALETTE["line"]) -> None:
    draw.rounded_rectangle(box, radius=28, fill=fill, outline=outline, width=2)


def render_sankey(lang: str) -> Path:
    links = read_rows("world500_standard_industry_section_sankey_links")
    registry = read_rows("standard_industry_sankey_registry")
    sections = read_rows("national_industry_section_registry")
    image = Image.new("RGB", (2600, 1680), PALETTE["bg"])
    draw = ImageDraw.Draw(image)
    rounded(draw, (34, 34, 2566, 1646), PALETTE["paper"])
    title = "GHGP、ISO、GB/T 标准与国民经济行业门类的宏观关联分布" if lang == "zh" else "GHGP, ISO, and GB/T Standards × Industry Sections Mirror Sankey"
    note = "左右两侧均为 GB/T 4754-2017 行业门类，中间为 12 个具体标准节点；流量表示 accepted 企业-标准关联数，镜像布局不表示行业间流动或因果关系。" if lang == "zh" else "Both sides use GB/T 4754-2017 industry sections. The middle column contains 12 concrete standards; flow means accepted company-standard association count, not industry-to-industry causality."
    draw.text((82, 72), title, font=font(44, True), fill=PALETTE["ink"])
    text(draw, (84, 135), note, 24, PALETTE["muted"], 2220)
    column_labels = ("企业所属行业", "具体标准", "关联行业分布") if lang == "zh" else ("Company industry section", "Specific standard", "Associated industry distribution")
    for x, label in zip((110, 960, 1970), column_labels, strict=True):
        draw.text((x, 218), label, font=font(26, True), fill=PALETTE["ink"])
    system_colors = {"GHG Protocol": PALETTE["ghg"], "ISO": PALETTE["iso"], "GB/T": PALETTE["gb"]}
    flow_colors = {"GHG Protocol": (47, 111, 99, 92), "ISO": (49, 95, 140, 88), "GB/T": (199, 107, 45, 96)}
    left_x1, left_x2 = 92, 642
    mid_x1, mid_x2 = 930, 1670
    right_x1, right_x2 = 1960, 2510
    section_h, standard_h = 46, 64
    section_top, standard_top = 292, 304
    section_step = 60
    standard_step = 96
    section_y = {str(row["industry_section_code"]): section_top + index * section_step for index, row in enumerate(sections)}
    standard_y = {str(row["internal_standard_id"]): standard_top + index * standard_step for index, row in enumerate(registry)}
    section_total = {str(row["industry_section_code"]): 0 for row in sections}
    standard_total = {str(row["internal_standard_id"]): 0 for row in registry}
    for row in links:
        count = int(row["accepted_link_count"])
        section_total[str(row["industry_section_code"])] += count
        standard_total[str(row["internal_standard_id"])] += count
    max_count = max((int(row["accepted_link_count"]) for row in links), default=1)
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    flow_draw = ImageDraw.Draw(overlay)
    for row in sorted(links, key=lambda item: int(item["accepted_link_count"])):
        count = int(row["accepted_link_count"])
        code = str(row["industry_section_code"])
        sid = str(row["internal_standard_id"])
        system = str(row["standard_system"])
        width = 2 + round(22 * count / max_count)
        ly = section_y[code] + section_h // 2
        sy = standard_y[sid] + standard_h // 2
        points = []
        for step in range(18):
            t = step / 17
            ease = t * t * (3 - 2 * t)
            points.append((round(left_x2 + (mid_x1 - left_x2) * t), round(ly + (sy - ly) * ease)))
        flow_draw.line(points, fill=flow_colors[system], width=width)
        points = []
        for step in range(18):
            t = step / 17
            ease = t * t * (3 - 2 * t)
            points.append((round(mid_x2 + (right_x1 - mid_x2) * t), round(sy + (ly - sy) * ease)))
        flow_draw.line(points, fill=flow_colors[system], width=width)
    image = Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(image)
    for row in sections:
        code = str(row["industry_section_code"])
        name = str(row["industry_section_name_zh" if lang == "zh" else "industry_section_name_en"])
        y = section_y[code]
        fill = PALETTE["bg"] if section_total[code] else "#fbf7ef"
        for x1, x2 in ((left_x1, left_x2), (right_x1, right_x2)):
            rounded(draw, (x1, y, x2, y + section_h), fill)
            text(draw, (x1 + 18, y + 7), f"{code} {name}", 14, PALETTE["ink"], x2 - x1 - 112, True)
            draw.text((x2 - 72, y + 13), str(section_total[code]), font=font(15, True), fill=PALETTE["muted"])
    for row in registry:
        sid = str(row["internal_standard_id"])
        system = str(row["display_system"])
        y = standard_y[sid]
        name = str(row["display_standard_name_zh" if lang == "zh" else "display_standard_name_en"])
        if lang == "zh":
            name = name.replace("GHG Protocol", "GHGP")
        color = system_colors[system]
        rounded(draw, (mid_x1, y, mid_x2, y + standard_h), "#fbf7ef", color)
        draw.rounded_rectangle((mid_x1 + 16, y + 18, mid_x1 + 126, y + 45), radius=12, fill=color)
        draw.text((mid_x1 + 32, y + 22), system.replace(" Protocol", "P"), font=font(14, True), fill=PALETTE["paper"])
        text(draw, (mid_x1 + 144, y + 8), name, 16, PALETTE["ink"], 430, True)
        draw.text((mid_x2 - 70, y + 22), str(standard_total[sid]), font=font(18, True), fill=color)
    legend = [("GHGP", PALETTE["ghg"]), ("ISO", PALETTE["iso"]), ("GB/T", PALETTE["gb"])]
    for index, (label, color) in enumerate(legend):
        x = 92 + index * 170
        draw.rounded_rectangle((x, 1564, x + 32, 1596), radius=9, fill=color)
        draw.text((x + 44, 1567), label, font=font(19, True), fill=PALETTE["ink"])
    footer = f"accepted links: {sum(standard_total.values())} | standards: 12 | GB/T 4754-2017 sections: 20"
    draw.text((690, 1567), footer, font=font(19, True), fill=PALETTE["muted"])
    out = FIGURES / lang / "world500_standard_industry_section_sankey.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    image.save(out)
    return out


def render_emissions(lang: str) -> Path:
    rows = [row for row in read_rows("world500_emissions_industry_section_coverage_summary") if int(row["published_company_count"]) > 0]
    image = Image.new("RGB", (2400, 1520), PALETTE["bg"])
    draw = ImageDraw.Draw(image)
    rounded(draw, (34, 34, 2366, 1486), PALETTE["paper"])
    title = "按 GB/T 4754-2017 门类的完整可比排放排行与缺失统计" if lang == "zh" else "Complete Comparable Emissions by GB/T 4754-2017 Industry Section"
    note = "主榜只包含 Scope 1 + selected Scope 2 + Scope 3 均闭环企业；missing 表示未进入完整主榜，不等于没有披露。" if lang == "zh" else "The main ranking includes only complete Scope 1 + selected Scope 2 + Scope 3 companies. Missing means not in the complete ranking, not no disclosure."
    draw.text((82, 72), title, font=font(42, True), fill=PALETTE["ink"])
    text(draw, (84, 132), note, 24, PALETTE["muted"], 1900)
    max_published = max(int(row["published_company_count"]) for row in rows)
    for index, row in enumerate(rows):
        y = 250 + index * 84
        label = f"{row['industry_section_code']} {row['industry_section_name_zh' if lang == 'zh' else 'industry_section_name_en']}"
        text(draw, (88, y), str(label), 20, PALETTE["ink"], 520, True)
        x = 640
        scale = 1120 / max_published
        parts = [
            ("complete_comparable_count", PALETTE["ghg"]),
            ("partial_emissions_count", PALETTE["iso"]),
            ("missing_total_emissions_count", PALETTE["warn"]),
        ]
        cursor = x
        for key, color in parts:
            width = max(3, int(int(row[key]) * scale))
            draw.rounded_rectangle((cursor, y + 4, cursor + width, y + 38), radius=12, fill=color)
            cursor += width
        draw.text((1780, y + 2), f"{row['complete_comparable_count']} / {row['published_company_count']}", font=font(21, True), fill=PALETTE["ink"])
        draw.text((1930, y + 2), f"missing {row['missing_total_emissions_count']}", font=font(18), fill=PALETTE["muted"])
    legend = [("complete", PALETTE["ghg"]), ("partial", PALETTE["iso"]), ("missing", PALETTE["warn"])]
    for index, (label, color) in enumerate(legend):
        x = 88 + index * 220
        draw.rounded_rectangle((x, 1370, x + 34, 1404), radius=9, fill=color)
        draw.text((x + 46, 1372), label, font=font(20, True), fill=PALETTE["ink"])
    out = FIGURES / lang / "world500_emissions_industry_section_ranking.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    image.save(out)
    return out


def update_manifest(outputs: list[Path]) -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    names = {output.name for output in outputs}
    manifest["figures"] = [item for item in manifest.get("figures", []) if Path(item["file"]).name not in names]
    metadata = {
        "world500_standard_industry_section_sankey.png": (
            "standard_industry_sankey",
            "R1_GHG_FINE_SERIES_AND_STANDARD_COMPANY_MAPPING",
            "GHGP, ISO, and GB/T standards × industry-section mirror Sankey",
            "GHGP、ISO、GB/T标准与行业门类镜像桑基图",
            ["standard_industry_sankey_links"],
        ),
        "world500_emissions_industry_section_ranking.png": (
            "emissions_industry_ranking",
            "R2_TOTAL_EMISSIONS_RANKING_DESC",
            "Emissions industry-section ranking",
            "排放行业门类排行与缺失统计",
            ["emissions_industry_section_outputs"],
        ),
    }
    for output in outputs:
        figure_no, requirement_id, title_en, title_zh, data_keys = metadata[output.name]
        manifest["figures"].append({
            "file": str(output.relative_to(ROOT)).replace("\\", "/"),
            "lang": output.parent.name,
            "figure_no": figure_no,
            "requirement_id": requirement_id,
            "title_en": title_en,
            "title_zh": title_zh,
            "data_keys": data_keys,
            "page_sections": ["industry_section_outputs"],
            "claim_status": "partial_evidence_bounded",
            "can_claim_requirement_complete": False,
            "static_sync_can_claim_complete": True,
            "audit_boundary_en": "Generated from GB/T 4754-2017 section-level outputs; review data remain excluded from accepted-flow charts.",
            "audit_boundary_zh": "基于 GB/T 4754-2017 门类层级输出生成；review 数据不进入 accepted 流量图。",
            "bytes": output.stat().st_size,
            "sha256": sha256(output),
        })
    manifest["generated_at"] = datetime.now(UTC).replace(microsecond=0).isoformat()
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")


def main() -> None:
    outputs = [render_sankey(lang) for lang in ("zh", "en")]
    outputs += [render_emissions(lang) for lang in ("zh", "en")]
    update_manifest(outputs)
    for output in outputs:
        print(f"Wrote {output.relative_to(ROOT)}")
    print(f"Updated {MANIFEST.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
