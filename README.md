# BlockQuest 3D 4.0.0 — Classic Archive Edition

This edition changes the game foundation to the archived browser-era Minecraft Classic client.

Source snapshot:
- Repository: https://github.com/SajagIN/minecraft-classic
- Pinned commit: 22d79dfae142528bee659fc957fb01a93331b37f
- The archive describes itself as preserving the (almost) original classic.minecraft.net code for historical/documentation purposes.
- The archive also contains a assets/textures directory used by the client.

Important:
- This desktop package does not copy Mojang-era texture files into the BlockQuest repository.
- The game launcher loads the archived client at runtime, so an internet connection is required.
- This is the old Classic client foundation, not the previous custom BlockQuest renderer.

Updater:
- Version 4.0.0
- Checks every 30 minutes
- Uses a writable per-user copy
- Forces cache-busting on manifest downloads
