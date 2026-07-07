import axios from 'axios';

const DEFAULT_BASE_URL = (import.meta.env && import.meta.env.VITE_API_BASE_URL) || 'http://localhost:3000';

/**
 * Generic REST helper shared by every domain provider. Knows nothing about
 * patients, documents, diagnoses, or any other resource — it only knows how
 * to talk HTTP to the backend, so it can service any data the backend exposes.
 *
 * @param {string} baseUrl - Root URL of the backend API.
 * @returns {{
 *   get: function(string, object=): Promise<any>,
 *   post: function(string, object, object=): Promise<any>,
 *   put: function(string, object, object=): Promise<any>,
 *   patch: function(string, object, object=): Promise<any>,
 *   delete: function(string, object=): Promise<any>,
 * }}
 */
export function createHttpClient(baseUrl = DEFAULT_BASE_URL) {
  const instance = axios.create({
    baseURL: baseUrl,
    headers: { 'Content-Type': 'application/json' },
  });

  async function get(path, config = {}) {
    const response = await instance.get(path, config);
    return response.data;
  }

  async function post(path, body, config = {}) {
    const response = await instance.post(path, body, config);
    return response.data;
  }

  async function put(path, body, config = {}) {
    const response = await instance.put(path, body, config);
    return response.data;
  }

  async function patch(path, body, config = {}) {
    const response = await instance.patch(path, body, config);
    return response.data;
  }

  async function del(path, config = {}) {
    const response = await instance.delete(path, config);
    return response.data;
  }

  return { get, post, put, patch, delete: del };
}

export const apiClient = createHttpClient();
