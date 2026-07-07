import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PatientSceneContext } from '../../../components/PatientScene/PatientSceneProvider';
import { PatientScene } from '../../../components/PatientScene';
import { pickDot } from '../../../components/PatientScene/internal/pickDot';

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
// OrbitControls is inert in this test environment, so the camera is never actually
// aimed at the model — real click-to-screen-position geometry isn't meaningful here.
// pickDot's own hit-testing math is covered by tests/components/PatientScene/internal/pickDot.test.js;
// this file only verifies PatientScene's click-handling wiring calls it and applies the red color.
jest.mock('../../../components/PatientScene/internal/pickDot');

function renderWithSceneContext(contextValue) {
  return render(
    React.createElement(
      PatientSceneContext.Provider,
      { value: contextValue },
      React.createElement(PatientScene)
    )
  );
}

describe('PatientScene', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders a container for the 3D scene', () => {
    renderWithSceneContext({ model: null, status: 'loading', error: null });
    expect(screen.getByTestId('patient-scene-container')).toBeInTheDocument();
  });

  it('renders without crashing once a model is available', () => {
    const actualThree = jest.requireActual('three');
    const model = new actualThree.Group();
    model.add(new actualThree.Mesh(new actualThree.BoxGeometry(1, 1, 1)));

    renderWithSceneContext({ model, status: 'success', error: null });
    expect(screen.getByTestId('patient-scene-container')).toBeInTheDocument();
  });

  it('turns the clicked dot red', () => {
    const actualThree = jest.requireActual('three');
    const model = new actualThree.Group();
    model.add(new actualThree.Mesh(new actualThree.BoxGeometry(1, 1, 1)));
    const dot = new actualThree.Mesh(
      new actualThree.SphereGeometry(0.1),
      new actualThree.MeshBasicMaterial({ color: 0x00ff00 })
    );
    dot.userData.isKropka = true;
    model.add(dot);

    pickDot.mockReturnValue(dot);

    const { container } = renderWithSceneContext({ model, status: 'success', error: null });
    const canvas = container.querySelector('canvas');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 150 });

    fireEvent.click(canvas, { clientX: 150, clientY: 75 });

    expect(pickDot).toHaveBeenCalled();
    expect(dot.material.color.getHex()).toBe(0xff0000);
  });
});
