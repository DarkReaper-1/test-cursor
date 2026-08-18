export interface TodayFacts {
  category: "main" | "recovery" | string;
  title: string;
  minutes: number;
  equipment: string;
  missedYesterday: boolean;
  adaptedFromHistory: boolean;
}

export function explainToday(facts: TodayFacts): string {
  if (facts.category === "recovery" || facts.missedYesterday) {
    return `Yesterday slipped. Today is ${facts.title}: a shorter return so momentum can recover. This is coaching, not medical advice.`;
  }
  if (facts.adaptedFromHistory) {
    return `Today is ${facts.title} because your last session earned a progression. Loads and reps come from that history, not a frozen plan. Not medical advice.`;
  }
  if (facts.minutes <= 10) {
    return `You have about ${facts.minutes} minutes. Helix kept the work small so you still move today. Not medical advice.`;
  }
  if (facts.equipment === "none") {
    return `No equipment logged, so ${facts.title} stays bodyweight. Tell Helix if that changes. Not medical advice.`;
  }
  return `${facts.title} is today’s one priority from your goal, time, and equipment. Finish this before adding extras. Not medical advice.`;
}
