# VitalTrack AI — UI Component Library

**Version:** 1.0  
**Alignment:** Apple Human Interface Guidelines (iOS 17+)  
**Related:** [WIREFRAMES.md](WIREFRAMES.md), [INFORMATION_ARCHITECTURE.md](INFORMATION_ARCHITECTURE.md)

Aesthetic direction: **calm teal health** — clinical clarity, soft atmosphere, expressive typography. Avoid purple-on-white “AI slop,” cream-terracotta clichés, and broadsheet sparsity.

> Trust copy appears in components like `VTDisclaimerBanner` and measurement headers: informational only; BP from external monitors; camera/Watch = HR only.

---

## 1. Design tokens

### 1.1 Color — Light

| Token | Value | Usage |
|-------|-------|-------|
| `--vt-bg-canvas` | `#F3F7F6` | App background (soft mint-gray, not flat white alone) |
| `--vt-bg-elevated` | `#FFFFFF` | Elevated surfaces |
| `--vt-bg-subtle` | `#E7F1EF` | Grouped fills |
| `--vt-brand-primary` | `#0F766E` | Teal primary (CTAs, key icons) |
| `--vt-brand-primary-pressed` | `#0B5F58` | Pressed |
| `--vt-brand-secondary` | `#1D4E6B` | Deep blue-teal secondary |
| `--vt-accent-soft` | `#5EEAD4` | Highlights, sparklines (use sparingly) |
| `--vt-text-primary` | `#10221F` | Primary text |
| `--vt-text-secondary` | `#3D5A55` | Secondary |
| `--vt-text-tertiary` | `#6B857F` | Meta |
| `--vt-stroke` | `#C9D9D5` | Separators |
| `--vt-success` | `#2F7D4A` | Success (not “diagnosis green”) |
| `--vt-warning` | `#B7791F` | Validation warnings |
| `--vt-danger` | `#B42318` | Destructive / critical errors |
| `--vt-info` | `#1769AA` | Informational callouts |
| `--vt-disclaimer-bg` | `#E8F0EE` | Disclaimer banner fill |
| `--vt-source-manual` | `#3D5A55` | Source chip |
| `--vt-source-bluetooth` | `#0F766E` | Source chip |
| `--vt-source-healthkit` | `#1769AA` | Source chip |
| `--vt-source-csv` | `#6B857F` | Source chip |
| `--vt-source-ppg` | `#1D4E6B` | HR source chip |

Atmosphere: subtle top-down gradient `canvas → subtle` on Dashboard/hero measurement screens; optional soft radial wash behind metric heroes (low contrast). Prefer real photography of cuffs/Watch in marketing; in-app use restrained illustration.

### 1.2 Color — Dark

| Token | Value |
|-------|-------|
| `--vt-bg-canvas` | `#0B1413` |
| `--vt-bg-elevated` | `#14201E` |
| `--vt-bg-subtle` | `#1C2B28` |
| `--vt-brand-primary` | `#2DD4BF` |
| `--vt-brand-primary-pressed` | `#5EEAD4` |
| `--vt-brand-secondary` | `#7DD3FC` |
| `--vt-text-primary` | `#E7F5F2` |
| `--vt-text-secondary` | `#A7C2BC` |
| `--vt-text-tertiary` | `#7A9690` |
| `--vt-stroke` | `#2A3D39` |
| `--vt-disclaimer-bg` | `#1A2A27` |

Danger/warning/success shift to WCAG-friendly dark variants. Never rely on color alone for BP vs target.

### 1.3 Typography

Do **not** use Inter/Roboto/Arial system defaults as brand voice. Prefer:

| Role | Font | Size / Weight | Notes |
|------|------|---------------|-------|
| Brand / Display | **Source Serif 4** or **Newsreader** | 34–40 Regular/Medium | Wordmark & onboarding headlines |
| UI Sans | **SF Pro** (system) | Body 17 Regular | HIG alignment for controls |
| Metric numerals | **SF Pro Rounded** or SF Pro | 40–56 Semibold/Bold | Tabular numbers (`monospacedDigit`) |
| Section title | SF Pro | 20–22 Semibold | |
| Subhead | SF Pro | 15 Regular | Secondary |
| Caption | SF Pro | 13 Regular | Sources, timestamps |
| Disclaimer | SF Pro | 12–13 Regular | Adequate contrast |

