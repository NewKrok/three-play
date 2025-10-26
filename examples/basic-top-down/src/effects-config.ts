/**
 * Particle effects and game effects configuration
 */

export const runningEffect = {
  duration: 0.36,
  startLifetime: { min: 0.2, max: 0.6 },
  startSpeed: { min: 0.93, max: 1.76 },
  startSize: { min: 5, max: 7 },
  startOpacity: { min: 1, max: 1 },
  gravity: 0,
  simulationSpace: 'WORLD',
  maxParticles: 10,
  emission: { rateOverTime: 0, rateOverDistance: 2 },
  shape: {
    shape: 'CONE',
    cone: { angle: 16.8097, radius: 0.5 },
    rectangle: { scale: { x: 0.5, y: 1.8 } },
  },
  renderer: { blending: 'THREE.AdditiveBlending' },
  sizeOverLifetime: {
    isActive: true,
    lifetimeCurve: {
      bezierPoints: [
        { x: 0, y: 0.245, percentage: 0 },
        { x: 0.1666, y: 0.4116 },
        { x: 0.3766, y: 0.2182 },
        { x: 0.5433, y: 0.385, percentage: 0.5433 },
        { x: 0.7099, y: 0.5516 },
        { x: 0.8333, y: 0.6333 },
        { x: 1, y: 0.7, percentage: 1 },
      ],
    },
  },
  opacityOverLifetime: {
    isActive: true,
    lifetimeCurve: {
      bezierPoints: [
        { x: 0, y: 0.1, percentage: 0 },
        { x: 0.1666, y: 0.15 },
        { x: 0.3333, y: 0.2 },
        { x: 0.5, y: 0.25, percentage: 0.5 },
        { x: 0.6666, y: 0.3332 },
        { x: 0.8333, y: 0.1665 },
        { x: 1, y: 0, percentage: 1 },
      ],
    },
  },
  noise: { isActive: true, strength: 0.3, positionAmount: 0.278 },
  _editorData: {
    textureId: 'CLOUD',
    simulation: {
      movements: 'CIRCLE',
      movementSpeed: 3.9,
      rotation: 'FOLLOW_THE_MOVEMENT',
      rotationSpeed: 0,
    },
    showLocalAxes: true,
    showWorldAxes: false,
    frustumCulled: true,
    terrain: {
      textureId: 'WIREFRAME',
      movements: 'DISABLED',
      movementSpeed: 1,
      rotation: 'DISABLED',
      rotationSpeed: 1,
    },
    metadata: {
      name: 'Untitled-2',
      createdAt: 1759099361252,
      modifiedAt: 1759099361252,
      editorVersion: '2.1.0',
    },
  },
};

