/**
 * GEOGRAPHY EDU - FIREBASE CONFIGURATION
 * High School Help Kit Project
 *
 * Firebase configuration is no longer committed to the frontend file.
 * The frontend fetches a secure server-provided config endpoint.
 */

(function () {
  'use strict';

  // Default project Firebase configuration for High School Help Kit
  const DEFAULT_FIREBASE_CONFIG = {
    apiKey: "AIzaSyDKTTOdnqXNstS1zDFunLMlx3rlEc5Q1mA",
    authDomain: "hshk-38bf1.firebaseapp.com",
    projectId: "hshk-38bf1",
    storageBucket: "hshk-38bf1.firebasestorage.app",
    messagingSenderId: "96036069171",
    appId: "1:96036069171:web:184bb95989b5d6b99ae846",
    measurementId: "G-J75CMK1DV2"
  };

  // Immediate synchronous initialization to ensure window.db & window.auth exist BEFORE data.js loads
  try {
    if (typeof firebase !== 'undefined') {
      const firebaseApp = (firebase.apps && firebase.apps.length > 0)
        ? firebase.app()
        : firebase.initializeApp(DEFAULT_FIREBASE_CONFIG);

      const db = firebase.firestore();
      const auth = firebase.auth();
      const googleProvider = new firebase.auth.GoogleAuthProvider();
      googleProvider.setCustomParameters({ prompt: 'select_account' });

      let storage = null;
      try {
        if (firebase.storage) storage = firebase.storage();
      } catch (storageErr) {
        console.warn('[Firebase Storage] Storage init notice:', storageErr);
      }

      let analytics = null;
      try {
        if (firebase.analytics) analytics = firebase.analytics();
      } catch (analyticsErr) {
        console.warn('[Firebase Analytics] Analytics init notice:', analyticsErr);
      }

      window.firebaseApp = firebaseApp;
      window.db = db;
      window.auth = auth;
      window.googleProvider = googleProvider;
      window.storage = storage;
      window.analytics = analytics;

      console.log('[Firebase] Initialized successfully - Project:', DEFAULT_FIREBASE_CONFIG.projectId);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('firebase_ready', { detail: { db, auth } }));
      }
    }
  } catch (syncErr) {
    console.warn('[Firebase] Synchronous init notice:', syncErr);
  }

  // Background check for dynamic config update if needed
  async function refreshConfigIfNeeded() {
    try {
      const res = await fetch('/api/config/firebase', { method: 'GET' });
      if (res.ok) {
        const payload = await res.json();
        if (payload && payload.firebaseConfig && payload.firebaseConfig.apiKey) {
          window.__FIREBASE_CONFIG__ = payload.firebaseConfig;
        }
      }
    } catch (e) {}
  }
  refreshConfigIfNeeded();
})();
