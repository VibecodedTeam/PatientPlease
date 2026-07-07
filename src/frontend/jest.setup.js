import '@testing-library/jest-dom';
import { fetch, Headers, Request, Response } from 'undici';

// jest-environment-jsdom doesn't implement fetch/Request/Response — polyfill
// with undici's spec-compliant implementations so axios's `fetch` adapter
// (lib/Api/httpClient.js) can run for real in tests, with `global.fetch`
// mockable per-test (Section 8 of CLAUDE.md).
if (typeof globalThis.fetch === 'undefined') {
  Object.assign(globalThis, { fetch, Headers, Request, Response });
}
