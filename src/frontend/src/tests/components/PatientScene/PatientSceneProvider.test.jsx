import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { PatientSceneProvider } from '../../../components/PatientScene/PatientSceneProvider';
import { usePatientScene } from '../../../components/PatientScene';

// esbuild-jest mishandles JSX hoisting in files that also call jest.mock(),
// so this file uses React.createElement instead of JSX literals throughout.
jest.mock('axios');
jest.mock('three/examples/jsm/loaders/OBJLoader.js');

function TestConsumer() {
  const { model, status, error } = usePatientScene();
  return React.createElement(
    'div',
    null,
    React.createElement('span', { 'data-testid': 'status' }, status),
    React.createElement('span', { 'data-testid': 'model' }, model ? 'has-model' : 'no-model'),
    React.createElement('span', { 'data-testid': 'error' }, error ? error.message : 'no-error')
  );
}

describe('PatientSceneProvider', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('exposes the parsed model on success', async () => {
    axios.get.mockResolvedValueOnce({ data: 'o Cube\nv 0 0 0\n' });
    const parsedGroup = { isGroup: true };
    OBJLoader.mockImplementation(() => ({
      parse: jest.fn().mockReturnValue(parsedGroup),
    }));

    render(
      React.createElement(
        PatientSceneProvider,
        { url: '/3DModels/FinalBaseMesh.obj' },
        React.createElement(TestConsumer)
      )
    );

    expect(screen.getByTestId('status').textContent).toBe('loading');

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('success'));
    expect(screen.getByTestId('model').textContent).toBe('has-model');
    expect(axios.get).toHaveBeenCalledWith(
      '/3DModels/FinalBaseMesh.obj',
      expect.objectContaining({
        responseType: 'text',
        transformResponse: [expect.any(Function)],
      })
    );
  });

  it('exposes an error when the fetch fails', async () => {
    axios.get.mockRejectedValueOnce(new Error('network error'));

    render(
      React.createElement(
        PatientSceneProvider,
        { url: '/3DModels/FinalBaseMesh.obj' },
        React.createElement(TestConsumer)
      )
    );

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('error'));
    expect(screen.getByTestId('error').textContent).toBe('network error');
    expect(screen.getByTestId('model').textContent).toBe('no-model');
  });

  it('throws when usePatientScene is used outside the provider', () => {
    const ConsumerWithoutProvider = () => {
      usePatientScene();
      return null;
    };
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(React.createElement(ConsumerWithoutProvider))).toThrow(
      'usePatientScene must be used within a PatientSceneProvider'
    );

    consoleError.mockRestore();
  });
});
