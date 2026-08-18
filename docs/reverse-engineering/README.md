# Reverse-engineering notes

These documents treat **Arise: Level Up In Real Life** as a public competitive/UX reference only.

## Evidence rules

| Label | Meaning |
| --- | --- |
| **OBSERVED** | Directly seen in a public listing, screenshot, changelog, store privacy label, or public review. |
| **INFERRED** | Likely from observed UI/copy, but not confirmed by using the product. |
| **PROPOSED** | Helix design, not a claim about the competitor. |

Do not treat marketing composites as confirmed in-app layouts. Store screenshots are promotional.

## Source limitation — screen recording

**OBSERVED:** The requested recording `/mnt/data/ScreenRecording_08-18-2026 02-38-26_1.mp4` was not present in this environment.

Checked:

- `/mnt/data` — directory does not exist
- `/mnt` — empty
- workspace, `/opt/cursor`, `/home/ubuntu` — no matching `.mp4`

**PROPOSED:** Do not invent a frame-by-frame walkthrough of an unseen recording. Inventory public store screenshots and listing copy instead, and mark runtime behavior as unconfirmed.

## Legal / ethical boundary

Allowed:

- Public App Store / Play Store listing copy
- Public marketing screenshots
- Public ratings, reviews, changelogs
- Public FAQ / marketing site copy
- Publicly observable UX patterns and product weaknesses

Not allowed, and not done:

- Copying source, artwork, logos, characters, or branding
- Extracting private APIs
- Bypassing auth, paywalls, or DRM
- Scraping protected/private user data
- Claiming affiliation with Arise or DIGITAL LIONS APPS

## Public identity of the reference product

**OBSERVED** from Apple lookup `id=6743036247` (2026-08-18):

| Field | Value |
| --- | --- |
| Name | Arise: Level Up In Real Life |
| Seller | DIGITAL LIONS APPS, SOCIEDAD LIMITADA |
| Bundle ID | `llc.sololeveling.Arise` |
| Version | 1.4.8 (released 2026-08-06) |
| First listed | 2025-04-02 |
| Rating | 4.77 from ~20,916 US App Store ratings |
| Category | Health & Fitness |
| Price | Free with IAP (Arise Pro SKUs from $4.99–$59.99) |
| Size | ~92.9 MB |
| Min iOS | 15.1 |
| Languages | English |
| Accessibility | Developer has not indicated supported features |
| Medical disclaimer | Listing states the app does not offer medical advice |

**OBSERVED** from Google Play (`llc.sololeveling.Arise`):

- 1M+ downloads
- 239K reviews
- Developer listed as GOLDEN GATE MEDIA ENTERPRISE, SOCIEDAD LIMITADA
- Data safety: may share health/fitness with third parties; collects personal info, health/fitness, app performance; encrypted in transit; deletion request supported
- Changelog mentions photo/gallery workout logging and translation polish (updated 2026-07-31)

## Documents in this folder

1. [`screen-inventory.md`](screen-inventory.md)
2. [`user-flows.md`](user-flows.md)
3. [`feature-inventory.md`](feature-inventory.md)
4. [`interaction-map.md`](interaction-map.md)
5. [`ux-observations.md`](ux-observations.md)
6. [`competitive-gaps.md`](competitive-gaps.md)
7. [`implementation-notes.md`](implementation-notes.md)
