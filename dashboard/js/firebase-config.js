/*
  firebase-config.js — filled with Firebase project's details.

  Where to find these: Firebase Console -> Project settings (gear icon) ->
  General tab -> "Your apps" -> SDK setup and configuration -> Config.

*/
const firebaseConfig = {
  apiKey: "AIzaSyAIgVXqkXy2uqqhOxC0WMnm7fvM5Bt2NSk",
  authDomain: "biometric-smart-breaker-2026.firebaseapp.com",
  databaseURL: "https://biometric-smart-breaker-2026-default-rtdb.firebaseio.com",
  projectId: "biometric-smart-breaker-2026",
  storageBucket: "biometric-smart-breaker-2026.firebasestorage.app",
  messagingSenderId: "938702477362",
  appId: "1:938702477362:web:d1fc64e983e006e123842b"
};

firebase.initializeApp(firebaseConfig);

// Anonymous sign-in so the dashboard can satisfy database rules like
// {".read": "auth != null", ".write": "auth != null"} without a full
// login system of its own (the admin-only gate is handled separately by
// js/auth-check.js on top of this).
firebase.auth().signInAnonymously().catch(function (err) {
  console.error("Firebase anonymous sign-in failed:", err.message);
});

const db = firebase.database();
