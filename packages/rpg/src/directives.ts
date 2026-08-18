export type Equipment = "none" | "dumbbells" | "gym";
export type GoalType = "strength" | "consistency" | "energy" | "hybrid";

export interface DirectiveExercise {
  key: string;
  name: string;
  targetSets: number;
  targetReps: number;
  load: number;
}

export interface DirectivePlan {
  category: "main" | "recovery";
  title: string;
  body: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  minutes: number;
  exercises: DirectiveExercise[];
}

export interface AssembleTodayInput {
  missedYesterday: boolean;
  equipment: Equipment;
  minutes: number;
  goal: GoalType;
}

export function dateKeyInTimeZone(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(year ?? 2026, (month ?? 1) - 1, day ?? 1));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

function bodyweightCircuit(minutes: number): DirectiveExercise[] {
  const reps = minutes <= 15 ? 8 : minutes <= 25 ? 10 : 12;
  return [
    { key: "push_up", name: "Push-up", targetSets: 3, targetReps: reps, load: 0 },
    { key: "squat", name: "Squat", targetSets: 3, targetReps: reps, load: 0 },
    { key: "hinge", name: "Hip hinge", targetSets: 3, targetReps: reps, load: 0 },
  ];
}

function loadedCircuit(minutes: number, load: number): DirectiveExercise[] {
  const reps = minutes <= 25 ? 8 : 10;
  return [
    { key: "goblet_squat", name: "Goblet squat", targetSets: 3, targetReps: reps, load },
    { key: "row", name: "Row", targetSets: 3, targetReps: reps, load },
    { key: "press", name: "Press", targetSets: 3, targetReps: reps, load },
  ];
}

export function assembleToday(input: AssembleTodayInput): DirectivePlan {
  const minutes = input.minutes <= 15 ? 10 : input.minutes <= 30 ? 20 : 45;
  const recovery = input.missedYesterday;
  const equipment = input.equipment;

  if (recovery) {
    return {
      category: "recovery",
      title: "The Return Path",
      body: `A ${minutes}-minute reset. Momentum dipped — this restores it. Not a failure state. Not medical advice.`,
      difficulty: 2,
      minutes,
      exercises: bodyweightCircuit(Math.min(minutes, 20)),
    };
  }

  if (equipment === "none" || minutes <= 10) {
    return {
      category: "main",
      title: minutes <= 10 ? "Ten Minutes, Still Forward" : "The Quiet Foundation",
      body: `Complete a ${minutes}-minute full-body session. No equipment required. This is a recommendation, not medical advice.`,
      difficulty: minutes <= 10 ? 2 : 3,
      minutes,
      exercises: bodyweightCircuit(minutes),
    };
  }

  const load = equipment === "gym" ? 135 : 25;
  const title =
    input.goal === "strength" ? "Iron Current" : "Operator Circuit";
  return {
    category: "main",
    title,
    body: `Train for ${minutes} minutes with the equipment you have. Loads are a starting point you can correct.`,
    difficulty: 3,
    minutes,
    exercises: loadedCircuit(minutes, load),
  };
}
