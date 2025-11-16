# Unit Manager Migration Plan

## Célkitűzés

A `main.ts`-ben található unit management logika áthelyezése a THREE Play core library-ba, hogy újrafelhasználható és moduláris legyen.

## Jelenlegi állapot (main.ts)

- **Character Assets**: SkeletonUtils.clone, animáció mixer, actions setup
- **Unit Management**: units array, character/enemy creation
- **AI Logic**: enemy targeting, pathfinding, attack behavior
- **Combat System**: light/heavy attack, knockback, stun
- **Movement**: rotation, translation, terrain height handling
- **Collision**: unit-unit push, unit-environment interaction
- **Effects**: particle systems (running, water, dust)
- **Animation**: playAnimation function, crossfade

## Architektúra terv

```
src/core/units/
├── unit-manager.ts        # Fő UnitManager class
├── character-asset-utils.ts  # Model/animáció setup
├── animation-controller.ts   # Animáció kezelés
├── behaviors/             # AI viselkedések
│   ├── chase-behavior.ts
│   ├── patrol-behavior.ts
│   └── attack-behavior.ts
└── collision-utils.ts     # Ütközés és fizika
```

## 4 Fázis + Commit

1. **Alapok** - Types + CharacterAssetUtils + UnitManager alap
2. **Viselkedés** - Animation + AI + Movement + Physics
3. **Integráció** - Combat + Effects + Projectiles + Outline
4. **Finalizálás** - Tests + Optimalizáció + Example refactor

## Integráció pontok

- HeightmapUtils (terrain height)
- ProjectileManager (collision detection)
- OutlineManager (unit highlighting)
- EffectManager (particle systems)
- InputManager (player controls)

## LOD System

- **Közeli unitok**: Teljes animáció + AI + collision
- **Közepes távolság**: Egyszerűsített animáció + redukált AI
- **Távoli unitok**: Csak pozíció update + billboard/impostor

## Következő lépés

Kezdés a types definícióval (`src/types/units.ts`)