export const dustEffect = {
  transform: { position: { y: 2 } },
  startLifetime: { min: 0.5, max: 2.5 },
  startSpeed: { min: 0, max: 0 },
  startSize: { min: 0.5, max: 0.9 },
  startOpacity: { min: 1, max: 1 },
  startRotation: { min: -360, max: 360 },
  startColor: {
    min: {
      r: 0.8901960784313725,
      g: 0.8901960784313725,
      b: 0.8901960784313725,
    },
    max: {
      r: 0.5725490196078431,
      g: 0.5725490196078431,
      b: 0.5647058823529412,
    },
  },
  gravity: 0.21,
  simulationSpace: 'WORLD',
  maxParticles: 500,
  emission: { rateOverTime: 100 },
  shape: {
    shape: 'BOX',
    sphere: { radius: 2.9127 },
    rectangle: { scale: { x: 7.682, y: 7.504 } },
    box: { scale: { x: 40, y: 4, z: 40 } },
  },
  renderer: { blending: 'THREE.NormalBlending' },
  sizeOverLifetime: {
    isActive: true,
    lifetimeCurve: {
      bezierPoints: [
        { x: 0, y: 0, percentage: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 1 },
        { x: 0.5, y: 1, percentage: 0.5 },
        { x: 1, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 0, percentage: 1 },
      ],
    },
  },
  opacityOverLifetime: {
    isActive: true,
    lifetimeCurve: {
      bezierPoints: [
        { x: 0, y: 0, percentage: 0 },
        { x: 0.3333, y: 0 },
        { x: 0.1666, y: 1 },
        { x: 0.5, y: 1, percentage: 0.5 },
        { x: 0.8333, y: 1 },
        { x: 0.6666, y: 0 },
        { x: 1, y: 0, percentage: 1 },
      ],
    },
  },
  rotationOverLifetime: { isActive: true, min: -170.2, max: 231.9 },
  noise: {
    isActive: true,
    useRandomOffset: true,
    strength: 0.13,
    frequency: 0.206,
    positionAmount: -0.072,
  },
  _editorData: {
    textureId: 'GRADIENT_POINT',
    simulation: {
      movements: 'DISABLED',
      movementSpeed: 1,
      rotation: 'DISABLED',
      rotationSpeed: 1,
    },
    showLocalAxes: false,
    showWorldAxes: false,
    frustumCulled: true,
    terrain: {
      textureId: 'WIREFRAME',
      movements: 'DISABLED',
      movementSpeed: 1,
      rotation: 'DISABLED',
      rotationSpeed: 1,
    },
    metadata: {
      name: 'Untitled-2',
      createdAt: 1759484443116,
      modifiedAt: 1759484443116,
      editorVersion: '2.1.0',
    },
  },
};

export const splashEffect = {
  transform: { rotation: { x: -90 } },
  duration: 0.25,
  looping: false,
  startLifetime: { min: 0.67, max: 1.77 },
  startSpeed: { min: 0.93, max: 2.85 },
  startSize: { min: 1.29, max: 2.2 },
  startOpacity: { min: 1, max: 1 },
  startRotation: { min: -360, max: 360 },
  startColor: {
    min: { g: 0, b: 0 },
    max: {
      r: 0.7764705882352941,
      g: 0.06274509803921569,
      b: 0.06274509803921569,
    },
  },
  gravity: 1.46,
  maxParticles: 10,
  emission: { rateOverTime: 30 },
  shape: { shape: 'CONE', cone: { angle: 35.6975, radius: 0.0001 } },
  sizeOverLifetime: {
    lifetimeCurve: {
      bezierPoints: [
        { x: 0, y: 0, percentage: 0 },
        { x: 1, y: 1, percentage: 1 },
      ],
    },
  },
  opacityOverLifetime: {
    isActive: true,
    lifetimeCurve: {
      bezierPoints: [
        { x: 0, y: 1, percentage: 0 },
        { x: 0.1666, y: 0.8333 },
        { x: 0.6366, y: 1.0466 },
        { x: 0.8033, y: 0.88, percentage: 0.8033 },
        { x: 0.9699, y: 0.7133 },
        { x: 0.8333, y: 0.1665 },
        { x: 1, y: 0, percentage: 1 },
      ],
    },
  },
  rotationOverLifetime: { isActive: true, min: -342.5, max: 299 },
  textureSheetAnimation: {
    timeMode: 'FPS',
    fps: 0,
    startFrame: { min: 0, max: 10 },
  },
  _editorData: {
    textureId: 'GRADIENT_POINT',
    simulation: {
      movements: 'DISABLED',
      movementSpeed: 1,
      rotation: 'DISABLED',
      rotationSpeed: 1,
    },
    showLocalAxes: false,
    showWorldAxes: false,
    frustumCulled: true,
    terrain: {
      textureId: 'WIREFRAME',
      movements: 'DISABLED',
      movementSpeed: 1,
      rotation: 'DISABLED',
      rotationSpeed: 1,
    },
    metadata: {
      name: 'Untitled-2',
      createdAt: 1759529399202,
      modifiedAt: 1759529399202,
      editorVersion: '2.1.0',
    },
  },
};
