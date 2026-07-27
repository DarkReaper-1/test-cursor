# Halal Detector

Production-oriented cross-platform app that helps adults (40+) quickly understand whether a product, ingredient, medicine, cosmetic, or restaurant item appears **Halal**, **Doubtful (Mashbooh)**, or **Haram** — with plain-language reasons, confidence scores, and clear disclaimers.

> Informational guidance only. **Not a religious ruling / fatwa.** Unknown origins are labeled Doubtful. Verify uncertain cases with manufacturers or trusted local scholars.

## Features

1. Barcode scanner (Open Food Facts + demo catalog)
2. AI ingredient analyzer (text + photo entry)
3. Camera OCR label highlighting
4. Ingredient search (offline E-numbers & additives)
5. Halal certification recognition (JAKIM, MUI, IFANCA, HMC, HFA, HFSAA, …)
6. Confidence / risk scoring when data is incomplete
7. Islamic Scholar Mode (Hanafi, Shafi’i, Maliki, Hanbali, General Sunni, Custom strictest)
8. Medicine checker
9. Cosmetics checker
10. Restaurant mode
11. Restaurant menu camera / text analysis
12. Smart halal alternatives
13. Favorites
14. Scan history (searchable)
15. Offline ingredient database
16. Voice assistant (speak answers aloud)
17. AI educational chat

Accessibility: large buttons/fonts, high contrast, light/dark mode, text scaling, voice reading, color-blind friendly status patterns, simple wording.

## Project layout

```
halal-detector/
  mobile/     # Expo React Native app
  backend/    # FastAPI API
  data/       # Offline ingredient + certification database
  docs/       # Architecture notes
```

## Quick start

### Backend

```bash
cd halal-detector/backend
python3 -m pip install -r requirements.txt
# optional: expand additive coverage
python3 scripts/expand_e_numbers.py
PYTHONPATH=. python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

API docs: http://127.0.0.1:8000/docs

### Mobile

```bash
cd halal-detector/mobile
npm install
# point at your API if needed
export EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
npx expo start
```

Use Expo Go on a phone, or `npx expo start --web` for a browser smoke test.

### Demo barcodes

| Barcode | Product |
|---------|---------|
| `0000000000001` | Pork gelatin gummies (Haram demo) |
| `0000000000002` | Alcohol-free vanilla |
| `0000000000003` | Ibuprofen softgels (medicine) |
| `0000000000004` | Lipstick with carmine (cosmetic) |
| `3017620422003` | Nutella sample |
| `5000112588264` | Coca-Cola sample |

## Tests

```bash
cd halal-detector/backend
PYTHONPATH=. python3 -m pytest tests/ -q
```

## Tech notes

- **Mobile:** Expo / React Native, React Navigation, expo-camera, expo-speech, AsyncStorage
- **Backend:** FastAPI, SQLAlchemy async (SQLite→PostgreSQL), httpx Open Food Facts client
- **Offline:** `data/ingredients.json` bundled into the app for zero-network ingredient search
- **Auth:** Guest mode by default; Firebase Auth can be attached for cloud sync
- **AI:** Deterministic ingredient/OCR/chat engine included; set `OPENAI_API_KEY` later for richer NLP

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for pipeline details.
