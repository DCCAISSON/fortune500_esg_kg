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
    section_total = {str(row["industry_section_code"]): 0 for row in sections}
    standard_total = {str(row["internal_standard_id"]): 0 for row in registry}
    for row in links:
        count = int(row["accepted_link_count"])
        section_total[str(row["industry_section_code"])] += count
        standard_total[str(row["internal_standard_id"])] += count
    left_sections = [row for row in sections[::2] if section_total[str(row["industry_section_code"])] > 0]
    right_sections = [row for row in sections[1::2] if section_total[str(row["industry_section_code"])] > 0]
    visible_section_count = len(left_sections) + len(right_sections)
    image = Image.new("RGB", (2600, 1680), PALETTE["bg"])
    draw = ImageDraw.Draw(image)
    rounded(draw, (34, 34, 2566, 1646), PALETTE["paper"])
    title = "\u4e09\u5957\u6807\u51c6\u4f53\u7cfb\u4e0e\u56fd\u6c11\u7ecf\u6d4e\u884c\u4e1a\u95e8\u7c7b\u5206\u680f\u5173\u8054\u56fe" if lang == "zh" else "GHGP, ISO, and GB/T Standards by Split Industry Sections"
    note = f"\u4ec5\u5c55\u793a\u5b58\u5728\u5df2\u91c7\u4fe1\u4f01\u4e1a-\u6807\u51c6\u5173\u7cfb\u7684 {visible_section_count} \u4e2a GB/T 4754-2017 \u884c\u4e1a\u95e8\u7c7b\uff0c0 \u503c\u95e8\u7c7b\u5df2\u7701\u7565\uff1b\u4e2d\u95f4\u4fdd\u7559\u9700\u6c42\u65b9\u6307\u5b9a\u7684 {len(registry)} \u4e2a\u5177\u4f53\u6807\u51c6\u8282\u70b9\u3002\u7ebf\u5bbd\u6309\u5df2\u91c7\u4fe1\u5173\u7cfb\u6570\u8ba1\u7b97\u3002" if lang == "zh" else f"Only the {visible_section_count} GB/T 4754-2017 industry sections with accepted company-standard relationships are shown; zero-value sections are omitted. The {len(registry)} requested standard nodes remain in the middle. Line width represents accepted relationship count."
    draw.text((82, 72), title, font=font(44, True), fill=PALETTE["ink"])
    text(draw, (84, 135), note, 24, PALETTE["muted"], 2220)
    column_labels = ("\u884c\u4e1a\u95e8\u7c7b\uff08\u5de6\uff09", "\u5177\u4f53\u6807\u51c6", "\u884c\u4e1a\u95e8\u7c7b\uff08\u53f3\uff09") if lang == "zh" else ("Industry sections (left)", "Specific standard", "Industry sections (right)")
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
    standard_span = max(standard_h, (len(registry) - 1) * standard_step + standard_h)
    left_codes = {str(row["industry_section_code"]) for row in left_sections}
    section_y = {}
    for side_sections in (left_sections, right_sections):
        section_step = 0 if len(side_sections) == 1 else round((standard_span - section_h) / (len(side_sections) - 1))
        section_span = (len(side_sections) - 1) * section_step + section_h
        section_top = standard_top + (standard_span - section_span) // 2
        section_y.update({str(row["industry_section_code"]): section_top + index * section_step for index, row in enumerate(side_sections)})
    standard_y = {str(row["internal_standard_id"]): standard_top + index * standard_step for index, row in enumerate(registry)}
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
            rounded(draw, (x1, y, x2, y + section_h), PALETTE["bg"])
            text(draw, (x1 + 18, y + 7), f"{code} {name}", 14, PALETTE["ink"], x2 - x1 - 112, True)
            count_label = f"{section_total[code]} \u6761" if lang == "zh" else str(section_total[code])
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
    footer = f"\u5df2\u91c7\u4fe1\u5173\u7cfb {sum(standard_total.values())} \u6761 | \u5177\u4f53\u6807\u51c6 {len(registry)} \u4e2a | \u5c55\u793a\u884c\u4e1a\u95e8\u7c7b {visible_section_count} \u4e2a\uff08\u5de6 {len(left_sections)} / \u53f3 {len(right_sections)}\uff09" if lang == "zh" else f"Accepted relationships: {sum(standard_total.values())} | standards: {len(registry)} | visible industry sections: {visible_section_count} (left {len(left_sections)} / right {len(right_sections)})"
    draw.text((690, 1567), footer, font=font(19, True), fill=PALETTE["muted"])
    out = FIGURES / lang / "world500_standard_industry_section_sankey.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    image.save(out)
    return out


