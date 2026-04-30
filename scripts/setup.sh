#!/bin/bash

# Setup script for Climate Warriors

echo "🚀 Starting setup..."

# Backend setup
echo "📦 Setting up backend..."
cd src/backend
npm install
npx prisma generate
npx prisma db push
node seed.js
cd ../..

# Frontend setup
echo "📦 Setting up frontend..."
cd src/frontend
npm install
cd ../..

# AI setup
echo "📦 Setting up AI layer..."
cd src/ai
python -m venv venv
source venv/bin/activate || source venv/Scripts/activate
pip install -r requirements.txt
cd ../..

echo "✅ Setup complete!"
