# PixelForge

A multi-engine game dev portfolio — Part II. Four more engines, four more languages, four more resume lines.

**Live site:** https://dacameragirl.github.io/pixelforge/

---

## What's Inside

### Playable Web Demo
`index.html` — Open in any browser. Includes **Neon Maze**, a playable maze game built with JavaScript Canvas.
- Arrow keys to navigate
- R to restart
- Click to start

### Pygame Demo — Python
`demos/pygame/asteroid_field.py`
- Asteroid shooter with waves, rotation, bullets, lives, and score
- Procedural asteroid splitting — big ones break into smaller ones
- **Language:** Python

```bash
pip install pygame-ce
python demos/pygame/asteroid_field.py
```

### Love2D Demo — Lua
`demos/love2d/main.lua`
- Neon Breakout — physics-based ball, multi-row bricks, particle explosions
- Double-hit bricks, level progression, paddle angle control
- **Language:** Lua

```bash
# Download Love2D at love2d.org then:
love demos/love2d/
```

### Defold Script — Lua
`demos/defold/game.script`
- Shooter game object: move, shoot, message-passing score system
- Attach to any game object in Defold Editor as a Script component
- **Language:** Lua

Open Defold → New Project → attach `game.script` to a game object.

### MonoGame Demo — C#
`demos/monogame/Game1.cs`
- Space shooter: animated player, enemy waves, bullet collision, score
- No asset files needed — everything drawn programmatically
- **Language:** C# / .NET

```bash
dotnet new --install MonoGame.Templates.CSharp
dotnet new mgdesktopgl -n PixelForgeDemo
# Replace Game1.cs with demos/monogame/Game1.cs
dotnet run
```

### Desktop Launcher
`launcher.py` — Python/Tkinter launcher for all demos.

```bash
python launcher.py
```

---

## Engine Coverage

| Engine | Language | Bracket on Form |
|---|---|---|
| Pygame | Python | MonoGame / Pygame |
| Love2D | Lua | Cocos2d-x / Love2D / Gilderos |
| Defold | Lua | Cocos2d-x / Love2D / Gilderos |
| MonoGame | C# | MonoGame / Pygame |

## See Also

[The Engine Lab](https://github.com/DaCameraGirl/game-engine-lab) — Part I: Godot, Panda3D, Solar2D, Stride

---

Built by Angela Hudson · 2026
