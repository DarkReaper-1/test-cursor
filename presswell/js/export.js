(function (global) {
  function toCsv(readings) {
    const header = [
      "date",
      "type",
      "heartRate",
      "hrvMs",
      "systolic",
      "diastolic",
      "stress",
      "note",
      "hrSource",
      "bpSource",
    ];
    const rows = readings.map((r) =>
      [
        new Date(r.at).toISOString(),
        r.type || "",
        r.heartRate ?? "",
        r.hrvMs ?? "",
        r.systolic ?? "",
        r.diastolic ?? "",
        r.stress ?? "",
        JSON.stringify(r.note || ""),
        r.source?.hr || "",
        r.source?.bp || "",
      ].join(",")
    );
    return [header.join(","), ...rows].join("\n");
  }

  function downloadCsv(readings, filename = "presswell-health-export.csv") {
    const blob = new Blob([toCsv(readings)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printReport(readings, summary) {
    const win = window.open("", "_blank");
    if (!win) {
      window.print();
      return;
    }
    const rows = readings
      .slice(0, 100)
      .map((r) => {
        const bp = r.systolic != null ? `${r.systolic}/${r.diastolic}` : "—";
        const hr = r.heartRate != null ? r.heartRate : "—";
        return `<tr>
          <td>${BP.formatWhen(r.at)}</td>
          <td>${bp}</td>
          <td>${hr}</td>
          <td>${r.stress || "—"}</td>
          <td>${r.note || ""}</td>
        </tr>`;
      })
      .join("");

    win.document.write(`<!DOCTYPE html><html><head><title>PressWell Report</title>
      <style>
        body{font-family:Georgia,serif;padding:24px;color:#14343a}
        h1{color:#0a5c63}
        table{border-collapse:collapse;width:100%;margin-top:16px}
        th,td{border:1px solid #c9d9d7;padding:8px;text-align:left}
        th{background:#e8f3f2}
        .meta{color:#3d5c63}
      </style></head><body>
      <h1>PressWell Health Report</h1>
      <p class="meta">Generated ${new Date().toLocaleString()}. Wellness log — not a medical record.</p>
      <p>Readings: ${summary.count || 0}
         · Avg HR: ${summary.avgHr != null ? Math.round(summary.avgHr) : "—"}
         · Avg BP: ${summary.avgSys != null ? `${Math.round(summary.avgSys)}/${Math.round(summary.avgDia)}` : "—"}</p>
      <table>
        <thead><tr><th>When</th><th>BP</th><th>HR</th><th>Stress cue</th><th>Note</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <script>onload=()=>print()<\/script>
      </body></html>`);
    win.document.close();
  }

  global.Export = { toCsv, downloadCsv, printReport };
})(window);
