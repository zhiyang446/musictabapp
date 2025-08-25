# MVP 分步计划（基于 `architecture.md`）

> 说明：任务**按实现顺序**排列；每个任务**很小、可测试**，有明确**开始/结束**与**验收（DoD）**。你可一次丢给工程 LLM 一个任务执行与验证。

---

## Phase A — 基础与项目骨架

**T01 — 初始化 Monorepo**

- 目标：创建 `repo/` 及 `apps/`, `services/`, `infra/`, `packages/`, `docs/` 目录与 `.gitignore`
- DoD：仓库结构与空 `README.md` 就绪；`git init` 成功
- 测试：`tree -L 2` 显示预期结构并提交初始 commit

**T02 — Node/Poetry 环境固定**

- 目标：固定 Node 版本（`.nvmrc`）与 Python 版本（`.python-version`/`pyproject.toml`）
- DoD：本机 `nvm use`、`poetry env use` 无报错
- 测试：`node -v`、`python -V` 输出锁定版本

**T03 — 代码规范与工具**

- 目标：前端 `eslint`/`prettier`、后端 `ruff`/`black` 配置与 `lint` 脚本
- DoD：`pnpm lint`/`poetry run ruff check` 通过
- 测试：引入一个格式问题并确认能被工具捕获

**T04 — CI（本地替代）脚本**

- 目标：在 `package.json`/`Makefile` 增加 `fmt`, `lint`, `test` 脚本
- DoD：本地运行 `make ci` 一键执行通过
- 测试：`make ci` 返回 0

**T05 — 环境变量模板**

- 目标：创建 `/.env.example`（含 SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY 等）
- DoD：`cp .env.example .env` 可用
- 测试：读取 `.env` 不缺关键变量

---

## Phase B — Supabase（Schema/Storage/RLS）

**T06 — 连接 Supabase 项目**

