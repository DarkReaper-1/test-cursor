# VitalTrack — Information Architecture

## Navigation shell

```
RootView
├── SplashView                     (transient, ~0.7s)
├── OnboardingView                 (first launch only, 5 pages, last page not skippable)
│   ├── Welcome
│   ├── Capabilities (what it can/can't do)
│   ├── How heart rate works
│   ├── Privacy
│   └── Permissions → "Get started"
└── MainTabView                    (5-tab bar)
    ├── Dashboard
    ├── History
    ├── Analytics
    ├── Insights
    └── Settings
```

## Screen tree

```
Dashboard
├── Heart rate card, Blood pressure card, weekly trend
├── "Measure heart rate" → HeartRateMeasureView (sheet)
└── "Log blood pressure" → BloodPressureLogView (sheet)
    ├── manual entry form
    ├── "Connect a Bluetooth monitor" → DevicesView (sheet)
    └── "Import from CSV" → system file importer

History
├── Segmented control: Heart rate / Blood pressure
└── Swipe-to-delete list for each

Analytics
├── Range picker: 7d / 30d / 90d / 1y
├── Heart rate line + area chart
├── Blood pressure systolic/diastolic line chart
└── Weekly / monthly / yearly systolic averages

Insights ("Smart Insights")
└── Rule-based insight list (trend deltas, missed-reading nudge,
    reference-range note), each carrying an "informational only" disclaimer

Settings
├── Reminders (7 kinds, per-kind time picker)
├── Apple Health (write toggle, read toggle — independent, both off by default)
├── iCloud sync (off by default)
├── Devices → DevicesView
├── Reports → ReportsView (CSV / PDF summary / PDF doctor report)
├── Delete all data (destructive, confirmation required)
├── Subscription → SubscriptionView
├── Help & FAQ → HelpView
└── Privacy → PrivacyView
```

## Navigation flow: first blood pressure reading

```
Dashboard → "Log blood pressure"
    ├─(manual)──────────────→ fill form → Save → dismiss → Dashboard refreshes
    ├─(Bluetooth)───────────→ Devices → Scan → tap device → Connect
    │                          → reading auto-arrives → saved → Dashboard refreshes
    └─(CSV)─────────────────→ file picker → parse → "Imported N readings"
```

## Error/recovery flow: Bluetooth disconnect

```
Connected → (peripheral disconnects) → Disconnected state
    → status row shows "Not connected" + "The device disconnected. Bring it
      back in range and tap Reconnect." + a Reconnect button
    → tapping Reconnect retrieves the same peripheral by identifier
      (no full re-scan) and re-attempts the GATT handshake
```

## Deep-link surface (proposed, not implemented)

`vitaltrack://measure-heart-rate`, `vitaltrack://log-blood-pressure` — for
a future widget/Watch complication to jump straight into a flow. Left out
of this pass since it depends on the widget target existing first.
