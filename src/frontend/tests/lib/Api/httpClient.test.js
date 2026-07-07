import { createHttpClient } from '../../../lib/Api';

describe('createHttpClient', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

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

    const calledWith = global.fetch.mock.calls[0][0];
    // Axios's fetch adapter passes a Request instance here (not a plain
    // URL string) when the environment's Request supports `credentials`.
    // Assert against whichever shape it actually used — read
    // `global.fetch.mock.calls[0]` if this fails to see the real shape.
    expect(calledWith.credentials ?? global.fetch.mock.calls[0][1]?.credentials).toBe('include');
  });

  it('does not send credentials by default', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('{}', { status: 200 }));

    const client = createHttpClient('http://api.test');
    await client.get('/things');

    const calledWith = global.fetch.mock.calls[0][0];
    const credentials = calledWith.credentials ?? global.fetch.mock.calls[0][1]?.credentials;
    expect(credentials === 'omit' || credentials === undefined).toBe(true);
  });
});
