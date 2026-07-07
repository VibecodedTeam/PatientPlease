import '@testing-library/jest-dom';
import { fetch, Headers, Request, Response } from 'undici';

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
