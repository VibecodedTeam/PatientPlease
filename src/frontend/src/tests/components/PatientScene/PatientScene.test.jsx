import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import * as THREE_MOCKED from 'three';
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

function renderWithSceneContext(contextValue, patientSceneProps = {}) {
  return render(
    React.createElement(
      PatientSceneContext.Provider,
      { value: contextValue },
      React.createElement(PatientScene, patientSceneProps)
    )
  );
}

describe('PatientScene', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="overlay-root"></div>';
  });

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

  it('places a dot only for regions present in the documents prop, including OTHER', () => {
    const actualThree = jest.requireActual('three');
    const model = new actualThree.Group();
    model.add(new actualThree.Mesh(new actualThree.BoxGeometry(1, 1, 1)));

    const documents = [
      { id: 'd1', attentionPointRegion: 'HEAD' },
      { id: 'd2', attentionPointRegion: null },
      { id: 'd3', attentionPointRegion: 'OTHER' },
    ];

    renderWithSceneContext({ model, status: 'success', error: null }, { documents });

    const placedRegions = model.children
      .filter((child) => child.userData.isKropka)
      .map((child) => child.userData.bodyRegion)
      .sort();

    expect(placedRegions).toEqual(['HEAD', 'OTHER']);
  });

  it('does not re-fit/re-center the model when the effect re-runs for a new-but-equal documents reference', () => {
    const actualThree = jest.requireActual('three');
    const model = new actualThree.Group();
    // Humanoid-shaped: local origin at the feet (y=0), body extends up to y=180 —
    // a common export convention, and the actual root cause of the zoom bug: without
    // a guard, a second effect run re-measures the ALREADY-fitted world-space box,
    // computes scale = 2/2 = 1, and snaps the model back to this raw, unscaled size
    // with its local origin (the feet) landing exactly on OrbitControls' fixed target.
    const bodyMesh = new actualThree.Mesh(new actualThree.BoxGeometry(60, 180, 30));
    bodyMesh.position.set(0, 90, 0);
    model.add(bodyMesh);

    const { rerender } = renderWithSceneContext(
      { model, status: 'success', error: null },
      { documents: [{ id: 'd1', attentionPointRegion: 'HEAD' }] },
    );

    const scaleAfterFirstRun = model.scale.x;
    const positionAfterFirstRun = model.position.clone();

    // Same content, new array reference — exactly what a second RoundProvider
    // fetch resolving with fresh JSON produces.
    rerender(
      React.createElement(
        PatientSceneContext.Provider,
        { value: { model, status: 'success', error: null } },
        React.createElement(PatientScene, {
          documents: [{ id: 'd1', attentionPointRegion: 'HEAD' }],
        }),
      ),
    );

    expect(model.scale.x).toBeCloseTo(scaleAfterFirstRun, 5);
    expect(model.position.x).toBeCloseTo(positionAfterFirstRun.x, 5);
    expect(model.position.y).toBeCloseTo(positionAfterFirstRun.y, 5);
    expect(model.position.z).toBeCloseTo(positionAfterFirstRun.z, 5);
  });

  it('replaces old dots instead of accumulating them when documents changes', () => {
    const actualThree = jest.requireActual('three');
    const model = new actualThree.Group();
    model.add(new actualThree.Mesh(new actualThree.BoxGeometry(1, 1, 1)));

    const { rerender } = renderWithSceneContext(
      { model, status: 'success', error: null },
      { documents: [{ id: 'd1', attentionPointRegion: 'HEAD' }] },
    );

    rerender(
      React.createElement(
        PatientSceneContext.Provider,
        { value: { model, status: 'success', error: null } },
        React.createElement(PatientScene, {
          documents: [{ id: 'd2', attentionPointRegion: 'CHEST' }],
        }),
      ),
    );

    const placedRegions = model.children
      .filter((child) => child.userData.isKropka)
      .map((child) => child.userData.bodyRegion)
      .sort();

    expect(placedRegions).toEqual(['CHEST']);
  });

  function makeDot(actualThree, color = 0x00ff00) {
    const dot = new actualThree.Mesh(
      new actualThree.SphereGeometry(0.1),
      new actualThree.MeshBasicMaterial({ color })
    );
    dot.userData.isKropka = true;
    dot.userData.baseColor = color;
    return dot;
  }

  it('turns the clicked dot red and opens the image popup', () => {
    const actualThree = jest.requireActual('three');
    const model = new actualThree.Group();
    model.add(new actualThree.Mesh(new actualThree.BoxGeometry(1, 1, 1)));
    const dot = makeDot(actualThree);
    model.add(dot);

    pickDot.mockReturnValue(dot);

    const { container } = renderWithSceneContext({ model, status: 'success', error: null });
    const canvas = container.querySelector('canvas');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 150 });

    fireEvent.click(canvas, { clientX: 150, clientY: 75 });

    expect(pickDot).toHaveBeenCalled();
    expect(dot.material.color.getHex()).toBe(0xff0000);
    const image = screen.getByRole('img');
    expect(image.getAttribute('src')).toMatch(/^\/melanoma\/.+\.jpg$/);
  });

  it('reverts the previously active dot to its base color when a new dot is clicked', () => {
    const actualThree = jest.requireActual('three');
    const model = new actualThree.Group();
    model.add(new actualThree.Mesh(new actualThree.BoxGeometry(1, 1, 1)));
    const firstDot = makeDot(actualThree, 0x00ff00);
    const secondDot = makeDot(actualThree, 0x0000ff);
    model.add(firstDot);
    model.add(secondDot);

    const { container } = renderWithSceneContext({ model, status: 'success', error: null });
    const canvas = container.querySelector('canvas');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 150 });

    pickDot.mockReturnValue(firstDot);
    fireEvent.click(canvas, { clientX: 150, clientY: 75 });
    expect(firstDot.material.color.getHex()).toBe(0xff0000);

    pickDot.mockReturnValue(secondDot);
    fireEvent.click(canvas, { clientX: 150, clientY: 75 });

    expect(firstDot.material.color.getHex()).toBe(0x00ff00);
    expect(secondDot.material.color.getHex()).toBe(0xff0000);
  });

  it('reverts the active dot and closes the popup when the popup is closed', () => {
    const actualThree = jest.requireActual('three');
    const model = new actualThree.Group();
    model.add(new actualThree.Mesh(new actualThree.BoxGeometry(1, 1, 1)));
    const dot = makeDot(actualThree);
    model.add(dot);

    pickDot.mockReturnValue(dot);

    const { container } = renderWithSceneContext({ model, status: 'success', error: null });
    const canvas = container.querySelector('canvas');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 150 });

    fireEvent.click(canvas, { clientX: 150, clientY: 75 });
    expect(dot.material.color.getHex()).toBe(0xff0000);

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(dot.material.color.getHex()).toBe(0x00ff00);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it("passes the clicked region's real document to the popup instead of a random stock image", () => {
    const actualThree = jest.requireActual('three');
    const model = new actualThree.Group();
    model.add(new actualThree.Mesh(new actualThree.BoxGeometry(1, 1, 1)));
    const dot = makeDot(actualThree);
    dot.userData.bodyRegion = 'HEAD';
    model.add(dot);

    pickDot.mockReturnValue(dot);

    const documents = [
      {
        id: 'doc-1',
        type: 'SKIN_IMAGE',
        attentionPointRegion: 'HEAD',
        imageUrl: 'https://cdn.example.test/real-lesion.png',
        imageAltText: 'Real lesion on the head',
      },
    ];

    const { container } = renderWithSceneContext(
      { model, status: 'success', error: null },
      { documents },
    );
    const canvas = container.querySelector('canvas');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 150 });

    fireEvent.click(canvas, { clientX: 150, clientY: 75 });

    const image = screen.getByRole('img');
    expect(image.getAttribute('src')).toBe('https://cdn.example.test/real-lesion.png');
    expect(image.getAttribute('alt')).toBe('Real lesion on the head');
  });

  it('clears the shown document when the popup closes and reopens for a region with no document', () => {
    const actualThree = jest.requireActual('three');
    const model = new actualThree.Group();
    model.add(new actualThree.Mesh(new actualThree.BoxGeometry(1, 1, 1)));
    const headDot = makeDot(actualThree);
    headDot.userData.bodyRegion = 'HEAD';
    const chestDot = makeDot(actualThree, 0x0000ff);
    chestDot.userData.bodyRegion = 'CHEST';
    model.add(headDot);
    model.add(chestDot);

    const documents = [
      {
        id: 'doc-1',
        type: 'SKIN_IMAGE',
        attentionPointRegion: 'HEAD',
        imageUrl: 'https://cdn.example.test/real-lesion.png',
        imageAltText: 'Real lesion on the head',
      },
    ];

    const { container } = renderWithSceneContext(
      { model, status: 'success', error: null },
      { documents },
    );
    const canvas = container.querySelector('canvas');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 150 });

    pickDot.mockReturnValue(headDot);
    fireEvent.click(canvas, { clientX: 150, clientY: 75 });
    expect(screen.getByRole('img').getAttribute('src')).toBe(
      'https://cdn.example.test/real-lesion.png',
    );

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    pickDot.mockReturnValue(chestDot);
    fireEvent.click(canvas, { clientX: 150, clientY: 75 });
    expect(screen.getByRole('img').getAttribute('src')).toMatch(/^\/melanoma\/.+\.jpg$/);
  });

  // MainView.jsx keeps PatientScene mounted and toggles `display: none` on
  // its wrapper (via styles.paneHidden) instead of unmounting it when the
  // player switches to Chat. A native `resize` event firing on `window`
  // while the pane is hidden (e.g. the player maximizes/resizes the browser
  // while on the Chat tab) must not be allowed to zero out the renderer via
  // handleResize (PatientScene.jsx:93-102) — the hidden container's
  // clientWidth/clientHeight are both 0, and nothing would otherwise
  // re-trigger a resize when the player switches back to the 3D tab
  // (MainView only swaps the CSS class), leaving the canvas in the DOM but
  // rendering nothing.
  it('keeps the renderer at its last real size when a resize fires while the pane is hidden', () => {
    const clientWidthDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth');
    const clientHeightDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight');
    const size = { width: 800, height: 600 };
    Object.defineProperty(Element.prototype, 'clientWidth', {
      configurable: true,
      get: () => size.width,
    });
    Object.defineProperty(Element.prototype, 'clientHeight', {
      configurable: true,
      get: () => size.height,
    });

    try {
      renderWithSceneContext({ model: null, status: 'loading', error: null });

      const rendererInstance = THREE_MOCKED.WebGLRenderer.mock.results[0].value;
      expect(rendererInstance.setSize).toHaveBeenLastCalledWith(800, 600);

      // Player switches to Chat: MainView applies display:none to this pane
      // (no unmount), and the browser fires a native resize while it's hidden.
      size.width = 0;
      size.height = 0;
      window.dispatchEvent(new Event('resize'));
      // The 0x0 reading must be ignored — setSize keeps its last real value.
      expect(rendererInstance.setSize).toHaveBeenLastCalledWith(800, 600);
      expect(rendererInstance.setSize).toHaveBeenCalledTimes(1);

      // Player switches back to the 3D tab: pane becomes visible again with
      // real dimensions restored. Nothing needed to recompute — it was never
      // corrupted in the first place.
      size.width = 800;
      size.height = 600;

      expect(rendererInstance.setSize).toHaveBeenLastCalledWith(800, 600);
    } finally {
      Object.defineProperty(Element.prototype, 'clientWidth', clientWidthDescriptor);
      Object.defineProperty(Element.prototype, 'clientHeight', clientHeightDescriptor);
    }
  });
});
