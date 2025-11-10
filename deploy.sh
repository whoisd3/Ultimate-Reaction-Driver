#!/bin/bash

# Firebase deployment test script
# This script helps deploy the Ultimate Reaction Driver game to Firebase Hosting

echo "🚗 Ultimate Reaction Driver - Firebase Deployment"
echo "================================================"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

echo "✅ Firebase CLI version: $(firebase --version)"

# Check current authentication status
echo "🔐 Checking Firebase authentication..."

# Try to list projects (this will prompt for login if needed)
if firebase projects:list &> /dev/null; then
    echo "✅ Already authenticated with Firebase"
else
    echo "🔑 Please authenticate with Firebase..."
    echo "Run: firebase login"
    echo "Then run this script again."
    exit 1
fi

# Validate firebase.json configuration
if [ -f "firebase.json" ]; then
    echo "✅ firebase.json found"
else
    echo "❌ firebase.json not found!"
    exit 1
fi

# Validate .firebaserc configuration
if [ -f ".firebaserc" ]; then
    echo "✅ .firebaserc found"
    PROJECT_ID=$(grep -o '"ultimate-reaction-driver"' .firebaserc)
    if [ "$PROJECT_ID" ]; then
        echo "✅ Project ID: ultimate-reaction-driver"
    fi
else
    echo "❌ .firebaserc not found!"
    exit 1
fi

# Check essential files
echo "📁 Checking required files..."
required_files=("index.html" "game.js" "styles.css" "manifest.json")

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file found"
    else
        echo "❌ $file missing!"
        exit 1
    fi
done

# Run deployment
echo "🚀 Deploying to Firebase Hosting..."
firebase deploy --only hosting --project ultimate-reaction-driver

if [ $? -eq 0 ]; then
    echo "🎉 Deployment successful!"
    echo "🌐 Your game should be available at: https://ultimate-reaction-driver.web.app"
else
    echo "❌ Deployment failed!"
    echo "Please check the error messages above."
    exit 1
fi