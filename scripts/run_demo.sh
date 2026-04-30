#!/bin/bash

# Run demo script for Climate Warriors

echo "🚀 Starting Climate Warriors..."

# Start Backend in background
echo "📡 Starting backend..."
cd src/backend && node index.js &
BACKEND_PID=$!

# Start AI layer in background
echo "🤖 Starting AI layer..."
cd src/ai && source venv/bin/activate || source venv/Scripts/activate && uvicorn main:app --port 8000 &
AI_PID=$!

# Start Frontend
echo "💻 Starting frontend..."
cd src/frontend && npm run dev

# Cleanup background processes on exit
trap "kill $BACKEND_PID $AI_PID" EXIT
