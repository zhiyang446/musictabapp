// renderMusicXML.ts
// 决定性渲染 JSON → MusicXML

import { drumMap } from "./drumMap";
import { validate } from "./validate";

interface Event {
  bar: number;
  beat: number;
  tick: number;
  instrument: string;
  duration_ticks: number;
  velocity: number;
  probability: number;
}

interface Analysis {
  metadata: {
    title: string;
    tempo_bpm: number;
    time_signatures: { bar_index: number; beats: number; beat_type: number }[];
  };
  grid: { ppq: number; divisions_per_quarter: number };
  events: Event[];
}

export function renderMusicXML(input: Analysis): string {
  const check = validate(input);
  if (!check.ok) {
    throw new Error("Invalid input: " + check.errors.join(", "));
  }

  const divs = input.grid.divisions_per_quarter;
  const beats = input.metadata.time_signatures[0].beats;
  const beatType = input.metadata.time_signatures[0].beat_type;

  // Group events by bar
  const bars: Record<number, Event[]> = {};
  input.events.forEach(ev => {
    if (!bars[ev.bar]) bars[ev.bar] = [];
    bars[ev.bar].push(ev);
  });

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<score-partwise version="4.0">\n`;
  xml += `  <part-list>\n`;
  xml += `    <score-part id="P1"><part-name>Drum Set</part-name></score-part>\n`;
  xml += `  </part-list>\n`;
  xml += `  <part id="P1">\n`;

  Object.keys(bars).sort((a, b) => Number(a) - Number(b)).forEach(barNum => {
    xml += `    <measure number="${barNum}">\n`;
    if (barNum === "0") {
      xml += `      <attributes>\n`;
      xml += `        <divisions>${divs}</divisions>\n`;
      xml += `        <time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>\n`;
      xml += `        <clef><sign>F</sign><line>4</line></clef>\n`;
      xml += `      </attributes>\n`;
      xml += `      <sound tempo="${input.metadata.tempo_bpm}"/>\n`;
    }

    const evs = bars[Number(barNum)].sort(
      (a, b) => a.beat * 1000 + a.tick - (b.beat * 1000 + b.tick)
    );

    for (const ev of evs) {
      const map = drumMap[ev.instrument];
      if (!map) continue;
      const dur = Math.max(1, Math.round((ev.duration_ticks / input.grid.ppq) * divs));
      xml += `      <note>\n`;
      xml += `        <unpitched><display-step>C</display-step><display-octave>4</display-octave></unpitched>\n`;
      xml += `        <duration>${dur}</duration>\n`;
      xml += `        <instrument id="${map.id}"/>\n`;
      xml += `        <voice>${map.voice}</voice>\n`;
      xml += `        <type>eighth</type>\n`;
      if (map.notehead) xml += `        <notehead>${map.notehead}</notehead>\n`;
      xml += `      </note>\n`;
    }

    xml += `    </measure>\n`;
  });

  xml += `  </part>\n`;
  xml += `</score-partwise>\n`;
  return xml;
}
