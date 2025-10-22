#!/usr/bin/env bash
# Start the Spotify Analytics application using Docker Compose

set -e

echo "Starting Spotify Analytics..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Check if database exists
if [ ! -f "./backend/spotify.db" ]; then
    echo "Warning: Database not found at ./backend/spotify.db"
    echo "Please run 'python backend/load_data.py' first to load your Spotify data."
    exit 1
fi

# Build and start containers
docker compose up -d --build

# Wait for services to be healthy
echo "Waiting for services to be ready..."
sleep 1

# Check if services are running
if docker compose ps | grep -q "Up"; then
    echo "Application started successfully!"
    echo ""
    echo "Access the application:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend:  http://localhost:8080"
    echo ""
    echo "View logs:    docker compose logs -f"
    echo "Stop:         docker compose down"
else
    echo "Failed to start services. Check logs with: docker compose logs"
    exit 1
fi
