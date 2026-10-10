/**
 * NEXORA AI Battery Intelligence Platform
 * API Base URL Configuration Layer
 */

export const API_BASE_URL = (() => {
  // If window config is present (e.g. injected at runtime)
  if (window.NEXORA_API_BASE_URL) {
    return window.NEXORA_API_BASE_URL.replace(/\/$/, '');
  }

  // If served from the same origin (e.g. FastAPI serving static frontend files or reverse proxy)
  if (window.location.protocol.startsWith('http')) {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost && window.location.port !== '8001') {
      return 'http://localhost:8001';
    }
    return window.location.origin;
  }

  return 'http://localhost:8001';
})();
