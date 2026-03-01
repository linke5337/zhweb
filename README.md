# 宸·Shin 住宿登记系统

民宿/短租房住客登记 Web 系统，支持住客扫码自助填写、管理员后台查看/导出数据。

## 功能概览

| 模块 | 功能 |
|------|------|
| 住客登记页 | 三语表单（中/日/英）、证件照上传（最多9张）、浏览器自动压缩 |
| 管理后台 | 住客列表、照片预览灯箱、CSV 批量导出、照片 ZIP 下载、删除记录 |
| 技术特性 | Docker 一键部署、照片流式写入（10MB 限制）、JWT 鉴权 |

---

## 部署方案

根据服务器配置选择合适方案：

| 方案 | 适用场景 | 构建在哪里 |
|------|---------|-----------|
| [方案 A：服务器直接构建](#方案-a服务器直接构建) | 服务器 ≥ 2核4G | 服务器 |
| [方案 B：本地构建传镜像](#方案-b本地-mac-构建一键部署到服务器) | 服务器 1核2G（推荐） | 本地 Mac |

---

## 方案 A：服务器直接构建

适合内存 ≥ 4G 的服务器。如果只有 2G，**强烈建议先开 Swap**。

### 0. 开启 Swap（2G 服务器必做）

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
# 验证：free -h 看到 Swap 有 4G 即可
```

### 1. 克隆项目

```bash
git clone git@github.com:linke5337/zhweb.git
cd zhweb
```

### 2. 配置环境变量

```bash
cp .env.example .env
nano .env   # 修改密码和访问地址
```

关键配置项：

```env
# JWT 密钥 —— 必须修改！
SECRET_KEY=your-random-secret-key   # openssl rand -hex 32

# 管理员账号 —— 必须修改！
ADMIN_PASSWORD=your-strong-password

# 允许跨域的来源 —— 填服务器公网 IP 或域名
ALLOWED_ORIGINS=http://123.45.67.89:3000
# ALLOWED_ORIGINS=https://yourdomain.com
```

### 3. 构建并启动

```bash
docker compose up -d --build
```

> Next.js 构建约需 5～15 分钟（取决于服务器性能），Dockerfile 已加入
> `NODE_OPTIONS="--max-old-space-size=1536"` 内存限制，防止 OOM。

### 4. 访问

| 地址 | 说明 |
|------|------|
| `http://服务器IP:3000/check-in` | 住客登记页 |
| `http://服务器IP:3000/admin` | 管理后台 |

---

## 方案 B：本地 Mac 构建，一键部署到服务器

**推荐用于 1核2G 服务器**，同时解决 Mac (aarch64) → 服务器 (x86_64) 跨平台问题。
在本地 Mac 用 `docker buildx` 编译 `linux/amd64` 镜像，打包后 SSH 传到服务器直接运行。

### 前置准备

- 本地已安装 Docker Desktop（自带 buildx）
- 本地可通过 SSH 免密登录服务器（`ssh user@IP` 不需要输密码）

### 1. 修改部署脚本配置

编辑 `deploy.sh` 开头的两行：

```bash
SERVER="root@123.45.67.89"     # 改为你的服务器 SSH 地址
DEPLOY_PATH="/opt/zhweb"       # 改为服务器上的部署目录
```

### 2. 一键部署

```bash
chmod +x deploy.sh
./deploy.sh
```

脚本自动完成以下步骤：
1. 初始化 `buildx` 多平台构建器
2. `docker buildx build --platform linux/amd64` 构建 x86_64 镜像（在 Mac 本地完成）
3. 打包镜像为 `.tar.gz`
4. `scp` 上传到服务器
5. 服务器 `docker load` 加载镜像
6. 服务器 `docker compose up -d` 启动服务

### 3. 首次部署后在服务器修改 `.env`

```bash
ssh root@服务器IP
cd /opt/zhweb
nano .env   # 修改 SECRET_KEY、ADMIN_PASSWORD、ALLOWED_ORIGINS
docker compose -f docker-compose.prod.yml restart
```

---

## 常用命令

```bash
# 查看运行状态
docker compose ps
# 或（方案 B）
docker compose -f docker-compose.prod.yml ps

# 查看实时日志
docker compose logs -f

# 停止服务
docker compose down

# 停止并删除数据（⚠️ 会清空数据库和照片）
docker compose down -v

# 更新代码后重新部署（方案 A）
git pull && docker compose up -d --build

# 更新代码后重新部署（方案 B，在本地 Mac 执行）
git pull && ./deploy.sh
```

---

## 目录结构

```
zhweb/
├── backend/                # FastAPI 后端
│   ├── app/
│   │   ├── models.py           # 数据库模型
│   │   ├── routers/            # API 路由
│   │   └── main.py             # 入口
│   └── requirements.txt
├── frontend/               # Next.js 前端
│   ├── app/                    # 页面（App Router）
│   ├── components/             # UI 组件
│   └── lib/                    # API 客户端、工具函数
├── docker-compose.yml      # 开发/方案 A 用
├── docker-compose.prod.yml # 方案 B 服务器端用（直接 run，不 build）
├── deploy.sh               # 方案 B 本地一键部署脚本
└── .env.example
```

## 技术栈

- **后端**：Python · FastAPI · SQLAlchemy · PostgreSQL
- **前端**：Next.js 14 · Tailwind CSS · Shadcn UI · Recharts
- **部署**：Docker Compose
