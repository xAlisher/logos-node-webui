# Logos Design System — Web (CSS) Implementation Spec

Extracted verbatim from the canonical Logos Design System QML source so a web replica of
the Logos node UI matches the official app pixel-for-pixel.

**Sources (read-only):**
- `~/basecamp/refs/logos-design-system/src/qml/Logos/Theme/*` — tokens (single source of truth)
- `~/basecamp/refs/logos-design-system/src/qml/Logos/Controls/*` — component definitions
- `/extra/tmp/logos-blockchain-ui-official/src/qml` — the node UI that consumes the DS
- `bcui-0.3-base/prototype/{ds-additions,missing-components}.md` — gap/addition notes

**Fidelity notes (read before implementing):**
- **The node UI ships only the DARK theme.** `Theme.qml` hard-defaults `theme: "dark"`;
  `availableThemes` contains `dark` only (light is a commented-out stub). The raw palette holds
  light greys (`gray50`–`gray200`) but **no light semantic theme is defined**. A dark-only
  `:root` is therefore correct; an optional light-override block is included but is a reconstruction,
  not a DS-defined theme — do not treat it as authoritative.
- **Accent is ORANGE, not `#ff0079`.** The string `#ff0079` appears nowhere in the DS, the official
  UI, or the prototype. The brand/primary accent is `orange300 #ED7B58`, with `focus = orange400 #FF8800`
  and the vivid `orange500 #F55702` used on hover. Full orange ramp is in the palette below.
- The official node UI consumes DS tokens faithfully — a repo-wide scan found **one** hardcoded hex
  (`#FFFFFF`) and otherwise 100% `Theme.palette.* / spacing.* / typography.*` references. Matching the
  tokens below reproduces the app.
- QML `Text` has **no line-height tokens**; it renders at the font's natural leading (~1.2–1.25).
  Use `line-height: 1.25` as the web default unless a component says otherwise.

---

## 1. CSS Custom Properties (paste-ready)

