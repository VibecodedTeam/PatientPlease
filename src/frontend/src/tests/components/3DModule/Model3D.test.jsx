import React from 'react';
import { render, screen } from '@testing-library/react';
import { Model3DContext } from '../../../components/3DModule/Model3DProvider';
import { Model3D } from '../../../components/3DModule';

// esbuild-jest mishandles JSX hoisting in files that also call jest.mock(),
// so this file uses React.createElement instead of JSX literals throughout.
// jsdom has no real WebGL context, so WebGLRenderer/OrbitControls are stubbed;
// everything else (Scene, cameras, math, lights) runs as real three.js code.
jest.mock('three', () => {
  const actualThree = jest.requireActual('three');
  return {
    ...actualThree,
    WebGLRenderer: jest.fn().mockImplementation(() => ({
      domElement: global.document.createElement('canvas'),
      setSize: jest.fn(),
      setPixelRatio: jest.fn(),
      render: jest.fn(),
      dispose: jest.fn(),
    })),
  };
});
jest.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: jest.fn().mockImplementation(() => ({
    enableDamping: false,
    dampingFactor: 0,
    enableZoom: false,
    minDistance: 0,
    maxDistance: 0,
    target: { set: jest.fn() },
    update: jest.fn(),
    dispose: jest.fn(),
  })),
}));

function renderWithModelContext(contextValue) {
  return render(
    React.createElement(Model3DContext.Provider, { value: contextValue }, React.createElement(Model3D))
  );
}

describe('Model3D', () => {
  it('renders a container for the 3D scene', () => {
    renderWithModelContext({ model: null, status: 'loading', error: null });
    expect(screen.getByTestId('model-3d-container')).toBeInTheDocument();
  });

  it('renders without crashing once a model is available', () => {
    const actualThree = jest.requireActual('three');
    const model = new actualThree.Group();
    model.add(new actualThree.Mesh(new actualThree.BoxGeometry(1, 1, 1)));

    renderWithModelContext({ model, status: 'success', error: null });
    expect(screen.getByTestId('model-3d-container')).toBeInTheDocument();
  });
});
