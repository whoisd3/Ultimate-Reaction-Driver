# Firebase Hosting Setup - Ultimate Reaction Driver

This guide helps you deploy the Ultimate Reaction Driver game to Firebase Hosting.

## 🚀 Quick Deploy

1. **Authenticate with Firebase:**
   ```bash
   firebase login
   ```

2. **Deploy the game:**
   ```bash
   ./deploy.sh
   ```
   Or manually:
   ```bash
   firebase deploy --only hosting --project ultimate-reaction-driver
   ```

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) installed
- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase account and project created

## 🔧 Configuration Files

### firebase.json
Configures Firebase hosting settings:
- **public**: "." (serves files from root directory)
- **ignore**: Excludes development files from deployment
- **rewrites**: Routes all requests to index.html (SPA behavior)
- **headers**: Sets cache control for performance

### .firebaserc
Specifies the Firebase project ID:
```json
{
  "projects": {
    "default": "ultimate-reaction-driver"
  }
}
```

## 🌐 Firebase SDK Integration

The game uses Firebase SDK for:
- **Analytics**: Game event tracking
- **Performance monitoring**: Load time tracking
- **Future features**: Authentication, Firestore, etc.

### Current Firebase Features:
- ✅ Analytics tracking for game starts and ends
- ✅ Performance monitoring
- ✅ Proper caching headers
- ⏳ Authentication (planned)
- ⏳ Leaderboards with Firestore (planned)
- ⏳ Real-time multiplayer (planned)

## 🎯 URLs

After deployment, your game will be available at:
- **Primary**: https://ultimate-reaction-driver.web.app
- **Alternative**: https://ultimate-reaction-driver.firebaseapp.com

## 📊 Analytics Events

The game tracks these events:
- `game_start`: When a game begins
- `game_end`: When a game ends (with score, distance, etc.)
- `page_view`: When the game loads

## 🔧 Troubleshooting

### Common Issues:

1. **"Failed to authenticate"**
   ```bash
   firebase login --reauth
   ```

2. **"Project not found"**
   - Check your .firebaserc file
   - Ensure project ID matches your Firebase console

3. **"Permission denied"**
   - Make sure you have owner/editor access to the Firebase project

4. **Files not updating**
   - Clear browser cache
   - Check firebase.json ignore patterns

### Development Mode:
```bash
npm run dev
# or
python3 -m http.server 8000
```

## 🚀 GitHub Actions (Automated Deployment)

The repository includes GitHub Actions for automatic deployment:
- Triggers on pushes to main branch
- Builds and deploys automatically
- Requires `FIREBASE_SERVICE_ACCOUNT_ULTIMATE_REACTION_DRIVER` secret

## 📱 PWA Features

The game includes Progressive Web App features:
- Service Worker for offline caching
- Web App Manifest for installability
- Firebase Hosting optimizations

---

**Need help?** Check the [Firebase Hosting documentation](https://firebase.google.com/docs/hosting)