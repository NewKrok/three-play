# Documentation Auto-Update System

Automatikus dokumentáció frissítő rendszer a THREE Play projekthez.

## Működés

A rendszer egy **docs-updater** sub-agent-et használ, ami elemzi a git változásokat és automatikusan frissíti a `.claude/docs` mappában lévő dokumentációt.

## Használat

### Manuális futtatás

Amikor új feature-t adsz hozzá vagy módosítasz meglévőt, egyszerűen kérd Claude-ot:

```
Frissítsd a dokumentációt az utolsó commit alapján
```

vagy

```
Update documentation based on the last commit
```

Claude automatikusan elindítja a docs-updater agent-et, ami:
1. ✅ Elemzi a git diff-et
2. ✅ Eldönti, hogy szükséges-e dokumentáció frissítés
3. ✅ Frissíti a releváns `.claude/docs/*.md` fájlokat
4. ✅ Stage-eli a frissített dokumentációt

### Automatikus futtatás (opcionális)

Ha teljesen automatizálni szeretnéd, létrehozhatsz egy git pre-commit hook-ot:

1. Hozd létre a `.git/hooks/pre-commit` fájlt:
```bash
#!/bin/bash
# Ellenőrzi hogy vannak-e src/ változások
STAGED_SRC=$(git diff --cached --name-only | grep '^src/.*\.ts$' | grep -v '__tests__')

if [ -n "$STAGED_SRC" ]; then
  echo "📚 Változások észlelve - javasolt: dokumentáció frissítés"
  echo "Futtasd: 'Update documentation based on staged changes'"
fi
```

2. Tedd futtathatóvá:
```bash
chmod +x .git/hooks/pre-commit
```

## Agent konfiguráció

Az agent a [.claude/agents/docs-updater.json](../.claude/agents/docs-updater.json) fájlban van definiálva.

**Fontos szabályok:**
- ✅ Frissíti a doksit: ÚJ feature, API módosítás, viselkedés változás
- ❌ NEM frissíti: bug fix, refactor, test változás, belső módosítás

## Hook-ok

- **post-commit-notify.sh** - PostToolUse hook, amely értesít ha dokumentáció frissítés lehet szükséges
- **pre-commit-docs.sh** - PreToolUse hook placeholder (jelenleg nem aktív)

## Példa workflow

```bash
# 1. Fejlesztés
vim src/core/units.ts  # Új feature hozzáadása

# 2. Stage változások
git add src/core/units.ts

# 3. Commit
git commit -m "feat(units): add health regeneration"

# 4. Dokumentáció frissítés (manuális trigger Claude-ban)
# "Update documentation based on the last commit"

# 5. Commit a frissített dokumentációt
git commit -m "docs: update units documentation for health regen"
```

## Troubleshooting

### Az agent nem talál változásokat
- Ellenőrizd hogy commitoltad-e a változásokat
- Futtasd: `git log -1 --stat` hogy lásd az utolsó commit tartalmát

### Az agent túl sok fájlt frissít
- Az agent autonóm - ha sok változás van, sok doksit fog frissíteni
- Javaslat: kisebb, fókuszált commitok

### Hook-ok nem futnak
- Ellenőrizd: `.claude/settings.local.json` tartalmazza-e a hooks konfigurációt
- Ellenőrizd: a hook script-ek futtathatóak-e (`chmod +x .claude/hooks/*.sh`)