```css
:root {
  /* ============================================================
     RAW PALETTE (design tokens — single source of truth)
     Named exactly as ColorPalette.qml. Prefer the SEMANTIC
     tokens below for component work; these are the primitives.
     ============================================================ */
  --color-white: #FFFFFF;
  --color-white-06: rgba(255, 255, 255, 0.06);
  --color-white-63: rgba(255, 255, 255, 0.63);
  --color-black: #000000;
  --color-black-10: rgba(0, 0, 0, 0.10);

  /* Greys */
  --gray-50:  #FAFAFA;
  --gray-100: #EBEBEB;
  --gray-200: #D9D9D9;
  --gray-300: #434343;
  --gray-320: #343434;
  --gray-330: #333333;
  --gray-340: #2F2F2F;
  --gray-350: #515151;
  --gray-355: #595959;
  --gray-360: #232323;
  --gray-370: #1F1F1F;
  --gray-390: #A9A9A9;
  --gray-400: #A4A4A4;
  --gray-500: #969696;
  --gray-550: #808080;
  --gray-600: #717784;
  --gray-700: #5C5C5C;
  --gray-800: #2B303B;
  --gray-850: #262626;
  --gray-875: #1C1C1C;
  --gray-900: #171717;
  --gray-925: #141414;
  --gray-950: #0E121B;
  --gray-975: #101214;
  --gray-550-07: rgba(128, 128, 128, 0.07);
  --gray-550-20: rgba(128, 128, 128, 0.20);
  --gray-550-30: rgba(128, 128, 128, 0.30);

  /* Orange (primary / accent ramp) */
  --orange-300: #ED7B58;   /* primary / accentOrange */
  --orange-350: #FF6F42;   /* accentOrangeMid */
  --orange-400: #FF8800;   /* focus */
  --orange-450: #FF4911;   /* accentOrangeDeep */
  --orange-500: #F55702;   /* primaryHover */
  --orange-600: #F57A02;   /* primaryPressed */
  --orange-700: #BF5104;   /* accentBurntOrange */
  --orange-400-30: rgba(255, 136, 0, 0.30);

  --peach-100: #FFD5C0;    /* primarySoft */

  /* Red (error) */
  --red-400: #FF736A;
  --red-500: #FB3748;
  --red-600: #F44336;
  --red-700: #DC2626;

  /* Yellow (warning) */
  --yellow-300: #EEF083;   /* accentYellowSoft */
  --yellow-400: #FEBC2E;
  --yellow-500: #FFA726;

  /* Green (success) */
  --green-400: #6CCC93;
  --green-500: #49F563;
  --green-600: #19C332;
  --green-700: #16A34A;
  --green-800: #15803D;

  /* Blue (info) */
  --blue-400: #4A90E2;
  --blue-500: #3578C7;
  --blue-600: #2563EB;
  --blue-700: #1D4ED8;

  /* Cyan */
  --cyan-400: #29B6F6;
  --cyan-500: #0284C7;

  /* ============================================================
     SEMANTIC TOKENS (DarkTheme.qml) — USE THESE in components
     ============================================================ */
  /* Backgrounds & surfaces */
  --background:            var(--gray-900);        /* #171717 — app/page base */
  --background-secondary:  var(--gray-850);        /* #262626 — inputs, raised panels */
  --background-tertiary:   var(--gray-875);        /* #1C1C1C */
  --background-elevated:   var(--gray-950);        /* #0E121B — e.g. input border */
  --background-muted:      var(--gray-550-07);     /* rgba(128,128,128,.07) */
  --background-black:      var(--color-black);     /* #000000 */
  --background-inset:      var(--gray-925);        /* #141414 */
  --background-button:     var(--gray-340);        /* #2F2F2F — default button/combobox fill */
  --surface:               var(--gray-320);        /* #343434 — card/frame fill */
  --surface-raised:        var(--gray-360);        /* #232323 */
  --surface-recessed:      var(--gray-370);        /* #1F1F1F */
  --surface-contrast:      var(--gray-355);        /* #595959 */

  /* Text */
  --text:             var(--color-white);          /* #FFFFFF — primary text */
  --text-secondary:   var(--gray-400);             /* #A4A4A4 — labels, table headers */
  --text-subtle:      var(--gray-390);             /* #A9A9A9 */
  --text-tertiary:    var(--gray-500);             /* #969696 — placeholders, icons */
  --text-placeholder: var(--gray-600);             /* #717784 */
  --text-muted:       var(--gray-700);             /* #5C5C5C — disabled text */

  /* Borders */
  --border:                var(--gray-300);        /* #434343 — default border */
  --border-secondary:      var(--gray-800);        /* #2B303B */
  --border-tertiary:       var(--gray-500);        /* #969696 */
  --border-tertiary-muted: rgba(150, 150, 150, 0.20); /* gray500 @ .20 — table row divider, scrollbar */
  --border-subtle:         var(--gray-330);        /* #333333 */
  --border-hairline:       var(--gray-550-20);     /* rgba(128,128,128,.20) */
  --border-interactive:    var(--gray-300);        /* #434343 */
  --border-dark:           var(--gray-340);        /* #2F2F2F */
  --border-strong:         var(--gray-350);        /* #515151 — icon buttons, paginator */

  /* Primary / accent */
  --primary:         var(--orange-300);            /* #ED7B58 */
  --primary-hover:   var(--orange-500);            /* #F55702 */
  --primary-pressed: var(--orange-600);            /* #F57A02 */
  --primary-soft:    var(--peach-100);             /* #FFD5C0 */

  /* Semantic states */
  --success:         var(--green-500);             /* #49F563 */
  --success-hover:   var(--green-400);             /* #6CCC93 */
  --success-pressed: var(--green-600);             /* #19C332 */
  --error:           var(--red-500);               /* #FB3748 */
  --error-hover:     var(--red-400);               /* #FF736A */
  --error-pressed:   var(--red-600);               /* #F44336 */
  --warning:         var(--yellow-400);            /* #FEBC2E */
  --warning-hover:   var(--yellow-500);            /* #FFA726 */
  --info:            var(--blue-400);              /* #4A90E2 */
  --notification:    var(--red-500);               /* #FB3748 */

  /* Accent variants */
  --accent-orange:       var(--orange-300);        /* #ED7B58 */
  --accent-orange-mid:   var(--orange-350);        /* #FF6F42 */
  --accent-orange-deep:  var(--orange-450);        /* #FF4911 */
  --accent-burnt-orange: var(--orange-700);        /* #BF5104 */
  --accent-yellow-soft:  var(--yellow-300);        /* #EEF083 */

  /* Interaction states */
  --hover:    var(--gray-700);                     /* #5C5C5C */
  --pressed:  var(--gray-850);                     /* #262626 */
  --disabled: var(--gray-500);                     /* #969696 */
  --focus:    var(--orange-400);                   /* #FF8800 */

  /* Overlays / glass */
  --glass-overlay: var(--gray-550-07);             /* rgba(128,128,128,.07) */
  --glass-strong:  var(--gray-550-30);             /* rgba(128,128,128,.30) */
  --overlay-dark:  rgba(28, 28, 28, 0.30);         /* gray875 @ .30 */
  --overlay-light: var(--color-white-06);          /* rgba(255,255,255,.06) */
  --overlay-orange: var(--orange-400-30);          /* rgba(255,136,0,.30) — focus ring on inputs/buttons */

  /* ============================================================
     SPACING  (Spacing.qml)
     ============================================================ */
  --space-tiny:   4px;
  --space-small:  8px;
  --space-medium: 12px;
  --space-large:  16px;
  --space-xlarge: 20px;
  --space-xxlarge: 40px;

  /* ============================================================
     RADII  (Spacing.qml)
     ============================================================ */
  --radius-small:  4px;
  --radius-medium: 6px;
  --radius-large:  8px;
  --radius-xlarge: 16px;
  --radius-pill:   999px;

  /* Border widths — the DS uses 1px everywhere; tab indicator 3px. */
  --border-width: 1px;

  /* ============================================================
     TYPOGRAPHY  (Typography.qml)
     ============================================================ */
  --font-sans: "Public Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: "Public Sans Mono", ui-monospace, "SF Mono", "Roboto Mono", "DejaVu Sans Mono", monospace;

  --weight-regular: 400;
  --weight-medium:  500;
  --weight-bold:    700;

  /* Type scale (px) — names match Theme.typography.* */
  --text-main-title:  256px;  /* mainTitleText  — splash / marketing only */
  --text-page-title:  36px;   /* pageTitleText  — page-level headline */
  --text-title:       30px;   /* titleText      — section / dialog title */
  --text-panel-title: 24px;   /* panelTitleText — panel / table title */
  --text-subtitle:    16px;   /* subtitleText   — page subtitle / lead body */
  --text-primary:     14px;   /* primaryText    — DEFAULT body text */
  --text-secondary:   12px;   /* secondaryText  — caption / small / most control labels */
  --text-badge:       8px;    /* badgeText      — tiny */

  --line-height: 1.25;        /* web default (QML Text has no line-height token) */
}
```

