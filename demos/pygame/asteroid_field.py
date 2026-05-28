"""
PixelForge — Pygame Demo
Asteroid Field: shoot asteroids, survive waves, chase the high score.
Run: pip install pygame-ce && python asteroid_field.py
"""

import pygame
import math
import random
import sys

pygame.init()
pygame.mixer.init(frequency=22050, size=-16, channels=1, buffer=512)

W, H = 800, 600
FPS  = 60

PURPLE  = (191,  95, 255)
ORANGE  = (255, 107,  53)
LIME    = (168, 255,  62)
PINK    = (255,  61, 154)
BLUE    = (61,  154, 255)
WHITE   = (220, 210, 240)
DIM     = ( 80,  60, 100)
BG      = ( 26,  10,  46)

screen = pygame.display.set_mode((W, H))
pygame.display.set_caption("PixelForge — Asteroid Field")
clock  = pygame.time.Clock()

try:
    font_big  = pygame.font.Font(None, 64)
    font_med  = pygame.font.Font(None, 36)
    font_sm   = pygame.font.Font(None, 24)
except:
    font_big = font_med = font_sm = pygame.font.SysFont("monospace", 24)


def make_beep(freq=440, duration=0.05, volume=0.3):
    sample_rate = 22050
    n = int(sample_rate * duration)
    buf = bytes([
        int(128 + 127 * math.sin(2 * math.pi * freq * i / sample_rate) * volume)
        for i in range(n)
    ])
    sound = pygame.mixer.Sound(buffer=buf)
    return sound

shoot_sfx   = make_beep(660, 0.04, 0.2)
explode_sfx = make_beep(120, 0.12, 0.4)


def draw_poly(surf, pts, color, width=2):
    pygame.draw.polygon(surf, color, pts, width)


