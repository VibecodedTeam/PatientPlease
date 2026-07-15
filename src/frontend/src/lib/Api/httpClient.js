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
  });

  function unwrap(response) {
    return response.status === 204 ? null : response.data;
  }

  async function get(path, config = {}) {
    return unwrap(await instance.get(path, config));
  }

  // Defaulting to {} rather than leaving the body undefined: axios forces
  // some Content-Type onto every POST/PUT/PATCH once it reaches its
  // dispatch step (application/x-www-form-urlencoded, unconditionally,
  // regardless of axios.create() config), and this backend has no parser
  // registered for that content type, so a truly bodyless request gets
  // rejected (415). Sending a real {} body makes axios's own
  // transformRequest correctly set Content-Type: application/json with a
  // valid, non-empty "{}" payload beforehand, which wins over the forced
  // default and which Fastify parses fine.
  async function post(path, body = {}, config = {}) {
    return unwrap(await instance.post(path, body, config));
  }

  async function put(path, body = {}, config = {}) {
    return unwrap(await instance.put(path, body, config));
  }

  async function patch(path, body = {}, config = {}) {
    return unwrap(await instance.patch(path, body, config));
  }

  async function del(path, config = {}) {
    return unwrap(await instance.delete(path, config));
  }

  return { get, post, put, patch, delete: del };
}