#!/bin/bash

# Build the app
echo "📦 Building the app..."
npm run build

# Copy the static files to public
echo "📋 Copying files to public directory..."
mkdir -p public
cp -r out/* public/

# Start the server
echo "🚀 Starting server..."
node server.js
