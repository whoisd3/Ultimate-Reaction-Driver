// Firebase utilities for Ultimate Reaction Driver
// This module provides Firebase integration for features like leaderboards, user data, etc.

// Note: This is for future Node.js/bundler integration
// Currently using CDN imports in index.html for immediate compatibility

/**
 * Future Firebase features to implement:
 * - User authentication for leaderboards
 * - Cloud Firestore for persistent game data
 * - Real-time multiplayer updates
 * - Cloud Functions for game logic
 */

// Configuration (same as in index.html)
export const firebaseConfig = {
  apiKey: "AIzaSyD7EJ0Pj2MqyGq_K8FSBoSy6snG6qx3Eeg",
  authDomain: "ultimate-reaction-driver.firebaseapp.com",
  projectId: "ultimate-reaction-driver",
  storageBucket: "ultimate-reaction-driver.firebasestorage.app",
  messagingSenderId: "830331959670",
  appId: "1:830331959670:web:d4a2c254d3f876bc596257",
  measurementId: "G-GP3S1W0S21"
};

// Utility functions for future use
export function trackGameEvent(eventName, parameters = {}) {
  if (window.firebaseAnalytics) {
    console.log('Tracking event:', eventName, parameters);
    // Will implement gtag tracking when ready
  }
}

export function logGameScore(mode, score, distance) {
  trackGameEvent('game_end', {
    game_mode: mode,
    score: score,
    distance: distance,
    timestamp: Date.now()
  });
}

export function logLevelUp(newLevel) {
  trackGameEvent('level_up', {
    level: newLevel,
    timestamp: Date.now()
  });
}

console.log('Firebase utilities loaded');