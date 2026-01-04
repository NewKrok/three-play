import type { InputManagerConfig } from '@newkrok/three-play';

const inputConfig: InputManagerConfig = {
  enabled: true,
  preventDefaultKeyboard: true,
  actions: {
    roll: {
      action: {
        type: 'trigger',
        valueType: 'boolean',
      },
      bindings: [
        {
          type: 'keyboard',
          key: 'Space',
        },
      ],
    },
    dash: {
      action: {
        type: 'trigger',
        valueType: 'boolean',
      },
      bindings: [
        {
          type: 'keyboard',
          key: 'Digit1',
        },
      ],
    },
    moveLeft: {
      action: {
        type: 'trigger',
        valueType: 'boolean',
      },
      bindings: [
        {
          type: 'keyboard',
          key: 'KeyA',
        },
        {
          type: 'keyboard',
          key: 'ArrowLeft',
        },
      ],
    },
    moveRight: {
      action: {
        type: 'trigger',
        valueType: 'boolean',
      },
      bindings: [
        {
          type: 'keyboard',
          key: 'KeyD',
        },
        {
          type: 'keyboard',
          key: 'ArrowRight',
        },
      ],
    },
    moveUp: {
      action: {
        type: 'trigger',
        valueType: 'boolean',
      },
      bindings: [
        {
          type: 'keyboard',
          key: 'KeyW',
        },
        {
          type: 'keyboard',
          key: 'ArrowUp',
        },
      ],
    },
    moveDown: {
      action: {
        type: 'trigger',
        valueType: 'boolean',
      },
      bindings: [
        {
          type: 'keyboard',
          key: 'KeyS',
        },
        {
          type: 'keyboard',
          key: 'ArrowDown',
        },
      ],
    },
    run: {
      action: {
        type: 'trigger',
        valueType: 'boolean',
      },
      bindings: [
        {
          type: 'keyboard',
          key: 'ShiftLeft',
        },
      ],
    },
    lightAttack: {
      action: {
        type: 'trigger',
        valueType: 'boolean',
      },
      bindings: [
        {
          type: 'mouse',
          button: 2, // Right mouse button
        },
      ],
    },
    heavyAttack: {
      action: {
        type: 'trigger',
        valueType: 'boolean',
      },
      bindings: [
        {
          type: 'keyboard',
          key: 'KeyT',
        },
      ],
    },
    aim: {
      action: {
        type: 'trigger',
        valueType: 'boolean',
      },
      bindings: [
        {
          type: 'mouse',
          button: 2, // 0=left, 1=middle, 2=right
        },
      ],
    },
    interact: {
      action: {
        type: 'trigger',
        valueType: 'boolean',
      },
      bindings: [
        {
          type: 'keyboard',
          key: 'KeyE',
        },
      ],
    },
    throw: {
      action: {
        type: 'trigger',
        valueType: 'boolean',
      },
      bindings: [
        {
          type: 'mouse',
          button: 0, // Left mouse button
        },
      ],
    },
  },
};

export default inputConfig;
