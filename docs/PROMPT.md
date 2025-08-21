# PROMPT.md — Drum Score Generator (MusicXML/MIDI)

## 目标

把**歌曲的节拍/鼓击事件分析结果**（JSON）转换为**标准、可导入主流制谱软件的 MusicXML**（必要时附带 MIDI）。支持多种拍号、速度变化、常见鼓组打击乐器、swing/shuffle、重复记号与小节线规则。输出**确定性**、**可验证**。

---

## 输入（由外部分析器提供的 JSON）

模型**不负责**直接从音频识别鼓；它**接收**已检测好的结构化数据，并据此排版记谱。

```json
{
  "metadata": {
    "title": "Song Title",
    "composer": "Unknown",
    "arranger": "Auto",
    "tempo_bpm": 120,
    "swing": false,
    "time_signatures": [
      {"bar_index": 0, "beats": 4, "beat_type": 4},
      {"bar_index": 32, "beats": 3, "beat_type": 4}
    ]
  },
  "tempo_map": [
    {"time": 0.0, "bpm": 120},
    {"time": 45.732, "bpm": 124}
  ],
  "grid": {
    "ppq": 960,                       // MIDI pulses per quarter (用于量化与MIDI)
    "divisions_per_quarter": 8        // MusicXML <divisions>
  },
  "structure": [
    {"label": "Intro", "start_bar": 0, "end_bar": 7},
    {"label": "Verse", "start_bar": 8, "end_bar": 23},
    {"label": "Chorus", "start_bar": 24, "end_bar": 31}
  ],
  "events": [
    // 每条事件是一次鼓击；位置可用 bar/beat/tick 或绝对秒，只要与grid一致
    {
      "bar": 0, "beat": 1, "tick": 0,
      "instrument": "kick",           // kick|snare|hh_closed|hh_open|ride|crash|tom1|tom2|tomf|cowbell|clap...
      "duration_ticks": 480,
      "velocity": 96,
      "probability": 0.98
    }
  ],
  "notation": {
    "quantize": "eighth",              // sixteenth|eighth|triplet_8|triplet_16|swing_8
    "beam_grouping": "auto",           // auto|by_time_signature
    "accent_policy": "velocity_based", // none|velocity_based
    "ghost_note_threshold": 45         // 低于则标 ghost 小音符（括弧）
  }
}
```

> 说明
>
> * **`divisions_per_quarter`**：用于 MusicXML `<divisions>`，建议 8 或 12（支持三连音/摇摆）。
> * **`ppq`**：用于 MIDI。
> * **`time_signatures`**：允许中途换拍。
> * **`events.probability`**：可用于过滤低可信度击打（见“误差与清洗”）。

---

## 乐器映射（可覆盖的默认表）

输出时的 **MusicXML `<score-partwise>` + General MIDI Percussion** 建议如下。若调用方提供自定义映射，则以调用方为准。

| 逻辑名        | MusicXML part/instrument id | GM Drum (MIDI note) | 默认音符头     | 五线位置（建议）          |
| ---------- | --------------------------- | ------------------- | --------- | ----------------- |
| kick       | P1-X2                       | 36 (Acoustic Bass)  | normal    | F3/F4 谱号下方（F4谱）   |
| snare      | P1-X4                       | 38 (Acoustic Snare) | normal    | C4 中线             |
| hh\_closed | P1-X6                       | 42 (Closed HH)      | x         | 高线/加线             |
| hh\_open   | P1-X6-open                  | 46 (Open HH)        | x circle  | 同上并加开口符号          |
| ride       | P1-X12                      | 51/59               | x         | 顶线/加线             |
| crash      | P1-X13                      | 49                  | diamond/x | 顶线/加线             |
| tom1       | P1-T1                       | 50 (High Tom)       | normal    | 上方线               |
| tom2       | P1-T2                       | 45 (Low Tom)        | normal    | 中上                |
| tomf       | P1-TF                       | 41 (Low Floor Tom)  | normal    | 下方线               |
| cowbell    | P2-X1                       | 56/59               | x         | 单线谱 staff-lines=1 |
| clap       | P1-CL                       | 39 (Hand Clap)      | normal/x  | snare 位置或稍上       |

* **镲类**（hi-hat/ride/crash）使用 `notehead x`（开镲可 `x` 外圈或上加开口 articulation）。
* **声部**：

  * voice 1：镲/军鼓/拍手
  * voice 2：大鼓/落地鼓（必要时 tom 也可在 voice 2 以避免冲突）

