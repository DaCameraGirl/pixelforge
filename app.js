const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const heroCanvas = document.getElementById("hero-canvas");
const heroCtx = heroCanvas.getContext("2d");

const ui = {
  title: document.getElementById("game-title"),
  state: document.getElementById("game-state"),
  score: document.getElementById("score"),
  lives: document.getElementById("lives"),
  wave: document.getElementById("wave"),
  best: document.getElementById("best"),
  notes: document.getElementById("game-notes"),
  primary: document.getElementById("control-primary"),
  secondary: document.getElementById("control-secondary"),
  start: document.getElementById("start-button"),
  modeButtons: Array.from(document.querySelectorAll(".mode-button")),
};

const colors = {
  bg: "#05070c",
  grid: "#1c2840",
  wall: "#38dff0",
  pellet: "#ffbd4a",
  power: "#ff4f9a",
  player: "#ffd84a",
  cyan: "#38dff0",
  pink: "#ff4f9a",
  violet: "#9b7cff",
  amber: "#ffbd4a",
  green: "#87f26f",
  red: "#ff5d5d",
  white: "#f4f7fb",
};

const keys = new Set();
const pointer = {
  active: false,
  x: canvas.width / 2,
  y: canvas.height / 2,
  justPressed: false,
};
let activeMode = "maze";
let game = null;
let lastTime = performance.now();

