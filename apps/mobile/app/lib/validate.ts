// validate.ts
// 校验 analysis.json 输入是否合法

interface Event {
  bar: number;
  beat: number;
  tick: number;
  instrument: string;
  duration_ticks: number;
  velocity: number;
  probability: number;
}

interface Metadata {
  title: string;
  tempo_bpm: number;
  time_signatures: { bar_index: number; beats: number; beat_type: number }[];
}

interface Analysis {
  metadata: Metadata;
  grid: { ppq: number; divisions_per_quarter: number };
  events: Event[];
}

export function validate(input: any): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.metadata) errors.push("Missing metadata");
  if (!input.grid) errors.push("Missing grid");
  if (!Array.isArray(input.events)) errors.push("Missing events array");

  if (input.grid && !input.grid.divisions_per_quarter) {
    errors.push("Missing divisions_per_quarter");
  }

  if (Array.isArray(input.events)) {
    input.events.forEach((e: any, idx: number) => {
      if (!e.instrument) errors.push(`Event ${idx} missing instrument`);
      if (typeof e.bar !== "number") errors.push(`Event ${idx} missing bar`);
      if (typeof e.beat !== "number") errors.push(`Event ${idx} missing beat`);
    });
  }

  return { ok: errors.length === 0, errors };
}
