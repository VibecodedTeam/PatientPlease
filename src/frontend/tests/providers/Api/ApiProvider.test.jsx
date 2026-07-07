import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ApiProvider, useApi } from '../../../providers/Api';

function TestConsumer() {
  const api = useApi();
  return <div>{typeof api.get === 'function' ? 'has-get' : 'missing-get'}</div>;
}

function BareConsumer() {
  useApi();
  return null;
}

function GetCaller() {
  const api = useApi();
  api.get('/auth/me');
  return null;
}

function PostCaller({ path, onResult }) {
  const api = useApi();
  api.post(path).then(onResult);
  return null;
}

describe('ApiProvider / useApi', () => {
  it('exposes a get method to consumers', () => {
    render(
      <ApiProvider>
        <TestConsumer />
      </ApiProvider>,
    );
    expect(screen.getByText('has-get')).toBeInTheDocument();
  });

  it('throws when useApi is used outside ApiProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<BareConsumer />)).toThrow('useApi must be used within an ApiProvider');
    consoleError.mockRestore();
  });

  it('sends requests with credentials included, so the session cookie round-trips cross-origin', () => {
    const originalFetch = global.fetch;
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    global.fetch = fetchMock;

    render(
      <ApiProvider>
        <GetCaller />
      </ApiProvider>,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: 'include' }),
    );
    global.fetch = originalFetch;
  });

  it('resolves without parsing a body for 204 No Content responses', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.reject(new Error('Unexpected end of JSON input')),
    });
    const onResult = jest.fn();

    render(
      <ApiProvider>
        <PostCaller path="/auth/logout" onResult={onResult} />
      </ApiProvider>,
    );

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(null));
    global.fetch = originalFetch;
  });
});
