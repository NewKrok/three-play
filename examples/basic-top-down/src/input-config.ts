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
          key: 'KeyR',
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
          type: 'keyboard',
          key: 'KeyE',
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
    throwApple: {
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
  },
};

export default inputConfig;
