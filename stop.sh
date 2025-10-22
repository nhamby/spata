#!/usr/bin/env bash
# Stop the Spotify Analytics application

set -e

echo "Stopping Spotify Analytics..."

docker compose down

echo "Application stopped successfully!"
