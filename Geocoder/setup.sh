#!/bin/bash

echo "════════════════════════════════════════════════════"
echo "  CSV Geocoder Setup"
echo "════════════════════════════════════════════════════"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo ""
    echo "Please install Node.js from: https://nodejs.org/"
    echo ""
    exit 1
fi

echo "✓ Node.js found: $(node --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Dependencies installed successfully!"
    echo ""
    echo "════════════════════════════════════════════════════"
    echo "  Ready to Start!"
    echo "════════════════════════════════════════════════════"
    echo ""
    echo "Run the following command to start the proxy server:"
    echo ""
    echo "  node geocode-proxy-server.js"
    echo ""
    echo "Then open CSV_Geocoder.html in your browser."
    echo ""
else
    echo ""
    echo "❌ Installation failed!"
    echo ""
    exit 1
fi
