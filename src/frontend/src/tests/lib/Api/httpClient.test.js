import { createHttpClient } from '../../../lib/Api';

describe('createHttpClient', () => {
  it('resolves a GET with the parsed JSON body', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ hello: 'world' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const client = createHttpClient('http://api.test');
    await expect(client.get('/things')).resolves.toEqual({ hello: 'world' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('resolves null instead of parsing a body for a 204 No Content response', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(null, { status: 204 }));

    const client = createHttpClient('http://api.test');
    await expect(client.post('/things', { a: 1 })).resolves.toBeNull();
  });

  it('sends credentials when withCredentials is requested', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('{}', { status: 200 }));

    const client = createHttpClient('http://api.test', { withCredentials: true });
    await client.get('/things');

    // Axios's fetch adapter passes a Request instance as fetch's sole
    // argument, carrying `credentials` directly (verified against this
    // repo's exact axios/undici versions).
    const request = global.fetch.mock.calls[0][0];
    expect(request.credentials).toBe('include');
  });

  it('does not send credentials by default', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('{}', { status: 200 }));

    const client = createHttpClient('http://api.test');
    await client.get('/things');

    const request = global.fetch.mock.calls[0][0];
    expect(request.credentials).toBe('omit');
  });

  it('declares a JSON content-type on a POST with no explicit body', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('{}', { status: 200 }));

    const client = createHttpClient('http://api.test');
    await client.post('/things');

    // axios forces Content-Type: application/x-www-form-urlencoded onto any
    // POST/PUT/PATCH with an undefined body, and this backend has no parser
    // registered for that content type, so a truly bodyless request gets
    // rejected (415) — every no-body POST in this app (round.start,
    // game.pause/reset, day.reset/end, auth.logout) would hit this in real
    // use. Defaulting the body to `{}` (see httpClient.js) sends a valid,
    // non-empty JSON payload instead, which Fastify parses fine.
    const request = global.fetch.mock.calls[0][0];
    expect(request.headers.get('content-type')).toBe('application/json');
  });

  it('still declares a JSON content-type on a POST that does send a body', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('{}', { status: 200 }));

    const client = createHttpClient('http://api.test');
    await client.post('/things', { a: 1 });

    const request = global.fetch.mock.calls[0][0];
    expect(request.headers.get('content-type')).toBe('application/json');
  });
});