### Optional light-theme override (RECONSTRUCTED — not DS-defined)

The DS defines no light semantic theme. The node UI is dark-only. Only add this if a web-only light
mode is explicitly wanted; values are a best-effort inversion using the palette's light greys, **not**
canonical. Guard it so dark stays the default.

```css
:root:not([data-theme="dark"]) {
  @media (prefers-color-scheme: light) {
    --background:           var(--gray-50);    /* #FAFAFA */
    --background-secondary: var(--color-white);
    --surface:              var(--color-white);
    --surface-raised:       var(--gray-50);
    --text:                 var(--gray-900);   /* #171717 */
    --text-secondary:       var(--gray-700);
    --text-tertiary:        var(--gray-550);
    --border:               var(--gray-200);   /* #D9D9D9 */
    --border-subtle:        var(--gray-100);
    /* primary/semantic accents unchanged */
  }
}
```

---

## 2. Typography & font sourcing

**Family:** **Public Sans** (US Government open-source grotesque; SIL OFL 1.1).
The DS bundles three static TTFs and loads them via QML `FontLoader`:
- `Logos/Theme/fonts/PublicSans-Regular.ttf` → weight 400
- `Logos/Theme/fonts/PublicSans-Medium.ttf`  → weight 500
- `Logos/Theme/fonts/PublicSans-Bold.ttf`    → weight 700

`Typography.publicSans` resolves to the loaded font name, **falling back to `sans-serif`** if loading
fails — so `sans-serif` is the canonical fallback.

**How to load on the web** (pick one):

