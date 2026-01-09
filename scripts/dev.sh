#!/bin/bash

# Script to run both Backend and Frontend for local testing

echo "🚀 Starting Karu Teens Local Dev Environment..."

# Clean up background processes on exit
trap "kill 0" EXIT

# 1. Start Backend (in background)
echo "🦀 Starting Rust Backend..."
cd backend
cargo run & 
BACKEND_PID=$!
cd ..

# 2. Start Frontend
echo "⚛️ Starting React Frontend..."
npm run dev

# Wait for both
wait $BACKEND_PID
