#!/bin/bash
# Agri-Access Setup Script
# Helps with initial project setup and dependency installation

set -e

echo "🌾 Agri-Access Setup Script"
echo "================================"

# Check if .env exists
if [ ! -f .env ]; then
    echo "📋 Creating .env file from template..."
    cp .env.example .env
    echo "✅ Created .env file. Please update it with your API keys."
else
    echo "⚠️ .env file already exists. Skipping..."
fi

# Install Node.js dependencies
echo ""
echo "📦 Installing Node.js dependencies..."
npm install

# Check Python and install dependencies
echo ""
echo "🐍 Checking Python environment..."
if command -v python3 &> /dev/null; then
    echo "✅ Python3 found: $(python3 --version)"
    
    echo "📦 Installing Python dependencies..."
    pip3 install -r requirements.txt
    
    echo "✅ Python dependencies installed"
else
    echo "❌ Python3 not found. Please install Python 3.8+ for Google Earth Engine integration."
    exit 1
fi

# Run basic checks
echo ""
echo "🧪 Running basic health checks..."
npm run test:unit

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📚 Next steps:"
echo "1. Update .env file with your Google Earth Engine credentials"
echo "2. Run 'npm start' to start the server"
echo "3. Visit http://localhost:3000 to test the application"
echo ""
echo "📖 For more information:"
echo "- README.md - Project documentation"
echo "- docs/api-status-issues.md - API integration status"
echo "- docs/CURRENT_STATE_SUMMARY.md - Current project state"