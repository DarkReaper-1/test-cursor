/**
 * Rule-based, on-device pattern detection over your own logged readings —
 * not a machine-learning model, not a cloud service. Every insight is
 * informational only, never a diagnosis.
 */
function buildInsights() {
  const insights = [];
  const now = Date.now();
  const day = 86400000;

  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

  // Heart rate week-over-week trend
  const thisWeekHr = Store.heartRate(now - 7 * day);
  const priorWeekHr = Store.heartRate(now - 14 * day).filter((r) => r.takenAt < now - 7 * day);
  if (thisWeekHr.length >= 3 && priorWeekHr.length >= 3) {
    const a = avg(thisWeekHr.map((r) => r.bpm));
    const b = avg(priorWeekHr.map((r) => r.bpm));
    const delta = a - b;
    if (Math.abs(delta) < 3) {
      insights.push({ tone: 'good', text: `Your resting heart rate has been steady, averaging ${Math.round(a)} bpm this week.` });
    } else {
      insights.push({
        tone: Math.abs(delta) > 8 ? 'caution' : 'neutral',
        text: `Your average heart rate is ${delta > 0 ? 'up' : 'down'} ${Math.round(Math.abs(delta))} bpm this week (${Math.round(a)} vs ${Math.round(b)} bpm last week).`,
      });
    }
  }

  // HRV
  const hrvVals = thisWeekHr.map((r) => r.hrv).filter((v) => typeof v === 'number');
  if (hrvVals.length >= 3) {
    insights.push({ tone: 'neutral', text: `Your average HRV (RMSSD) this week is ${Math.round(avg(hrvVals))} ms — a rough wellness indicator, not a clinical HRV measurement.` });
  }

  // Blood pressure week-over-week
  const thisWeekBp = Store.bloodPressure(now - 7 * day);
  const priorWeekBp = Store.bloodPressure(now - 14 * day).filter((r) => r.takenAt < now - 7 * day);
  if (thisWeekBp.length >= 2 && priorWeekBp.length >= 2) {
    const a = avg(thisWeekBp.map((r) => r.systolic));
    const b = avg(priorWeekBp.map((r) => r.systolic));
    const delta = a - b;
    if (Math.abs(delta) < 4) {
      insights.push({ tone: 'good', text: `Your systolic blood pressure has been consistent, averaging ${Math.round(a)} mmHg this week.` });
    } else {
      insights.push({
        tone: delta > 10 ? 'caution' : 'neutral',
        text: `Your average systolic reading this week (${Math.round(a)} mmHg) is ${Math.round(Math.abs(delta))} mmHg ${delta > 0 ? 'higher' : 'lower'} than last week.`,
      });
    }
  }

  // Missed reading nudge
  const latestBp = Store.latestBloodPressure();
  if (latestBp) {
    const daysSince = Math.floor((now - latestBp.takenAt) / day);
    if (daysSince >= 5) {
      insights.push({ tone: 'caution', text: `You haven't logged a blood pressure reading in ${daysSince} days. Regular readings make the trends above more meaningful.` });
    }
    const cat = bpReferenceRange(latestBp.systolic, latestBp.diastolic);
    insights.push({
      tone: cat === 'Normal range' ? 'good' : 'caution',
      text: `Your latest reading (${latestBp.systolic}/${latestBp.diastolic} mmHg) falls in the "${cat}" reference range. This is general information, not a diagnosis — talk to a clinician about what your numbers mean for you.`,
    });
  }

  if (!insights.length) {
    insights.push({ tone: 'neutral', text: 'Log a few more readings to start seeing trends here.' });
  }
  return insights;
}