class Player:
    def __init__(self):
        self.reset()

    def reset(self):
        self.x, self.y = W / 2, H / 2
        self.angle  = 0.0
        self.vx = self.vy = 0.0
        self.thrust  = 0.25
        self.drag    = 0.98
        self.iframes = 0
        self.alive   = True

    def update(self, keys):
        if keys[pygame.K_LEFT]  or keys[pygame.K_a]: self.angle -= 4
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]: self.angle += 4

        if keys[pygame.K_UP] or keys[pygame.K_w]:
            rad = math.radians(self.angle - 90)
            self.vx += math.cos(rad) * self.thrust
            self.vy += math.sin(rad) * self.thrust

        self.vx *= self.drag
        self.vy *= self.drag
        self.x  = (self.x + self.vx) % W
        self.y  = (self.y + self.vy) % H
        if self.iframes > 0: self.iframes -= 1

    def draw(self, surf):
        if self.iframes > 0 and (self.iframes // 5) % 2: return
        rad = math.radians(self.angle)
        tip  = (self.x + math.cos(rad - math.pi/2)*18,
                self.y + math.sin(rad - math.pi/2)*18)
        bl   = (self.x + math.cos(rad + math.pi*0.7)*14,
                self.y + math.sin(rad + math.pi*0.7)*14)
        br   = (self.x + math.cos(rad - math.pi*0.7)*14,
                self.y + math.sin(rad - math.pi*0.7)*14)
        draw_poly(surf, [tip, bl, br], PINK, 2)
        pygame.draw.circle(surf, PURPLE, (int(self.x), int(self.y)), 3)

    def shoot(self):
        rad = math.radians(self.angle - 90)
        tip_x = self.x + math.cos(rad) * 18
        tip_y = self.y + math.sin(rad) * 18
        return Bullet(tip_x, tip_y, self.vx + math.cos(rad)*12, self.vy + math.sin(rad)*12)

    def collides(self, ax, ay, r):
        return math.hypot(self.x - ax, self.y - ay) < r + 12


class Bullet:
    def __init__(self, x, y, vx, vy):
        self.x, self.y = x, y
        self.vx, self.vy = vx, vy
        self.life = 55
        self.dead = False

    def update(self):
        self.x = (self.x + self.vx) % W
        self.y = (self.y + self.vy) % H
        self.life -= 1
        if self.life <= 0: self.dead = True

    def draw(self, surf):
        alpha = min(255, self.life * 6)
        color = (int(LIME[0]*alpha/255), int(LIME[1]*alpha/255), int(LIME[2]*alpha/255))
        pygame.draw.circle(surf, color, (int(self.x), int(self.y)), 3)
        pygame.draw.line(surf, LIME,
                         (int(self.x), int(self.y)),
                         (int(self.x - self.vx*1.5), int(self.y - self.vy*1.5)), 1)


class Asteroid:
    SIZES = {3: (38, 200), 2: (22, 80), 1: (12, 30)}

    def __init__(self, size=3, x=None, y=None):
        self.size  = size
        self.r, self.pts = self.SIZES[size]
        self.x = x if x is not None else random.choice([random.uniform(0, W*0.3), random.uniform(W*0.7, W)])
        self.y = y if y is not None else random.choice([random.uniform(0, H*0.3), random.uniform(H*0.7, H)])
        speed  = random.uniform(0.6, 1.4 + (4 - size) * 0.4)
        angle  = random.uniform(0, math.pi * 2)
        self.vx = math.cos(angle) * speed
        self.vy = math.sin(angle) * speed
        self.rot   = 0.0
        self.rot_v = random.uniform(-1.5, 1.5)
        self.shape = self._make_shape()
        self.dead  = False

    def _make_shape(self):
        pts = []
        n = random.randint(7, 11)
        for i in range(n):
            a = (i / n) * math.pi * 2
            r = self.r * random.uniform(0.75, 1.25)
            pts.append((math.cos(a) * r, math.sin(a) * r))
        return pts

    def update(self):
        self.x = (self.x + self.vx) % W
        self.y = (self.y + self.vy) % H
        self.rot += self.rot_v

    def draw(self, surf):
        rad = math.radians(self.rot)
        cos_r, sin_r = math.cos(rad), math.sin(rad)
        world = [
            (self.x + p[0]*cos_r - p[1]*sin_r,
             self.y + p[0]*sin_r + p[1]*cos_r)
            for p in self.shape
        ]
        color = {3: ORANGE, 2: BLUE, 1: DIM}[self.size]
        draw_poly(surf, world, color, 2)

    def split(self):
        if self.size == 1:
            return []
        return [Asteroid(self.size - 1, self.x + random.uniform(-10,10),
                         self.y + random.uniform(-10,10)) for _ in range(2)]


class Particle:
    def __init__(self, x, y, color):
        a = random.uniform(0, math.pi*2)
        s = random.uniform(1, 4)
        self.x, self.y = x, y
        self.vx = math.cos(a)*s; self.vy = math.sin(a)*s
        self.life = random.randint(20, 45)
        self.color = color

    def update(self):
        self.x += self.vx; self.y += self.vy
        self.vx *= 0.93;   self.vy *= 0.93
        self.life -= 1

    def draw(self, surf):
        a = self.life / 45
        c = tuple(int(ch * a) for ch in self.color)
        pygame.draw.circle(surf, c, (int(self.x), int(self.y)), max(1, int(a*3)))


class Stars:
    def __init__(self, n=120):
        self.pts = [(random.randint(0,W), random.randint(0,H),
                     random.uniform(0.3,1.0)) for _ in range(n)]

    def draw(self, surf):
        for x, y, b in self.pts:
            v = int(b * 160)
            pygame.draw.circle(surf, (v, int(v*0.85), v), (x, y), 1 if b<0.7 else 2)


def spawn_wave(wave, asteroids):
    count = 3 + wave
    for _ in range(count):
        asteroids.append(Asteroid(3))


def draw_text_center(surf, text, font, color, y, glow=False):
    surf2 = font.render(text, True, color)
    x = W//2 - surf2.get_width()//2
    if glow:
        g = font.render(text, True, tuple(min(255,c+60) for c in color))
        for ox, oy in [(-1,-1),(1,-1),(-1,1),(1,1)]:
            surf.blit(g, (x+ox, y+oy))
    surf.blit(surf2, (x, y))


def main():
    player     = Player()
    bullets    = []
    asteroids  = []
    particles  = []
    stars      = Stars()
    score      = 0
    best       = 0
    wave       = 1
    shoot_cd   = 0
    state      = 'start'
    wave_timer = 0

    spawn_wave(wave, asteroids)

    while True:
        dt = clock.tick(FPS)
        keys = pygame.key.get_pressed()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit(); sys.exit()
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    pygame.quit(); sys.exit()
                if state in ('start', 'dead'):
                    if event.key in (pygame.K_SPACE, pygame.K_RETURN):
                        player.reset(); bullets=[]; asteroids=[]; particles=[]
                        score=0; wave=1; shoot_cd=0; wave_timer=0
                        spawn_wave(wave, asteroids)
                        state='playing'

        screen.fill(BG)
        stars.draw(screen)

        if state == 'start':
            draw_text_center(screen, "ASTEROID FIELD", font_big, PURPLE, H//2-70, True)
            draw_text_center(screen, "SPACE / ENTER TO START", font_med, ORANGE, H//2+10)
            draw_text_center(screen, "ARROWS / WASD MOVE   SPACE SHOOT", font_sm, DIM, H//2+55)
            pygame.display.flip(); continue

        # Update
        player.update(keys)
        shoot_cd = max(0, shoot_cd - 1)

        if keys[pygame.K_SPACE] and shoot_cd == 0 and player.alive:
            bullets.append(player.shoot())
            shoot_cd = 16
            try: shoot_sfx.play()
            except: pass

        for b in bullets: b.update()
        bullets = [b for b in bullets if not b.dead]

        for a in asteroids: a.update()

        for p in particles: p.update()
        particles = [p for p in particles if p.life > 0]

        # Bullet vs asteroid
        new_rocks = []
        for b in bullets[:]:
            for a in asteroids[:]:
                if not a.dead and math.hypot(b.x-a.x, b.y-a.y) < a.r:
                    b.dead = True; a.dead = True
                    score += a.pts
                    new_rocks.extend(a.split())
                    for _ in range(12):
                        particles.append(Particle(a.x, a.y, ORANGE))
                    try: explode_sfx.play()
                    except: pass
                    break

        asteroids = [a for a in asteroids if not a.dead] + new_rocks

        # Player vs asteroid
        if player.iframes == 0:
            for a in asteroids:
                if player.collides(a.x, a.y, a.r):
                    for _ in range(20):
                        particles.append(Particle(player.x, player.y, PINK))
                    player.iframes = 120
                    score = max(0, score - 150)
                    break

        # Next wave
        if not asteroids:
            wave_timer += 1
            if wave_timer > 80:
                wave += 1; wave_timer = 0
                spawn_wave(wave, asteroids)

        # Draw
        for b in bullets:    b.draw(screen)
        for a in asteroids:  a.draw(screen)
        for p in particles:  p.draw(screen)
        player.draw(screen)

        # HUD
        screen.blit(font_sm.render(f"SCORE  {score}", True, LIME), (16, 14))
        screen.blit(font_sm.render(f"WAVE  {wave}",   True, BLUE), (16, 38))
        best = max(best, score)
        screen.blit(font_sm.render(f"BEST  {best}",   True, DIM),  (16, 62))
        screen.blit(font_sm.render("← → ROTATE   ↑ THRUST   SPACE SHOOT   ESC QUIT",
                                   True, DIM), (W//2 - 220, H-22))

        if wave_timer > 0 and wave_timer < 80:
            alpha = min(1.0, (80 - wave_timer) / 30)
            c = tuple(int(ch * alpha) for ch in LIME)
            draw_text_center(screen, f"WAVE {wave}", font_big, c, H//2-30, True)

        pygame.display.flip()


if __name__ == "__main__":
    main()
