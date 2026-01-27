# 🌸 春暖花开 - 匿名情绪支持平台

> 每一次倾诉，都是内心的春暖花开

一个基于MemFire Cloud的临时/去中心化/用完即毁的匿名情绪支持工具。

## ✨ 功能特性

- **匿名匹配**：基于情绪标签的即时匿名匹配
- **限时倾诉**：30分钟安全对话，自动结束清理
- **隐私保护**：三层内容过滤 + 数据加密
- **响应式设计**：移动端优先，全平台兼容
- **实时通信**：WebSocket实时消息传递

## 🚀 快速部署

### 部署到Vercel（推荐）

1. **Fork或克隆此仓库**
2. **登录Vercel**：https://vercel.com
3. **导入项目**：选择这个GitHub仓库
4. **配置环境变量**：
   - `VITE_SUPABASE_URL`: MemFire项目URL
   - `VITE_SUPABASE_ANON_KEY`: MemFire匿名公钥
5. **点击部署**

### 环境变量

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
手动部署

将文件上传到静态主机
确保所有文件在同一目录
访问 index.html
🛠️ 技术栈

前端：HTML5, CSS3, JavaScript (ES6+)
后端：MemFire Cloud (Supabase协议)
数据库：PostgreSQL + 实时订阅
部署：Vercel (CDN全球加速)
📁 项目结构

text
springblossom/
├── index.html          # 主HTML文件
├── style.css          # 样式文件
├── main.js            # 主应用逻辑
├── match-engine.js    # 匹配算法
├── supabase-client.js # MemFire连接配置
├── vercel.json        # Vercel部署配置
├── vite.config.js     # Vite构建配置
├── .gitignore         # Git忽略文件
└── README.md          # 说明文档
🔧 开发设置

本地运行

安装依赖（如果需要构建）：

bash
npm install
启动开发服务器：

bash
npm run dev
访问 http://localhost:3000
构建生产版本

bash
npm run build
构建文件将输出到 dist/ 目录。

🔒 隐私与安全

数据保护

所有消息传输均加密
不收集个人信息
30分钟后自动清理数据
内容多层安全过滤
用户匿名性

无用户注册系统
随机生成用户ID
不记录IP地址
会话结束即销毁
🌐 域名配置

建议域名结构

dev.springblossom.me → Vercel测试版
springblossom.me → 阿里云备案版
global.springblossom.me → Vercel国际版
DNS配置

text
CNAME dev.springblossom.me → vercel部署域名
A     springblossom.me → 阿里云服务器IP
📊 数据库结构

需要创建以下MemFire表：

chat_sessions 表

sql
CREATE TABLE chat_sessions (
    session_id TEXT PRIMARY KEY,
    user1_id TEXT NOT NULL,
    user2_id TEXT NOT NULL,
    emotion_tag TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ
);
messages 表

sql
CREATE TABLE messages (
    message_id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES chat_sessions(session_id),
    sender_id TEXT NOT NULL,
    content TEXT NOT NULL,
    original_content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
match_queue 表

sql
CREATE TABLE match_queue (
    user_id TEXT PRIMARY KEY,
    emotion_tag TEXT NOT NULL,
    emotion_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
user_reports 表

sql
CREATE TABLE user_reports (
    report_id TEXT PRIMARY KEY,
    session_id TEXT,
    reporter_id TEXT,
    feeling TEXT,
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
🔄 版本历史

v1.0.0 (2026-01)

初始版本发布
9大情绪标签匹配
实时匿名聊天
内容安全过滤
移动端响应式设计
🤝 贡献指南

Fork项目
创建功能分支 (git checkout -b feature/AmazingFeature)
提交更改 (git commit -m 'Add some AmazingFeature')
推送到分支 (git push origin feature/AmazingFeature)
开启Pull Request
📄 许可证

本项目仅供学习和个人使用，遵循MIT许可证。

🙏 致谢

MemFire Cloud提供后端支持
Vercel提供部署平台
所有贡献者和测试用户
📞 支持

如有问题或建议，请：

在GitHub提交Issue
查看项目文档
联系项目维护者
