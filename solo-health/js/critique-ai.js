/**
 * Critique AI — analyzes scanner rep data (depth, tempo, tracking loss) and
 * writes a System-voice performance review after every scan and every day.
 */

const DEPTH_TARGET = {
  pushup: 95, // elbow angle at bottom, lower = deeper
  squat: 100, // knee angle at bottom, lower = deeper
  situp: 70, // torso angle at curl, lower = deeper
};

const GRADES = [
  { min: 90, id: "S", label: "S-Rank Form" },
  { min: 78, id: "A", label: "A-Rank Form" },
  { min: 62, id: "B", label: "B-Rank Form" },
  { min: 45, id: "C", label: "C-Rank Form" },
  { min: 25, id: "D", label: "D-Rank Form" },
  { min: 0, id: "F", label: "Rejected" },
];

export function gradeForScore(score) {
  return GRADES.find((g) => score >= g.min) ?? GRADES[GRADES.length - 1];
}

function mean(arr) {
  return arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : 0;
}

function stdev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(mean(arr.map((n) => (n - m) ** 2)));
}

/** Collects per-frame scanner output during a live scan session. */
export function createFormTracker(kind) {
  const depths = [];
  const repTimestamps = [];
  const holds = [];
  let totalFrames = 0;
  let lostFrames = 0;

  return {
    kind,
    record(result, now = Date.now()) {
      totalFrames += 1;
      if (result.angle == null && result.hold == null) lostFrames += 1;
      if (result.phase === "down" && typeof result.angle === "number") {
        depths.push(result.angle);
      }
      if (typeof result.hold === "number") holds.push(result.hold);
      if (result.gained > 0) repTimestamps.push(now);
    },
    hasData: () => totalFrames > 0,
    metrics() {
      const intervals = [];
      for (let i = 1; i < repTimestamps.length; i++) {
        intervals.push(repTimestamps[i] - repTimestamps[i - 1]);
      }
      return {
        totalFrames,
        lostFrames,
        trackingRate: totalFrames ? 1 - lostFrames / totalFrames : 1,
        minDepth: depths.length ? Math.min(...depths) : null,
        avgDepth: depths.length ? mean(depths) : null,
        repCount: repTimestamps.length,
        avgIntervalMs: mean(intervals),
        intervalStdevMs: stdev(intervals),
        avgHold: holds.length ? mean(holds) : null,
      };
    },
  };
}

/** Builds a System-voice critique for a single completed (or abandoned) quest. */
export function critiqueQuest({ name, kind, target, achieved, tracker }) {
  const m = tracker.metrics();
  const lines = [];
  let score = 50;

  const completion = target > 0 ? Math.min(1, achieved / target) : 0;
  score += Math.round(completion * 20) - 10;

  const trackingPct = Math.round(m.trackingRate * 100);
  if (m.totalFrames > 20) {
    if (m.trackingRate > 0.92) {
      lines.push(`Tracking lock held at ${trackingPct}% — the scanner never lost you.`);
      score += 10;
    } else if (m.trackingRate > 0.75) {
      lines.push(`Tracking held ${trackingPct}% of the scan. Minor frame drift detected.`);
    } else {
      lines.push(`Tracking dropped to ${trackingPct}%. Stay centered and fully in frame.`);
      score -= 15;
    }
  }

  if (DEPTH_TARGET[kind] != null && m.minDepth != null) {
    const targetAngle = DEPTH_TARGET[kind];
    const gap = m.minDepth - targetAngle;
    if (gap <= 5) {
      lines.push(`Depth: full range confirmed (${Math.round(m.minDepth)}°). Textbook extension.`);
      score += 20;
    } else if (gap <= 20) {
      lines.push(`Depth: close but shallow by ~${Math.round(gap)}°. Push a fraction further next rep.`);
      score += 5;
    } else {
      lines.push(`Depth: reps cut short by ~${Math.round(gap)}°. Partial reps will not raise your rank.`);
      score -= 15;
    }
  }

  if (m.repCount >= 3 && m.avgIntervalMs > 0) {
    const cv = m.intervalStdevMs / m.avgIntervalMs;
    if (cv < 0.25) {
      lines.push(`Tempo: rock-steady rhythm (±${Math.round(m.intervalStdevMs)}ms). Excellent control.`);
      score += 15;
    } else if (cv < 0.5) {
      lines.push(`Tempo: mostly even, some rushed reps near the end.`);
      score += 3;
    } else {
      lines.push(`Tempo: erratic pacing. Slow down and control the eccentric.`);
      score -= 10;
    }
  }

  if (kind === "hydrate" || kind === "mind") {
    if (m.avgHold != null) {
      if (m.avgHold > 0.7) {
        lines.push(`Hold discipline was excellent — minimal drift from position.`);
        score += 15;
      } else if (m.avgHold > 0.35) {
        lines.push(`Hold discipline was inconsistent. Commit fully to the pose.`);
        score += 2;
      } else {
        lines.push(`Hold discipline was weak. The System nearly rejected this log.`);
        score -= 10;
      }
    }
  }

  if (!lines.length) {
    lines.push(`Insufficient scanner data — objective was logged from partial telemetry.`);
    score -= 10;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const grade = gradeForScore(score);

  const closers = {
    S: "The System acknowledges peak execution, Hunter.",
    A: "Strong work. Keep this standard and the ranks will follow.",
    B: "Adequate. There is a clear ceiling above you — go find it.",
    C: "Passable, but sloppy reps compound into a weak Hunter.",
    D: "Barely counted. The System is watching your form, not just your count.",
    F: "This performance would not survive a Penalty Quest.",
  };
  lines.push(closers[grade.id]);

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind: "quest",
    questName: name,
    score,
    grade: grade.id,
    gradeLabel: grade.label,
    lines,
    ts: Date.now(),
  };
}

/** End-of-day critique across every quest completed that day. */
export function critiqueDay({ quests, streak, stats, rank }) {
  const lines = [];
  const cleared = quests.filter((q) => q.progress >= q.target);
  const rate = quests.length ? cleared.length / quests.length : 0;
  let score = Math.round(rate * 70);

  lines.push(
    `Daily Quest: ${cleared.length}/${quests.length} objectives verified by the Camera Scanner.`
  );

  if (streak > 0) {
    lines.push(`Streak sustained at ${streak} day${streak === 1 ? "" : "s"}. Consistency is a stat too.`);
    score += Math.min(20, streak * 2);
  } else {
    lines.push(`Streak reset. The System does not carry momentum for free.`);
  }

  const weakest = Object.entries(stats).sort((a, b) => a[1] - b[1])[0];
  if (weakest) {
    lines.push(`Weakest attribute: ${weakest[0].toUpperCase()} (${weakest[1]}). Prioritize it tomorrow.`);
  }

  score = Math.max(0, Math.min(100, score));
  const grade = gradeForScore(score);
  lines.push(
    rate >= 1
      ? `Full clear as ${rank}. The gate ahead has been noted.`
      : `Incomplete clear as ${rank}. Precision over excuses, Hunter.`
  );

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind: "day",
    questName: "Daily Critique",
    score,
    grade: grade.id,
    gradeLabel: grade.label,
    lines,
    ts: Date.now(),
  };
}
