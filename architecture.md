# 🎼 音乐谱自动生成系统：架构设计（React Native + Supabase）

面向：**能上传歌曲文件或添加 YouTube 链接，选择目标乐器并自动生成对应乐谱**的移动端产品。前端使用 **React Native**，鉴权与数据库/对象存储使用 **Supabase**，服务端编排网关（Orchestrator）+ **Python ML Worker** 进行音频分离、转录、导出（MusicXML/MIDI/PDF）。

---

## 1) 系统总览（High-Level Overview）

**关键能力**

* 输入：本地上传音频或提交 YouTube 链接
* 处理：可选源分离（drums/bass/guitar/piano/vocals），按目标乐器转录
* 输出：MusicXML / MIDI / PDF（可预览和下载）
* 控制：登录鉴权、任务状态、配额与用量、可观测性

**核心组件**

1. **移动端 App（React Native）**
   上传/输入链接 → 选择乐器 → 创建任务 → 订阅进度 → 预览/下载产物
2. **Supabase（Auth + Postgres + Storage + Realtime）**

   * Auth：邮箱/第三方登录
   * DB：任务状态机、制品索引、用量日志
   * Storage：原始音频 / 分离 stems / 输出产物
   * Realtime：任务状态与进度推送
3. **Orchestrator（API 网关：FastAPI 或 Supabase Edge Functions）**
   鉴权与权限、创建任务、签名上传、签名下载、推送队列、汇总状态
4. **ML Worker（Python + GPU）**
   下载 → 预处理 →（可选）源分离 → 乐器级转录 → 导出 MusicXML/MIDI → 渲染 PDF
5. **队列/作业系统（Redis + Celery / 等价云托管）**
   异步长任务、重试、并发/优先级控制、幂等缓存
6. **可观测性（OpenTelemetry/Prometheus/Loki/Grafana）**
   调用链、资源监控、错误报警

---

## 2) Monorepo 目录与文件结构

```txt
repo/
├─ apps/
│  └─ mobile/                         # React Native 应用（Expo 或纯 RN）
│     ├─ app/                         # Expo Router 或 src/
│     │  ├─ (auth)/                   # 登录/注册/魔法链接
│     │  ├─ upload/                   # 上传/YouTube 链接输入
│     │  ├─ instruments/              # 选择乐器与参数
│     │  ├─ jobs/                     # 任务列表/详情/进度
│     │  └─ viewer/                   # 乐谱/MIDI 预览
│     ├─ components/                  # 通用组件
│     ├─ hooks/                       # 自定义 hook（含 Realtime 订阅）
│     ├─ stores/                      # Zustand/Redux（本地 UI 状态）
│     ├─ services/                    # API SDK（Orchestrator + Supabase）
│     ├─ utils/                       # 工具函数（校验/格式化/节流等）
│     └─ supabase/                    # Supabase 客户端与类型
│
├─ services/
│  ├─ orchestrator/                   # FastAPI（或 Edge Functions）
│  │  ├─ src/
│  │  │  ├─ api/                      # 路由：/jobs /upload-url /artifacts
│  │  │  ├─ auth/                     # JWT 校验、RLS 配合
│  │  │  ├─ db/                       # Postgres 访问层
│  │  │  ├─ mq/                       # 队列投递（Redis/Celery）
│  │  │  ├─ storage/                  # 签名上传/下载 URL
│  │  │  └─ schemas/                  # DTO（Pydantic 或 TS）
│  │  └─ tests/
│  │
│  └─ worker/                         # Python + GPU 模型与流水线
│     ├─ src/
│     │  ├─ pipelines/
│     │  │  ├─ separate.py            # Demucs/HT 分离
│     │  │  ├─ transcribe_drums.py    # 鼓谱转录
│     │  │  ├─ transcribe_bass.py     # 贝斯转录
│     │  │  ├─ transcribe_guitar.py   # 吉他转录/和弦/Tab
│     │  │  ├─ transcribe_piano.py    # 钢琴多声部
│     │  │  ├─ chord_key_bpm.py       # 和弦/调性/BPM
│     │  │  └─ render_score.py        # MusicXML→PDF（LilyPond/MuseScore）
│     │  ├─ jobs/                     # Celery 任务定义与重试策略
│     │  ├─ io/                       # Supabase Storage 下载/上传
│     │  ├─ utils/                    # ffmpeg/切片/缓存/哈希
│     │  └─ models/                   # 权重与模型封装
│     └─ tests/
│
├─ infra/
│  ├─ docker/                         # Dockerfile / docker-compose.dev.yml
│  ├─ k8s/                            # 部署清单（可选）
│  ├─ terraform/                      # 云资源（可选）
│  └─ observability/                  # Prometheus/Grafana/Loki 配置
│
├─ packages/
│  ├─ types/                          # OpenAPI/TS 类型或 JSON Schemas
│  └─ ui/                             # 跨端 UI 组件（可选）
│
└─ docs/
   └─ api.md                          # API 文档与状态机说明
```

