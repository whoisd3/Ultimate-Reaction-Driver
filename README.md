# Ultimate Reaction Driver

Experience the ultimate web-based endless driver. Level up to unlock new game modes, vehicles, and abilities. Race against the clock, survive obstacle waves, or challenge players in real-time multiplayer via WebRTC. Full VR/AR immersion with WebXR support.

## Features

### Core Gameplay
- **Endless Driving**: Navigate through an infinite procedurally generated highway
- **Multiple Game Modes**:
  - **Classic Mode**: Endless survival with increasing difficulty
  - **Time Attack**: Score as much as possible in 60 seconds (Unlock at Level 5)
  - **Survival**: Extreme obstacle density challenge (Unlock at Level 10)

### Progression System
- **Leveling System**: Gain XP from gameplay to level up
- **Skill Points**: Unlock skill points with each level
- **Upgradable Skills**:
  - Speed Boost: Increase maximum vehicle speed
  - XP Multiplier: Gain more XP from actions
  - Handling: Improve vehicle control

### Vehicles
- **Multiple Vehicles**: Unlock 4 different vehicles as you progress
  - Basic Car (Level 1)
  - Sports Car (Level 5)
  - Super Car (Level 10)
  - Hyper Car (Level 20)
- **Vehicle Stats**: Each vehicle has unique speed and handling characteristics

### Multiplayer
- **WebRTC Support**: Real-time multiplayer using peer-to-peer connections
- **Room System**: Create or join rooms with unique IDs
- **Synchronized Gameplay**: See other players in real-time

### Immersive Features
- **WebXR Support**: Full VR and AR support for compatible devices
- **Dynamic Audio**: Web Audio API for engine sounds, music, and effects
- **Advanced Graphics**: Three.js powered 3D graphics with:
  - Real-time shadows
  - Particle effects
  - Dynamic lighting
  - Fog effects

### Progressive Web App (PWA)
- **Offline Support**: Play even without internet connection
- **Install to Home Screen**: Install as a native-like app
- **Background Sync**: Sync progress when connection is restored
- **Push Notifications**: Get notified of multiplayer invites

### UI/UX
- **Clean Interface**: Modern, responsive design
- **Player Stats**: Track your progress and achievements
- **Leaderboards**: Mode-specific high scores
- **Settings**: Customizable audio and graphics options

## How to Play

### Controls
- **Keyboard**: 
  - Arrow Left/Right: Change lanes
  - Escape: Pause game
- **Mouse**: Click left/right of center to change lanes
- **Touch**: Swipe left/right to change lanes

### Getting Started
1. Open the game in a modern web browser
2. Complete the tutorial level
3. Select a game mode from the main menu
4. Avoid obstacles and rack up points!

## Technical Details

### Technologies Used
- **Three.js**: 3D graphics rendering
- **WebRTC (SimplePeer)**: Peer-to-peer multiplayer
- **WebXR**: VR/AR support
- **Web Audio API**: Dynamic sound generation
- **Service Workers**: PWA offline functionality
- **LocalStorage**: Persistent progress storage

### Browser Requirements
- Modern browser with WebGL support
- For VR: WebXR compatible browser and device
- For multiplayer: WebRTC support

### Running Locally
1. Clone the repository
2. Run a local web server:
   ```bash
   python -m http.server 8000
   # or
   npm start
   ```
3. Open `http://localhost:8000` in your browser

### Installing as PWA
1. Open the game in Chrome/Edge/Safari
2. Look for the "Install" prompt in the address bar
3. Click install to add to your home screen

## Game Modes Details

### Classic Mode
- Endless gameplay with gradually increasing difficulty
- Speed increases over time
- Obstacles spawn more frequently as you progress
- Best for practicing and earning XP

### Time Attack (Unlock at Level 5)
- 60-second time limit
- Score as many points as possible
- Higher speed from the start
- Intense, fast-paced action

### Survival (Unlock at Level 10)
- Extreme difficulty
- Very frequent obstacle spawning
- Test your reflexes and skills
- Highest XP multiplier

## Multiplayer Guide

### Hosting a Game
1. Click "Multiplayer" from the main menu
2. Click "Create Room"
3. Share the Room ID with other players
4. Wait for players to join

### Joining a Game
1. Get the Room ID from the host
2. Click "Multiplayer" from the main menu
3. Enter the Room ID
4. Click "Join Room"

**Note**: Full multiplayer functionality requires a signaling server for WebRTC connections. The current implementation provides the framework.

## Development

### Project Structure
```
├── index.html          # Main HTML file
├── styles.css          # All CSS styles
├── game.js            # Game engine and logic
├── manifest.json      # PWA manifest
├── sw.js              # Service worker
├── package.json       # Project metadata
└── README.md          # This file
```

### Key Classes
- `GameEngine`: Main game loop and rendering
- `PlayerProgress`: Manages player level, XP, and unlocks
- Event handlers for UI interactions

### Adding New Features
- New game modes: Modify `startGame()` and `updateGame()` methods
- New vehicles: Add to `PlayerProgress.vehicles` array
- New skills: Add to `PlayerProgress.skills` object

## Credits
Built with modern web technologies for an immersive gaming experience.

## License
MIT License - Feel free to use and modify!
