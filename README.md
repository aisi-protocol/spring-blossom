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