---

## 生成规则（必须遵守）

### 1) 小节与节拍

* 根据 `time_signatures` 创建 `<attributes><time>`，并在变拍处重写属性。
* 每小节内 **时值总和** 必须 == `beats * (divisions_per_quarter * 4 / beat_type)`。
* 使用 `<backup>` 分别排 voice 1 与 voice 2 的音符。

### 2) 量化与 swing/shuffle

* `notation.quantize` 决定最小音符类型；swing\_8 时：将二连八量化为三连八的 1+3分配，并使用 `<time-modification>` 或以三连记法呈现。
* `beam_grouping`：

  * `auto`：按拍号常规连线（4/4 下八分以 2 为一束，16 以 4 为一束；6/8 以三连为一束）。
  * `by_time_signature`：严格按拍号分组。

### 3) 音符头与符干

* 镲类：`<notehead>x</notehead>`（开镲可附加 `<notations><technical><open-string/>` 或文字“open”）。
* Crash 可用 `diamond` 或 `x`，与团队风格一致即可。
* 符干：voice 1 向上、voice 2 向下，除非碰撞需要调整。

### 4) 力度与表情

* 如果 `accent_policy=velocity_based`：

  * velocity ≥ 110 → `<articulations><accent/></articulations>`
  * 90–109 → 普通
  * 60–89 → `<dynamics><mf/></dynamics>`（可选）
  * < ghost\_note\_threshold → 加括弧音符（ghost），并减小 `<note><cue/>` 或 `<note-size type="cue">60</note-size>`（两者择一，保持一致）

### 5) 省略与重复

* 连续重复小节 ≥ 2，可用 `<measure-style><measure-repeat type="start">n</measure-repeat>`。
* 需要时加入小节线类型 `<barline location="right"><bar-style>light-heavy</bar-style></barline>`。
* 回二段、D.S./Coda 仅在结构明确时使用；否则保持线性。

### 6) 兼容性

* 顶层使用 `<score-partwise version="4.0">`。
* 每个 part 定义 `<score-instrument>` 与 `<midi-instrument>`（channel=10，设置 `midi-unpitched`）。
* 只用常见元素，避免高度定制的自定义标签。

---

## 输出（必须同时满足）

