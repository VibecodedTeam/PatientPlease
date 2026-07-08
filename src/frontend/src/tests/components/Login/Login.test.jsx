import React from 'react';
import { render } from '@testing-library/react';
import { Login } from '../../../components/Login';

describe('Login', () => {
  beforeEach(() => {
    delete window.google;
    document.getElementById('google-gsi-script')?.remove();
  });

  it('initializes GSI immediately with the given client ID when the script is already loaded', () => {
    const initialize = jest.fn();
    const renderButton = jest.fn();
    window.google = { accounts: { id: { initialize, renderButton } } };

    render(<Login googleClientId="test-client-id" onCredential={() => {}} />);

    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'test-client-id', callback: expect.any(Function) }),
    );
    expect(renderButton).toHaveBeenCalled();
  });

  it('calls onCredential with the credential when GSI invokes the callback', () => {
    const initialize = jest.fn();
    window.google = { accounts: { id: { initialize, renderButton: jest.fn() } } };
    const onCredential = jest.fn();

    render(<Login googleClientId="test-client-id" onCredential={onCredential} />);

    const { callback } = initialize.mock.calls[0][0];
    callback({ credential: 'id-token-123' });

    expect(onCredential).toHaveBeenCalledWith('id-token-123');
  });

  it('injects the GSI script and initializes once it loads, when not already present', () => {
    render(<Login googleClientId="test-client-id" onCredential={() => {}} />);

    const script = document.getElementById('google-gsi-script');
    expect(script).not.toBeNull();
    expect(script.src).toBe('https://accounts.google.com/gsi/client');

    const initialize = jest.fn();
    window.google = { accounts: { id: { initialize, renderButton: jest.fn() } } };
    script.dispatchEvent(new Event('load'));

    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'test-client-id' }),
    );
  });
});
