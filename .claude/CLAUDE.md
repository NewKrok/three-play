# THREE Play - Project Guide for Claude Code

This directory contains comprehensive documentation to help Claude Code work efficiently with the THREE Play project.

## Quick Start for Claude

THREE Play is a modular Three.js-based game engine for interactive 3D experiences. This is an **npm package** project, not an application.

### Project Structure

```
src/
├── core/           - Core modules (units, input, projectiles, world, etc.)
├── types/          - TypeScript type definitions
└── __tests__/      - Jest unit tests

.claude/
├── CLAUDE.md       - This file (project overview and guidelines)
└── docs/           - Detailed module documentation
    ├── api-reference.md    - Complete API reference index
    ├── world.md            - World orchestrator
    ├── units.md            - Character management system
    ├── projectiles.md      - Projectile system
    ├── input.md            - Input handling
    ├── effects.md          - Post-processing and outlines
    ├── terrain.md          - Terrain generation
    ├── water.md            - Water rendering
    ├── heightmap.md        - Height queries
    ├── day-night.md        - Day/night cycle
    ├── skybox.md           - Skybox management
    ├── assets.md           - Asset loading
    └── utilities.md        - Shared utilities
```

## Essential Commands

```bash
npm run build          # Production build
npm run test           # Run all tests
npm run test:watch     # Tests in watch mode (use during development)
npm run lint           # Run ESLint
npm run dev:basic-top-down  # Start example app (for testing only)
```

## Code Style & Patterns

### TypeScript Guidelines

- **CRITICAL:** Use `type` instead of `interface` for all type definitions
- Import types with `import type { ... }` syntax
- **MANDATORY:** Place type definitions in `src/types/` - never in implementation files
- Use strict TypeScript with explicit return types
- File names: kebab-case (e.g., `easing-utils.ts`)

### Three.js Best Practices

- **MUST:** Clone Three.js objects (Vector3, Matrix4, Quaternion) before modification
- Implement proper dispose patterns for geometries, materials, textures
- Watch for memory leaks with object pools

### Architecture Patterns

- **Factory pattern:** All systems use `create*` functions
  - Examples: `createWorld()`, `createUnitManager()`, `createProjectileManager()`
- **Manager-based:** Each domain has a manager (UnitManager, InputManager, etc.)
- **Object pooling:** Used for projectiles to avoid GC spikes
- **Event system:** Hit/destroy events for projectiles
- **State machines:** AI behaviors (idle, patrol, chase, attack, return)

### Code Conventions

- Use existing utilities before creating new ones
- For easing: Use `EasingFunctions` from [src/core/utils/easing-utils.ts](src/core/utils/easing-utils.ts)
- Use `logger` instead of `console.*` (from [src/core/utils/logger.ts](src/core/utils/logger.ts))
- All exported functions need JSDoc documentation
- Every core module needs [index.ts](src/core) for re-exports

## Testing Requirements

- **NON-NEGOTIABLE:** Every new function must have tests
- Place tests in `src/__tests__/`
- Aim for minimum 80% code coverage
- Test edge cases and error conditions
- Use `npm run test:watch` during development

## Git Workflow

- Main branch: `master`
- Development branch: `dev`
- **ALWAYS:** Create PRs to `dev` branch
- **MANDATORY:** All PRs must include tests

### Commit Message Format

Use Conventional Commits: `type(scope): description`

**Rules:**
- Subject line: Max 50 characters, clear and concise
- Body: Optional, only if absolutely necessary (max 2-3 short lines)
- **NO** emoji, **NO** "Generated with Claude Code" footer
- Focus on WHAT changed and WHY (brief), not HOW

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples:**
```
feat(water): add ripple effect animation
fix(terrain): resolve texture loading issue
test(units): add comprehensive unit management tests
fix(units): apply rotation to instance not wrapper
```

## Key Modules Overview

### Core Systems

- **[world](docs/world.md)** - Top-level orchestrator, initializes all systems
- **[units](docs/units.md)** - Character management (lifecycle, AI, animation, combat)
- **[projectiles](docs/projectiles.md)** - Projectile system with object pooling
- **[input](docs/input.md)** - Keyboard, mouse, gamepad with easing support

### Rendering & Environment

- **[effects](docs/effects.md)** - Post-processing and outline effects
- **[terrain](docs/terrain.md)** - Terrain generation
- **[water](docs/water.md)** - Water rendering
- **[heightmap](docs/heightmap.md)** - Height queries for terrain
- **[day-night](docs/day-night.md)** - Day/night cycle
- **[skybox](docs/skybox.md)** - Skybox management
- **[camera](docs/camera.md)** - Cinematic camera sequences

### Support Systems

- **[assets](docs/assets.md)** - Asset loading and management
- **[ui](docs/ui.md)** - Health bars, damage numbers, and visual feedback
- **[floating-text](docs/floating-text.md)** - Temporary text in 3D space
- **[interactions](docs/interactions.md)** - Collision and interaction system for world objects
- **[utils](docs/utilities.md)** - Shared utilities (easing, logger, object pool, damage calculator, attack priority)

## Known Issues & Limitations

- AI pathfinding is basic (direct line, no obstacle avoidance)
- Unit collision is O(n²) - needs spatial optimization for >100 units

## Dependencies

- **three**: ^0.180.0 (peer dependency)
- **@newkrok/three-utils**: ^2.0.1

## Documentation Index

For detailed API documentation, see [docs/api-reference.md](docs/api-reference.md)
