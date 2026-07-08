import '@testing-library/jest-dom';
import { fetch, Headers, Request, Response } from 'undici';

// Mock Three.js to avoid WebGL errors in test environment
global.THREE = {
  Scene: jest.fn(),
  PerspectiveCamera: jest.fn(),
  WebGLRenderer: jest.fn(() => ({
    setSize: jest.fn(),
    setPixelRatio: jest.fn(),
    domElement: document.createElement('canvas'),
    render: jest.fn(),
    dispose: jest.fn(),
  })),
  AmbientLight: jest.fn(),
  DirectionalLight: jest.fn(),
  Color: jest.fn(),
  Vector3: jest.fn(() => ({
    x: 0, y: 0, z: 0,
    set: jest.fn(function(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }),
  })),
  Box3: jest.fn(() => ({
    setFromObject: jest.fn().mockReturnThis(),
    getCenter: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
    getSize: jest.fn(() => ({ x: 1, y: 1, z: 1 })),
  })),
  MeshStandardMaterial: jest.fn(),
};

// jest-environment-jsdom doesn't implement fetch/Request/Response — polyfill
// with undici's spec-compliant implementations so axios's `fetch` adapter
// (lib/Api/httpClient.js) can run for real in tests, with `global.fetch`
// mockable per-test (Section 8 of CLAUDE.md). jest.config.js's
// resetModules ensures this (and axios) get a fresh module instance bound
// to each test file's own jsdom global, rather than staying pinned to
// whichever file's global was active the first time they were required.
if (typeof globalThis.fetch === 'undefined') {
  Object.assign(globalThis, { fetch, Headers, Request, Response });
}

// Every test that mocks `global.fetch` (Section 8's convention) needs to
// restore it afterward, or a later test file inherits the previous one's
// mock. Centralized here instead of every test file re-declaring its own
// originalFetch/beforeEach/afterEach triplet.
let originalFetch;

beforeEach(() => {
  originalFetch = global.fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});
