# 🎼 音乐谱自动生成系统

一个基于 React Native + Supabase 的移动端音乐转录应用，能够自动将音频文件或 YouTube 链接转换为对应乐器的乐谱。

## ✨ 核心功能

- **多种输入方式**：支持本地音频文件上传或 YouTube 链接
- **智能音频分离**：可选择性分离鼓、贝斯、吉他、钢琴、人声等音轨
- **多乐器转录**：针对不同乐器生成专业乐谱
- **多格式输出**：支持 MusicXML、MIDI、PDF 格式导出
- **实时进度跟踪**：任务状态实时更新，支持预览和下载

## 🏗️ 技术架构

### 前端

- **React Native**：跨平台移动应用开发
- **Expo**：快速开发和热更新支持
- **Supabase Client**：身份验证和实时数据同步

### 后端

- **Supabase**：
  - Auth：用户身份验证
  - Database：PostgreSQL 数据库
  - Storage：文件存储
  - Realtime：实时数据推送
- **Orchestrator**：API 网关（FastAPI 或 Supabase Edge Functions）
- **ML Worker**：Python + GPU 音频处理服务
- **队列系统**：Redis + Celery 异步任务处理

### 核心算法

- **音频分离**：Demucs/HT 源分离技术
- **音频转录**：针对不同乐器的专业转录算法
- **乐谱渲染**：LilyPond/MuseScore 乐谱生成

## 📁 项目结构

```
repo/
├── apps/mobile/          # React Native 移动应用
├── services/
│   ├── orchestrator/     # API 网关服务
│   └── worker/          # ML 音频处理服务
├── infra/               # 基础设施配置
├── packages/            # 共享包和类型定义
└── docs/               # 项目文档
```

## 🚀 快速开始

### 环境要求

- Node.js 18+
- Python 3.9+
- Redis 服务器
- VSCode (推荐)

### 🔧 环境设置

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd musictabapp
   ```

2. **安装依赖**
   ```bash
   # Python 依赖
   pip install -r requirements.txt

   # Node.js 依赖
   npm install
   cd apps/mobile && npm install
   ```

3. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，填入 Supabase 凭据
   ```

## 🎯 开发环境启动

### 方法 1：VSCode 任务（推荐）⭐

1. **在 VSCode 中打开项目**
2. **按 `Ctrl+Shift+P`**
3. **输入 "Tasks: Run Task"**
4. **选择 "Start All Services"**

这会自动在 VSCode Terminal 中创建 3 个标签页并启动所有服务！

### 方法 2：PowerShell 脚本

```powershell
# 启动所有服务
.\start-vscode.ps1

# 检查服务状态
.\start-vscode.ps1 -Status

# 停止所有服务
.\start-vscode.ps1 -Stop
```

### 方法 3：手动启动

在 VSCode 中打开 3 个终端标签页，分别运行：

**终端 1 (Worker):**
```bash
cd services/worker
..\..\.venv\Scripts\python.exe -m celery -A tasks worker --loglevel=info --pool=solo
```

**终端 2 (Orchestrator API):**
```bash
cd services/orchestrator
..\..\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

**终端 3 (Expo App):**
```bash
cd apps/mobile
npx expo start
```

## 🌐 服务地址

- **移动应用**: http://localhost:8081
- **API 服务器**: http://localhost:8080
- **Supabase**: https://jvmcekqjavgesucxytwh.supabase.co

## 📱 测试应用

1. **等待所有服务启动** (10-15 秒)
2. **打开浏览器**: http://localhost:8081
3. **上传音频文件**
4. **启用 "Source Separation"**
5. **选择乐器** (如：drums)
6. **点击 "Process Audio"**
7. **观察进度条**
8. **下载生成的文件**

## 🔧 开发脚本

| 脚本 | 描述 |
|------|------|
| `.\start-vscode.ps1` | 在 VSCode 中自动启动所有服务 |
| `.\start-vscode.ps1 -Status` | 检查服务状态 |
| `.\start-vscode.ps1 -Stop` | 停止所有服务 |
| `.\start-vscode.ps1 -Tasks` | 显示 VSCode 任务使用说明 |

## 🔍 故障排除

### 服务无法启动？
```powershell
# 检查运行状态
.\start-vscode.ps1 -Status

# 停止所有服务并重启
.\start-vscode.ps1 -Stop
.\start-vscode.ps1
```

### 连接错误？
- 确保所有服务都在运行
- 检查端口 8080, 8081 是否可用
- 验证 Redis 在端口 6379 上运行

### VSCode 任务不工作？
- 确保在项目根目录
- 尝试手动终端方法
- 检查 `.vscode/tasks.json` 文件存在

## 📝 开发工作流程

1. **启动服务**: 使用 VSCode 任务或脚本
2. **修改代码**: 在 VSCode 中编辑
3. **测试**: 使用 localhost:8081 的移动应用
4. **调试**: 查看 VSCode 终端日志
5. **停止服务**: 完成后使用停止脚本

## 🎯 MVP 功能

当前版本专注于核心功能：

- ✅ 鼓谱转录
- ✅ 贝斯转录
- ✅ 源分离 (Demucs)
- ✅ MusicXML/MIDI/PDF 输出
- ✅ PDF 预览功能
- ✅ 实时任务进度

## 🛣️ 发展路线

- **V1**：和弦/调性/BPM 检测，历史记录管理
- **V1.5**：吉他 Tab 谱，钢琴多声部转录
- **V2**：在线乐谱编辑，协作功能
- **商业化**：订阅套餐，企业版本

## 📄 许可证

[MIT License](LICENSE)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 🆘 快速帮助

### 🚀 最快启动方式
1. **打开 VSCode**
2. **按 `Ctrl+Shift+P`**
3. **输入 "run task"**
4. **选择 "Start All Services"**
5. **等待 10-15 秒**
6. **访问 http://localhost:8081**

### 📊 检查状态
```powershell
.\start-vscode.ps1 -Status
```

### 🛑 停止服务
```powershell
.\start-vscode.ps1 -Stop
```

### 📋 查看日志
在 VSCode Terminal 标签页中查看实时日志

---

> 🎵 让音乐转录变得简单高效

**每次重启 IDE 后，只需一个命令：`Ctrl+Shift+P` → "Tasks: Run Task" → "Start All Services"** ⭐
