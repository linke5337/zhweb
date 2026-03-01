#!/bin/bash
# ============================================================
# deploy.sh —— 在本地 Mac 构建镜像，通过 SSH 传输到服务器并启动
# ============================================================
# 使用方法：
#   chmod +x deploy.sh
#   ./deploy.sh
# 或指定服务器：
#   SERVER=root@123.45.67.89 DEPLOY_PATH=/opt/zhweb ./deploy.sh
# ============================================================

set -e  # 任意步骤失败即退出

# ── 配置（首次使用请修改这两行）────────────────────────────
SERVER="${SERVER:-root@your-server-ip}"          # 服务器 SSH 地址
DEPLOY_PATH="${DEPLOY_PATH:-/opt/zhweb}"         # 服务器上的项目目录
# ─────────────────────────────────────────────────────────────

echo "================================================"
echo " 宸·Shin 住宿登记系统 —— 一键部署脚本"
echo "================================================"
echo "  目标服务器: $SERVER"
echo "  部署目录  : $DEPLOY_PATH"
echo ""

# Step 1: 本地构建镜像
echo "▶ [1/5] 在本地构建 Docker 镜像..."
docker compose build
echo "✓ 镜像构建完成"
echo ""

# Step 2: 打包镜像
echo "▶ [2/5] 打包镜像（frontend + backend）..."
docker save zhweb-frontend | gzip > /tmp/zhweb-frontend.tar.gz
docker save zhweb-backend  | gzip > /tmp/zhweb-backend.tar.gz
echo "✓ 打包完成"
echo ""

# Step 3: 上传镜像到服务器
echo "▶ [3/5] 上传镜像到服务器（可能需要几分钟）..."
scp /tmp/zhweb-frontend.tar.gz /tmp/zhweb-backend.tar.gz "$SERVER:/tmp/"
echo "✓ 上传完成"
echo ""

# Step 4: 上传配置文件（首次部署或配置有变更时）
echo "▶ [4/5] 同步配置文件..."
ssh "$SERVER" "mkdir -p $DEPLOY_PATH/backend"
scp docker-compose.prod.yml "$SERVER:$DEPLOY_PATH/docker-compose.prod.yml"
scp .env.example             "$SERVER:$DEPLOY_PATH/.env.example"
scp -r backend/app           "$SERVER:$DEPLOY_PATH/backend/"
scp backend/requirements.txt "$SERVER:$DEPLOY_PATH/backend/requirements.txt"
scp backend/Dockerfile       "$SERVER:$DEPLOY_PATH/backend/Dockerfile"
echo "✓ 配置同步完成"
echo ""

# Step 5: 服务器加载镜像并启动
echo "▶ [5/5] 在服务器上加载镜像并启动服务..."
ssh "$SERVER" bash << EOF
  set -e
  echo "  加载 frontend 镜像..."
  docker load < /tmp/zhweb-frontend.tar.gz
  echo "  加载 backend 镜像..."
  docker load < /tmp/zhweb-backend.tar.gz

  cd $DEPLOY_PATH

  # 首次部署自动生成 .env
  if [ ! -f .env ]; then
    echo "  首次部署，自动生成 .env（请记得修改密码！）"
    cp .env.example .env
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://zhweb:zhweb_password@db:5432/zhweb|" .env
  fi

  docker compose -f docker-compose.prod.yml up -d
  docker compose -f docker-compose.prod.yml ps
EOF

echo ""
echo "================================================"
echo " ✅ 部署完成！"
echo "   住客登记页: http://$SERVER_IP:3000/check-in"
echo "   管理后台  : http://$SERVER_IP:3000/admin"
echo "================================================"

# 清理本地临时文件
rm -f /tmp/zhweb-frontend.tar.gz /tmp/zhweb-backend.tar.gz