1. **主输出**：**完整 MusicXML** 文档（UTF-8，无多余注释）。
2. **可选**：若请求包含 `want_midi=true`，再输出 **标准 MIDI**（以 Base64 或用“\`\`\`midi”围栏包裹十六进制）。
3. **校验报告**（JSON，嵌在代码块里，便于 CI 检查）：

   ```json
   {
     "bars": 64,
     "invalid_bars": [],
     "quantization_warnings": 1,
     "dropped_events": 0,
     "ghost_notes": 12,
     "time_signature_changes": 1
   }
   ```

> **禁止**：输出片段式 XML、缺 `<part-list>`、小节时值不平衡、未声明 `<divisions>`。

---

## 误差与清洗

* 丢弃 `probability < 0.35` 的事件，并在报告中统计 `dropped_events`。
* 量化后若与原始事件差距 > 半个最小网格，发出 `quantization_warnings`。
* 同一时间戳若出现同乐器重复击打，只保留 velocity 最大者。
* 若同一拍出现 open/closed hi-hat 冲突：优先 open，closed 仅保留为装饰（或合并为 open）。

---

## 声部分配策略

* **默认**：voice 1 = 镲/军鼓，voice 2 = 大鼓/落地鼓；toms 根据上下文分配避免符干冲突。
* 当同一时刻同时出现 snare + tom：snare 留在 voice 1，tom 移 voice 2。
* 必要时对和弦写法使用 `<chord/>`，但鼓谱中尽量避免复杂叠加，优先分声部清晰度。

---

## Beaming（连线）细则

* 4/4：八分二连一束，十六四连一束；切分跨拍需断开。
* 6/8：三连一束（1-3、4-6）。
* 3/4：按拍分组，避免跨拍连束。
* 三连音：使用 `<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>` 并加上连括号 `<tuplet>`。

---

## 验证与自检（生成端必须执行）

* **小节时值平衡**（每小节严格相等）。
* `<divisions>` 与所有 `<duration>` 一致；**禁止**非整除结果。
* 所有 `<instrument id>` 在 `<part-list>` 中均有定义。
* MusicXML 通过至少一种常见软件（MuseScore/Finale/Sibelius）导入测试（约束：文本层面保证，不依赖实际运行）。

---

## Few-shot 示例

### 示例输入（片段）

```json
{
  "metadata": {
    "title": "Example Groove",
    "tempo_bpm": 100,
    "swing": false,
    "time_signatures": [{"bar_index":0,"beats":4,"beat_type":4}]
  },
  "grid": {"ppq":960,"divisions_per_quarter":8},
  "events": [
    {"bar":0,"beat":1,"tick":0,"instrument":"hh_closed","duration_ticks":480,"velocity":90,"probability":0.99},
    {"bar":0,"beat":1,"tick":0,"instrument":"kick","duration_ticks":480,"velocity":100,"probability":0.98},
    {"bar":0,"beat":1,"tick":480,"instrument":"hh_closed","duration_ticks":480,"velocity":88,"probability":0.99},
    {"bar":0,"beat":2,"tick":0,"instrument":"snare","duration_ticks":480,"velocity":100,"probability":0.98},
    {"bar":0,"beat":2,"tick":0,"instrument":"hh_closed","duration_ticks":480,"velocity":88,"probability":0.99},
    {"bar":0,"beat":2,"tick":480,"instrument":"hh_closed","duration_ticks":480,"velocity":88,"probability":0.99},
    {"bar":0,"beat":3,"tick":0,"instrument":"kick","duration_ticks":480,"velocity":100,"probability":0.98},
    {"bar":0,"beat":3,"tick":0,"instrument":"hh_closed","duration_ticks":480,"velocity":88,"probability":0.99},
    {"bar":0,"beat":3,"tick":480,"instrument":"hh_closed","duration_ticks":480,"velocity":88,"probability":0.99},
    {"bar":0,"beat":4,"tick":0,"instrument":"snare","duration_ticks":480,"velocity":100,"probability":0.98},
    {"bar":0,"beat":4,"tick":0,"instrument":"hh_closed","duration_ticks":480,"velocity":88,"probability":0.99},
    {"bar":0,"beat":4,"tick":480,"instrument":"hh_closed","duration_ticks":480,"velocity":88,"probability":0.99}
  ],
  "notation":{"quantize":"eighth","beam_grouping":"auto","accent_policy":"velocity_based","ghost_note_threshold":45}
}
```

### 期望输出（片段）

* 一个含有 P1（Drum Set）part 的 `<score-partwise version="4.0">`
* `<divisions>8</divisions>`；4/4；tempo=100；voice 1 放 HH+Snare；voice 2 放 Kick；HH 用 `<notehead>x</notehead>`；小节内时值平衡。
* 附带简短校验 JSON。

---

## 生成时的风格与健壮性

* **拒绝猜测**缺失信息：若输入不含`time_signatures`或`grid`，先声明假设（例如 4/4、divisions=8），并在校验报告中标注 `assumptions`.
* 一律输出 **完整文档**，不要只给片段。
* 对于不常用乐器（如：rimshot、china cymbal、splash），按 GM Percussion 合理映射，若无则在 `<direction>` 注明。
* **跨平台**：输出不得依赖特定字体；尽量使用标准 notehead 名称（`x`, `diamond`, `normal`）。

---

## 可选：同时产出 MIDI

* Channel 10；音高用 GM Drum key；速度变化写入 tempo map；力度由 velocity 映射。
* 仅作为播放与校验辅助，**MusicXML 仍为权威输出**。

---

## 返回格式（统一规范）

按下列顺序输出三个代码块（如不需要 MIDI，则省略第二块）：

```xml
<!-- 1) MusicXML -->
<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  ...
</score-partwise>
```

```midi
# 2) （可选）MIDI：Base64 或十六进制
TVRoZAAAAAYAAQAB...
```

```json
// 3) 校验报告
{"bars": 4, "invalid_bars": [], "quantization_warnings": 0, "dropped_events": 0, "ghost_notes": 0, "time_signature_changes": 0}
```

---

## 接入建议

* 将本文件命名为 **`PROMPT.md`**，置于仓库根目录或 `docs/PROMPT.md`。
* 让你的工具链（Cursor、Augment、其他 IDE 插件）在任务开始前**加载并贴上本规范**，再补充“本次输入的分析 JSON”。
* 在代码里（例如 `drumMap.ts`、`validate.ts`）也沿用此映射与校验规则，保证**提示词规范 = 代码实现**的一致性。