def render_emissions(lang: str) -> Path:
    rows = [row for row in read_rows("world500_emissions_industry_section_scope_summary") if int(row["published_company_count"]) > 0]
    image = Image.new("RGB", (2400, 1520), PALETTE["bg"])
    draw = ImageDraw.Draw(image)
    rounded(draw, (34, 34, 2366, 1486), PALETTE["paper"])
    title = "按 GB/T 4754-2017 门类汇总的 Scope 1/2/3 排放量与缺失企业数" if lang == "zh" else "Scope 1/2/3 Emissions and Missing-Closure Counts by GB/T 4754-2017 Section"
    note = "该图不代表所有企业排放量；排放条只汇总 27 家完整 Scope 1 + selected Scope 2 + Scope 3 闭环企业。未闭合企业 324 家按行业列出。" if lang == "zh" else "This is not an all-company emissions total. Bars sum only the 27 complete Scope 1 + selected Scope 2 + Scope 3 companies; 324 missing-closure companies are listed by industry."
    draw.text((82, 72), title, font=font(42, True), fill=PALETTE["ink"])
    text(draw, (84, 132), note, 24, PALETTE["muted"], 1900)
    max_total = max(float(row["complete_total_mtco2e"]) for row in rows) or 1
    headers = ("行业门类", "完整 Scope 排放量 MtCO2e", "完整/正式", "未闭合") if lang == "zh" else ("Industry section", "Complete Scope emissions MtCO2e", "Complete / published", "Missing")
    for x, header in zip((88, 642, 1780, 2050), headers, strict=True):
        draw.text((x, 218), header, font=font(20, True), fill=PALETTE["muted"])
    for index, row in enumerate(sorted(rows, key=lambda item: float(item["complete_total_mtco2e"]), reverse=True)):
        y = 270 + index * 82
        label = f"{row['industry_section_code']} {row['industry_section_name_zh' if lang == 'zh' else 'industry_section_name_en']}"
        text(draw, (88, y), str(label), 20, PALETTE["ink"], 520, True)
        scale = 980 / max_total
        parts = [
            ("complete_scope1_mtco2e", PALETTE["ghg"]),
            ("complete_scope2_selected_mtco2e", PALETTE["iso"]),
            ("complete_scope3_mtco2e", PALETTE["warn"]),
        ]
        cursor = 642
        for key, color in parts:
            value = float(row[key])
            width = max(3, int(value * scale)) if value else 0
            if width == 0:
                continue
            draw.rounded_rectangle((cursor, y + 4, cursor + width, y + 38), radius=12, fill=color)
            cursor += width
        total_label = f"{float(row['complete_total_mtco2e']):,.1f}"
        draw.text((1640, y + 4), total_label, font=font(18, True), fill=PALETTE["ink"])
        draw.text((1780, y + 4), f"{row['complete_comparable_company_count']} / {row['published_company_count']}", font=font(21, True), fill=PALETTE["ink"])
        draw.text((2050, y + 4), str(row["missing_total_emissions_company_count"]), font=font(21, True), fill=PALETTE["warn"])
    legend = [("Scope 1", PALETTE["ghg"]), ("selected Scope 2", PALETTE["iso"]), ("Scope 3", PALETTE["warn"])]
    for index, (label, color) in enumerate(legend):
        x = 88 + index * 290
        draw.rounded_rectangle((x, 1370, x + 34, 1404), radius=9, fill=color)
        draw.text((x + 46, 1372), label, font=font(20, True), fill=PALETTE["ink"])
    out = FIGURES / lang / "world500_emissions_industry_section_ranking.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    image.save(out)
    return out


def update_manifest(outputs: list[Path]) -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    source_path = ROOT / str(manifest.get("source", ""))
    if source_path.exists():
        manifest["source_sha256"] = sha256(source_path)
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
