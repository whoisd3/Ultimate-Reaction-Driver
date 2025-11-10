#!/bin/bash
# Firebase deployment script
# Run this script after authenticating with Firebase CLI

echo "🚀 Deploying Ultimate Reaction Driver to Firebase Hosting..."

# Check if Firebase CLI is authenticated
if ! firebase projects:list >/dev/null 2>&1; then
    echo "❌ Firebase CLI not authenticated. Please run:"
    echo "   firebase login"
    echo "   Then run this script again."
    exit 1
fi

# Set the project
echo "📋 Setting Firebase project..."
firebase use ultimate-reaction-driver

# Deploy to hosting
echo "🌐 Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo "✅ Deployment complete!"
echo "🎮 Your game should now be live at: https://ultimate-reaction-driver.web.app/"
