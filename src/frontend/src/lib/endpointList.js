/**
 * Single source of truth for the backend's HTTP surface: the base URL every
 * request resolves against, and every route path the frontend calls.
 * Framework-free and stateless — a provider's job is to hold the HTTP client
 * (Section 5's Api domain), this module only names where it points.
 */

export const API_BASE_URL =
  (import.meta.env && import.meta.env.VITE_API_BASE_URL) || 'http://localhost:4000';

/** Mirrors src/backend/src/routes/*.ts one-for-one. */
export const ENDPOINTS = {
  health: '/health',
  auth: {
    google: '/auth/google',
    me: '/auth/me',
    logout: '/auth/logout',
  },
  round: {
    start: '/api/v1/round',
  },
  diagnoses: {
    submit: '/api/v1/diagnoses',
  },
  game: {
    pause: '/api/v1/game/pause',
    reset: '/api/v1/game/reset',
  },
  day: {
    reset: '/api/v1/day/reset',
    end: '/api/v1/day/end',
  },
  diagnoses: {
    submit: '/api/v1/diagnoses',
  },
  examinations: {
    order: '/api/v1/examinations',
  },
  shop: {
    list: '/api/v1/shop',
    purchase: '/api/v1/shop/purchase',
  },
  inventory: {
    get: '/api/v1/inventory',
    update: '/api/v1/inventory',
  },
};

/**
 * @param {string} path - One of the relative paths from ENDPOINTS.
 * @returns {string} The path resolved against API_BASE_URL.
 */
export function buildEndpointUrl(path) {
  return `${API_BASE_URL}${path}`;
}
