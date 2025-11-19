# THREE Play - Three.js Game Engine

A modular Three.js-based game engine for interactive 3D experiences.

## Project Structure

```
src/
├── core/           - Core modules (units, input, projectiles, world, etc.)
├── types/          - TypeScript type definitions
└── __tests__/      - Jest unit tests
```

## Commands

- `npm run build` - Production build
- `npm run test` - Run all tests
- `npm run test:watch` - Tests in watch mode (use during development)
- `npm run lint` - Run ESLint
- `npm run dev:basic-top-down` - Start example app

## TypeScript Style

- **IMPORTANT:** Use `type` instead of `interface` for all type definitions
- Import types with `import type { ... }` syntax
- **YOU MUST** place type definitions in `src/types/` - never in implementation files
- Use strict TypeScript with explicit return types
- File names: kebab-case (e.g., `easing-utils.ts`)

## Three.js Guidelines

- **YOU MUST** clone Three.js objects (Vector3, Matrix4, Quaternion) before modification
- Implement proper dispose patterns for geometries, materials, textures
- Watch for memory leaks with object pools

## Code Patterns

- Factory pattern: All systems use `create*` functions (e.g., `createWorld()`, `createUnitManager()`)
- Use existing utilities before creating new ones
- For easing: Use `EasingFunctions` from `src/core/utils/easing-utils.ts`
- Use `logger` instead of `console.*` (from `src/core/utils/logger.ts`)
- All exported functions need JSDoc documentation
- Every core module needs `index.ts` for re-exports

## Testing

- **IMPORTANT:** Every new function must have tests - no exceptions
- Place tests in `src/__tests__/`
- Aim for minimum 80% code coverage
- Test edge cases and error conditions
- Use `npm run test:watch` during development

## Key Modules

Each module in `src/core/` has a `CLAUDE.md` with specific details:

- **world** - Top-level orchestrator, initializes all systems
- **units** - Character management (lifecycle, AI, animation, combat)
- **input** - Keyboard, mouse, gamepad with easing support
- **projectiles** - Projectile system with object pooling
- **assets** - Asset loading and management
- **effects** - Post-processing and outline effects
- **terrain** - Terrain generation
- **water** - Water rendering
- **heightmap** - Height queries for terrain
- **day-night** - Day/night cycle
- **skybox** - Skybox management
- **utils** - Shared utilities (easing, logger, object pool)

## Architecture Patterns

- Manager-based: Each domain has a manager (UnitManager, InputManager, etc.)
- Object pooling: Used for projectiles to avoid GC spikes
- Event system: Hit/destroy events for projectiles
- State machines: AI behaviors (idle, patrol, chase, attack, return)

## Git Workflow

- Main branch: `master`
- Development branch: `dev`
- **YOU MUST** create PRs to `dev` branch
- **IMPORTANT:** All PRs must include tests

## Commit Messages

Use Conventional Commits: `type(scope): description`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat(water): add ripple effect animation`
- `fix(terrain): resolve texture loading issue`
- `test(units): add comprehensive unit management tests`

## Known Issues

- AI pathfinding is basic (direct line, no obstacle avoidance)
- Unit collision is O(n²) - needs spatial optimization for >100 units

## Dependencies

- **three**: ^0.180.0 (peer dependency)
- **@newkrok/three-utils**: ^2.0.1
