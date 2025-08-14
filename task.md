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

## Phase G — 音频处理最小实现（Drums & Bass）

**T47 — ffmpeg 预处理**

- 目标：全部音频统一转为 `wav, 44.1kHz, mono`（或保留原声道）
- DoD：输出临时 `wav` 文件
- 测试：`ffprobe` 显示期望格式

**T48 — 可选：源分离（占位/跳过）**

- 目标：保留 `options.separate` 参数通路；初期直接返回原音频
- DoD：分支逻辑可运行
- 测试：开启/关闭对后续无副作用

**T49 — 鼓：简单击打检测 → MIDI**

- 目标：能粗略识别 kick/snare/hihat 的 onset → 量化到节拍格
- DoD：产出一个含 3 轨道的 MIDI
- 测试：用 DAW 打开能听到对应轨

**T50 — 鼓：MIDI → MusicXML**

- 目标：用 `music21` 生成基础鼓谱 XML（节拍/小节线/基本符头）
- DoD：输出 `musicxml` 文件
- 测试：用 MuseScore 打开不报错

**T51 — 鼓：PDF 渲染**

- 目标：MuseScore CLI 或 LilyPond 从 MusicXML 导出 PDF
- DoD：输出 `pdf`，谱面可读
- 测试：本地打开 PDF 视觉检查

**T52 — 鼓：产物上传**

- 目标：`artifacts` 写入 `midi/musicxml/pdf` 三个
- DoD：`GET /jobs/:id/artifacts` 返回 3 项
- 测试：RN 端可下载并预览 PDF

**T53 — 贝斯：f0 跟踪 → MIDI**

- 目标：使用轻量 f0（如 `crepe`）输出贝斯单音 MIDI
- DoD：产出单音轨 MIDI
- 测试：DAW 播放与原曲音高大致吻合

**T54 — 贝斯：MIDI → MusicXML & PDF**

- 目标：同鼓流程生成 XML 与 PDF
- DoD：`artifacts` 新增 3 项（bass）
- 测试：MuseScore 打开 XML，PDF 预览正常

**T55 — 选项通路**

- 目标：`precision: fast|balanced|high` 对采样步长/阈值生效
- DoD：参数改变影响处理时长/结果
- 测试：设置 `fast` 明显更快

---

## Phase H — 配额/用量/取消与错误处理

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
