import React from 'react';
import { render, screen } from '@testing-library/react';
import { ApiProvider, useApi } from '../../../providers/Api';

function TestConsumer() {
  const api = useApi();
  return <div>{typeof api.get === 'function' ? 'has-get' : 'missing-get'}</div>;
}

function BareConsumer() {
  useApi();
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
});