1. **Google Fonts (simplest):** Public Sans is on Google Fonts.
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
   <link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;700&display=swap" rel="stylesheet">
   ```
2. **Self-host the exact bundled TTFs** (byte-identical to the app) — copy the three files above and:
   ```css
   @font-face { font-family:"Public Sans"; font-weight:400; font-style:normal;
     src:url("/fonts/PublicSans-Regular.ttf") format("truetype"); font-display:swap; }
   @font-face { font-family:"Public Sans"; font-weight:500; font-style:normal;
     src:url("/fonts/PublicSans-Medium.ttf") format("truetype"); font-display:swap; }
   @font-face { font-family:"Public Sans"; font-weight:700; font-style:normal;
     src:url("/fonts/PublicSans-Bold.ttf") format("truetype"); font-display:swap; }
   ```
   Self-hosting is the higher-fidelity choice (the app uses these exact static instances, not the
   variable font Google serves).

**Monospace:** `Theme.typography.mono` is referenced by the node UI (hashes, Peer IDs, addresses,
prettified JSON — `HashRow`, `LinkRow`, `JsonBlock`, `ConfigUpgradeDialog`, `PowAutoClaimTargets`) but
is **not present in the checked-out DS master** (it is an addition in the DS pin the UI uses; the
prototype notes flag `mono` as a gap being promoted). **No mono TTF is bundled.** Use a monospace stack
(`--font-mono`) for any hash/ID/amount/JSON rendering. If a specific mono lands in the DS later, swap
`--font-mono` to match.

**Type scale** (all weights: 400 regular / 500 medium / 700 bold):

| Token (`typography.*`) | px  | Typical use                                   |
|------------------------|-----|-----------------------------------------------|
| `mainTitleText`        | 256 | splash / marketing only                       |
| `pageTitleText`        | 36  | page-level headline                           |
| `titleText`            | 30  | section / dialog title                        |
| `panelTitleText`       | 24  | panel / table title                           |
| `subtitleText`         | 16  | page subtitle / lead body                     |
| `primaryText`          | 14  | **default body text**, table cells, tab labels|
| `secondaryText`        | 12  | captions, placeholders, most control labels   |
| `badgeText`            | 8   | tiny text                                     |

Note: the DS's default body text is **14px** (`primaryText`); most controls label at **12px**
(`secondaryText`). Badges render at **11px** uppercase (component-local override, see Badge).

---

## 3. Component catalog

All geometry/colors below are the exact QML values. Default web `box-sizing: border-box`,
`border: 1px solid` where a border is specified, `font-family: var(--font-sans)`.
Transitions: DS animates color over **120ms**, switch handle/tab-indicator slide **120–200ms**.

### Text (`LogosText`)
Base text element. Defaults: `font: var(--font-sans)`, `font-size: var(--text-primary)` (14px),
`font-weight: var(--weight-regular)`, `color: var(--text)`.

### Button (`LogosButton`)
The checked-out master ships a **single neutral (secondary) style** — no color variants. (A `primary`
accent variant is noted as an addition in the UI's DS pin; the prototype's ds-additions proposes a
brighter primary + a `compact` size. Implement the neutral style as the base; add a primary via
`--primary` if your UI needs a CTA.)

- **Anatomy:** rounded rect, 1px border, centered label.
- **Size:** `min-width: 200px` (implicit; shrinks with content in layouts), `height: 50px`
  (`implicitHeight`). `border-radius: var(--radius-xlarge)` (16px).
- **Label:** `font-size: var(--text-secondary)` (12px), `font-weight: var(--weight-medium)` (500),
  centered.
- **States:**
  | State    | background            | border               | text          |
  |----------|-----------------------|----------------------|---------------|
  | default  | `--background-secondary` | `--border`        | `--text`      |
  | hover / active (pressed) | `--background-muted` | `--overlay-orange` | `--text` |
  | disabled | `--background-muted`  | `--border`           | `--text-muted`|
- `cursor: pointer` when enabled. (Hover and pressed share the same look — `isActive = hovered || pressed`.)

> Prototype addition (not yet in master): **primary/CTA** = fill `--primary`, text `--text`;
> **compact size** ≈ 32–36px height, 8/6 padding, lower min-width, label still 12px.

### Icon button (`LogosIconButton`)
Circular icon chip.
- **Size:** `40×40px` default (`size`); icon `20×20px` (`iconSize`).
- **Shape:** `border-radius: var(--radius-pill)` (999px → circle), `border: 1px solid var(--border-strong)`.
- **Background:** `var(--background-button)` (#2F2F2F).
- **Icon tint:** `var(--text-tertiary)` (#969696) by default (recolored, see Icon).
- **Disabled:** `opacity: 0.4`. `cursor: pointer` when enabled.
- Used bare (`background: none`) inside the Paginator.

### Icon (`LogosIcon`)
Icons are monochrome silhouettes **recolored at render** (QML `MultiEffect` colorization). On the web,
use inline SVG with `fill: currentColor` (or a CSS mask) so you can tint via `color`.
- Default size `20×20px`; default tint `var(--text)`. Pass any token color to tint.

### Text field (`LogosTextField`)
- **Size:** `width: 200px` (implicit), `height: 40px`. `padding: 0 12px`.
- **Shape:** `border-radius: var(--radius-small)` (4px), `border: 1px solid`.
- **Background:** `var(--background-secondary)` (#262626).
- **Border:** default `var(--background-elevated)` (#0E121B); **focus** `var(--overlay-orange)`
  (rgba(255,136,0,.30)).
- **Text:** `font-size: var(--text-secondary)` (12px), `color: var(--text)`.
- **Placeholder:** `var(--text-tertiary)` (#969696), 12px.

### Text area (`LogosTextArea`)
- **Background:** `var(--background-secondary)`; `border-radius: var(--radius-small)` (4px), 1px border.
- **Border:** default `var(--border)`; **focus** `var(--primary)`.
- **Padding:** `8px 12px` (top/bottom `small`, left/right `medium`).
- **Text:** `var(--font-sans)`, 14px (`primaryText`), `color: var(--text)`; placeholder `var(--text-tertiary)`.
- `white-space: pre-wrap` (wrap on).

### Search bar (`LogosSearchBar`)
- **Size:** `width: 400px` (implicit), `height: 54px`. Padding `8px 8px 8px 10px`.
- **Shape:** `border-radius: var(--radius-large)` (8px), 1px border.
- **Background:** `var(--background)` (#171717).
- **Border:** default `var(--border-subtle)` (#333333); **focus** `var(--primary)`.
- **Layout:** leading 20×20 search icon tinted `var(--text-secondary)`, then field (inherits
  TextField text/placeholder styles, placeholder "Search..."), then optional trailing shortcut chip.
- **Shortcut chip:** `height: 20px`, bg `var(--surface-raised)`, `border-radius: var(--radius-small)`,
  1px `var(--border-subtle)`; label 12px/500 `var(--text-secondary)`, horizontal padding 12px.

### Select / dropdown (`LogosComboBox`)
- **Closed control:** `height: 32px`. `border-radius: var(--radius-small)` (4px), 1px border.
  Text padding-left `10px` (medium−2), padding-right makes room for the chevron (~`indicator.width + 10`).
- **Background:** enabled `var(--background-button)` (#2F2F2F); **pressed** `var(--pressed)` (#262626);
  disabled `var(--background-secondary)`.
- **Border:** enabled `var(--border)`; disabled `var(--border-subtle)`.
- **Displayed value:** 12px, `var(--text)`; when showing placeholder → `var(--text-tertiary)`;
  disabled → `var(--text-muted)`. `text-overflow: ellipsis`.
- **Chevron:** 20×20 arrow rotated to point down, tinted `var(--text)` (or `--text-muted` disabled).
- **Popup:** offset `2px` below; bg `var(--background-secondary)`, 1px `var(--border)`,
  `border-radius: var(--radius-small)`, `padding: 1px`.
- **Option row (delegate):** 12px `var(--text)`; **highlighted** bg `var(--surface)` (#343434), else transparent.

### Card / panel / frame (`LogosFrame`)
The node UI's card/surface primitive.
- **Background:** `var(--surface)` (#343434).
- **Border:** 1px `var(--border)` (#434343).
- **Radius:** `var(--radius-small)` (4px).
- **Padding:** `var(--space-medium)` (12px).
> (The DS has no shadow/elevation tokens — surfaces are distinguished by the `surface` / `surface-raised`
> / `surface-recessed` / `background-*` fills, not drop shadows. `LogosFrame` has a shadow/layer effect
> in QML that the node UI leaves at default; replicate with **no** box-shadow unless you add one deliberately.)

### Group box (`LogosGroupBox`)
Titled bordered container.
- **Border:** 1px `var(--border)`, `border-radius: var(--radius-small)` (4px), transparent fill.
- **Padding:** 12px; inner `spacing: 8px`.
- **Label:** sits on the top edge, left-inset 12px; 12px (`secondaryText`), **700**,
  `color: var(--text-secondary)`.

### Table (`LogosTable`)
- **Row height:** `64px` (`rowHeight`); **header height:** `36px` (`headerHeight`).
- **Cell padding (horizontal):** `var(--space-medium)` (12px) each side (`defaultCellPadding`).
- **Header bar:** bg `var(--background-button)` (#2F2F2F), `border-radius: var(--radius-large)` (8px);
  each header cell overlaid with `rgba(20,20,20,0.6)` (`backgroundInset` @ .6).
- **Header text:** 12px (`secondaryText`), 500, `color: var(--text-secondary)`; `text-overflow: ellipsis`.
- **Sort affordance:** stacked up/down triangles (12×8 each) beside the title; active direction
  `opacity: 1.0`, inactive `opacity: 0.35`.
- **Body cell text:** 14px (`primaryText`), `color: var(--text)`; align per column.
- **Row divider:** bottom `1px solid var(--border-tertiary-muted)` (rgba(150,150,150,.20)).
- **Selection column** (optional): 40px wide, holds a `LogosCheckbox`; Multi mode adds a header select-all.
- **Empty state:** centered text 14px `var(--text-secondary)`. **Loading:** centered `LogosSpinner`.
- **Scrollbars:** `AsNeeded` (see ScrollBar).

### Badge / pill (`LogosBadge`)
- **Anatomy:** small rounded rect, optional 12×12 leading icon, uppercase label.
- **Shape:** `border-radius: var(--radius-small)` (4px), 1px border. Padding `4px 8px` (tiny vert / small horiz).
- **Color model (default `accentOrange` #ED7B58):** `--color` drives text + border; background is
  `--color` at **18% alpha**. Pass a semantic token to recolor (e.g. success/warning/error).
- **Label:** `font-size: 11px`, `font-weight: 500`, `letter-spacing: 0.22px`, `text-transform: uppercase`,
  `color: var(--color)`. Icon gap 4px.
- **Status pill (node-UI pattern, proposed DS variant):** a dot + label colored by state —
  green `--success` online, orange/`--primary` bootstrapping, yellow `--warning` starting, red `--error`.

### Tabs (`LogosTabBar` + `LogosTabButton`)
- **Tab button:** `height: 40px`, padding `4px 8px`, icon–label gap `6px`, icon `20×20`.
- **Label:** 14px (`primaryText`), 500. Color: **active** `var(--primary)`, **inactive**
  `var(--text-tertiary)` (#969696). Icon tinted to match.
- **Indicator (underline):** `height: 3px`, color `var(--primary)`, `border-radius: 1.5px`, sits on the
  bottom edge of the active tab; slides with `200ms ease-out` (`Easing.OutCubic`).
- Tab bar background is transparent.
> Prototype addition (not in master): shrink tab label to 12px (`secondaryText`).

### Toggle / switch (`LogosSwitch`)
- **Track:** `36×20px`, `border-radius: 10px` (height/2), 1px `var(--border)`.
  **On** fill `var(--primary)`; **off** fill `var(--surface)` (#343434). Color transition 120ms.
- **Handle:** circle `16×16px` (track height − 4), `var(--text)` (white), inset 2px; slides left↔right
  over 120ms.
- **Label:** `var(--text)` (enabled) / `var(--text-muted)` (disabled), gap 8px.
- **Disabled:** `opacity: 0.5`.

### Checkbox (`LogosCheckbox`)
- **Box:** `24×24px`; outer ring `var(--border)`, inner box `var(--radius-small)` corners.
  **Checked** inner fill `var(--primary)`; **unchecked** `var(--surface)`.
- **Checkmark:** stroke `var(--text)` (white), rounded caps.
- **Label:** 14px (`primaryText`), `var(--text)` / `var(--text-muted)` disabled, gap 8px.
- **Disabled:** `opacity: 0.5`. Padding 4px.

### Radio (`LogosRadioButton`)
- **Dot:** outer circle `18×18px`, 1px border — `var(--primary)` when checked, else `var(--border)`;
  fill `var(--surface)`. **Checked** inner dot `8×8px` `var(--primary)`.
- **Label:** `var(--text)` / `var(--text-muted)` disabled, gap 8px. **Disabled:** `opacity: 0.5`.

### Slider (`LogosSlider`)
- **Track:** `height: 4px`, `border-radius: 2px`, `var(--background-secondary)` (#262626).
- **Fill:** `var(--primary)`, 4px, radius 2px.
- **Handle:** circle `18×18px`, `var(--primary)`, 1px `var(--border)`; **pressed** `var(--primary-pressed)`.

### Progress bar (`LogosProgressBar`)
- **Size:** `width: 200px` (implicit), `height: 8px`.
- **Track:** `var(--background-secondary)`, `border-radius: 4px` (height/2).
- **Fill:** `var(--primary)`, full-height, radius 4px. Indeterminate = a 30%-width bar sliding
  across (1200ms each way).

### Spinner (`LogosSpinner`)
- **Size:** `36×36px` default. A ring (`border: 3px solid var(--text)`, circular) with a `6px` dot
  on top, the whole ring rotating 360° over **1000ms**, infinite.
- CSS: `border-radius: 50%`, `border: 3px solid var(--text)` + a rotating conic/dot, `animation: spin 1s linear infinite`.

### Dialog / modal (`LogosDialog`)
- **Panel:** bg `var(--background-secondary)` (#262626), 1px `var(--border)`,
  `border-radius: var(--radius-large)` (8px), `padding: var(--space-large)` (16px). Modal (dim backdrop).
- **Header/title:** 14px (`primaryText`), **700**, `var(--text)`; padding `16px 16px 8px`.
- **Footer:** left-aligned actions + right-aligned actions row, inset 16px l/r, top 12px, bottom 16px,
  button gap 8px. Hidden when no actions.

### Menu (`LogosMenu` / `LogosMenuItem`)
- **Menu item:** `height: 32px`, label padding l/r 12px, 14px `var(--text)` (`var(--text-muted)` disabled).
  **Highlighted** bg `var(--surface)` (#343434), `border-radius: var(--radius-small)`, else transparent.

### Tooltip (`LogosToolTip`)
- **Bubble:** bg `var(--background-secondary)`, `border-radius: var(--radius-small)` (4px).
  Padding `2px 6px` (vert/horiz), `min-height: 20px`. Directional 45°-rotated square tail on the
  pointing edge.
- **Text:** `var(--font-sans)`, **700**, 12px (`secondaryText`), color = `var(--text)` at **60% alpha**
  (`rgba(255,255,255,0.6)`).
- **Timing:** `delay: 200ms`, `timeout: 5000ms`.

### Scrollbar (`LogosScrollBar`)
- **Thickness:** `6px`, `border-radius: 3px`.
- **Color:** idle `var(--border-tertiary-muted)` (rgba(150,150,150,.20)); **hover/pressed**
  `var(--text-tertiary)` (#969696). Color transition 120ms. Transparent track. Policy AsNeeded.

### Paginator (`LogosPaginator`)
- **Row height:** `36px`, item gap 8px.
- **Nav arrows:** bare `LogosIconButton` (36px, no background), icon tint `var(--text)`; disabled at bounds.
- **Page cell:** `36×36px`, `border-radius: var(--radius-large)` (8px).
  **Active:** bg `var(--surface-contrast)` (#595959), no border, text `var(--background-black)` (#000),
  14px/500. **Inactive:** bg `var(--surface-recessed)` (#1F1F1F), 1px `var(--border-strong)` (#515151),
  text `var(--text-muted)`.
- **Info label:** 12px `var(--text-muted)`. **Page-size select:** a `LogosComboBox` styled with
  bg `var(--surface-recessed)`, radius 8px, 1px `var(--border-strong)`.

---

## 4. Node-UI-specific composites (not in DS — hand-rolled / proposed)

The node UI composes these from DS primitives (see `missing-components.md`); replicate with tokens:
- **CopyButton** — small copy-to-clipboard affordance appended to any hash/ID/address/amount.
- **StatCard** — big value → divider → label → optional info "i"; compose from `LogosFrame` + text tokens.
- **KeyValue / HashRow** — label (`--text-secondary`, 12px) + elided-middle **mono** value
  (`--font-mono`, 12px, `--text-tertiary`) + copy button.
- **JsonBlock / LinkRow** — boxed wrapping **mono** text, 12px.
- **Status pill** — `LogosBadge` recolored by node state (see Badge).
- **Toast / error banner** — not designed in DS; use `--error` / `--surface` with 8px radius if needed.

_Extraction date: 2026-10-02. DS source: `logos-design-system` master (`Logos/Theme` + `Logos/Controls`)._