---

## 3) 各目录职责与模块边界

### apps/mobile

* **app/(auth)**：注册/登录/会话管理（Supabase Auth）
* **app/upload**：

  * 本地选择音频 → 请求签名 URL → 直传到 Storage
  * 粘贴 YouTube 链接 → 直接提交后端
* **app/instruments**：勾选乐器（drums/bass/guitar/piano/chords），可选开关：是否源分离、精度等级
* **app/jobs**：任务列表（分页/过滤）、任务详情（进度条/错误显示）
* **app/viewer**：PDF 预览（WebView）、可选 MIDI 播放器/瀑布流
* **stores**：UI 局部状态（Zustand/Redux）
* **services**：

  * `api.ts`：与 Orchestrator 的 REST 交互
  * `supabase.ts`：单例客户端、Realtime 订阅封装

### services/orchestrator

* **api**：

  * `/upload-url`：返回签名上传 URL（或直接走 Supabase 客户端也可）
  * `/jobs`：创建/查询/取消任务
  * `/artifacts`：列出与签名下载
* **auth**：校验 Supabase JWT，注入 `user_id` 贯穿请求链
* **db**：对 `jobs/artifacts/stems/usage_log` 的读写（与 RLS 策略配合）
* **mq**：将任务（job\_id + 参数）投递到 Celery/队列
* **storage**：生成短期有效签名 URL 与路径规范

### services/worker

* **pipelines**：音频处理主流程：下载→预处理→（可选）分离→按乐器转录→导出→渲染→上传
* **jobs**：Celery 任务（重试、超时、并发限制、优先级）
* **io**：操作 Supabase Storage 与 Orchestrator 回调（或直接写 DB）
* **models**：加载/热身模型，显存与 batch 策略管理

---

## 4) 数据库与存储（Supabase Postgres + Storage）

### 4.1 表结构（简化 SQL）

```sql
-- profiles：用户扩展信息
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  tier text default 'free',                 -- free / pro / enterprise
  created_at timestamptz default now()
);

-- 任务状态
create type job_status as enum ('PENDING','QUEUED','RUNNING','SUCCEEDED','FAILED','CANCELED');

-- jobs：任务编排
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null,                -- 'upload' | 'youtube'
  source_object_path text,                  -- Storage 路径（上传模式）
  youtube_url text,                         -- 链接模式
  instruments text[] not null,              -- ['drums','bass','guitar','piano','chords']
  options jsonb default '{}'::jsonb,        -- 分离/精度/阈值等
  status job_status not null default 'PENDING',
  progress int default 0,                   -- 0-100
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- artifacts：输出制品（一个任务多产物）
create table public.artifacts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  kind text not null,                       -- 'midi' | 'musicxml' | 'pdf' | 'preview'
  instrument text,                          -- 'drums'/'bass'/... 或 'mix'/'chords'
  storage_path text not null,
  bytes int,
  created_at timestamptz default now()
);

-- stems（可选）：分离后的音轨
create table public.stems (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  stem text not null,                       -- 'drums'|'bass'|'other'...
  storage_path text not null,
  created_at timestamptz default now()
);

-- 用量日志（可选）
create table public.usage_log (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid,
  seconds_processed int,                    -- 音频秒数
  gpu_seconds numeric,                      -- 推理 GPU 时间
  created_at timestamptz default now()
);
```

**RLS 建议**

* 开启 `jobs/artifacts/stems/usage_log` 的 RLS：`user_id = auth.uid()` 的行才可见/可写
* Orchestrator/Worker 使用服务角色（service role key）执行必要的后端写入

