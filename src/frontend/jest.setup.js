import '@testing-library/jest-dom';

// Mock Three.js to avoid WebGL errors in test environment
global.THREE = {
  Scene: jest.fn(),
  PerspectiveCamera: jest.fn(),
  WebGLRenderer: jest.fn(() => ({
    setSize: jest.fn(),
    setPixelRatio: jest.fn(),
    domElement: document.createElement('canvas'),
    render: jest.fn(),
    dispose: jest.fn(),
  })),
  AmbientLight: jest.fn(),
  DirectionalLight: jest.fn(),
  Color: jest.fn(),
  Vector3: jest.fn(() => ({
    x: 0, y: 0, z: 0,
    set: jest.fn(function(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }),
  })),
  Box3: jest.fn(() => ({
    setFromObject: jest.fn().mockReturnThis(),
    getCenter: jest.fn(() => ({ x: 0, y: 0, z: 0 })),
    getSize: jest.fn(() => ({ x: 1, y: 1, z: 1 })),
  })),
  MeshStandardMaterial: jest.fn(),
};
