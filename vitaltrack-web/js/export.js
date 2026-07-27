/** CSV export is the only way data leaves this app, and only when you tap it. */
function exportCsv() {
  const rows = [['type', 'date', 'value_1', 'value_2', 'notes']];
  Store.heartRate().forEach((r) => {
    rows.push(['heart_rate', new Date(r.takenAt).toISOString(), r.bpm, r.hrv ? Math.round(r.hrv) : '', '']);
  });
  Store.bloodPressure().forEach((r) => {
    const notes = (r.notes || '').replace(/,/g, ';');
    rows.push(['blood_pressure', new Date(r.takenAt).toISOString(), r.systolic, r.diastolic, notes]);
  });

  const csv = rows.map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'vitaltrack_export.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}
