import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ApiProvider, useApi } from '../../../../src/providers/Api';

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
    global.fetch = jest.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    render(
      <ApiProvider baseUrl="http://api.test">
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

  it('sends requests with credentials included, so the session cookie round-trips cross-origin', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('{}', { status: 200 }));

    render(
      <ApiProvider baseUrl="http://api.test">
        <GetCaller />
      </ApiProvider>,
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    // Axios's fetch adapter passes a Request instance as fetch's sole
    // argument, carrying `credentials` directly (see src/frontend/lib/Api's
    // own test for the underlying verification).
    const request = global.fetch.mock.calls[0][0];
    expect(request.credentials).toBe('include');
  });

  it('resolves without parsing a body for 204 No Content responses', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const onResult = jest.fn();

    render(
      <ApiProvider baseUrl="http://api.test">
        <PostCaller path="/auth/logout" onResult={onResult} />
      </ApiProvider>,
    );

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(null));
  });
});
