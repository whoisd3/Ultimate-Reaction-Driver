#!/bin/bash

# Firebase configuration validator
echo "🔍 Validating Firebase setup..."

# Check Firebase configuration
if grep -q "ultimate-reaction-driver" .firebaserc; then
    echo "✅ Project ID configured correctly"
else
    echo "❌ Project ID not found in .firebaserc"
    exit 1
fi

# Check Firebase config in HTML
if grep -q "AIzaSyD7EJ0Pj2MqyGq_K8FSBoSy6snG6qx3Eeg" index.html; then
    echo "✅ Firebase config found in index.html"
else
    echo "❌ Firebase config not found in index.html"
    exit 1
fi

# Check if Firebase SDK imports are correct
if grep -q "firebase-app.js" index.html && grep -q "firebase-analytics.js" index.html; then
    echo "✅ Firebase SDK imports are correct"
else
    echo "❌ Firebase SDK imports are missing or incorrect"
    exit 1
fi

# Validate firebase.json
if [ -f "firebase.json" ] && grep -q '"public": "."' firebase.json; then
    echo "✅ firebase.json is properly configured"
else
    echo "❌ firebase.json is missing or misconfigured"
    exit 1
fi

# Check essential game files
files=("index.html" "game.js" "styles.css" "manifest.json" "sw.js")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file is missing"
        exit 1
    fi
done

echo ""
echo "🎉 All Firebase setup validations passed!"
echo "📱 Your game is ready for Firebase deployment!"
echo ""
echo "Next steps:"
echo "1. Run 'firebase login' to authenticate"
echo "2. Run './deploy.sh' to deploy your game"
echo "3. Visit https://ultimate-reaction-driver.web.app to play!"