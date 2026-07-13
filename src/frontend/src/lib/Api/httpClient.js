import axios from 'axios';

const DEFAULT_BASE_URL = (import.meta.env && import.meta.env.VITE_API_BASE_URL) || 'http://localhost:4000';

/**
 * Generic REST helper shared by every provider that needs to talk HTTP.
 * Framework-free and stateless beyond the axios instance it wraps — knows
 * nothing about patients, documents, diagnoses, auth sessions, or any other
 * resource, only how to make requests and normalize responses.
 *
 * Configured with axios's `fetch` adapter (rather than the environment's
 * default `xhr`/`http` resolution) so it stays mockable via `global.fetch`
 * in this repo's jsdom-based Jest tests.
 *
 * @param {string} baseUrl - Root URL to resolve requests against.
 * @param {object} [options]
 * @param {boolean} [options.withCredentials=false] - Send cookies cross-origin (needed for session-cookie backends like /auth).
 * @returns {{
 *   get: function(string, object=): Promise<any>,
 *   post: function(string, object=, object=): Promise<any>,
 *   put: function(string, object=, object=): Promise<any>,
 *   patch: function(string, object=, object=): Promise<any>,
 *   delete: function(string, object=): Promise<any>,
 * }}
 */
export function createHttpClient(baseUrl = DEFAULT_BASE_URL, { withCredentials = false } = {}) {
  const instance = axios.create({
    baseURL: baseUrl,
    withCredentials,
    adapter: 'fetch',
    headers: { 'Content-Type': 'application/json' },
  });

  function unwrap(response) {
    return response.status === 204 ? null : response.data;
  }

  async function get(path, config = {}) {
    return unwrap(await instance.get(path, config));
  }

  // Fastify rejects a request that declares `Content-Type: application/json`
  // but carries no body at all (FST_ERR_CTP_EMPTY_JSON_BODY) — a bodyless
  // call like `POST /api/v1/round` must not carry that header.
  function configFor(body, config) {
    if (body !== undefined) return config;
    // `false` (not `undefined`) is required here: axios always forces a
    // default Content-Type on POST/PUT/PATCH unless the header is explicitly
    // `false`, which is the one value its own default-setting logic treats
    // as "leave this header alone".
    return { ...config, headers: { ...config.headers, 'Content-Type': false } };
  }

  async function post(path, body, config = {}) {
    return unwrap(await instance.post(path, body, configFor(body, config)));
  }

  async function put(path, body, config = {}) {
    return unwrap(await instance.put(path, body, configFor(body, config)));
  }

  async function patch(path, body, config = {}) {
    return unwrap(await instance.patch(path, body, configFor(body, config)));
  }

  async function del(path, config = {}) {
    return unwrap(await instance.delete(path, config));
  }

  return { get, post, put, patch, delete: del };
}
