# BlockQuest 3D

Voxel survival adventure game with quests, villagers, mobs, weapons, magic, hunger, crafting, mining and exploration.

## Desktop
The Electron desktop shell loads `game.html` locally instead of opening Chrome.

## Automatic updates
The desktop app checks `desktop-version.json` on GitHub when it starts and every 6 hours. When the version number changes, it downloads the current `game.html`, installs it, and restarts.

To publish an update:
1. Replace `game.html`.
2. Increase the version in `desktop-version.json`.
3. Commit both files to `main`.