- 目标：在 `.env` 填入 `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- DoD：`curl $SUPABASE_URL` 返回 200/301
- 测试：用 `supabase-js` 建立一次匿名会话成功

**T07 — 创建 Storage Buckets**

- 目标：新建 `audio-input/`, `audio-stems/`, `outputs/`, `previews/`
- DoD：四个 bucket 存在
- 测试：上传一个空文件到 `audio-input/` 成功

**T08 — 建 `profiles` 表**

- 目标：按 `architecture.md` 建表
- DoD：`select * from profiles limit 1;` 成功
- 测试：插入一条样例并能查询

**T09 — 定义 `job_status` 枚举**

- 目标：建枚举 `PENDING|QUEUED|RUNNING|SUCCEEDED|FAILED|CANCELED`
- DoD：`select unnest(enum_range(null::job_status));` 返回 6 项
- 测试：OK

**T10 — 建 `jobs` 表**

- 目标：按文档字段创建
- DoD：`insert` 一条伪记录成功
- 测试：`select status from jobs;` 返回 `PENDING`

**T11 — 建 `artifacts` 表**

- 目标：按文档字段创建
- DoD：外键 → `jobs(id)` 生效
- 测试：`insert` 一条 `artifacts` 关联任务成功

**T12 — 建 `stems` 表**

- 目标：按文档字段创建
- DoD：外键生效
- 测试：插入一条关联记录成功

**T13 — 建 `usage_log` 表**

- 目标：按文档字段创建
- DoD：可插入记录
- 测试：`select * from usage_log;` 返回 1 行

**T14 — 打开 RLS**

- 目标：对四张表启用 RLS
- DoD：`alter table ... enable row level security;` 完成
- 测试：匿名角色无法读取数据

**T15 — RLS 策略：仅本人可见**

- 目标：`user_id = auth.uid()` 的行可见/可写
- DoD：策略已创建
- 测试：用两个不同用户测试：A 可见自己，B 看不到 A

**T16 — Orchestrator 服务角色访问策略**

- 目标：创建仅后端使用的服务 key 访问策略（最小权限）
- DoD：服务角色能读写必要表
- 测试：使用 SERVICE_ROLE_KEY 成功插入/更新

**T17 — 索引优化**

- 目标：`jobs(user_id, created_at desc)`、`artifacts(job_id)`、`stems(job_id)`
- DoD：`create index` 成功
- 测试：`explain analyze` 显示命中索引

---

## Phase C — Orchestrator（FastAPI骨架 + 基础路由）

**T18 — FastAPI 项目骨架**

- 目标：`services/orchestrator/` 初始化，`main.py` + `pyproject.toml`
- DoD：`uvicorn main:app` 启动
- 测试：访问 `/docs` 正常

**T19 — 健康检查路由**

- 目标：`GET /health` 返回 `{ok:true}`
- DoD：路由可用
- 测试：`curl /health` 200

**T20 — Supabase 客户端封装**

- 目标：基于服务密钥的 Postgres 访问层封装
- DoD：可从 API 查询 `select 1`
- 测试：`GET /health/db` 返回 `db:true`

**T21 — JWT 中间件（Supabase）**

- 目标：解析 `Authorization: Bearer`，验证并注入 `user_id`
- DoD：无 token 401；有 token 通过
- 测试：用匿名与用户 token 分别访问

**T22 — `POST /upload-url`（签名上传）**

- 目标：输入 `fileName`,`contentType`，返回 `url`,`storagePath`
- DoD：响应含可用 `url` & `storagePath`
- 测试：用 `PUT` 上传一个小文件成功

**T23 — `POST /jobs`（创建任务）**

- 目标：写入 `jobs(PENDING)`，返回 `jobId`
- DoD：DB 存在新行，`user_id` 归属正确
- 测试：`select * from jobs where id=?;` 命中

**T24 — `GET /jobs`（分页）**

- 目标：按 `user_id` 返回列表，支持 `status`/`cursor`
- DoD：分页工作
- 测试：插入多条后分页校验总数

**T25 — `GET /jobs/:id`**

- 目标：返回单任务详情
- DoD：仅本人的任务可查
- 测试：跨用户访问返回 403

**T26 — `GET /jobs/:id/artifacts`**

- 目标：列出任务产物
- DoD：返回空数组或列表
- 测试：插入模拟产物后能查到

**T27 — `GET /artifacts/:id/signed-url`**

- 目标：返回短效下载 URL
- DoD：URL 可下载对象
- 测试：浏览器打开 URL 成功下载

---

## Phase D — 队列与 Worker（先打通空跑）

**T28 — Redis & Celery 配置**

- 目标：`celery[redis]` 依赖与 `celeryconfig.py`
- DoD：`celery -A worker.app worker` 启动
- 测试：执行一个空任务返回

**T29 — Orchestrator 推队列**

- 目标：`POST /jobs` 同时推送 `process_job.delay(job_id)`
- DoD：创建任务后队列出现消息
- 测试：观察 worker 日志收到任务

**T30 — Worker 空实现**

- 目标：读取 `job_id`，将 `status=RUNNING`→`SUCCEEDED`（无产物）
- DoD：任务状态更新成功
- 测试：前端或 DB 查询状态 100%

**T31 — 产物占位写入**

- 目标：写入 1 个占位 `artifact`（txt）
- DoD：`artifacts` 至少 1 条
- 测试：`GET /jobs/:id/artifacts` 返回该记录

**T32 — 进度上报**

- 目标：Worker 在 0→25→60→100 更新 `progress`
- DoD：DB 中 `progress` 逐步变化
- 测试：观察变化（手动轮询）

---

## Phase E — React Native（MVP 界面流）

**T33 — Expo RN 初始化**

- 目标：`apps/mobile` 使用 Expo Router 或 React Navigation
- DoD：`expo start` 启动
- 测试：模拟器看到欢迎页

**T34 — Supabase 客户端集成**

- 目标：创建单例 `supabase/client.ts`
- DoD：能获取匿名会话
- 测试：控制台打印 `session:null` OK

**T35 — 登录页（Email/Password 或 Magic Link）**

- 目标：实现登录/登出 UI
- DoD：登录后能拿到 `access_token`
- 测试：刷新应用仍保留会话

**T36 — 上传页：获取签名 URL**

- 目标：表单选择本地音频 → 调用 `/upload-url`
- DoD：能够拿到签名 URL
- 测试：日志输出 `storagePath`

**T37 — 上传页：直传音频**

- 目标：使用 `PUT` 将选中文件上传到 `audio-input/`
- DoD：上传成功、返回 200
- 测试：从 Supabase 控制台看到文件

**T38 — 乐器选择页**

- 目标：多选（drums/bass/guitar/piano/chords）与 options（separate/precision）
- DoD：状态在本地 store 保持
- 测试：切页返回仍保留选择

**T39 — 创建任务（上传模式）**

- 目标：提交 `sourceType=upload + storagePath + instruments + options`
- DoD：收到 `jobId` 并跳转详情
- 测试：详情页能显示 `PENDING/QUEUED`

**T40 — 任务列表页**

- 目标：调用 `GET /jobs` 显示分页列表
- DoD：下拉刷新与分页 OK
- 测试：创建多任务后列表正确

**T41 — 任务详情页 + Realtime**

- 目标：订阅 `jobs` 行变更并更新进度条
- DoD：进度条随 DB 变化
- 测试：空跑任务显示 0→100

**T42 — 产物列表 + 下载**

- 目标：调用 `GET /jobs/:id/artifacts` + `signed-url`
- DoD：可点击下载（系统浏览器）
- 测试：下载占位文件成功

**T43 — PDF 预览（WebView）**

- 目标：如果产物类型为 PDF，内嵌 WebView 打开
- DoD：能在应用内看到 PDF
- 测试：加载一个示例 PDF

---

## Phase F — YouTube 链接流程

**T44 — Orchestrator 支持 `sourceType=youtube`**

- 目标：`POST /jobs` 验证 `youtubeUrl`
- DoD：DB 正确保存 URL
- 测试：`select youtube_url from jobs` 正确

**T45 — Worker：`yt-dlp` 下载音频**

- 目标：将音频抓取为 `m4a/mp3`，上传至 `audio-input/`
- DoD：Storage 出现该文件
- 测试：下载一个 30s 视频音频成功

**T46 — 端到端：YouTube 任务空跑**

- 目标：创建 YT 任务→空跑完成
- DoD：状态 `SUCCEEDED`
- 测试：列表与详情刷新正确

---


## Phase G — 音频处理最小实现（Drums & Bass）——（**详细版：含库、命令、验收**）

> 目标：把“音频 →（可选）分离 → 转写 → 标准化 → 导出 MIDI/MusicXML/PDF”端到端最小打通；先做 **鼓、贝斯** 两个乐器。

**前置统一依赖（一次性）**
- 系统：`ffmpeg`、MuseScore（CLI 可选，或 LilyPond）
- Python：`pip install demucs spleeter omnizart pretty_midi mido music21 basic-pitch librosa soundfile numpy`
- 可选：`pip install musescore-downloader`（或本地安装 MuseScore 4 并把 `mscore`/`mscore4portable` 加入 PATH）

---

**T47 — ffmpeg 预处理**
- **目标**：将所有输入音频统一到 `wav / 44.1kHz / mono`（或保留声道，先用 mono 简化）
- **实现**：
  - 命令：`ffmpeg -i input.mp3 -ac 1 -ar 44100 -vn tmp/normalized.wav`
  - 代码：使用 `ffmpeg` 或 `librosa.load(..., sr=44100, mono=True)` 读写
- **DoD**：生成 `tmp/normalized.wav`；`ffprobe` 显示采样率 44100、1 声道
- **测试**：对 10–30s 的样例音频运行命令并在仓库记录 `ffprobe` 结果

---

**T48 — 源分离（可选开关）**
- **目标**：提供 `options.separate=[none|demucs|spleeter]`，默认 `none`，可切到 `demucs`（质量优先）或 `spleeter`（速度优先）
- **实现**：
  - **Demucs**：`python -m demucs -n htdemucs_ft tmp/normalized.wav` → 输出 `separated/htdemucs_ft/normalized/` 下 `drums.wav | bass.wav | other.wav | vocals.wav`（模型可能不同，按实际为准）
  - **Spleeter(5stems)**：`spleeter separate -i tmp/normalized.wav -p spleeter:5stems -o separated/`
- **DoD**：当 `separate != none`，产出对应 stem 文件夹；否则直接将 `tmp/normalized.wav` 复制作为 `stems/drums.wav`（占位）
- **测试**：开/关分离开关，确认后续步骤均可继续

---

**T49 — 鼓：转写（Omnizart Drum）→ 原始事件 MIDI**
- **目标**：将 `drums.wav` 转为鼓击事件（kick/snare/hihat/…）并输出一个**原始 MIDI**（未标准化）
- **安装**：`pip install omnizart`
- **命令**：`omnizart drum transcribe stems/drums.wav --output tmp/drums_raw.mid`
- **DoD**：生成 `tmp/drums_raw.mid`，在 DAW/MuseScore 可播放并可见事件
- **测试**：对 8 小节“动次打次”节奏样例，raw MIDI 至少包含 kick/snare/hh 三类事件

---

**T50 — 鼓：MIDI 标准化（量化、并行合并、GM Perc、ghost note）**
- **目标**：把 `drums_raw.mid` 标准化成“可读的鼓谱 MIDI”
- **规则**：
  1) **量化**：对齐到 1/16 网格（Swing 情况 1/12）  
  2) **并行合并**：同一拍/同一 tick 的多鼓件（如 `kick+hh`、`snare+hh`）必须写在同一时刻（polyphonic），避免“看起来不同步”  
  3) **GM Percussion 映射**：Kick=36，Snare=38，Hi-Hat Closed=42，Hi-Hat Open=46，Hi-Hat Pedal=44，Crash=49，Ride=51（兜底归并）  
  4) **ghost note**：力度 < 40 视作 ghost，力度回写为 25–35；极短毛刺 (<25ms) 移除  
- **实现**：用 `pretty_midi/mido` 读取 `drums_raw.mid` → 应用上述规则 → 写出 `tmp/drums_standard.mid`
- **DoD**：`tmp/drums_standard.mid` 在 MuseScore/DAW 中可见 **1/16 对齐** 且 **hat 与 kick/snare 同拍叠打**；音高符合 GM Perc 规范
- **测试**：以动次打次（1、2、3、4 拍均有 hat）校验叠打是否正确呈现


**T50.5 — 鼓：LLM 智能校对（节拍/叠打/符头一致性）**
- **目标**：在 T50 标准化后，利用 LLM（ChatGPT/GPT‑4/5）基于“事件 JSON + 规则”进行乐理级修正，输出修订后的事件并回写到 MIDI
- **输入 JSON Schema（示例）**：
  ```json
  {
    "meta": {"time_signature":"4/4","tempo_bpm":120,"grid":"1/16","swing":false},
    "track_type":"drums",
    "events":[
      {"t":0.0,"dur":0.25,"pitch":36,"label":"kick","vel":105,"conf":0.82},
      {"t":0.0,"dur":0.25,"pitch":42,"label":"hh_closed","vel":80,"conf":0.91},
      {"t":0.5,"dur":0.25,"pitch":38,"label":"snare","vel":96,"conf":0.84}
    ]
  }
  ```
- **System Prompt（建议固定）**：
  > 你是音乐转写审校官。基于输入的鼓事件（含时间、力度、置信度、乐器标签、节拍信息），将其修正为标准且可演奏的版本。  > 规则：1) 对齐到给定网格；2) 维持 2/4 拍 backbeat；3) Hi‑Hat 以 42 为闭合，46 为开启，44 为踏钹；4) 删除 <25ms 的毛刺与极低置信度事件；5) 同拍叠打需并行呈现；6) 统一 GM Perc 编码；7) ghost note 力度 <40。
- **User Prompt（示例）**：
  > 请按规则修正以下鼓事件，保持“动次打次”风格一致性。输出修订后的 `events` 与 `edits` 列表（说明每处修改原因）。输入：`{{JSON}}`
- **实现**：
  1) 将 `tmp/drums_standard.mid` 解析为上述 JSON；  2) 请求 LLM 获得 `fixed.events`；  3) 生成 `tmp/drums_llm.mid`（保留 GM Perc 与 polyphonic 叠打）。
- **DoD**：`tmp/drums_llm.mid` 在 MuseScore/DAW 中可见更整齐的 1/16 对齐；不合理的重叠/串音减少；2 与 4 拍 backbeat 更稳定。
- **测试**：用 8 小节样例统计 LLM “删除/量化/重映射” 的 edit 数量占比；人工听测节拍更稳。


---

**T51

**T50.5 — 鼓：MIDI 智能校对（LLM 辅助）**
- **目标**：在标准化 MIDI 基础上，利用 LLM（ChatGPT/GPT-4/5）做乐理与排版修正
- **输入**：`tmp/drums_standard.mid` 解析为 JSON（事件列表：时间、音高、力度、鼓件标签、置信度）
- **提示词**：
  - “对齐到 1/16 网格；同一拍多鼓件合并；Ghost note 力度<40；Hi-Hat 用 42/46；Kick=36, Snare=38；输出修正后的 JSON 并说明 edits。”
- **实现**：
  - 解析 MIDI → JSON  
  - 调用 OpenAI ChatCompletions API，带入系统 + 用户 Prompt  
  - 将返回的 JSON 应用回 MIDI → `tmp/drums_llm.mid`
- **DoD**：生成 `tmp/drums_llm.mid`，与 `drums_standard.mid` 比较可见修正（量化/合并/去噪）
- **测试**：用“动次打次”样例跑一遍，观察 2、4 拍的 hi-hat 与 snare 是否更合理地对齐


**T51 — 鼓：MusicXML 导出（music21 映射到鼓谱符位/符头）**
- **目标**：将标准化 MIDI 转为**标准鼓谱 MusicXML**
- **映射**：
  - Hi-Hat：顶线上方，`notehead="x"`；Snare：中线圆头；Kick：低线圆头；Crash/Ride：最上方 X 头；Tom 高中低依次排列
  - 使用 `music21` 的 `Unpitched`/`Percussion` 记谱，并在同一拍使用 `Chord` 叠音
- **实现**：`music21` 读取 `tmp/drums_standard.mid` → 依据自定义 mapping（pitch→staffLine/notehead）生成 `stream.Part`（isPercussion）→ `score.write("musicxml", "out/drums.xml")`
- **DoD**：生成 `out/drums.xml`，用 MuseScore 打开：hi-hat 为 X 符号、kick/snare 与其**同拍叠写**且小节线/拍号正确
- **测试**：随机抽 2 小节核对：2、4 拍军鼓 backbeat 与 hat 同时显示；导出无报错

---

**T52 — 鼓：PDF 渲染（MuseScore CLI 或 LilyPond）**
- **目标**：把 `out/drums.xml` 渲染为可分享的 PDF
- **MuseScore CLI 示例**：
  - `mscore -o out/drums.pdf out/drums.xml`（或 `mscore4portable` / `musescore-portable`，视环境而定）
- **LilyPond（可选路径）**：将 MusicXML 转换后渲染
- **DoD**：生成 `out/drums.pdf`，排版可读
- **测试**：打开 PDF 视觉检查两页以内不溢出、谱号/拍号清晰

---

**T53 — 贝斯：转写（Basic Pitch 或 Omnizart Music）→ 单旋律 MIDI**
- **目标**：从 `bass.wav` 提取主旋律/低音线并输出 MIDI
- **方案 A（推荐）**：**Basic Pitch**（对单旋律友好，弯音鲁棒）  
  - 安装：`pip install basic-pitch`
  - 代码/CLI：使用项目提供的推理接口导出 `tmp/bass_raw.mid`
- **方案 B**：Omnizart Music（多声部可能过拟合，先用 A）
- **DoD**：`tmp/bass_raw.mid` 在 DAW 有单音轨，基本跟原曲低音走向一致
- **测试**：8 小节样例与参考 MIDI 比对，音高准确率肉眼可接受（>80%）

---

**T54 — 贝斯：标准化 & 导出（MIDI → MusicXML → PDF）**
- **目标**：类似鼓流程进行标准化：
  - 量化到 1/16；限制音域（E1–G4）；去除极短毛刺与不可能跳进
  - `music21` 生成五线谱 MusicXML（低音谱号），导出 `out/bass.xml` → 渲染 `out/bass.pdf`
- **DoD**：`out/bass.xml`、`out/bass.pdf` 生成并可读
- **测试**：节拍、小节线正确；与原曲低音听感匹配


**T54.5 — 贝斯：LLM 智能校对（音域/节奏/和声合理化）**
- **目标**：在 T54 前（或后）使用 LLM 对贝斯初稿事件进行乐理审校，减少错音/乱节奏
- **输入 JSON Schema（示例）**：与鼓类似，但 `track_type="bass"`，并提供可选 `key_hint`
- **System Prompt（建议）**：
  > 你是贝斯转写的乐理审校官。规则：1) 对齐到 1/16 网格（或 swing 1/12）；2) 限制音域 E1–G4；3) 优先根音/五度/三度走向，避免不合理大跳；4) 删除 <25ms 毛刺与极低置信度事件；5) 处理延音与连音，不拆碎同一拍的持续音。
- **User Prompt（示例）**：
  > 请在保留风格的前提下修正以下贝斯事件，输出修订后的 `events` 与 `edits`，并给出推测的每小节和声（如 I‑V‑vi‑IV）。输入：`{{JSON}}`
- **实现**：将 `tmp/bass_raw.mid`（或 `tmp/bass_standard.mid`）解析为 JSON → LLM 修订 → 回写 `tmp/bass_llm.mid`；再走 `music21` 导出 `out/bass.xml/pdf`。
- **DoD**：`tmp/bass_llm.mid` 的跳进跳出更自然、节拍对齐更稳，导出的 `out/bass.pdf` 视觉更规整。
- **测试**：与未校对版本对比，错音/毛刺数量下降；人工听感更贴合原曲低音。


---

**T55

**T54.5 — 贝斯：MIDI 智能校对（LLM 辅助）**
- **目标**：对 `bass_raw.mid` 或 `bass_standard.mid` 进行乐理/音域/和弦合理性校正
- **输入**：MIDI 解析为 JSON（事件列表：时间、音高、力度、置信度）
- **提示词**：
  - “对齐到 1/16 网格；限制音域 E1–G4；避免不合理大跳进；若与常见和声冲突，优先根音/五度/三度；输出修正后的 JSON 并说明 edits。”
- **实现**：
  - 解析 MIDI → JSON  
  - 调用 LLM 修订 → 生成新 JSON  
  - 应用修订 JSON → 输出 `tmp/bass_llm.mid`
- **DoD**：`tmp/bass_llm.mid` 在 DAW 播放时更平滑，错误音/超域音减少
- **测试**：对一段含跳进的低音样例，校对前后比对，错误跳音被修复或转位


**T55 — 选项通路与验收脚本**
- **目标**：打通处理参数并提供一键冒烟
  - `precision: fast|balanced|high`（影响分帧步长/阈值）
  - `separate: none|demucs|spleeter`
  - `grid: 1/12|1/16`（swing 或直板）
- **实现**：`scripts/process_demo.sh`：
  1) 预处理 →（可选）分离  
  2) 鼓：转写→标准化→XML→PDF  
  3) 贝斯：转写→标准化→XML→PDF  
- **DoD**：一条命令在 `./out/` 产出：`drums.mid/xml/pdf` 与 `bass.mid/xml/pdf`
- **测试**：更换 `precision` 和 `grid` 参数能看到显著差异（速度/节拍对齐）


## Phase H — 配额/用量/取消与错误处理 — 配额/用量/取消与错误处理

**T56 — 统计音频秒数**

- 目标：Worker 计算秒数并写 `usage_log.seconds_processed`
- DoD：`usage_log` 存在对应记录
- 测试：短音频与长音频秒数正确

**T57 — 简单配额检查（Orchestrator）**

- 目标：按 `profiles.tier` 限制每月总秒数（阈值写死）
- DoD：超限返回 `402/429`
- 测试：模拟累计超过后创建任务失败

**T58 — 取消任务**

- 目标：`POST /jobs/:id/cancel` 将状态标记，并在 Worker 侧检查中断
- DoD：已取消任务不再处理
- 测试：创建任务后立即取消，状态保持 `CANCELED`

**T59 — 错误上报**

- 目标：异常时更新 `status=FAILED` 与 `error_message`
- DoD：详情页显示错误理由
- 测试：人为触发下载失败，看到错误文案

---

## Phase I — 观测性与日志

**T60 — 结构化日志**

- 目标：Orchestrator/Worker 统一 JSON 日志，含 `job_id`, `user_id`, `phase`
- DoD：日志可 grep 与关联
- 测试：执行一次任务，日志完整

**T61 — Orchestrator `/metrics`**

- 目标：暴露基础指标：请求时延、2xx/4xx/5xx 计数
- DoD：`GET /metrics` 输出文本
- 测试：curl 查看指标存在

**T62 — Worker 指标**

- 目标：任务计数、阶段耗时（下载/转码/转录/渲染/上传）
- DoD：日志或简单指标端点输出
- 测试：跑一单任务并检查各阶段耗时

---

## Phase J — 打包与本地“仿生产”验证

**T63 — Orchestrator Dockerfile**

- 目标：多阶段构建 + 非 root 运行
- DoD：`docker build` 成功，容器启动 `/health` 正常
- 测试：`docker run -p 8080:8080` 手测

**T64 — Worker Dockerfile**

- 目标：包含 `ffmpeg`、`yt-dlp`、`music21`、MuseScore/LilyPond（按选用）
- DoD：容器可启动并连接 Redis
- 测试：发一个任务，容器内跑通空任务

**T65 — `docker-compose.dev.yml`**

- 目标：编排 Orchestrator + Worker + Redis（Supabase 仍用云端）
- DoD：`docker compose up` 全部服务健康
- 测试：端到端提交任务→生成 PDF 成功

**T66 — 冒烟脚本**

- 目标：`scripts/smoke.sh`：1）上传短音频→2）创建鼓任务→3）轮询状态→4）拉取 PDF
- DoD：一条命令完成端到端验证
- 测试：本地执行成功并下载到 `./tmp/score.pdf`

---

## Phase K — RN 端用户体验最小打磨（可并行）

**T67 — 错误与重试提示**

- 目标：为上传、创建任务、下载添加错误提示与重试按钮
- DoD：UI 明确可操作
- 测试：断网/限网场景手测

**T68 — 进度条与步骤提示**

- 目标：以步骤显示（下载→预处理→转录→渲染→上传）
- DoD：状态切换可见
- 测试：空跑与真实跑对照

**T69 — 历史任务筛选**

- 目标：按 `status` 与乐器筛选列表
- DoD：筛选起效
- 测试：多任务手测筛选

**T70 — 简易引导与版权提示**

- 目标：首登引导页，说明长度限制与版权
- DoD：首次显示，可跳过
- 测试：二次进入不再出现

---

# 交付与里程碑

- **里程碑 M1（T01–T27）**：后端 CRUD + 签名上传 + RN 基础登录/上传 UI（空跑）
- **里程碑 M2（T28–T46）**：队列打通 + RN 端任务流 + YouTube 流程（仍空跑）
- **里程碑 M3（T47–T55）**：鼓 & 贝斯最小可用产物（MIDI/MusicXML/PDF）
- **里程碑 M4（T56–T66）**：配额/取消/错误、日志/指标、Docker 化与冒烟脚本
- **里程碑 M5（T67–T70）**：RN 体验打磨（必需的用户可用性）

> 建议：严格**一次只执行一个任务**。每完成一个任务即运行其**测试**，记录结果，再进入下一任务。
