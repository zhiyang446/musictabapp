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
- Docker & Docker Compose
- Supabase 账户

### 本地开发

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd musictabapp
   ```

2. **启动后端服务**
   ```bash
   docker-compose up -d
   ```

3. **启动移动应用**
   ```bash
   cd apps/mobile
   npm install
   npm start
   ```

4. **配置 Supabase**
   - 创建 Supabase 项目
   - 配置环境变量
   - 运行数据库迁移

## 🎯 MVP 功能

当前版本专注于核心功能：
- ✅ 鼓谱转录
- ✅ 贝斯转录  
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

> 🎵 让音乐转录变得简单高效