const bestScores = {
  maze: Number(localStorage.getItem("pixelforge-best-maze") || 0),
  asteroids: Number(localStorage.getItem("pixelforge-best-asteroids") || 0),
  climber: Number(localStorage.getItem("pixelforge-best-climber") || 0),
  swarm: Number(localStorage.getItem("pixelforge-best-swarm") || 0),
  miner: Number(localStorage.getItem("pixelforge-best-miner") || 0),
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function wrapBody(body, width = canvas.width, height = canvas.height) {
  if (body.x < -body.radius) body.x = width + body.radius;
  if (body.x > width + body.radius) body.x = -body.radius;
  if (body.y < -body.radius) body.y = height + body.radius;
  if (body.y > height + body.radius) body.y = -body.radius;
}

function drawCentered(text, y, size, color, glow = false) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${size}px "Press Start 2P", monospace`;
  ctx.fillStyle = color;
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
  }
  ctx.fillText(text, canvas.width / 2, y);
  ctx.restore();
}

function updateUi(snapshot) {
  ui.score.textContent = snapshot.score;
  ui.lives.textContent = snapshot.lives;
  ui.wave.textContent = snapshot.wave;
  ui.best.textContent = bestScores[activeMode];
  ui.state.textContent = snapshot.state;
}

function saveBest(mode, score) {
  if (score <= bestScores[mode]) return;
  bestScores[mode] = score;
  localStorage.setItem(`pixelforge-best-${mode}`, String(score));
}

class MazeGame {
  constructor() {
    this.maps = [
      [
        "#########################",
        "#...........#...........#",
        "#.###.#####.#.#####.###.#",
        "#o# #.#...#.#.#...#.# #o#",
        "#.###.#.#.#...#.#.#.###.#",
        "#.....#.#.#####.#.#.....#",
        "#####.#.#...#...#.#.#####",
        "#.....#.### # ###.#.....#",
        " .###...#       #...###. ",
        "#...#.### ##### ###.#...#",
        "###.#.....#...#.....#.###",
        "#...#####.#.#.#.#####...#",
        "#.#.......#.#.#.......#.#",
        "#o#.#####...#...#####.#o#",
        "#...#...#####.#####...#.#",
        "#.....#...........#.....#",
        "#########################",
      ],
      [
        "#########################",
        "#o....#.......#.......o.#",
        "###.#.#.#####.#.#####.#.#",
        "#...#...#...#...#...#...#",
        "#.#####.#.#.#####.#.###.#",
        "#.......#.#...#...#.....#",
        "#.#######.### # ###.###.#",
        "#.........#       #.....#",
        " ###.###.##       ##.### ",
        "#.....#...#### ####...#.#",
        "#.###.#.#....#.#....#.#.#",
        "#.#...#.####.#.#.####...#",
        "#.#.###......#......###.#",
        "#o#.....####...####.....#",
        "#.#####.#.........#.#####",
        "#.......#...###...#.....#",
        "#########################",
      ],
      [
        "#########################",
        "#.....#.......#.......o.#",
        "#.###.#.#####.#.#####.#.#",
        "#o..#...#...#...#...#...#",
        "###.#####.#.#####.#.###.#",
        "#.........#...#...#.....#",
        "#.#######.### # ###.#####",
        "#.#.......#       #.....#",
        " .#.###.###       ###.#. ",
        "#...#.....#### ####...#.#",
        "#.#####.#....#.#....###.#",
        "#.......####.#.#.####...#",
        "###.###......#......#.#.#",
        "#o#...#.####...####.#.#o#",
        "#.###.#.#.........#.#.###",
        "#.....#.....###.....#...#",
        "#########################",
      ],
    ];
    this.map = this.maps[0];
    this.cols = this.map[0].length;
    this.rows = this.map.length;
    this.cell = 24;
    this.offsetX = (canvas.width - this.cols * this.cell) / 2;
    this.offsetY = 78;
    this.tunnelRows = new Set([8]);
    this.scatterTargets = [
      { c: 1, r: 1 },
      { c: this.cols - 2, r: 1 },
      { c: 1, r: this.rows - 2 },
      { c: this.cols - 2, r: this.rows - 2 },
    ];
    this.fruitTable = [
      { icon: "◆", points: 100 },
      { icon: "●", points: 300 },
      { icon: "▲", points: 500 },
      { icon: "✦", points: 700 },
      { icon: "★", points: 1000 },
    ];
    this.reset();
  }

  reset() {
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.status = "Ready";
    this.started = false;
    this.pausedAfterHit = 0;
    this.extraLifeAwarded = false;
    this.loadWave();
  }

  loadWave() {
    this.map = this.maps[(this.wave - 1) % this.maps.length];
    this.pellets = new Set();
    this.powerPellets = new Set();
    for (let r = 0; r < this.rows; r += 1) {
      for (let c = 0; c < this.cols; c += 1) {
        const tile = this.map[r][c];
        if (tile === ".") this.pellets.add(`${c},${r}`);
        if (tile === "o") this.powerPellets.add(`${c},${r}`);
      }
    }
    this.player = {
      c: 12,
      r: 15,
      x: this.cellToX(12),
      y: this.cellToY(15),
      dir: { x: 0, y: 0 },
      next: { x: 0, y: 0 },
      speed: 132 + this.wave * 4,
      radius: 8,
      mouth: 0,
    };
    this.ghosts = [
      this.makeGhost(12, 8, colors.pink, 0, "Chaser", 0.4),
      this.makeGhost(11, 8, colors.cyan, 1, "Ambusher", 1.7),
      this.makeGhost(13, 8, colors.violet, 2, "Patroller", 3.0),
      this.makeGhost(14, 8, colors.red, 3, "Drifter", 4.3),
    ];
    this.fright = 0;
    this.frightChain = 0;
    this.roundIntro = 2.4;
    this.modeTimer = 0;
    this.modeIndex = 0;
    this.modeSchedule = [7, 18, 7, 18, 5, 22, 5, 9999];
    this.scatter = true;
    this.fruit = null;
    this.fruitSpawned = false;
    this.fruitMessage = null;
  }

  makeGhost(c, r, color, brain, name, releaseDelay) {
    return {
      c,
      r,
      home: { c, r },
      x: this.cellToX(c),
      y: this.cellToY(r),
      dir: { x: brain % 2 === 0 ? 1 : -1, y: 0 },
      speed: 92 + this.wave * 7 + brain * 2,
      color,
      brain,
      name,
      radius: 9,
      respawn: 0,
      releaseDelay,
      inHouse: true,
    };
  }

  cellToX(c) {
    return this.offsetX + c * this.cell + this.cell / 2;
  }

  cellToY(r) {
    return this.offsetY + r * this.cell + this.cell / 2;
  }

  pixelToCell(x, y) {
    return {
      c: Math.floor((x - this.offsetX) / this.cell),
      r: Math.floor((y - this.offsetY) / this.cell),
    };
  }

  isWall(c, r) {
    if (this.tunnelRows.has(r) && (c < 0 || c >= this.cols)) return false;
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return true;
    return this.map[r][c] === "#";
  }

  atCenter(entity) {
    return Math.abs(entity.x - this.cellToX(entity.c)) < 2 && Math.abs(entity.y - this.cellToY(entity.r)) < 2;
  }

  canMove(c, r, dir) {
    return !this.isWall(c + dir.x, r + dir.y);
  }

  start() {
    if (this.status === "Game Over") this.reset();
    this.started = true;
    this.status = this.roundIntro > 0 ? `Round ${this.wave}` : "Playing";
  }

  handleInput() {
    const next = { x: 0, y: 0 };
    if (keys.has("ArrowUp") || keys.has("KeyW")) next.y = -1;
    if (keys.has("ArrowDown") || keys.has("KeyS")) next.y = 1;
    if (keys.has("ArrowLeft") || keys.has("KeyA")) next.x = -1;
    if (keys.has("ArrowRight") || keys.has("KeyD")) next.x = 1;
    if (!next.x && !next.y && pointer.active) {
      const dx = pointer.x - this.player.x;
      const dy = pointer.y - this.player.y;
      if (Math.hypot(dx, dy) > 10) {
        if (Math.abs(dx) > Math.abs(dy)) next.x = Math.sign(dx);
        else next.y = Math.sign(dy);
      }
    }
    if (next.x || next.y) this.player.next = next;
  }

  update(dt) {
    if (!this.started || this.status === "Game Over") return;
    this.handleInput();
    if (this.roundIntro > 0) {
      this.roundIntro -= dt;
      this.status = `Round ${this.wave}`;
      if (this.roundIntro <= 0) this.status = "Playing";
      return;
    }
    if (this.pausedAfterHit > 0) {
      this.pausedAfterHit -= dt;
      return;
    }
    this.updateModes(dt);
    this.fright = Math.max(0, this.fright - dt);
    if (this.fright <= 0) this.frightChain = 0;
    this.updateFruit(dt);
    this.movePlayer(dt);
    this.eatPellet();
    this.ghosts.forEach((ghost) => this.moveGhost(ghost, dt));
    this.resolveCollisions();
    this.checkExtraLife();
    if (this.pellets.size === 0 && this.powerPellets.size === 0) {
      this.wave += 1;
      this.score += 1000 + this.wave * 100;
      this.loadWave();
      this.status = `Round ${this.wave}`;
    }
  }

  updateModes(dt) {
    if (this.fright > 0) return;
    this.modeTimer += dt;
    if (this.modeTimer < this.modeSchedule[this.modeIndex]) return;
    this.modeTimer = 0;
    this.modeIndex = Math.min(this.modeIndex + 1, this.modeSchedule.length - 1);
    this.scatter = this.modeIndex % 2 === 0;
  }

  updateFruit(dt) {
    const totalPellets = this.pellets.size + this.powerPellets.size;
    if (!this.fruitSpawned && totalPellets < 120) {
      const item = this.fruitTable[Math.min(this.wave - 1, this.fruitTable.length - 1)];
      this.fruit = {
        c: 12,
        r: 8,
        x: this.cellToX(12),
        y: this.cellToY(8),
        ttl: 10,
        icon: item.icon,
        points: item.points,
      };
      this.fruitSpawned = true;
    }
    if (this.fruit) {
      this.fruit.ttl -= dt;
      if (this.fruit.ttl <= 0) this.fruit = null;
    }
    if (this.fruitMessage) {
      this.fruitMessage.ttl -= dt;
      if (this.fruitMessage.ttl <= 0) this.fruitMessage = null;
    }
  }

  movePlayer(dt) {
    const p = this.player;
    if (this.atCenter(p)) {
      p.x = this.cellToX(p.c);
      p.y = this.cellToY(p.r);
      if (this.canMove(p.c, p.r, p.next)) p.dir = { ...p.next };
      if (!this.canMove(p.c, p.r, p.dir)) p.dir = { x: 0, y: 0 };
    }
    p.x += p.dir.x * p.speed * dt;
    p.y += p.dir.y * p.speed * dt;
    this.wrapTunnel(p);
    const current = this.pixelToCell(p.x, p.y);
    if (!this.isWall(current.c, current.r)) {
      p.c = current.c;
      p.r = current.r;
    }
    p.mouth += dt * 12;
  }

  moveGhost(ghost, dt) {
    if (ghost.respawn > 0) {
      ghost.respawn -= dt;
      return;
    }
    ghost.releaseDelay = Math.max(0, ghost.releaseDelay - dt);
    if (ghost.releaseDelay > 0) return;
    if (this.atCenter(ghost)) {
      ghost.x = this.cellToX(ghost.c);
      ghost.y = this.cellToY(ghost.r);
      const choices = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ].filter((dir) => {
        const canMove = this.canMove(ghost.c, ghost.r, dir);
        const reversing = dir.x === -ghost.dir.x && dir.y === -ghost.dir.y;
        return canMove && (ghost.inHouse || !reversing);
      });

      if (choices.length) {
        const target = this.ghostTarget(ghost);
        choices.sort((a, b) => {
          const ac = ghost.c + a.x;
          const ar = ghost.r + a.y;
          const bc = ghost.c + b.x;
          const br = ghost.r + b.y;
          const ad = Math.hypot(target.c - ac, target.r - ar);
          const bd = Math.hypot(target.c - bc, target.r - br);
          return ad - bd;
        });
        const jitterRate = this.fright > 0 ? 0.62 : ghost.brain === 3 ? 0.28 : 0.12;
        const jitter = !ghost.inHouse && Math.random() < jitterRate ? Math.floor(Math.random() * choices.length) : 0;
        ghost.dir = choices[jitter];
      }
    }
    const speedScale = this.fright > 0 ? 0.72 : this.tunnelRows.has(ghost.r) ? 0.82 : 1;
    ghost.x += ghost.dir.x * ghost.speed * speedScale * dt;
    ghost.y += ghost.dir.y * ghost.speed * speedScale * dt;
    this.wrapTunnel(ghost);
    const current = this.pixelToCell(ghost.x, ghost.y);
    if (!this.isWall(current.c, current.r)) {
      ghost.c = current.c;
      ghost.r = current.r;
    }
    if (ghost.inHouse && ghost.r <= 7) {
      ghost.inHouse = false;
      ghost.dir = { x: ghost.brain % 2 === 0 ? -1 : 1, y: 0 };
    }
  }

  ghostTarget(ghost) {
    if (ghost.releaseDelay > 0) return { c: ghost.home.c, r: ghost.home.r };
    if (ghost.inHouse) return { c: 12, r: 7 };
    if (this.fright > 0) return { c: this.cols - 1 - this.player.c, r: this.rows - 1 - this.player.r };
    if (this.scatter) return this.scatterTargets[ghost.brain];
    if (ghost.brain === 0) return { c: this.player.c, r: this.player.r };
    if (ghost.brain === 1) {
      return {
        c: clamp(this.player.c + this.player.dir.x * 4, 1, this.cols - 2),
        r: clamp(this.player.r + this.player.dir.y * 4, 1, this.rows - 2),
      };
    }
    if (ghost.brain === 2) {
      const farFromPlayer = Math.hypot(ghost.c - this.player.c, ghost.r - this.player.r) > 7;
      return farFromPlayer ? { c: this.player.c, r: this.player.r } : this.scatterTargets[2];
    }
    return Math.random() < 0.08 ? this.scatterTargets[3] : { c: this.player.c, r: this.player.r };
  }

  wrapTunnel(entity) {
    if (!this.tunnelRows.has(entity.r)) return;
    const minX = this.offsetX - this.cell / 2;
    const maxX = this.offsetX + this.cols * this.cell + this.cell / 2;
    if (entity.x < minX) {
      entity.x = this.cellToX(this.cols - 1);
      entity.c = this.cols - 1;
    }
    if (entity.x > maxX) {
      entity.x = this.cellToX(0);
      entity.c = 0;
    }
  }

  eatPellet() {
    const key = `${this.player.c},${this.player.r}`;
    if (this.pellets.delete(key)) this.score += 10;
    if (this.powerPellets.delete(key)) {
      this.score += 50;
      this.fright = Math.max(4.5, 8 - this.wave * 0.35);
      this.frightChain = 0;
    }
    if (this.fruit && this.player.c === this.fruit.c && this.player.r === this.fruit.r) {
      this.score += this.fruit.points;
      this.fruitMessage = {
        text: `+${this.fruit.points}`,
        x: this.fruit.x,
        y: this.fruit.y,
        ttl: 1.2,
      };
      this.fruit = null;
    }
  }

  checkExtraLife() {
    if (this.extraLifeAwarded || this.score < 10000) return;
    this.extraLifeAwarded = true;
    this.lives += 1;
    this.fruitMessage = {
      text: "EXTRA LIFE",
      x: canvas.width / 2,
      y: 64,
      ttl: 1.8,
    };
  }

  resolveCollisions() {
    this.ghosts.forEach((ghost) => {
      if (ghost.respawn > 0) return;
      if (Math.hypot(this.player.x - ghost.x, this.player.y - ghost.y) > 17) return;
      if (this.fright > 0) {
        this.frightChain += 1;
        const points = 200 * 2 ** (this.frightChain - 1);
        this.score += points;
        this.fruitMessage = {
          text: `+${points}`,
          x: ghost.x,
          y: ghost.y - 16,
          ttl: 1,
        };
        ghost.c = ghost.home.c;
        ghost.r = ghost.home.r;
        ghost.x = this.cellToX(ghost.c);
        ghost.y = this.cellToY(ghost.r);
        ghost.respawn = 2;
        ghost.releaseDelay = 1.2;
        ghost.inHouse = true;
        return;
      }
      this.lives -= 1;
      this.pausedAfterHit = 1.1;
      if (this.lives <= 0) {
        this.status = "Game Over";
        this.started = false;
        saveBest("maze", this.score);
      } else {
        this.player.c = 12;
        this.player.r = 15;
        this.player.x = this.cellToX(12);
        this.player.y = this.cellToY(15);
        this.player.dir = { x: 0, y: 0 };
        this.player.next = { x: 0, y: 0 };
        this.ghosts.forEach((g) => {
          g.c = g.home.c;
          g.r = g.home.r;
          g.x = this.cellToX(g.c);
          g.y = this.cellToY(g.r);
          g.releaseDelay = 1 + g.brain * 1.1;
          g.inHouse = true;
        });
        this.status = "Playing";
      }
    });
  }

  draw() {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.drawGrid();
    this.drawPellets();
    this.drawFruit();
    this.drawPlayer();
    this.ghosts.forEach((ghost) => this.drawGhost(ghost));
    this.drawMessages();
    this.drawHudHint();
    if (!this.started || this.roundIntro > 0) this.drawOverlay();
  }

  drawGrid() {
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = colors.wall;
    ctx.shadowColor = colors.wall;
    ctx.shadowBlur = 12;
    for (let r = 0; r < this.rows; r += 1) {
      for (let c = 0; c < this.cols; c += 1) {
        if (!this.isWall(c, r)) continue;
        const x = this.offsetX + c * this.cell;
        const y = this.offsetY + r * this.cell;
        ctx.strokeRect(x + 2, y + 2, this.cell - 4, this.cell - 4);
      }
    }
    ctx.restore();
  }

  drawPellets() {
    ctx.save();
    ctx.fillStyle = colors.pellet;
    this.pellets.forEach((key) => {
      const [c, r] = key.split(",").map(Number);
      ctx.beginPath();
      ctx.arc(this.cellToX(c), this.cellToY(r), 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = colors.power;
    ctx.shadowColor = colors.power;
    ctx.shadowBlur = 14;
    this.powerPellets.forEach((key) => {
      const [c, r] = key.split(",").map(Number);
      ctx.beginPath();
      ctx.arc(this.cellToX(c), this.cellToY(r), 6, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  drawFruit() {
    if (!this.fruit) return;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = '22px "Press Start 2P", monospace';
    ctx.fillStyle = colors.amber;
    ctx.shadowColor = colors.amber;
    ctx.shadowBlur = 18;
    ctx.fillText(this.fruit.icon, this.fruit.x, this.fruit.y + Math.sin(performance.now() / 150) * 2);
    ctx.restore();
  }

  drawPlayer() {
    const p = this.player;
    const mouth = 0.2 + Math.abs(Math.sin(p.mouth)) * 0.32;
    const angle = Math.atan2(p.dir.y, p.dir.x || 0.001);
    const facing = p.dir.x || p.dir.y ? angle : 0;
    ctx.save();
    ctx.fillStyle = colors.player;
    ctx.shadowColor = colors.player;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.arc(p.x, p.y, 10, facing + mouth, facing + Math.PI * 2 - mouth);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = colors.pink;
    ctx.beginPath();
    ctx.arc(p.x - 2, p.y - 11, 4, 0, Math.PI * 2);
    ctx.arc(p.x + 4, p.y - 11, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawGhost(ghost) {
    if (ghost.respawn > 0) return;
    const flashing = this.fright > 0 && this.fright < 2.2 && Math.floor(this.fright * 8) % 2 === 0;
    const color = this.fright > 0 ? (flashing ? colors.white : colors.green) : ghost.color;
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(ghost.x, ghost.y - 2, 9, Math.PI, 0);
    ctx.lineTo(ghost.x + 9, ghost.y + 9);
    ctx.lineTo(ghost.x + 4, ghost.y + 5);
    ctx.lineTo(ghost.x, ghost.y + 9);
    ctx.lineTo(ghost.x - 4, ghost.y + 5);
    ctx.lineTo(ghost.x - 9, ghost.y + 9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = colors.white;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(ghost.x - 3, ghost.y - 2, 2, 0, Math.PI * 2);
    ctx.arc(ghost.x + 4, ghost.y - 2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawHudHint() {
    ctx.save();
    ctx.fillStyle = colors.grid;
    ctx.fillRect(0, 0, canvas.width, 48);
    ctx.fillStyle = colors.white;
    ctx.font = '16px "Space Mono", monospace';
    const mode = this.fright > 0 ? "POWER" : this.scatter ? "SCATTER" : "CHASE";
    ctx.fillText(`Round ${this.wave}  ${mode}  Fruit: ${this.fruit ? this.fruit.points : "--"}  Extra life at 10000`, 26, 30);
    ctx.restore();
  }

  drawMessages() {
    if (!this.fruitMessage) return;
    ctx.save();
    ctx.globalAlpha = clamp(this.fruitMessage.ttl, 0, 1);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillStyle = colors.amber;
    ctx.shadowColor = colors.amber;
    ctx.shadowBlur = 12;
    ctx.fillText(this.fruitMessage.text, this.fruitMessage.x, this.fruitMessage.y);
    ctx.restore();
  }

  drawOverlay() {
    ctx.save();
    ctx.fillStyle = "rgba(5, 7, 12, 0.76)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const title = this.status === "Game Over" ? "GAME OVER" : this.roundIntro > 0 ? `ROUND ${this.wave}` : "NEON CHOMP";
    drawCentered(title, 250, 28, this.status === "Game Over" ? colors.red : colors.cyan, true);
    const subtitle = this.status === "Game Over" ? "SPACE / CLICK TO RETRY" : this.roundIntro > 0 ? "GET READY" : "SPACE / CLICK TO START";
    drawCentered(subtitle, 310, 14, colors.amber);
    ctx.restore();
  }

  snapshot() {
    return {
      score: this.score,
      lives: this.lives,
      wave: this.wave,
      state: this.status,
    };
  }
}

class AsteroidGame {
  constructor() {
    this.reset();
  }

  reset() {
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.status = "Ready";
    this.started = false;
    this.cooldown = 0;
    this.invincible = 0;
    this.bullets = [];
    this.particles = [];
    this.ship = { x: canvas.width / 2, y: canvas.height / 2, vx: 0, vy: 0, angle: -Math.PI / 2, radius: 13 };
    this.spawnWave();
  }

  spawnWave() {
    this.asteroids = [];
    const count = 4 + this.wave;
    for (let i = 0; i < count; i += 1) this.spawnAsteroid(44, true);
  }

  spawnAsteroid(radius, edge = false, x = rand(80, canvas.width - 80), y = rand(80, canvas.height - 80)) {
    if (edge) {
      const side = Math.floor(Math.random() * 4);
      x = side === 0 ? -radius : side === 1 ? canvas.width + radius : rand(0, canvas.width);
      y = side === 2 ? -radius : side === 3 ? canvas.height + radius : rand(0, canvas.height);
    }
    const angle = rand(0, Math.PI * 2);
    const speed = rand(36, 84) + this.wave * 5;
    const verts = Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2;
      return { a, r: radius * rand(0.72, 1.18) };
    });
    this.asteroids.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      spin: rand(-1.2, 1.2),
      angle: rand(0, Math.PI * 2),
      verts,
    });
  }

  start() {
    if (this.status === "Game Over") this.reset();
    this.started = true;
    this.status = "Playing";
  }

  update(dt) {
    if (!this.started || this.status === "Game Over") {
      this.updateParticles(dt);
      return;
    }
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.invincible = Math.max(0, this.invincible - dt);
    this.handleInput(dt);
    this.updateShip(dt);
    this.updateBullets(dt);
    this.updateAsteroids(dt);
    this.updateParticles(dt);
    this.checkHits();
    if (this.asteroids.length === 0) {
      this.wave += 1;
      this.score += 800;
      this.spawnWave();
    }
  }

  handleInput(dt) {
    if (pointer.active) {
      this.ship.angle = Math.atan2(pointer.y - this.ship.y, pointer.x - this.ship.x);
    } else {
      if (keys.has("ArrowLeft") || keys.has("KeyA")) this.ship.angle -= 4.8 * dt;
      if (keys.has("ArrowRight") || keys.has("KeyD")) this.ship.angle += 4.8 * dt;
    }
    if (keys.has("ArrowUp") || keys.has("KeyW") || pointer.active) {
      this.ship.vx += Math.cos(this.ship.angle) * 260 * dt;
      this.ship.vy += Math.sin(this.ship.angle) * 260 * dt;
      this.spawnThrust();
    }
    if (keys.has("Space") || pointer.active) this.shoot();
  }

  updateShip(dt) {
    this.ship.x += this.ship.vx * dt;
    this.ship.y += this.ship.vy * dt;
    this.ship.vx *= 0.992;
    this.ship.vy *= 0.992;
    const speed = Math.hypot(this.ship.vx, this.ship.vy);
    if (speed > 380) {
      this.ship.vx = (this.ship.vx / speed) * 380;
      this.ship.vy = (this.ship.vy / speed) * 380;
    }
    wrapBody(this.ship);
  }

  shoot() {
    if (this.cooldown > 0) return;
    this.cooldown = 0.16;
    const tipX = this.ship.x + Math.cos(this.ship.angle) * 18;
    const tipY = this.ship.y + Math.sin(this.ship.angle) * 18;
    this.bullets.push({
      x: tipX,
      y: tipY,
      vx: Math.cos(this.ship.angle) * 520 + this.ship.vx * 0.2,
      vy: Math.sin(this.ship.angle) * 520 + this.ship.vy * 0.2,
      life: 0.95,
      radius: 3,
    });
  }

  updateBullets(dt) {
    this.bullets.forEach((bullet) => {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      wrapBody(bullet);
    });
    this.bullets = this.bullets.filter((bullet) => bullet.life > 0);
  }

  updateAsteroids(dt) {
    this.asteroids.forEach((asteroid) => {
      asteroid.x += asteroid.vx * dt;
      asteroid.y += asteroid.vy * dt;
      asteroid.angle += asteroid.spin * dt;
      wrapBody(asteroid);
    });
  }

  checkHits() {
    for (let ai = this.asteroids.length - 1; ai >= 0; ai -= 1) {
      const asteroid = this.asteroids[ai];
      for (let bi = this.bullets.length - 1; bi >= 0; bi -= 1) {
        if (dist(asteroid, this.bullets[bi]) > asteroid.radius) continue;
        this.bullets.splice(bi, 1);
        this.breakAsteroid(ai);
        break;
      }
    }

    if (this.invincible <= 0) {
      const hit = this.asteroids.some((asteroid) => dist(asteroid, this.ship) < asteroid.radius + this.ship.radius);
      if (hit) this.hitShip();
    }
  }

  breakAsteroid(index) {
    const asteroid = this.asteroids[index];
    this.asteroids.splice(index, 1);
    this.score += asteroid.radius > 30 ? 80 : asteroid.radius > 20 ? 140 : 220;
    this.burst(asteroid.x, asteroid.y, colors.amber || "#ffbd4a", 18);
    if (asteroid.radius > 18) {
      this.spawnAsteroid(asteroid.radius * 0.58, false, asteroid.x, asteroid.y);
      this.spawnAsteroid(asteroid.radius * 0.58, false, asteroid.x, asteroid.y);
    }
  }

  hitShip() {
    this.lives -= 1;
    this.burst(this.ship.x, this.ship.y, colors.red, 28);
    if (this.lives <= 0) {
      this.status = "Game Over";
      this.started = false;
      saveBest("asteroids", this.score);
      return;
    }
    this.ship.x = canvas.width / 2;
    this.ship.y = canvas.height / 2;
    this.ship.vx = 0;
    this.ship.vy = 0;
    this.ship.angle = -Math.PI / 2;
    this.invincible = 2.2;
  }

  spawnThrust() {
    const back = this.ship.angle + Math.PI;
    this.particles.push({
      x: this.ship.x + Math.cos(back) * 14,
      y: this.ship.y + Math.sin(back) * 14,
      vx: Math.cos(back + rand(-0.5, 0.5)) * rand(60, 150),
      vy: Math.sin(back + rand(-0.5, 0.5)) * rand(60, 150),
      life: 0.28,
      color: colors.cyan,
    });
  }

  burst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const a = rand(0, Math.PI * 2);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * rand(50, 240),
        vy: Math.sin(a) * rand(50, 240),
        life: rand(0.35, 0.8),
        color,
      });
    }
  }

  updateParticles(dt) {
    this.particles.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    });
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  draw() {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.drawStars();
    this.drawBullets();
    this.asteroids.forEach((asteroid) => this.drawAsteroid(asteroid));
    this.drawShip();
    this.drawParticles();
    if (!this.started) this.drawOverlay();
  }

  drawStars() {
    ctx.save();
    ctx.fillStyle = "#101a2c";
    for (let x = 0; x < canvas.width; x += 48) {
      for (let y = 0; y < canvas.height; y += 48) {
        ctx.fillRect(x + ((y * 7) % 31), y + ((x * 5) % 29), 2, 2);
      }
    }
    ctx.restore();
  }

  drawBullets() {
    ctx.save();
    ctx.fillStyle = colors.green;
    ctx.shadowColor = colors.green;
    ctx.shadowBlur = 12;
    this.bullets.forEach((bullet) => {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  drawShip() {
    if (this.invincible > 0 && Math.floor(this.invincible * 12) % 2 === 0) return;
    const s = this.ship;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);
    ctx.strokeStyle = colors.cyan;
    ctx.fillStyle = "rgba(56, 223, 240, 0.10)";
    ctx.lineWidth = 2;
    ctx.shadowColor = colors.cyan;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(19, 0);
    ctx.lineTo(-13, -12);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-13, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawAsteroid(asteroid) {
    ctx.save();
    ctx.translate(asteroid.x, asteroid.y);
    ctx.rotate(asteroid.angle);
    ctx.strokeStyle = colors.violet;
    ctx.lineWidth = 2;
    ctx.shadowColor = colors.violet;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    asteroid.verts.forEach((v, i) => {
      const x = Math.cos(v.a) * v.r;
      const y = Math.sin(v.a) * v.r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  drawParticles() {
    ctx.save();
    this.particles.forEach((p) => {
      ctx.globalAlpha = clamp(p.life * 2, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 3, 3);
    });
    ctx.restore();
  }

  drawOverlay() {
    ctx.save();
    ctx.fillStyle = "rgba(5, 7, 12, 0.76)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawCentered(this.status === "Game Over" ? "GAME OVER" : "ASTEROID FORGE", 250, 25, this.status === "Game Over" ? colors.red : colors.cyan, true);
    drawCentered("SPACE / CLICK TO START", 310, 14, "#ffbd4a");
    ctx.restore();
  }

  snapshot() {
    return {
      score: this.score,
      lives: this.lives,
      wave: this.wave,
      state: this.status,
    };
  }
}

class ClimberGame {
  constructor() {
    this.platforms = [540, 450, 360, 270, 180, 90].map((y, i) => ({
      y,
      x1: i % 2 === 0 ? 54 : 154,
      x2: i % 2 === 0 ? 830 : 930,
    }));
    this.ladders = [
      { x: 760, y1: 450, y2: 540 },
      { x: 250, y1: 360, y2: 450 },
      { x: 730, y1: 270, y2: 360 },
      { x: 310, y1: 180, y2: 270 },
      { x: 700, y1: 90, y2: 180 },
    ];
    this.reset();
  }

  reset() {
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.status = "Ready";
    this.started = false;
    this.player = { x: 86, y: 516, vx: 0, vy: 0, radius: 13, onGround: false, climb: false };
    this.barrels = [];
    this.spawnTimer = 1;
    this.winTimer = 0;
  }

  start() {
    if (this.status === "Game Over") this.reset();
    this.started = true;
    this.status = "Playing";
  }

  update(dt) {
    if (!this.started || this.status === "Game Over") return;
    if (this.winTimer > 0) {
      this.winTimer -= dt;
      if (this.winTimer <= 0) this.nextWave();
      return;
    }
    this.handleInput(dt);
    this.updatePlayer(dt);
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnBarrel();
      this.spawnTimer = Math.max(0.85, 2.25 - this.wave * 0.18);
    }
    this.updateBarrels(dt);
    this.checkCollisions();
    if (this.player.y < 115 && this.player.x > 790) {
      this.score += 1200 + this.wave * 150;
      this.status = "Tower Clear";
      this.winTimer = 1.4;
    }
  }

  handleInput(dt) {
    let move = 0;
    if (keys.has("ArrowLeft") || keys.has("KeyA")) move -= 1;
    if (keys.has("ArrowRight") || keys.has("KeyD")) move += 1;
    if (pointer.active) {
      const dx = pointer.x - this.player.x;
      if (Math.abs(dx) > 12) move = Math.sign(dx);
      if (pointer.y < this.player.y - 48 && this.player.onGround) this.player.vy = -430;
    }
    this.player.vx = move * (170 + this.wave * 6);

    const ladder = this.nearLadder();
    const climbUp = keys.has("ArrowUp") || keys.has("KeyW") || (pointer.active && pointer.y < this.player.y - 10);
    const climbDown = keys.has("ArrowDown") || keys.has("KeyS") || (pointer.active && pointer.y > this.player.y + 20);
    this.player.climb = Boolean(ladder && (climbUp || climbDown));
    if (this.player.climb) {
      this.player.x += (ladder.x - this.player.x) * clamp(dt * 8, 0, 1);
      this.player.vy = (climbUp ? -1 : climbDown ? 1 : 0) * 150;
    } else if ((keys.has("Space") || pointer.justPressed) && this.player.onGround) {
      this.player.vy = -430;
    }
  }

  nearLadder() {
    return this.ladders.find(
      (ladder) => Math.abs(this.player.x - ladder.x) < 24 && this.player.y <= ladder.y1 + 24 && this.player.y >= ladder.y2 - 24
    );
  }

  updatePlayer(dt) {
    const p = this.player;
    p.x = clamp(p.x + p.vx * dt, 24, canvas.width - 24);
    if (!p.climb) p.vy += 980 * dt;
    p.y += p.vy * dt;
    p.onGround = false;
    this.platforms.forEach((platform) => {
      const inX = p.x > platform.x1 - 18 && p.x < platform.x2 + 18;
      const crossing = p.y + p.radius >= platform.y && p.y + p.radius <= platform.y + 22 && p.vy >= 0;
      if (inX && crossing) {
        p.y = platform.y - p.radius;
        p.vy = 0;
        p.onGround = true;
      }
    });
    if (p.y > canvas.height + 40) this.hit();
  }

  spawnBarrel() {
    this.barrels.push({ x: 835, floor: 5, y: this.platforms[5].y - 12, dir: -1, radius: 12, spin: 0 });
  }

  updateBarrels(dt) {
    this.barrels.forEach((barrel) => {
      const platform = this.platforms[barrel.floor];
      barrel.x += barrel.dir * (125 + this.wave * 10) * dt;
      barrel.spin += dt * 8;
      if (barrel.x < platform.x1 || barrel.x > platform.x2) {
        barrel.floor -= 1;
        if (barrel.floor < 0) {
          barrel.dead = true;
          this.score += 20;
          return;
        }
        const next = this.platforms[barrel.floor];
        barrel.dir *= -1;
        barrel.x = clamp(barrel.x, next.x1, next.x2);
        barrel.y = next.y - 12;
      }
    });
    this.barrels = this.barrels.filter((barrel) => !barrel.dead);
  }

  checkCollisions() {
    if (this.barrels.some((barrel) => Math.hypot(barrel.x - this.player.x, barrel.y - this.player.y) < 24)) this.hit();
  }

  hit() {
    this.lives -= 1;
    if (this.lives <= 0) {
      this.status = "Game Over";
      this.started = false;
      saveBest("climber", this.score);
      return;
    }
    this.player.x = 86;
    this.player.y = 516;
    this.player.vx = 0;
    this.player.vy = 0;
  }

  nextWave() {
    this.wave += 1;
    this.status = "Playing";
    this.player.x = 86;
    this.player.y = 516;
    this.player.vx = 0;
    this.player.vy = 0;
    this.barrels = [];
    this.spawnTimer = 1;
  }

  draw() {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.lineWidth = 5;
    this.platforms.forEach((platform, i) => {
      ctx.strokeStyle = i % 2 ? colors.pink : colors.cyan;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(platform.x1, platform.y);
      ctx.lineTo(platform.x2, platform.y);
      ctx.stroke();
    });
    ctx.strokeStyle = colors.amber;
    ctx.shadowColor = colors.amber;
    this.ladders.forEach((ladder) => {
      ctx.beginPath();
      ctx.moveTo(ladder.x - 9, ladder.y1);
      ctx.lineTo(ladder.x - 9, ladder.y2);
      ctx.moveTo(ladder.x + 9, ladder.y1);
      ctx.lineTo(ladder.x + 9, ladder.y2);
      ctx.stroke();
      for (let y = ladder.y2; y <= ladder.y1; y += 18) {
        ctx.beginPath();
        ctx.moveTo(ladder.x - 12, y);
        ctx.lineTo(ladder.x + 12, y);
        ctx.stroke();
      }
    });
    ctx.restore();
    ctx.fillStyle = colors.green;
    ctx.font = '24px "Press Start 2P", monospace';
    ctx.fillText("EXIT", 802, 74);
    this.barrels.forEach((barrel) => {
      ctx.save();
      ctx.translate(barrel.x, barrel.y);
      ctx.rotate(barrel.spin);
      ctx.strokeStyle = colors.amber;
      ctx.lineWidth = 3;
      ctx.shadowColor = colors.amber;
      ctx.shadowBlur = 12;
      ctx.strokeRect(-11, -11, 22, 22);
      ctx.restore();
    });
    ctx.save();
    ctx.fillStyle = colors.white;
    ctx.shadowColor = colors.white;
    ctx.shadowBlur = 14;
    ctx.fillRect(this.player.x - 11, this.player.y - 17, 22, 28);
    ctx.fillStyle = colors.pink;
    ctx.fillRect(this.player.x - 13, this.player.y - 23, 26, 8);
    ctx.restore();
    if (!this.started) this.drawOverlay();
    if (this.winTimer > 0) drawCentered("TOWER CLEAR", 285, 24, colors.green, true);
  }

  drawOverlay() {
    ctx.save();
    ctx.fillStyle = "rgba(5, 7, 12, 0.76)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawCentered(this.status === "Game Over" ? "GAME OVER" : "BARREL TOWER", 250, 25, this.status === "Game Over" ? colors.red : colors.cyan, true);
    drawCentered("CLICK TO MOVE, CLICK HIGH TO JUMP", 310, 12, colors.amber);
    ctx.restore();
  }

  snapshot() {
    return { score: this.score, lives: this.lives, wave: this.wave, state: this.status };
  }
}

class SwarmGame {
  constructor() {
    this.reset();
  }

  reset() {
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.status = "Ready";
    this.started = false;
    this.player = { x: canvas.width / 2, y: 552, radius: 13 };
    this.bullets = [];
    this.cooldown = 0;
    this.mushrooms = Array.from({ length: 36 }, () => ({ x: rand(70, 890), y: rand(80, 470), hp: 2 }));
    this.spawnSwarm();
  }

  spawnSwarm() {
    this.segments = Array.from({ length: 10 + this.wave }, (_, i) => ({
      x: 120 + i * 28,
      y: 70,
      dir: 1,
      radius: 10,
      leader: i === 0,
    }));
  }

  start() {
    if (this.status === "Game Over") this.reset();
    this.started = true;
    this.status = "Playing";
  }

  update(dt) {
    if (!this.started || this.status === "Game Over") return;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.handleInput();
    this.updateBullets(dt);
    this.updateSegments(dt);
    this.checkHits();
    if (this.segments.length === 0) {
      this.wave += 1;
      this.score += 750;
      this.spawnSwarm();
    }
  }

  handleInput() {
    let targetX = this.player.x;
    if (keys.has("ArrowLeft") || keys.has("KeyA")) targetX -= 14;
    if (keys.has("ArrowRight") || keys.has("KeyD")) targetX += 14;
    if (pointer.active) targetX = pointer.x;
    this.player.x = clamp(targetX, 32, canvas.width - 32);
    if (keys.has("Space") || pointer.active || pointer.justPressed) this.shoot();
  }

  shoot() {
    if (this.cooldown > 0) return;
    this.cooldown = 0.12;
    this.bullets.push({ x: this.player.x, y: this.player.y - 16, radius: 3, vy: -520 });
  }

  updateBullets(dt) {
    this.bullets.forEach((bullet) => (bullet.y += bullet.vy * dt));
    this.bullets = this.bullets.filter((bullet) => bullet.y > -20);
  }

  updateSegments(dt) {
    const speed = 85 + this.wave * 9;
    this.segments.forEach((segment) => {
      segment.x += segment.dir * speed * dt;
      const obstacle = this.mushrooms.find((m) => Math.hypot(m.x - segment.x, m.y - segment.y) < 22);
      if (segment.x < 24 || segment.x > canvas.width - 24 || obstacle) {
        segment.dir *= -1;
        segment.y += 28;
      }
      if (segment.y > canvas.height - 40) {
        segment.y = 70;
        segment.x = rand(80, 880);
      }
    });
  }

  checkHits() {
    for (let bi = this.bullets.length - 1; bi >= 0; bi -= 1) {
      const bullet = this.bullets[bi];
      const si = this.segments.findIndex((segment) => Math.hypot(segment.x - bullet.x, segment.y - bullet.y) < segment.radius + bullet.radius);
      if (si >= 0) {
        const [segment] = this.segments.splice(si, 1);
        this.mushrooms.push({ x: segment.x, y: segment.y, hp: 2 });
        this.score += segment.leader ? 150 : 90;
        this.bullets.splice(bi, 1);
        continue;
      }
      const mushroom = this.mushrooms.find((m) => Math.hypot(m.x - bullet.x, m.y - bullet.y) < 12);
      if (mushroom) {
        mushroom.hp -= 1;
        this.score += 5;
        this.bullets.splice(bi, 1);
      }
    }
    this.mushrooms = this.mushrooms.filter((m) => m.hp > 0);
    if (this.segments.some((segment) => Math.hypot(segment.x - this.player.x, segment.y - this.player.y) < 24)) this.hit();
  }

  hit() {
    this.lives -= 1;
    if (this.lives <= 0) {
      this.status = "Game Over";
      this.started = false;
      saveBest("swarm", this.score);
      return;
    }
    this.player.x = canvas.width / 2;
    this.segments.forEach((segment) => (segment.y = Math.min(segment.y, 380)));
  }

  draw() {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.mushrooms.forEach((m) => {
      ctx.fillStyle = m.hp > 1 ? colors.violet : colors.pink;
      ctx.fillRect(m.x - 8, m.y - 8, 16, 16);
    });
    ctx.fillStyle = colors.green;
    ctx.shadowColor = colors.green;
    ctx.shadowBlur = 12;
    this.bullets.forEach((bullet) => {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    this.segments.forEach((segment) => {
      ctx.fillStyle = segment.leader ? colors.amber : colors.cyan;
      ctx.beginPath();
      ctx.arc(segment.x, segment.y, segment.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = colors.white;
    ctx.fillRect(this.player.x - 14, this.player.y, 28, 12);
    ctx.fillRect(this.player.x - 4, this.player.y - 16, 8, 18);
    ctx.shadowBlur = 0;
    if (!this.started) this.drawOverlay();
  }

  drawOverlay() {
    ctx.save();
    ctx.fillStyle = "rgba(5, 7, 12, 0.76)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawCentered(this.status === "Game Over" ? "GAME OVER" : "BUG SPIRAL", 250, 25, this.status === "Game Over" ? colors.red : colors.cyan, true);
    drawCentered("MOVE MOUSE TO AIM, HOLD TO FIRE", 310, 12, colors.amber);
    ctx.restore();
  }

  snapshot() {
    return { score: this.score, lives: this.lives, wave: this.wave, state: this.status };
  }
}

class MinerGame {
  constructor() {
    this.cols = 30;
    this.rows = 18;
    this.cell = 26;
    this.offsetX = (canvas.width - this.cols * this.cell) / 2;
    this.offsetY = 68;
    this.reset();
  }

  reset() {
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.status = "Ready";
    this.started = false;
    this.loadWave();
  }

  loadWave() {
    this.dirt = Array.from({ length: this.rows }, () => Array(this.cols).fill(true));
    this.player = { c: 2, r: 2, x: this.xOf(2), y: this.yOf(2), dir: { x: 1, y: 0 }, moveTimer: 0 };
    this.clearAt(2, 2);
    this.gems = Array.from({ length: 5 + this.wave }, () => {
      const c = Math.floor(rand(4, this.cols - 3));
      const r = Math.floor(rand(3, this.rows - 2));
      return { c, r, x: this.xOf(c), y: this.yOf(r) };
    });
    this.enemies = Array.from({ length: 3 + Math.min(this.wave, 5) }, () => {
      const c = Math.floor(rand(14, this.cols - 2));
      const r = Math.floor(rand(4, this.rows - 2));
      return { c, r, x: this.xOf(c), y: this.yOf(r), dir: { x: -1, y: 0 }, stun: 0, step: 0 };
    });
  }

  xOf(c) {
    return this.offsetX + c * this.cell + this.cell / 2;
  }

  yOf(r) {
    return this.offsetY + r * this.cell + this.cell / 2;
  }

  start() {
    if (this.status === "Game Over") this.reset();
    this.started = true;
    this.status = "Playing";
  }

  update(dt) {
    if (!this.started || this.status === "Game Over") return;
    this.handleInput(dt);
    this.updateEnemies(dt);
    this.collect();
    if (this.gems.length === 0) {
      this.score += 900 + this.wave * 100;
      this.wave += 1;
      this.loadWave();
    }
  }

  handleInput(dt) {
    const next = { x: 0, y: 0 };
    if (keys.has("ArrowUp") || keys.has("KeyW")) next.y = -1;
    if (keys.has("ArrowDown") || keys.has("KeyS")) next.y = 1;
    if (keys.has("ArrowLeft") || keys.has("KeyA")) next.x = -1;
    if (keys.has("ArrowRight") || keys.has("KeyD")) next.x = 1;
    if (!next.x && !next.y && pointer.active) {
      const dx = pointer.x - this.player.x;
      const dy = pointer.y - this.player.y;
      if (Math.abs(dx) > Math.abs(dy)) next.x = Math.sign(dx);
      else next.y = Math.sign(dy);
    }
    if (next.x || next.y) this.player.dir = next;
    if (keys.has("Space") || pointer.justPressed) this.pump();
    this.player.moveTimer -= dt;
    if (this.player.moveTimer <= 0 && (this.player.dir.x || this.player.dir.y)) {
      this.player.c = clamp(this.player.c + this.player.dir.x, 0, this.cols - 1);
      this.player.r = clamp(this.player.r + this.player.dir.y, 0, this.rows - 1);
      this.player.x = this.xOf(this.player.c);
      this.player.y = this.yOf(this.player.r);
      this.clearAt(this.player.c, this.player.r);
      this.player.moveTimer = 0.085;
    }
  }

  clearAt(c, r) {
    if (this.dirt[r] && this.dirt[r][c]) {
      this.dirt[r][c] = false;
      this.score += 2;
    }
  }

  pump() {
    this.enemies.forEach((enemy) => {
      const aligned = enemy.c === this.player.c || enemy.r === this.player.r;
      const close = Math.hypot(enemy.c - this.player.c, enemy.r - this.player.r) <= 4;
      if (aligned && close) {
        enemy.stun = 2.2;
        this.score += 80;
      }
    });
  }

  updateEnemies(dt) {
    this.enemies.forEach((enemy) => {
      if (enemy.stun > 0) {
        enemy.stun -= dt;
        return;
      }
      enemy.step -= dt;
      if (enemy.step > 0) return;
      const choices = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ];
      choices.sort((a, b) => {
        const ad = Math.hypot(this.player.c - (enemy.c + a.x), this.player.r - (enemy.r + a.y));
        const bd = Math.hypot(this.player.c - (enemy.c + b.x), this.player.r - (enemy.r + b.y));
        return ad - bd;
      });
      const pick = Math.random() < 0.75 ? choices[0] : choices[Math.floor(rand(0, choices.length))];
      enemy.dir = pick;
      enemy.c = clamp(enemy.c + pick.x, 0, this.cols - 1);
      enemy.r = clamp(enemy.r + pick.y, 0, this.rows - 1);
      enemy.x = this.xOf(enemy.c);
      enemy.y = this.yOf(enemy.r);
      enemy.step = this.dirt[enemy.r][enemy.c] ? 0.34 : 0.2;
    });
    if (this.enemies.some((enemy) => enemy.stun <= 0 && enemy.c === this.player.c && enemy.r === this.player.r)) this.hit();
  }

  collect() {
    this.gems = this.gems.filter((gem) => {
      if (gem.c === this.player.c && gem.r === this.player.r) {
        this.score += 250;
        return false;
      }
      return true;
    });
  }

  hit() {
    this.lives -= 1;
    if (this.lives <= 0) {
      this.status = "Game Over";
      this.started = false;
      saveBest("miner", this.score);
      return;
    }
    this.player.c = 2;
    this.player.r = 2;
    this.player.x = this.xOf(2);
    this.player.y = this.yOf(2);
  }

  draw() {
    ctx.fillStyle = "#080604";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < this.rows; r += 1) {
      for (let c = 0; c < this.cols; c += 1) {
        ctx.fillStyle = this.dirt[r][c] ? "#7b4d2a" : colors.bg;
        ctx.fillRect(this.offsetX + c * this.cell, this.offsetY + r * this.cell, this.cell - 1, this.cell - 1);
      }
    }
    this.gems.forEach((gem) => {
      ctx.fillStyle = colors.amber;
      ctx.shadowColor = colors.amber;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(gem.x, gem.y - 10);
      ctx.lineTo(gem.x + 10, gem.y);
      ctx.lineTo(gem.x, gem.y + 10);
      ctx.lineTo(gem.x - 10, gem.y);
      ctx.closePath();
      ctx.fill();
    });
    this.enemies.forEach((enemy) => {
      ctx.fillStyle = enemy.stun > 0 ? colors.green : colors.pink;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, 11, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = colors.cyan;
    ctx.fillRect(this.player.x - 10, this.player.y - 10, 20, 20);
    ctx.shadowBlur = 0;
    if (!this.started) this.drawOverlay();
  }

  drawOverlay() {
    ctx.save();
    ctx.fillStyle = "rgba(5, 7, 12, 0.76)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawCentered(this.status === "Game Over" ? "GAME OVER" : "TUNNEL MINER", 250, 25, this.status === "Game Over" ? colors.red : colors.cyan, true);
    drawCentered("CLICK TO DIG, SPACE OR TAP TO STUN", 310, 12, colors.amber);
    ctx.restore();
  }

  snapshot() {
    return { score: this.score, lives: this.lives, wave: this.wave, state: this.status };
  }
}

function configureMode(mode) {
  activeMode = mode;
  if (mode === "maze") game = new MazeGame();
  if (mode === "asteroids") game = new AsteroidGame();
  if (mode === "climber") game = new ClimberGame();
  if (mode === "swarm") game = new SwarmGame();
  if (mode === "miner") game = new MinerGame();
  ui.modeButtons.forEach((button) => button.classList.toggle("active", button.dataset.mode === mode));
  if (mode === "maze") {
    ui.title.textContent = "Neon Chomp";
    ui.primary.textContent = "Mouse/touch or WASD moves";
    ui.secondary.textContent = "Power dots flip the chase";
    ui.notes.textContent = "Includes tunnels, chase/scatter AI, bonus fruit, chain scoring, extra life, and rotating original mazes.";
  } else if (mode === "asteroids") {
    ui.title.textContent = "Asteroid Forge";
    ui.primary.textContent = "Mouse aims/thrusts/fires";
    ui.secondary.textContent = "Keyboard: rotate, thrust, space";
    ui.notes.textContent = "Break rocks into smaller rocks, manage drift, and clear waves before the field crowds you.";
  } else if (mode === "climber") {
    ui.title.textContent = "Barrel Tower";
    ui.primary.textContent = "Mouse moves, click high jumps";
    ui.secondary.textContent = "Keyboard: move, climb, space";
    ui.notes.textContent = "Climb ladders, jump rolling hazards, and reach the top exit to advance the tower.";
  } else if (mode === "swarm") {
    ui.title.textContent = "Bug Spiral";
    ui.primary.textContent = "Mouse moves and fires";
    ui.secondary.textContent = "Keyboard: arrows and space";
    ui.notes.textContent = "Clear the segmented swarm as it bounces through blockers and drops toward your cannon.";
  } else if (mode === "miner") {
    ui.title.textContent = "Tunnel Miner";
    ui.primary.textContent = "Mouse/touch digs toward pointer";
    ui.secondary.textContent = "Space or tap stuns enemies";
    ui.notes.textContent = "Dig tunnels, collect gems, stun enemies in a line, and clear each underground round.";
  }
  updateUi(game.snapshot());
}

function animationLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;
  game.update(dt);
  game.draw();
  updateUi(game.snapshot());
  pointer.justPressed = false;
  requestAnimationFrame(animationLoop);
}

window.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
    event.preventDefault();
  }
  if (event.code === "KeyR") {
    game.reset();
    updateUi(game.snapshot());
    return;
  }
  if (event.code === "Space" && !game.started) {
    game.start();
  }
  keys.add(event.code);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

function setPointerFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const source = event.touches ? event.touches[0] : event;
  pointer.x = ((source.clientX - rect.left) / rect.width) * canvas.width;
  pointer.y = ((source.clientY - rect.top) / rect.height) * canvas.height;
}

canvas.addEventListener("pointerdown", (event) => {
  setPointerFromEvent(event);
  pointer.active = true;
  pointer.justPressed = true;
  game.start();
});

canvas.addEventListener("pointermove", (event) => {
  setPointerFromEvent(event);
});

window.addEventListener("pointerup", () => {
  pointer.active = false;
});

canvas.addEventListener(
  "touchstart",
  (event) => {
    event.preventDefault();
    setPointerFromEvent(event);
    pointer.active = true;
    pointer.justPressed = true;
    game.start();
  },
  { passive: false }
);

canvas.addEventListener(
  "touchmove",
  (event) => {
    event.preventDefault();
    setPointerFromEvent(event);
  },
  { passive: false }
);

window.addEventListener("touchend", () => {
  pointer.active = false;
});

ui.start.addEventListener("click", () => game.start());
ui.modeButtons.forEach((button) => {
  button.addEventListener("click", () => configureMode(button.dataset.mode));
});

function resizeHero() {
  heroCanvas.width = heroCanvas.offsetWidth * devicePixelRatio;
  heroCanvas.height = heroCanvas.offsetHeight * devicePixelRatio;
  heroCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}

function drawHero(now) {
  const w = heroCanvas.offsetWidth;
  const h = heroCanvas.offsetHeight;
  heroCtx.clearRect(0, 0, w, h);
  heroCtx.fillStyle = "rgba(6, 9, 16, 0.74)";
  heroCtx.fillRect(0, 0, w, h);

  const t = now / 1000;
  for (let y = 0; y < h; y += 32) {
    for (let x = 0; x < w; x += 32) {
      const pulse = Math.sin(t * 1.4 + x * 0.02 + y * 0.03);
      if (pulse < 0.42) continue;
      heroCtx.fillStyle = pulse > 0.86 ? "rgba(255, 79, 154, 0.22)" : "rgba(56, 223, 240, 0.12)";
      heroCtx.fillRect(x, y, 4, 4);
    }
  }

  const ships = [
    { x: (t * 48) % (w + 120) - 60, y: h * 0.2, c: colors.cyan },
    { x: w - ((t * 34) % (w + 120)) + 60, y: h * 0.74, c: colors.pink },
  ];
  ships.forEach((ship) => {
    heroCtx.save();
    heroCtx.translate(ship.x, ship.y);
    heroCtx.strokeStyle = ship.c;
    heroCtx.shadowColor = ship.c;
    heroCtx.shadowBlur = 16;
    heroCtx.lineWidth = 2;
    heroCtx.beginPath();
    heroCtx.moveTo(16, 0);
    heroCtx.lineTo(-12, -9);
    heroCtx.lineTo(-8, 0);
    heroCtx.lineTo(-12, 9);
    heroCtx.closePath();
    heroCtx.stroke();
    heroCtx.restore();
  });

  requestAnimationFrame(drawHero);
}

resizeHero();
window.addEventListener("resize", resizeHero);
configureMode("maze");
requestAnimationFrame(animationLoop);
requestAnimationFrame(drawHero);