Dynamic Type: all styles map to iOS text styles (`largeTitle`, `title2`, `body`, `footnote`, `caption`) with custom fonts via `UIFontMetrics`.

### 1.4 Spacing & radius

| Token | Value |
|-------|-------|
| `--vt-space-1` | 4 |
| `--vt-space-2` | 8 |
| `--vt-space-3` | 12 |
| `--vt-space-4` | 16 |
| `--vt-space-5` | 24 |
| `--vt-space-6` | 32 |
| `--vt-space-7` | 48 |
| `--vt-radius-sm` | 8 |
| `--vt-radius-md` | 12 |
| `--vt-radius-lg` | 16 |
| `--vt-radius-pill` | Avoid for primary marketing chrome; use sparingly for source chips only |

Touch targets ≥ 44×44 pt.

### 1.5 Elevation & motion

- Prefer borders + subtle fill over multi-layer shadows.
- Shadow if needed: y:8 blur:24 opacity 8% dark teal — single layer.
- Motion: fade+short slide (220ms) for sheets; metric count-up on save (Reduce Motion → snap); PPG pulse opacity breathe (disabled when Reduce Motion on).

Ship intentional motions: (1) metric hero settle, (2) source chip appear, (3) chart draw-on.

---

## 2. Components

### VTDisclaimerBanner

**Purpose:** Persistent informational disclaimer.  
**Props:** `style: compact | expanded`, `text` (default trust string).  
**States:** default, collapsed (compact one-liner).  
**A11y:** `accessibilityLabel` full sentence; not dismissible on clinical surfaces (Analytics, AI, Reports).  
**Default copy:** “This is informational only and not medical advice.”

### VTMetricHero

**Purpose:** Large reading display (BP pair or HR).  
**Props:** `title`, `primaryValue`, `secondaryValue?`, `unit`, `source: VTSourceBadge`, `timestamp`, `footnote?`.  
**States:** loading skeleton, empty, error, populated.  
**Rules:** BP hero must never appear on Camera PPG screens. HR hero subtitle includes “Heart rate (PPG)” when camera-sourced.

### VTSourceBadge

**Purpose:** Honest provenance.  
**Values:** `manual`, `bluetooth`, `healthKit`, `csv`, `cameraPPG`, `appleWatch`.  
**Display examples:** “Manual”, “Bluetooth · Omron”, “HealthKit”, “CSV”, “Camera PPG”, “Apple Watch”.  
**A11y:** Read as “Source: …”

### VTCard

**Purpose:** Interaction container only (lists, tappable settings blocks).  
**Rules:** No decorative cards in hero. If removing background doesn’t hurt interaction, don’t use a card.  
**States:** resting, pressed, disabled.

### VTChart

**Purpose:** Swift Charts wrapper.  
**Props:** `series[]`, `range`, `showsTargetBand`, `accessibilitySummary`.  
**States:** empty, loading, error, populated, scrubbing.  
**A11y:** Audio graph / summary button; don’t encode meaning by color alone (shape/pattern).

### VTPrimaryButton / VTSecondaryButton / VTTertiaryButton

HIG-aligned; primary uses `--vt-brand-primary`. Destructive variant for delete. Loading state with spinner + disabled double-submit.

### VTTextField / VTNumericField

Numeric fields use decimal pads; unit labels trailing. Validation via `VTInlineError`.

### VTInlineError / VTInlineWarning

Error = blocking; Warning = confirmable unusual range (not diagnostic language).

### VTEmptyState

Illustration + one headline + one sentence + one primary CTA (+ optional secondary). BP empty copy must list allowed sources and deny camera BP.

### VTDeviceRow

**Props:** `name`, `kind: cuff | scale`, `connection: connected | connecting | disconnected | unauthorized`, `lastSync`.  
**Actions:** tap → detail; context → forget.

### VTDeviceConnectionMeter

Simple status: Connected / Scanning / Error with Retry.

### VTInsightCard

Shows heuristic/LLM insight preview, citation count, disclaimer footnote. Tap → detail. Never “Diagnosis” labels.

