# PixelForge

A multi-engine game dev portfolio - Part II. Four more engines, four more languages, four more resume lines.

**Live site:** https://dacameragirl.github.io/pixelforge/

## What's Inside

### Playable Web Arcade

`index.html` opens in any browser. It includes a five-game JavaScript Canvas cabinet:

- **Neon Chomp** - an original maze-chase score attack inspired by classic pellet maze games
- **Asteroid Forge** - a vector asteroid shooter with thrust, bullets, waves, lives, and splitting rocks
- **Barrel Tower** - climb ladders, jump rolling hazards, and reach the top exit
- **Bug Spiral** - clear a segmented insect swarm before it drops into your cannon lane
- **Tunnel Miner** - dig paths, collect gems, and stun underground enemies

Controls:

- Arrow keys or WASD to move / steer
- Space to start or shoot
- Mouse/touch works in the browser cabinet
- R to restart
- Click the canvas or Start Game button to play

The web arcade counts normally in GitHub's language breakdown alongside the engine demo languages.

### Pygame Demo - Python

`demos/pygame/asteroid_field.py`

- Asteroid shooter with waves, rotation, bullets, lives, and score
- Procedural asteroid splitting - big ones break into smaller ones
- **Language:** Python

```bash
pip install pygame-ce
python demos/pygame/asteroid_field.py
```

### Love2D Demo - Lua

`demos/love2d/main.lua`

- Neon Breakout with ball physics, multi-row bricks, particle bursts, and level progression
- **Language:** Lua

```bash
love demos/love2d/
```

### Defold Script - Lua

`demos/defold/game.script`

- Shooter game object with movement, firing, and message-passing score hooks
- Attach to a game object in the Defold Editor
- **Language:** Lua

### MonoGame Demo - C#

`demos/monogame/Game1.cs`

- Space shooter with animated player, enemy waves, bullet collision, and score
- Drawn programmatically, no asset files required
- **Language:** C# / .NET

```bash
dotnet new --install MonoGame.Templates.CSharp
dotnet new mgdesktopgl -n PixelForgeDemo
# Replace Game1.cs with demos/monogame/Game1.cs
dotnet run
```

### Desktop Launcher

`launcher.py` is a Python/Tkinter launcher for the web arcade and engine demos.

```bash
python launcher.py
```

## Engine Coverage

| Engine | Language | Bracket on Form |
|---|---|---|
| Pygame | Python | MonoGame / Pygame |
| Love2D | Lua | Cocos2d-x / Love2D / Gideros |
| Defold | Lua | Cocos2d-x / Love2D / Gideros |
| MonoGame | C# | MonoGame / Pygame |

## See Also

[The Engine Lab](https://github.com/DaCameraGirl/game-engine-lab) - Part I: Godot, Panda3D, Solar2D, Stride

Built by Angela Hudson - 2026
