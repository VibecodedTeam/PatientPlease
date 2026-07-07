import axios from 'axios';

/**
 * Fetches a raw .obj model file as plain text so it can be parsed by three.js's OBJLoader.
 * @param {string} url - path to the .obj file (e.g. a Vite public/ asset path)
 * @returns {Promise<string>} raw .obj file contents
 */
export async function fetchObjModel(url) {
  const response = await axios.get(url, {
    responseType: 'text',
    // Axios auto-parses text that looks like JSON; disable that since .obj files are plain text.
    transformResponse: [(data) => data],
  });
  return response.data;
}
