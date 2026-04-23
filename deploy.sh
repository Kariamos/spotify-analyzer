#!/bin/bash

# Spotify Analyzer - Proxmox LXC Deployment Script

set -e

ENV=${1:-development}
CONTAINER_NAME="spotify-analyzer"
IMAGE_NAME="spotify-analyzer:latest"

echo "🚀 Deploying Spotify Analyzer ($ENV)"

# Build Docker image
echo "📦 Building Docker image..."
docker build -t $IMAGE_NAME .

# Stop existing container
echo "🛑 Stopping existing container..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# Create data directory
mkdir -p ./data
chmod 755 ./data

# Start container
echo "🚀 Starting container..."
if [ "$ENV" = "production" ]; then
  docker run -d \
    --name $CONTAINER_NAME \
    --restart unless-stopped \
    -p 3000:3000 \
    -v $(pwd)/data:/data \
    --env-file .env.production \
    $IMAGE_NAME
else
  docker run -d \
    --name $CONTAINER_NAME \
    -p 3000:3000 \
    -v $(pwd)/data:/data \
    -v $(pwd)/src:/app/src \
    --env-file .env \
    $IMAGE_NAME
fi

# Wait for health check
echo "⏳ Waiting for container to be healthy..."
for i in {1..30}; do
  if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Container is healthy!"
    break
  fi
  echo "  Attempt $i/30..."
  sleep 2
done

echo "✨ Deployment complete!"
echo "📍 Access at http://localhost:3000"
