/**
 * Particle effects and game effects configuration
 */

export const runningEffect = JSON.parse(
  '{"duration":0.36,"startLifetime":{"min":0.4,"max":0.9},"startSpeed":{"min":0.39,"max":0.66},"startSize":{"min":12.25,"max":18.65},"startOpacity":{"min":0.177,"max":0.25},"startRotation":{"min":-360,"max":360},"gravity":-1.69,"simulationSpace":"WORLD","maxParticles":16,"emission":{"rateOverTime":0,"rateOverDistance":19},"shape":{"sphere":{"radius":0.0001},"cone":{"angle":90,"radius":9.6502,"arc":0},"rectangle":{"scale":{"x":0.5,"y":1.8}}},"renderer":{"blending":"THREE.AdditiveBlending"},"sizeOverLifetime":{"isActive":true,"lifetimeCurve":{"bezierPoints":[{"x":0,"y":0.885,"percentage":0},{"x":0.1666,"y":1.0516},{"x":0.3099,"y":0.5583},{"x":0.4766,"y":0.725,"percentage":0.4766},{"x":0.6432,"y":0.8916},{"x":0.8333,"y":0.7082},{"x":1,"y":0.875,"percentage":1}]}},"opacityOverLifetime":{"isActive":true,"lifetimeCurve":{"bezierPoints":[{"x":0,"y":0.1,"percentage":0},{"x":0.1666,"y":0.15},{"x":0.3333,"y":0.2},{"x":0.5,"y":0.25,"percentage":0.5},{"x":0.6666,"y":0.3332},{"x":0.8333,"y":0.1665},{"x":1,"y":0,"percentage":1}]}},"rotationOverLifetime":{"isActive":true,"min":-64.8,"max":69.2},"noise":{"strength":0.3,"positionAmount":5,"rotationAmount":5,"sizeAmount":5},"_editorData":{"textureId":"CustomTexture-595","simulation":{"movements":"PROJECTILE_STRAIGHT","movementSpeed":3.9,"rotation":"FOLLOW_THE_MOVEMENT","rotationSpeed":0},"showLocalAxes":true,"showWorldAxes":false,"frustumCulled":true,"terrain":{"textureId":"WIREFRAME","movements":"DISABLED","movementSpeed":1,"rotation":"DISABLED","rotationSpeed":1},"metadata":{"name":"Untitled-2","createdAt":1759099361252,"modifiedAt":1762113347133,"editorVersion":"2.1.0"}}}',
);
export const runningInWaterEffect = JSON.parse(
  '{"transform":{"position":{"y":0.3}},"startLifetime":{"min":0.4,"max":2.04},"startSpeed":{"min":0,"max":0},"startSize":{"min":21.39,"max":36.93},"startOpacity":{"min":0.79,"max":0.89},"startColor":{"min":{"r":0.7803921568627451,"g":0.7450980392156863,"b":0.9568627450980393},"max":{"r":0.8,"g":0.7058823529411765,"b":0.8941176470588236}},"gravity":1.46,"simulationSpace":"WORLD","maxParticles":15,"emission":{"rateOverTime":0,"rateOverDistance":3},"shape":{"sphere":{"radius":0.2064,"radiusThickness":0},"cone":{"angle":0,"radius":0.0001,"arc":-112.196}},"renderer":{"discardBackgroundColor":true,"backgroundColorTolerance":0.506,"backgroundColor":{"r":0,"g":0,"b":0}},"sizeOverLifetime":{"isActive":true,"lifetimeCurve":{"bezierPoints":[{"x":0,"y":0,"percentage":0},{"x":0,"y":1},{"x":0,"y":1},{"x":0.5,"y":1,"percentage":0.5},{"x":1,"y":1},{"x":1,"y":1},{"x":1,"y":0,"percentage":1}]}},"opacityOverLifetime":{"lifetimeCurve":{"bezierPoints":[{"x":0,"y":0,"percentage":0},{"x":1,"y":1,"percentage":1}]}},"rotationOverLifetime":{"isActive":true,"min":-20,"max":20},"noise":{"positionAmount":0,"rotationAmount":2},"_editorData":{"textureId":"CustomTexture-465","simulation":{"movements":"PROJECTILE_STRAIGHT","movementSpeed":1,"rotation":"DISABLED","rotationSpeed":1},"showLocalAxes":false,"showWorldAxes":false,"frustumCulled":true,"terrain":{"textureId":"WIREFRAME","movements":"DISABLED","movementSpeed":1,"rotation":"DISABLED","rotationSpeed":1},"metadata":{"name":"Untitled-3","createdAt":1762124838014,"modifiedAt":1762124838014,"editorVersion":"2.1.0"}}}',
);

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
