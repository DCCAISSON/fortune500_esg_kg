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
    title = "\u4e09\u5957\u6807\u51c6\u4f53\u7cfb\u4e0e\u56fd\u6c11\u7ecf\u6d4e\u884c\u4e1a\u95e8\u7c7b\u5206\u680f\u5173\u8054\u56fe" if lang == "zh" else "GHGP, ISO, and GB/T Standards by Split Industry Sections"
    note = "\u5de6\u53f3\u4e24\u4fa7\u5171\u540c\u8986\u76d6 GB/T 4754-2017 \u7684 20 \u4e2a\u884c\u4e1a\u95e8\u7c7b\uff08\u5de6 A-J\uff0c\u53f3 K-T\uff09\uff0c\u4e2d\u95f4\u4e3a 12 \u4e2a\u5177\u4f53\u6807\u51c6\u8282\u70b9\uff1b\u6d41\u91cf\u4e3a accepted \u4f01\u4e1a-\u6807\u51c6\u5173\u8054\u6570\uff0c\u4e0d\u662f\u4f01\u4e1a\u53bb\u91cd\u6570\uff0c\u4e5f\u4e0d\u8868\u793a\u884c\u4e1a\u95f4\u6d41\u52a8\u6216\u56e0\u679c\u5173\u7cfb\u3002" if lang == "zh" else "The two sides jointly cover 20 GB/T 4754-2017 industry sections (left A-J, right K-T). The middle column contains 12 concrete standards. Flow means accepted company-standard association count, not distinct company count or industry-to-industry movement."
    draw.text((82, 72), title, font=font(44, True), fill=PALETTE["ink"])
    text(draw, (84, 135), note, 24, PALETTE["muted"], 2220)
    column_labels = ("\u884c\u4e1a\u95e8\u7c7b A-J\uff08accepted \u5173\u8054\u6570\uff09", "\u5177\u4f53\u6807\u51c6", "\u884c\u4e1a\u95e8\u7c7b K-T\uff08accepted \u5173\u8054\u6570\uff09") if lang == "zh" else ("Industry sections A-J (accepted links)", "Specific standard", "Industry sections K-T (accepted links)")
    for x, label in zip((110, 960, 1970), column_labels, strict=True):
        draw.text((x, 218), label, font=font(26, True), fill=PALETTE["ink"])
    system_colors = {"GHG Protocol": PALETTE["ghg"], "ISO": PALETTE["iso"], "GB/T": PALETTE["gb"]}
    flow_colors = {"GHG Protocol": (47, 111, 99, 92), "ISO": (49, 95, 140, 88), "GB/T": (199, 107, 45, 96)}
    left_x1, left_x2 = 92, 642
    mid_x1, mid_x2 = 930, 1670
    right_x1, right_x2 = 1960, 2510
    section_h, standard_h = 46, 64
    standard_top = 304
    standard_step = 96
    left_sections = sections[:10]
    right_sections = sections[10:]
    standard_span = max(standard_h, (len(registry) - 1) * standard_step + standard_h)
    side_count = max(len(left_sections), len(right_sections), 1)
    section_step = 0 if side_count == 1 else round((standard_span - section_h) / (side_count - 1))
    section_span = (side_count - 1) * section_step + section_h
    section_top = standard_top + (standard_span - section_span) // 2
    left_codes = {str(row["industry_section_code"]) for row in left_sections}
    section_y = {str(row["industry_section_code"]): section_top + index * section_step for index, row in enumerate(left_sections)}
    section_y.update({str(row["industry_section_code"]): section_top + index * section_step for index, row in enumerate(right_sections)})
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
        sy = standard_y[sid] + standard_h // 2
        if code in left_codes:
            start_x, end_x = left_x2, mid_x1
            start_y, end_y = section_y[code] + section_h // 2, sy
        else:
            start_x, end_x = mid_x2, right_x1
            start_y, end_y = sy, section_y[code] + section_h // 2
        points = []
        for step in range(18):
            t = step / 17
            ease = t * t * (3 - 2 * t)
            points.append((round(start_x + (end_x - start_x) * t), round(start_y + (end_y - start_y) * ease)))
        flow_draw.line(points, fill=flow_colors[system], width=width)
    image = Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(image)
    for side_sections, x1, x2 in ((left_sections, left_x1, left_x2), (right_sections, right_x1, right_x2)):
        for row in side_sections:
            code = str(row["industry_section_code"])
            name = str(row["industry_section_name_zh" if lang == "zh" else "industry_section_name_en"])
            y = section_y[code]
            fill = PALETTE["bg"] if section_total[code] else "#fbf7ef"
            rounded(draw, (x1, y, x2, y + section_h), fill)
            text(draw, (x1 + 18, y + 7), f"{code} {name}", 14, PALETTE["ink"], x2 - x1 - 112, True)
            count_label = f"{section_total[code]} \u5173\u8054" if lang == "zh" else f"{section_total[code]} links"
            draw.text((x2 - 104, y + 13), count_label, font=font(15, True), fill=PALETTE["muted"])
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
    footer = f"accepted association links: {sum(standard_total.values())} | standards: 12 | GB/T 4754-2017 sections: 20 (left 10 / right 10)"
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
        "world500_standard_industry_section_sankey.png": ("standard_industry_sankey", "R1_GHG_FINE_SERIES_AND_STANDARD_COMPANY_MAPPING", "GHGP, ISO, and GB/T standards by split industry sections", "GHGP、ISO、GB/T 标准与行业门类分栏关联图", ["standard_industry_sankey_links", "standard_industry_sankey_evidence"]),
        "world500_emissions_industry_section_ranking.png": ("emissions_industry_ranking", "R2_TOTAL_EMISSIONS_RANKING_DESC", "Emissions industry-section ranking", "排放行业门类排行与缺失统计", ["emissions_industry_section_outputs"]),
    }
    boundaries = {
        "standard_industry_sankey": (["industry_section_outputs"], "partial_evidence_bounded", "Generated from accepted company-standard associations split by GB/T 4754-2017 sections; review data remain excluded from accepted-flow charts.", "基于 accepted 企业-标准关联数和 GB/T 4754-2017 门类分栏生成；review 数据不进入 accepted 流量图。"),
        "emissions_industry_ranking": (["industry_section_outputs", "emission-ledger"], "partial_complete_comparable_only", "The industry ranking distinguishes complete comparable companies, available partial totals, and missing complete Scope 1/2/3 closure by industry section.", "行业排行区分完整可比企业、可用 partial 总量以及缺完整 Scope 1/2/3 闭环的行业缺口。"),
    }
    for output in outputs:
        figure_no, requirement_id, title_en, title_zh, data_keys = metadata[output.name]
        page_sections, claim_status, boundary_en, boundary_zh = boundaries[figure_no]
        manifest["figures"].append({
            "file": str(output.relative_to(ROOT)).replace("\\", "/"),
            "lang": output.parent.name,
            "figure_no": figure_no,
            "requirement_id": requirement_id,
            "title_en": title_en,
            "title_zh": title_zh,
            "data_keys": data_keys,
            "page_sections": page_sections,
            "claim_status": claim_status,
            "can_claim_requirement_complete": False,
            "static_sync_can_claim_complete": True,
            "audit_boundary_en": boundary_en,
            "audit_boundary_zh": boundary_zh,
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