### 4.2 Storage Bucket 规划

```
audio-input/      # 原始音频（上传或 YouTube 抓取）
audio-stems/      # 分离后的 stems（可选缓存，便于失败重跑）
outputs/          # 产物：{jobId}/{instrument}/{type}.{ext}
previews/         # 预览图（可选）
```

---

## 5) API 设计（Orchestrator）

**鉴权**：前端携带 Supabase JWT：`Authorization: Bearer <token>`

```
POST   /upload-url
  req:  { fileName, contentType }
  res:  { url, storagePath }              # 直传 Storage

POST   /jobs
  req:  {
          sourceType: 'upload' | 'youtube',
          storagePath?: string,
          youtubeUrl?: string,
          instruments: string[],          # ['drums','bass','guitar','piano','chords']
          options?: { separate?: boolean, precision?: 'fast'|'balanced'|'high' }
        }
  res:  { jobId }

GET    /jobs?status=&limit=&cursor=
GET    /jobs/:id
GET    /jobs/:id/artifacts
GET    /artifacts/:artifactId/signed-url  # 短效下载 URL

POST   /jobs/:id/cancel
```

**Worker 与状态同步（两种其一）**

1. Worker 直接写 DB（服务账号，受最小权限控制）
2. Worker 回调 Orchestrator：

   * `POST /jobs/:id/progress { progress }`
   * `POST /jobs/:id/complete { success, artifacts[], errorMessage? }`

---

## 6) 前端状态存储与页面流

**本地 UI 状态（Zustand/Redux）**

* 上传/链接输入、乐器选择、参数（分离/精度）
* 本地暂存 `storagePath` 或 `youtubeUrl`

**服务端状态（React Query/SWR）**

* `useJobsList`、`useJobDetail(jobId)`、`useArtifacts(jobId)`
* 创建任务成功后 `invalidate` 列表与详情
* **Supabase Realtime** 订阅 `jobs` 表当前用户行变更，合并更新缓存，实现秒级进度刷新

**页面流**

1. Upload → Instruments → Create Job
2. 跳转 Job Detail → 实时进度条
3. 成功后显示可下载/预览的产物（PDF/MIDI/MusicXML）

---

## 7) 服务连接与数据流（Data Flow）

### A. 上传模式（本地文件）

1. App → `POST /upload-url` → 获签名 URL 与 `storagePath`
2. App 直传音频到 `audio-input/`
3. App → `POST /jobs`（携带 `storagePath`、`instruments`、`options`）
4. Orchestrator 写入 `jobs(PENDING)` → 推送队列（`QUEUED`）
5. Worker 消费任务（`RUNNING`）：
   下载输入 → 预处理 →（可选）源分离 → 乐器转录 → MusicXML/MIDI → 渲染 PDF → 上传 `outputs/`
6. Worker 更新 `jobs(SUCCEEDED)` 并写入 `artifacts`
7. App 通过 Realtime/轮询获知完成 → 拉取签名下载 → 预览/下载

### B. YouTube 模式

* 跳过直传；由 Worker（或 Orchestrator）用 `yt-dlp` 抓取最佳音频轨，后续流程一致

---

## 8) MVP 与算法路线

**MVP（建议优先）**

* 乐器：**Drums + Bass**（最刚需）
* 选项：开启“源分离”可显著提升准确率（鼓尤其明显）
* 产物：**MusicXML + MIDI + PDF**
* 预览：PDF（WebView）+ 简易 MIDI 播放

**扩展路径**

* 和弦/调性/BPM 检测（适配吉他/钢琴伴奏）
* 吉他 Tab 把位建议、钢琴多声部（更强模型+后处理）
* 乐谱在线微编辑（小节对齐/节拍纠错/音符移位）

**工具链（Worker）**
`ffmpeg`、`yt-dlp`、`demucs`、`crepe`/`nnls-chroma`（f0/和弦）、自研后处理、`music21`（MusicXML 操作）、`LilyPond` 或 `MuseScore CLI` 渲染 PDF。

---

## 9) 权限、安全与合规

* **RLS**：表级开启行级安全，仅 `auth.uid()` 可见/可下载
* **签名 URL**：上传/下载皆使用短效签名
* **内容合规**：提示用户尊重版权；对超长音频设定上限（如 ≤ 10 分钟）
* **配额**：按套餐限制并发/总秒数/每月额度；返回 402/429 并引导升级
* **审计**：记录用量（秒）、GPU 时间，便于计费与成本核算

