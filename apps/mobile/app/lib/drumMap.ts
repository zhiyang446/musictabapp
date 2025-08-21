// drumMap.ts
// 固定鼓谱映射（逻辑名 → MusicXML instrument id + GM percussion note）

export interface DrumMapping {
  id: string;           // instrument id (for MusicXML)
  gm: number;           // General MIDI percussion key
  notehead?: string;    // MusicXML notehead (e.g. "x", "diamond")
  voice: number;        // 建议声部 (1 = 上, 2 = 下)
}

export const drumMap: Record<string, DrumMapping> = {
  kick:    { id: "P1-X2",  gm: 36, notehead: "normal", voice: 2 },
  snare:   { id: "P1-X4",  gm: 38, notehead: "normal", voice: 1 },
  hh_closed: { id: "P1-X6", gm: 42, notehead: "x",     voice: 1 },
  hh_open:   { id: "P1-X6o", gm: 46, notehead: "x",    voice: 1 },
  crash:   { id: "P1-X13", gm: 49, notehead: "diamond", voice: 1 },
  ride:    { id: "P1-X12", gm: 51, notehead: "x",      voice: 1 },
  tom1:    { id: "P1-T1",  gm: 50, notehead: "normal", voice: 1 },
  tom2:    { id: "P1-T2",  gm: 45, notehead: "normal", voice: 2 },
  tomf:    { id: "P1-TF",  gm: 41, notehead: "normal", voice: 2 },
  cowbell: { id: "P2-X1",  gm: 56, notehead: "x",      voice: 1 },
  clap:    { id: "P1-CL",  gm: 39, notehead: "normal", voice: 1 },
};
