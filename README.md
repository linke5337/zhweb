# 宸·Shin 住宿登记系统

民宿/短租房住客登记 Web 系统，支持住客扫码自助填写、管理员后台查看/导出数据。

## 功能概览

| 模块 | 功能 |
|------|------|
| 住客登记页 | 三语表单（中/日/英）、证件照上传（最多9张）、浏览器自动压缩 |
| 管理后台 | 住客列表、照片预览灯箱、CSV 批量导出、照片 ZIP 下载、删除记录 |
| 技术特性 | Docker 一键部署、照片流式写入（10MB 限制）、JWT 鉴权 |

## 快速部署（Docker Compose）

### 前置要求

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 或 Docker + Docker Compose

### 1. 克隆项目

```bash
git clone git@github.com:linke5337/zhweb.git
cd zhweb
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

按需修改 `.env`：

```env
# 数据库（保持默认即可）
DATABASE_URL=postgresql://zhweb:zhweb_password@db:5432/zhweb

# JWT 密钥 —— 生产环境请务必改成随机字符串
SECRET_KEY=change-this-to-a-random-secret-key-in-production

# 管理员账号
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# 允许的跨域来源 —— 填写实际的前端访问地址，多个用逗号分隔
# 本机访问：
ALLOWED_ORIGINS=http://localhost:3000
# 局域网访问（换成本机内网 IP）：
# ALLOWED_ORIGINS=http://192.168.1.100:3000
# 公网访问（换成服务器公网 IP 或域名）：
# ALLOWED_ORIGINS=http://123.45.67.89:3000
# ALLOWED_ORIGINS=https://yourdomain.com
```

> ⚠️ 生产环境必须修改三项：
> - `SECRET_KEY` → 改为随机字符串（可用 `openssl rand -hex 32` 生成）
> - `ADMIN_PASSWORD` → 改为强密码
> - `ALLOWED_ORIGINS` → 改为实际公网 IP 或域名，否则前端请求会被 CORS 拦截

### 3. 启动服务

```bash
docker compose up -d --build
```

首次启动会拉取镜像并构建，约需 3～5 分钟。

### 4. 访问

| 地址 | 说明 |
|------|------|
| http://localhost:3000/check-in | 住客登记页（可分享给住客） |
| http://localhost:3000/admin | 管理员登录 |

局域网内其他设备访问，将 `localhost` 替换为本机 IP（如 `192.168.1.100:3000`）。

---

## 常用命令

```bash
# 查看运行状态
docker compose ps

# 查看日志
docker compose logs -f

# 停止服务
docker compose down

# 停止并删除数据卷（⚠️ 会清空数据库）
docker compose down -v

# 更新代码后重新构建
git pull
docker compose up -d --build
```

## 目录结构

```
zhweb/
├── backend/          # FastAPI 后端
│   ├── app/
│   │   ├── models.py      # 数据库模型
│   │   ├── routers/       # API 路由
│   │   └── main.py        # 入口
│   └── requirements.txt
├── frontend/         # Next.js 前端
│   ├── app/               # 页面（App Router）
│   ├── components/        # UI 组件
│   └── lib/               # API 客户端、工具函数
├── docker-compose.yml
└── .env.example
```

## 技术栈

- **后端**：Python · FastAPI · SQLAlchemy · PostgreSQL
- **前端**：Next.js 14 · Tailwind CSS · Shadcn UI · Recharts
- **部署**：Docker Compose
