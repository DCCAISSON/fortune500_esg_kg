# Fortune 500 ESG KG Design System

## 1. Atmosphere & Identity

The site should feel like an evidence command room: dense, inspectable, and calm. The signature visual idea is a warm-paper analytical canvas, where relationship strength is shown through line weight and opacity, standard clusters are shown through tinted territories, and company industries are shown through restrained dot colors.

## 2. Color

### Palette

| Role | Token | Light | Usage |
|---|---|---|---|
| Surface/page | `--bg` | `#f4efe5` | Site background |
| Surface/card | `--paper` | `rgba(255,253,248,0.94)` | Cards and panels |
| Text/primary | `--ink` | `#17313e` | Headings and body |
| Text/secondary | `--muted` | `#556b78` | Captions and metadata |
| Border/default | `--line` | `#d8ccba` | Dividers and graph outlines |
| Border/soft | `--border` | `rgba(216,204,186,0.82)` | Card borders |
| Accent/standard | `--accent` | `#c76b2d` | Primary action and standard highlights |
| Accent/evidence | `--accent2` | `#2f6f63` | Accepted evidence and system highlights |
| Accent/deep | `--accent3` | `#8a4f2a` | Hover state |
| Warning | `--warning` | `#d89b3d` | Partial/readiness warning states |
| Danger | `--danger` | `#9b3b2f` | Review, risk, and demotion notices |
| Surface/soft | `--soft` | `#f3ecdf` | Secondary fills |
| Graph canvas | `--graph-canvas` | `#fffdf8` | SVG graph drawing surface |
| Graph grid | `--graph-grid` | `rgba(85,107,120,0.08)` | Low-contrast graph background grid |
| Graph accepted | `--graph-accepted` | `#2f6f63` | Accepted explicit evidence edges |
| Graph review | `--graph-review` | `#9b3b2f` | Review/demoted evidence edges |

### Rules

- Standard colors come from the fixed GHG/standard palette in `assets/js/standard_cluster_full_graph.js`.
- Company node color always represents industry classification.
- Solid lines mean accepted explicit evidence; dashed lines mean review-only relationships.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Usage |
|---|---:|---:|---:|---|
| Display | `clamp(32px,5.2vw,48px)` | 800 | 1.15 | Hero title |
| Section | `28px` | 800 | 1.25 | Section headers |
| Card title | `20px` | 800 | 1.35 | Cards and graph panels |
| Body | `15.5px` | 400 | 1.85 | Long explanatory text |
| Small body | `14px` | 500 | 1.6 | Controls and notes |
| Caption | `12px` | 700 | 1.45 | Metadata and graph chips |

### Font Stack

- Title: `Outfit`, `Inter`, `Microsoft YaHei`, sans-serif.
- Body: `Inter`, `Microsoft YaHei`, sans-serif.
- Numbers use tabular figures where possible.

## 4. Spacing & Layout

### Base Unit

All spacing should use a 4px base.

| Token | Value | Usage |
|---|---:|---|
| Compact | `8px` | Inline badges |
| Default | `16px` | Controls and dense panels |
| Comfortable | `20px` | Cards |
| Section | `32px` | Page shell and graph spacing |
| Major | `64px` | Page-level separation |

### Grid

- Main content max width is normally `1240px`; full-screen graph pages intentionally use `max-width: none`.
- Full graph layout uses a large canvas plus a right evidence panel.
- At narrow widths, graph and evidence panels stack in one column.

## 5. Components

### Full Graph Canvas

- **Structure**: toolbar, SVG canvas, note, side evidence panels.
- **Variants**: GHG fine-series acceptance graph; standard role-family graph.
- **States**: default, hover, active, search match, dimmed, hidden-by-evidence.
- **Accessibility**: SVG has an `aria-label`; nodes are keyboard-focusable groups with visible focus styling.
- **Motion**: transform-only pan and zoom; opacity and filter only for state changes.

### Evidence Card

- **Structure**: report title, page metadata, source snippet, optional caution notice.
- **States**: default and contextual-review notice.
- **Accessibility**: text-first, no icon-only meaning.

## 6. Motion & Interaction

| Type | Duration | Easing | Usage |
|---|---:|---|---|
| Micro | `160ms` | ease-out | Node dimming and label reveal |
| Standard | `200ms` | ease | Buttons and panel hover |
| Canvas | `160ms` | ease-out | Pan/zoom viewport update |

### Rules

- Only animate `transform`, `opacity`, and `filter`.
- Keep the default GHG graph in accepted-evidence mode.
- Do not hide review data from the audit tables; only exclude it from the accepted graph drawing.

## 7. Depth & Surface

### Strategy

Use mixed warm-paper depth: soft tonal surfaces, thin borders, and restrained shadows.

| Level | Value | Usage |
|---|---|---|
| Card | `var(--shadow)` | Evidence panels and graph canvas |
| Hover | `var(--shadow-hover)` | Buttons and result cards |
| Graph glow | tinted drop shadows | Active standard/company emphasis |

### Rules

- Avoid decorative colors that do not encode data.
- Every graph visual cue must explain either node type, evidence strength, standard cluster, or industry.
