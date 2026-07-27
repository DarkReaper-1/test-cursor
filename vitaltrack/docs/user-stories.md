# VitalTrack — User Stories

Grouped by the screen/feature that satisfies them. Each maps to what's
actually implemented in this pass (see `PRD.md` §4 for the scope table).

## Onboarding
- As a new user, I want to be told upfront that VitalTrack can't measure
  blood pressure from my camera, so I don't download it expecting the
  wrong thing.
- As a new user, I want a plain-language explanation of how camera heart
  rate measurement works, so I trust the number it gives me.
- As a privacy-conscious user, I want to know before I grant any
  permission what it's for and that it's optional.

## Heart rate
- As a user, I want to cover my camera and flash and get a heart rate in
  under 30 seconds, with live feedback if my finger placement is bad.
- As a user, I want to see a signal-quality indicator so I know whether to
  trust a given reading.
- As a user with an Apple Watch, I want my Watch heart rate data to show
  up here too. *(Not implemented this pass — requires a watchOS
  companion target; see PRD §9.)*

## Blood pressure
- As a user with a home cuff, I want to type in my systolic/diastolic/pulse
  in under 10 seconds.
- As a user with a Bluetooth-enabled cuff, I want to take a reading on the
  cuff and have it appear in the app automatically, without typing anything.
- As a user switching from another app, I want to import a CSV of my
  historical readings instead of re-typing months of data.
- As a user who already logs in Apple Health, I want VitalTrack to show
  that history alongside what I log here, without duplicating manual entry.

## Devices
- As a user pairing a cuff for the first time, I want to see a list of
  nearby Bluetooth monitors and tap to connect.
- As a user whose cuff disconnected mid-reading, I want a specific reason
  and a specific next step, not a generic error.

## Analytics / History
- As a user, I want to see my heart rate and blood pressure trends over
  the last week, month, quarter, or year.
- As a user, I want weekly/monthly/yearly systolic averages at a glance.
- As a user, I want to delete a reading I logged by mistake.

## Insights
- As a user, I want to know if my resting heart rate has changed
  meaningfully over the past week, without doing the math myself.
- As a user, I want to be reminded if I haven't logged a blood pressure
  reading in several days.
- As a user, I want any pattern the app points out to be clearly labeled
  as informational, not a diagnosis.

## Reminders
- As a user managing hypertension, I want a daily reminder to check my
  blood pressure at a time I choose.
- As a user, I want reminders to be entirely local — I don't want a
  server deciding when to notify me.

## Reports
- As a user with a doctor's appointment coming up, I want a PDF report of
  my recent readings I can hand over or email.
- As a user, I want a CSV export I can open in a spreadsheet.

## Settings & subscription
- As a user, I want to see exactly what's free and what's paid before I'm
  asked to pay for anything.
- As a user, I want clear, working instructions for cancelling my
  subscription, without hunting through in-app menus.
- As a user, I want a one-tap way to delete all my data from this device.

## Privacy & help
- As a user, I want a plain-language FAQ that answers "can this really
  measure blood pressure?" directly.
- As a user, I want to know exactly where my data is stored and who can
  see it.
