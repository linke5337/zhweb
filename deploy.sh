#!/bin/bash
# ============================================================
# deploy.sh —— 本地 Mac (aarch64) 跨平台构建 linux/amd64 镜像
#              通过 SSH 传输到 x86_64 服务器并启动
# ============================================================
# 使用方法：
#   chmod +x deploy.sh
#   ./deploy.sh
# 或临时指定服务器：
#   SERVER=root@123.45.67.89 DEPLOY_PATH=/opt/zhweb ./deploy.sh
# ============================================================

set -e

# ── 配置（首次使用请修改这两行）────────────────────────────
SERVER="${SERVER:-root@your-server-ip}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/zhweb}"
# ─────────────────────────────────────────────────────────────

PLATFORM="linux/amd64"          # 服务器架构（x86_64）
BUILDER_NAME="zhweb-builder"

echo "================================================"
echo " 宸·Shin 住宿登记系统 —— 跨平台一键部署"
echo "================================================"
echo "  本机架构  : $(uname -m)"
echo "  目标平台  : $PLATFORM"
echo "  目标服务器: $SERVER"
echo "  部署目录  : $DEPLOY_PATH"
echo ""

# ── Step 1: 初始化 buildx 多平台构建器 ──────────────────────
echo "▶ [1/5] 初始化 buildx 构建器..."
if ! docker buildx inspect "$BUILDER_NAME" &>/dev/null; then
  docker buildx create --name "$BUILDER_NAME" --driver docker-container --bootstrap
fi
docker buildx use "$BUILDER_NAME"
echo "✓ 构建器就绪（$(docker buildx inspect --bootstrap | grep 'Platforms' | head -1)）"
echo ""

# ── Step 2: 跨平台构建镜像（--load 加载到本地 daemon）────────
echo "▶ [2/5] 跨平台构建镜像 [$PLATFORM]..."
echo "   构建 backend..."
docker buildx build \
  --platform "$PLATFORM" \
  --tag zhweb-backend \
  --load \
  ./backend

echo "   构建 frontend..."
docker buildx build \
  --platform "$PLATFORM" \
  --tag zhweb-frontend \
  --build-arg INTERNAL_API_URL=http://backend:8000 \
  --load \
  ./frontend

echo "✓ 镜像构建完成"
echo ""

# ── Step 3: 打包镜像 ─────────────────────────────────────────
echo "▶ [3/5] 打包镜像..."
docker save zhweb-backend  | gzip > /tmp/zhweb-backend.tar.gz
docker save zhweb-frontend | gzip > /tmp/zhweb-frontend.tar.gz
BACKEND_SIZE=$(du -sh /tmp/zhweb-backend.tar.gz  | cut -f1)
FRONTEND_SIZE=$(du -sh /tmp/zhweb-frontend.tar.gz | cut -f1)
echo "✓ 打包完成（backend: $BACKEND_SIZE，frontend: $FRONTEND_SIZE）"
echo ""

# ── Step 4: 上传 ─────────────────────────────────────────────
echo "▶ [4/5] 上传到服务器（镜像较大，请稍候）..."
scp /tmp/zhweb-backend.tar.gz  /tmp/zhweb-frontend.tar.gz "$SERVER:/tmp/"
ssh "$SERVER" "mkdir -p $DEPLOY_PATH/backend"
scp docker-compose.prod.yml "$SERVER:$DEPLOY_PATH/"
scp .env.example             "$SERVER:$DEPLOY_PATH/"
scp -r backend/app           "$SERVER:$DEPLOY_PATH/backend/"
scp backend/requirements.txt "$SERVER:$DEPLOY_PATH/backend/"
scp backend/Dockerfile       "$SERVER:$DEPLOY_PATH/backend/"
echo "✓ 上传完成"
echo ""

# ── Step 5: 服务器加载并启动 ─────────────────────────────────
echo "▶ [5/5] 服务器加载镜像并启动..."
ssh "$SERVER" bash << ENDSSH
  set -e
  echo "  加载 backend 镜像..."
  docker load < /tmp/zhweb-backend.tar.gz
  echo "  加载 frontend 镜像..."
  docker load < /tmp/zhweb-frontend.tar.gz
  rm -f /tmp/zhweb-*.tar.gz

  cd $DEPLOY_PATH

  if [ ! -f .env ]; then
    echo "  首次部署，从模板生成 .env（请事后修改密码！）"
    cp .env.example .env
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://zhweb:zhweb_password@db:5432/zhweb|" .env
  fi

  docker compose -f docker-compose.prod.yml pull db 2>/dev/null || true
  docker compose -f docker-compose.prod.yml up -d
  echo ""
  docker compose -f docker-compose.prod.yml ps
ENDSSH

echo ""
echo "================================================"
echo " ✅ 部署完成！"
SERVER_HOST=$(echo "$SERVER" | cut -d@ -f2)
echo "   住客登记页: http://$SERVER_HOST:3000/check-in"
echo "   管理后台  : http://$SERVER_HOST:3000/admin"
echo "================================================"

# 清理本地临时文件
rm -f /tmp/zhweb-backend.tar.gz /tmp/zhweb-frontend.tar.gz
