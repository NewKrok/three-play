# GitHub Copilot Instructions for THREE Play

This file contains coding conventions and guidelines for the THREE Play project to help GitHub Copilot generate consistent and appropriate code suggestions.

## TypeScript Conventions

- Use `type` instead of `interface` for object type definitions
- Import types with `import type { ... }` syntax
- Place complex type definitions in `src/types/` directory
- **ALWAYS move type definitions to appropriate files in `src/types/` - never leave them in implementation files**
- Export types with descriptive names

## Code Style Guidelines

- Follow existing project patterns and naming conventions
- Ensure all exported functions have JSDoc documentation
- Use strict TypeScript settings and explicit return types
- Prefer functional programming patterns where appropriate

## Three.js Specific Guidelines

- Always clone Three.js objects (Vector3, Matrix4, Quaternion) before modification
- Implement proper dispose patterns for Three.js resources (geometries, materials, textures)
- Use namespace-based exports for utility modules (e.g., `CallbackUtils`, `GeomUtils`)
- Maintain performance considerations for animation loops and real-time rendering

## Utility Function Guidelines

- **ALWAYS use existing utility functions** before creating new ones
- **For easing functions**: Use `EasingFunctions` from `src/core/utils/easing-utils.ts` - never duplicate easing logic
- **For time-based animations**: Use `applyEasing()` and `isEasingComplete()` from easing utils
- Before implementing any utility function, check if similar functionality exists in `src/core/utils/`
- If extending existing utilities, prefer composition over duplication
- Document any utility-specific extensions clearly (e.g., day/night specific easing functions)

## Testing Requirements

- Write unit tests for all new functionality using Jest
- **ALWAYS create tests for every new function, method, or feature - no functionality should be left untested**
- Place test files in `src/__tests__/` directory
- Aim for minimum 80% code coverage
- Include both positive and negative test cases
- Test edge cases and error conditions
- Mock external dependencies and console outputs when needed

## Module Organization

- Keep utilities in separate files by functionality
- Use modular exports to support tree-shaking
- Follow the existing file naming pattern (kebab-case)

## Commit Message Guidelines

- Use Conventional Commits format: `type(scope): description`
- Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Include scope when relevant (e.g., `feat(effects): add particle system`)
- Keep descriptions concise and imperative mood
- Add breaking change indicator with `!` if applicable
- Examples:
  - `feat(water): add ripple effect animation`
  - `fix(terrain): resolve texture loading issue`
  - `docs: update API documentation`
  - `refactor(effects): improve performance of outline system`
