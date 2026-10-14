/*
  auth-check.js — simple client-side admin gate for the dashboard pages.
*/

const ADMIN_USERNAME = "SamyZays";
const ADMIN_PASSWORD = "!2026amyZays@1234";

const SESSION_KEY = "biometricBreakerAdminSession";

function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === "true";
}

function attemptLogin(username, password) {
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, "true");
    return true;
  }
  return false;
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = "login.html";
}

// Call at the top of any page that requires login (e.g. dashboard.html)
function requireLogin() {
  if (!isLoggedIn()) {
    window.location.href = "login.html";
  }
}
