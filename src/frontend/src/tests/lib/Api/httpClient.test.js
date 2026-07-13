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

  it('omits the Content-Type header for a bodyless POST', async () => {
    // Fastify rejects a request that declares `Content-Type: application/json`
    // but sends no body at all (FST_ERR_CTP_EMPTY_JSON_BODY) — a bodyless
    // POST like `POST /api/v1/round` must not carry that header.
    global.fetch = jest.fn().mockResolvedValue(new Response('{}', { status: 200 }));

    const client = createHttpClient('http://api.test');
    await client.post('/things');

    const request = global.fetch.mock.calls[0][0];
    expect(request.headers.get('content-type')).toBeNull();
  });
});