---

## 10) 可观测性与失败恢复

* **指标**：任务成功率、端到端耗时、阶段耗时（下载/分离/转录/渲染/上传）
* **日志**：结构化日志（含 `job_id`），错误堆栈
* **重试**：网络类指数退避 3 次；模型超时直接失败并提示剪裁音频
* **幂等/缓存**：音频内容 + 参数哈希作为 key，命中则直接返回历史产物
* **断点与复用**：stems/中间件缓存可复用，失败后从最近阶段恢复

---

## 11) 本地开发与部署

**本地**

* docker-compose：Redis + Postgres（Supabase 本地）+ Worker（CPU 推理）
* 移动端：Expo（开发快、热更新）

**生产**

* Orchestrator：Supabase Edge Functions（轻网关）或自托管 FastAPI（更灵活）
* Worker：GPU 实例（A10/A100），按队列指标水平扩缩容
* Storage：Supabase Storage（版本化与生命周期策略可选）

---

## 12) 交互示例（伪代码）

**前端创建任务**

```ts
// services/api.ts
export async function createJob(payload: {
  sourceType: 'upload' | 'youtube',
  storagePath?: string,
  youtubeUrl?: string,
  instruments: string[],
  options?: Record<string, any>
}) {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  const res = await fetch(`${API_URL}/jobs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ jobId: string }>;
}
```

**Worker 任务轮廓**

```py
# services/worker/src/jobs/process_job.py
@app.task(bind=True, max_retries=3, soft_time_limit=1800)
def process_job(self, job_id: str):
    job = db.get_job(job_id)
    db.update_status(job_id, 'RUNNING', progress=5)

    audio = io.download_input(job)                 # Storage 拉取/yt-dlp 获取
    if job.options.get('separate', True):
        stems = separate.run(audio)                # drums/bass/other...
        io.save_stems(job_id, stems)
    else:
        stems = {'mix': audio}

    artifacts = []
    if 'drums' in job.instruments:
        mx, midi = transcribe_drums.run(stems.get('drums', audio))
        pdf = render_score.to_pdf(mx)
        artifacts += io.upload_artifacts(job_id, 'drums', mx, midi, pdf)

    if 'bass' in job.instruments:
        mx, midi = transcribe_bass.run(stems.get('bass', audio))
        pdf = render_score.to_pdf(mx)
        artifacts += io.upload_artifacts(job_id, 'bass', mx, midi, pdf)

    # ... guitar/piano/chords 同理

    db.insert_artifacts(job_id, artifacts)
    db.update_status(job_id, 'SUCCEEDED', progress=100)
```

---

## 13) React Native 页面与状态放置

```txt
apps/mobile/app/
├─ upload/
│  ├─ index.tsx          # 选择文件/粘贴链接 → 获取签名 URL → 直传
│  └─ useUpload.ts       # 直传封装（进度/取消）
├─ instruments/
│  └─ index.tsx          # 乐器多选、开关与精度设置
├─ jobs/
│  ├─ index.tsx          # 列表（React Query + Realtime 刷新）
│  └─ [id].tsx           # 详情页（进度条/错误/产物列表）
└─ viewer/
   ├─ ScoreView.tsx      # PDF/MusicXML 预览（WebView + 内置控件）
   └─ MidiPlayer.tsx     # 简易 MIDI 播放（可选）
```

**状态建议**

* `stores/ui.ts`：表单选择、上传进度等纯 UI 状态
* `services/api.ts`：Orchestrator REST 调用
* `supabase/client.ts`：单例 + `hooks/useRealtimeJob.ts`：基于 Realtime 的行级订阅

---

## 14) 路线图（建议）

1. **MVP**：上传/YouTube → 鼓+贝斯 → MusicXML/MIDI/PDF → PDF 预览
2. **V1**：和弦/调性/BPM；下载历史；数据留存/搜索
3. **V1.5**：吉他 Tab（把位建议）、钢琴多声部
4. **V2**：乐谱在线微编辑、协作与评论、教育机构/乐队版本
5. **商业化**：套餐/配额、结算与发票、组织/团队管理

