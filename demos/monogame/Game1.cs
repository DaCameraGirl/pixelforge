// PixelForge — MonoGame Demo
// Animated sprite shooter: move with arrow keys, shoot with Space.
// Setup:
//   dotnet new --install MonoGame.Templates.CSharp
//   dotnet new mgdesktopgl -n PixelForgeDemo
//   Replace Game1.cs with this file and run: dotnet run

using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using Microsoft.Xna.Framework.Input;
using System;
using System.Collections.Generic;

namespace PixelForgeDemo
{
    public class Game1 : Game
    {
        GraphicsDeviceManager _graphics;
        SpriteBatch           _spriteBatch;

        // Player
        Vector2 _playerPos;
        float   _playerSpeed = 280f;
        float   _shootCooldown = 0f;

        // Bullets
        List<Vector2> _bullets    = new();
        float         _bulletSpeed = 500f;

        // Enemies (simple bouncing squares)
        List<(Vector2 pos, Vector2 vel, Color color)> _enemies = new();
        float _spawnTimer = 0f;

        // Score
        int   _score = 0;
        float _elapsed = 0f;

        // Textures (generated in code — no asset files needed)
        Texture2D _white;
        SpriteFont _font;

        static readonly Color Purple  = new Color(191,  95, 255);
        static readonly Color Orange  = new Color(255, 107,  53);
        static readonly Color Lime    = new Color(168, 255,  62);
        static readonly Color Pink    = new Color(255,  61, 154);
        static readonly Color BgColor = new Color( 26,  10,  46);

        readonly Random _rng = new Random();

        public Game1()
        {
            _graphics = new GraphicsDeviceManager(this) { PreferredBackBufferWidth=800, PreferredBackBufferHeight=600 };
            Content.RootDirectory = "Content";
            IsMouseVisible = true;
            Window.Title = "PixelForge — MonoGame Demo";
        }

        protected override void LoadContent()
        {
            _spriteBatch = new SpriteBatch(GraphicsDevice);

            // 1x1 white pixel — used to draw all shapes via scaling
            _white = new Texture2D(GraphicsDevice, 1, 1);
            _white.SetData(new[] { Color.White });

            _playerPos = new Vector2(GraphicsDevice.Viewport.Width / 2f, GraphicsDevice.Viewport.Height - 60f);

            // Spawn initial enemies
            for (int i = 0; i < 4; i++) SpawnEnemy();
        }

        void SpawnEnemy()
        {
            float x   = _rng.Next(30, GraphicsDevice.Viewport.Width - 30);
            float vy  = _rng.Next(60, 120) + _score / 80f;
            float vx  = (_rng.NextSingle() - 0.5f) * 100f;
            Color col = _rng.Next(3) switch { 0 => Orange, 1 => Lime, _ => Pink };
            _enemies.Add((new Vector2(x, -20), new Vector2(vx, vy), col));
        }

        protected override void Update(GameTime gameTime)
        {
            float dt = (float)gameTime.ElapsedGameTime.TotalSeconds;
            _elapsed += dt;

            var kb = Keyboard.GetState();
            if (kb.IsKeyDown(Keys.Escape)) Exit();

            // Player movement
            int W = GraphicsDevice.Viewport.Width, H = GraphicsDevice.Viewport.Height;
            if (kb.IsKeyDown(Keys.Left)  || kb.IsKeyDown(Keys.A)) _playerPos.X -= _playerSpeed * dt;
            if (kb.IsKeyDown(Keys.Right) || kb.IsKeyDown(Keys.D)) _playerPos.X += _playerSpeed * dt;
            _playerPos.X = Math.Clamp(_playerPos.X, 20, W - 20);

            // Shoot
            _shootCooldown -= dt;
            if ((kb.IsKeyDown(Keys.Space) || kb.IsKeyDown(Keys.Up)) && _shootCooldown <= 0f)
            {
                _bullets.Add(new Vector2(_playerPos.X, _playerPos.Y - 20));
                _shootCooldown = 0.18f;
            }

            // Bullet movement
            for (int i = _bullets.Count - 1; i >= 0; i--)
            {
                _bullets[i] = new Vector2(_bullets[i].X, _bullets[i].Y - _bulletSpeed * dt);
                if (_bullets[i].Y < -10) _bullets.RemoveAt(i);
            }

            // Enemy movement + spawn
            _spawnTimer += dt;
            if (_spawnTimer > Math.Max(0.8f, 2.5f - _score * 0.005f)) { SpawnEnemy(); _spawnTimer = 0; }

            for (int i = _enemies.Count - 1; i >= 0; i--)
            {
                var (pos, vel, col) = _enemies[i];
                pos += vel * dt;
                if (pos.X < 20 || pos.X > W - 20) vel.X = -vel.X;
                if (pos.Y > H + 30) { _enemies.RemoveAt(i); continue; }
                _enemies[i] = (pos, vel, col);
            }

            // Bullet vs enemy collision
            for (int bi = _bullets.Count - 1; bi >= 0; bi--)
            {
                for (int ei = _enemies.Count - 1; ei >= 0; ei--)
                {
                    if (Vector2.Distance(_bullets[bi], _enemies[ei].pos) < 22f)
                    {
                        _bullets.RemoveAt(bi);
                        _enemies.RemoveAt(ei);
                        _score += 100;
                        break;
                    }
                }
            }

            base.Update(gameTime);
        }

        void DrawRect(Vector2 pos, float w, float h, Color color)
        {
            _spriteBatch.Draw(_white, new Rectangle((int)(pos.X - w/2), (int)(pos.Y - h/2), (int)w, (int)h), color);
        }

        protected override void Draw(GameTime gameTime)
        {
            GraphicsDevice.Clear(BgColor);
            _spriteBatch.Begin();

            // Player (triangle approximated as rotated rect)
            DrawRect(_playerPos, 24, 28, Purple);
            DrawRect(new Vector2(_playerPos.X, _playerPos.Y - 18), 6, 18, new Color(255,255,255,180));

            // Bullets
            foreach (var b in _bullets)
                DrawRect(b, 4, 14, Lime);

            // Enemies
            foreach (var (pos, _, col) in _enemies)
                DrawRect(pos, 26, 26, col);

            // Pulsing outline on player
            float pulse = (float)(Math.Sin(_elapsed * 4) * 0.5 + 0.5);
            DrawRect(_playerPos, 28 + pulse*4, 32 + pulse*4,
                     new Color(Purple.R, Purple.G, Purple.B, (byte)(60*pulse)));

            // HUD — draw with colored rectangles (no font required)
            DrawHudBar("SCORE  " + _score, 12, 12, Purple);
            DrawHudBar("ESC QUIT  |  ARROWS MOVE  |  SPACE SHOOT", 12, GraphicsDevice.Viewport.Height - 28, new Color(80,60,100));

            _spriteBatch.End();
            base.Draw(gameTime);
        }

        void DrawHudBar(string text, int x, int y, Color color)
        {
            // Simple pixel-block text using colored squares per character
            int cx = x;
            foreach (char c in text)
            {
                DrawRect(new Vector2(cx + 4, y + 6), 7, 12, new Color(color.R, color.G, color.B, 180));
                cx += 10;
            }
        }
    }

    public static class Program
    {
        [STAThread]
        static void Main()
        {
            using var game = new Game1();
            game.Run();
        }
    }
}