### VTComparisonTable

Free vs Premium rows; checkmarks; used on Paywall. No countdown timers.

### VTSegmentedRange

`24H | 7D | 30D | 90D | Custom`.

### VTProgressMeasurement

PPG session ring/bar + signal quality + time remaining. Announces progress to VoiceOver every ~5s.

### VTPermissionExplainer

Pre-system-sheet education (HealthKit, Notifications, Bluetooth, Camera).

### VTTrustCallout

Two-column or stacked callout for Onboarding O-02: BP sources vs HR PPG.

### VTAppLockGate

Blurred content + Authenticate button.

---

## 3. Composite patterns

| Pattern | Components |
|---------|------------|
| Dashboard metric strip | `VTMetricHero` ×2 + `VTSourceBadge` + quick `VTPrimaryButton`s |
| BP hub actions | 2×2 button grid (Manual, Bluetooth, HealthKit, CSV) |
| Paywall | Brand header + `VTComparisonTable` + purchase buttons + restore |
| Report footer | Disclaimer + source legend |
| Safety refusal (AI) | `VTInsightCard` error variant + Help link |

---

## 4. States matrix (core components)

| Component | Empty | Loading | Error | Disabled | Success |
|-----------|-------|---------|-------|----------|---------|
| VTMetricHero | Placeholders + CTA | Skeleton | Inline retry | — | Populated |
| VTChart | VTEmptyState | Shimmer axes | Retry | — | Series |
| VTDeviceRow | — | Connecting… | Error icon + subtitle | Unpair disabled during op | Connected |
| VTPrimaryButton | — | Spinner | — | Dimmed | Brief check (optional) |
| VTInsightCard | Need more data | Generating… | Safety refusal / fail | Cloud locked | Ready |

---

## 5. Dark mode

- Test metric numerals against canvas for ≥ 4.5:1 contrast.
- Charts: gridlines `--vt-stroke`; series use brand + secondary (not red/green only for BP meaning).
- Flash/PPG guidance: ensure warning text remains readable on dark.

---

## 6. Dynamic Type & layout

- Prefer `VStack` reflow over horizontal truncation of sys/dia.
- At accessibility XXXL, stack source badge below metric.
- Tab bar uses system sizing; avoid custom tab icons that clip labels.

---

## 7. Accessibility notes

| Topic | Requirement |
|-------|-------------|
| VoiceOver | Every reading announces values, units, source, time |
| Traits | Buttons vs static text correct; selected state on tabs |
| Reduce Motion | Disable PPG breathe and chart draw-on |
| Contrast | AA for text; source chips with text+icon |
| Localization | Strings from `L10n`; avoid UIImage text |
| RTL | Mirror navigation; keep numeric order sys/dia clear |
| Haptics | Light impact on successful save; none on errors that already alert |

---

## 8. Iconography

SF Symbols preferred:

| Concept | Symbol |
|---------|--------|
| Dashboard | `house.fill` |
| HR | `heart.fill` |
| BP | `waveform.path.ecg` |
| Analytics | `chart.xyaxis.line` |
| Bluetooth | `wave.3.right.circle` |
| HealthKit | `heart.text.square` |
| Privacy | `lock.shield` |
| Disclaimer | `info.circle` |

Custom mark: VitalTrack wordmark + simple pulse+shield monogram (teal).

---

## 9. Content & claim rules for UI copy

1. Never: “Measure blood pressure with your camera/fingerprint.”
2. Always label PPG as heart rate.
3. Premium upsells describe added analytics/AI/reports — never hostage core BP logging.
4. Insights: educational tone; include disclaimer component nearby.

---

## 10. SwiftUI mapping (implementation hint)

```
DesignSystem/
  Tokens/Colors.swift
  Tokens/Typography.swift
  Tokens/Spacing.swift
  Components/VTDisclaimerBanner.swift
  Components/VTMetricHero.swift
  Components/VTChart.swift
  Components/VTSourceBadge.swift
  Components/VTDeviceRow.swift
  Components/VTInsightCard.swift
  Components/VTEmptyState.swift
  Components/Buttons.swift
```

Use environment (`vtTheme`) for light/dark; avoid hard-coded hex in features.

---

*End of UI Component Library.*
