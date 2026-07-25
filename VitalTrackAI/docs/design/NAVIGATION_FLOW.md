# VitalTrack AI — Navigation Flow

## Cold launch

```
Splash (brand + trust microcopy)
  → if !onboardingCompleted → Onboarding (paged)
  → else → MainTabView
```

## Onboarding sequence

1. Welcome  
2. What we can do  
3. **What we cannot do** (camera ≠ BP; FDA-cleared monitor statement)  
4. How heart rate works (PPG)  
5. Why an external BP monitor  
6. Privacy first  
7. Apple Health permission explainer  
8. You’re ready → Enter app  

## Main tabs

| Tab | Root | Secondary pushes |
|-----|------|------------------|
| Home | Dashboard | Customize cards, Latest BP detail |
| Heart | Heart Rate | PPG explainer, Trends |
| BP | Blood Pressure | Manual entry, Import, Source picker |
| Insights | AI Assistant | Insight detail (disclaimer pinned) |
| More | More hub | History, Analytics, Devices, Reports, Settings, Help, FAQ, Subscription, Privacy |

## Deep links (planned)

- `vitaltrack://bp/log` → Blood Pressure manual entry  
- `vitaltrack://hr/measure` → Heart Rate  
- `vitaltrack://devices` → Devices  
- `vitaltrack://insights` → AI Assistant  
- `vitaltrack://settings/health` → HealthKit settings  

## Modal / sheet flows

- Crisis / very high BP education dialog (actionable, non-diagnostic)  
- Export share sheet (CSV / PDF)  
- Subscription paywall (transparent Free vs Premium — no forced dark patterns)  
- Bluetooth pairing sheet with recovery steps  

## Back stack rules

- Tab roots reset on re-select  
- Onboarding is not re-entered unless Settings → “Replay trust tour”  
- Permission denial always offers “Open Settings” recovery  
