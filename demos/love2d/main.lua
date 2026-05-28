-- PixelForge — Love2D Demo
-- Neon Breakout: destroy all bricks, don't let the ball fall.
-- Run: love demos/love2d/   (from the PixelForge root)

local W, H = 600, 450

-- Colors
local PURPLE  = {0.75, 0.37, 1.00}
local ORANGE  = {1.00, 0.42, 0.21}
local LIME    = {0.66, 1.00, 0.24}
local PINK    = {1.00, 0.24, 0.60}
local BLUE    = {0.24, 0.60, 1.00}
local BG      = {0.10, 0.04, 0.18}
local DIM     = {0.35, 0.27, 0.45}

-- Game state
local state = "start"
local paddle, ball, bricks, particles, score, lives, level

local BRICK_COLS = 10
local BRICK_ROWS = 5
local BRICK_W    = 52
local BRICK_H    = 18
local BRICK_GAP  = 3

local BRICK_COLORS = {PINK, ORANGE, PURPLE, BLUE, LIME}

local function newParticles(x, y, color, n)
    local ps = {}
    for i = 1, n do
        local a = love.math.random() * math.pi * 2
        local s = love.math.random() * 200 + 60
        ps[i] = {
            x=x, y=y,
            vx=math.cos(a)*s, vy=math.sin(a)*s,
            life=1.0, maxlife=1.0,
            color=color, r=love.math.random(2,5)
        }
    end
    return ps
end

local function buildBricks()
    bricks = {}
    local startX = (W - (BRICK_COLS*(BRICK_W+BRICK_GAP)-BRICK_GAP)) / 2
    for row = 1, BRICK_ROWS do
        for col = 1, BRICK_COLS do
            bricks[#bricks+1] = {
                x = startX + (col-1)*(BRICK_W+BRICK_GAP),
                y = 60 + (row-1)*(BRICK_H+BRICK_GAP),
                w = BRICK_W, h = BRICK_H,
                color = BRICK_COLORS[row],
                hp = row == 1 and 2 or 1,
                alive = true,
            }
        end
    end
end

local function resetRound()
    paddle = { x=W/2-40, y=H-36, w=80, h=12, speed=320 }
    local spd = 220 + level * 18
    local ang = -math.pi/2 + (love.math.random()-0.5)*0.6
    ball = { x=W/2, y=H-60, vx=math.cos(ang)*spd, vy=math.sin(ang)*spd, r=7 }
    particles = {}
end

local function startGame()
    score = 0; lives = 3; level = 1
    buildBricks()
    resetRound()
    state = "playing"
end

function love.load()
    love.window.setMode(W, H)
    love.window.setTitle("PixelForge — Neon Breakout")
    love.graphics.setBackgroundColor(BG)
end

function love.update(dt)
    if state ~= "playing" then return end

    -- Particles
    for i = #particles, 1, -1 do
        local p = particles[i]
        p.x = p.x + p.vx*dt; p.y = p.y + p.vy*dt
        p.vx = p.vx * 0.94;  p.vy = p.vy * 0.94
        p.life = p.life - dt * 1.8
        if p.life <= 0 then table.remove(particles, i) end
    end

    -- Paddle
    if love.keyboard.isDown("left",  "a") then paddle.x = paddle.x - paddle.speed*dt end
    if love.keyboard.isDown("right", "d") then paddle.x = paddle.x + paddle.speed*dt end
    paddle.x = math.max(0, math.min(W - paddle.w, paddle.x))

    -- Ball
    ball.x = ball.x + ball.vx*dt
    ball.y = ball.y + ball.vy*dt

    -- Wall bounces
    if ball.x - ball.r < 0     then ball.x = ball.r;      ball.vx = math.abs(ball.vx)  end
    if ball.x + ball.r > W     then ball.x = W-ball.r;    ball.vx = -math.abs(ball.vx) end
    if ball.y - ball.r < 0     then ball.y = ball.r;      ball.vy = math.abs(ball.vy)  end

    -- Paddle bounce
    if ball.y + ball.r >= paddle.y and ball.y + ball.r <= paddle.y + paddle.h
       and ball.x >= paddle.x - ball.r and ball.x <= paddle.x + paddle.w + ball.r
       and ball.vy > 0 then
        local rel = (ball.x - (paddle.x + paddle.w/2)) / (paddle.w/2)
        local angle = -math.pi/2 + rel * 0.8
        local spd = math.sqrt(ball.vx^2 + ball.vy^2)
        ball.vx = math.cos(angle) * spd
        ball.vy = math.sin(angle) * spd
        ball.y  = paddle.y - ball.r
        for _, p in ipairs(newParticles(ball.x, paddle.y, PURPLE, 5)) do
            particles[#particles+1] = p
        end
    end

    -- Ball lost
    if ball.y - ball.r > H then
        lives = lives - 1
        if lives <= 0 then
            state = "dead"
        else
            resetRound()
        end
        return
    end

    -- Brick collision
    local allGone = true
    for _, b in ipairs(bricks) do
        if b.alive then
            allGone = false
            if ball.x + ball.r > b.x and ball.x - ball.r < b.x + b.w
               and ball.y + ball.r > b.y and ball.y - ball.r < b.y + b.h then
                b.hp = b.hp - 1
                if b.hp <= 0 then
                    b.alive = false
                    score = score + 10 * level
                    for _, p in ipairs(newParticles(b.x+b.w/2, b.y+b.h/2, b.color, 10)) do
                        particles[#particles+1] = p
                    end
                end
                -- Determine bounce side
                local fromLeft  = ball.x < b.x
                local fromRight = ball.x > b.x + b.w
                if fromLeft or fromRight then ball.vx = -ball.vx
                else                          ball.vy = -ball.vy end
                break
            end
        end
    end

    if allGone then
        level = level + 1
        buildBricks()
        resetRound()
    end
end

local function setColor(c, a)
    love.graphics.setColor(c[1], c[2], c[3], a or 1)
end

function love.draw()
    -- Particles
    for _, p in ipairs(particles or {}) do
        setColor(p.color, p.life / p.maxlife * 0.9)
        love.graphics.circle("fill", p.x, p.y, p.r * p.life/p.maxlife)
    end

    if state == "start" or state == "dead" then
        setColor(PURPLE)
        love.graphics.printf(state=="start" and "NEON BREAKOUT" or "GAME OVER",
                             0, H/2-50, W, "center")
        setColor(ORANGE)
        love.graphics.printf("SCORE: "..(score or 0), 0, H/2, W, "center")
        setColor(DIM)
        love.graphics.printf("SPACE / ENTER TO "..(state=="start" and "START" or "RESTART"),
                             0, H/2+45, W, "center")
        return
    end

    -- Bricks
    for _, b in ipairs(bricks) do
        if b.alive then
            local alpha = b.hp > 1 and 1.0 or 0.6
            setColor(b.color, alpha)
            love.graphics.rectangle("fill", b.x+1, b.y+1, b.w-2, b.h-2)
            setColor({1,1,1}, 0.12)
            love.graphics.rectangle("line", b.x, b.y, b.w, b.h)
        end
    end

    -- Paddle
    setColor(PURPLE)
    love.graphics.rectangle("fill", paddle.x, paddle.y, paddle.w, paddle.h)
    setColor({1,1,1}, 0.15)
    love.graphics.rectangle("line", paddle.x, paddle.y, paddle.w, paddle.h)

    -- Ball
    setColor(LIME)
    love.graphics.circle("fill", ball.x, ball.y, ball.r)
    setColor({1,1,1}, 0.3)
    love.graphics.circle("line", ball.x, ball.y, ball.r)

    -- HUD
    setColor(LIME)
    love.graphics.print("SCORE  "..score,  8, 8)
    love.graphics.print("LEVEL  "..level,  8, 26)
    setColor(PINK)
    love.graphics.print("LIVES  "..lives,  W-90, 8)
    setColor(DIM)
    love.graphics.print("← → MOVE    ESC QUIT", W/2-80, H-18)
end

function love.keypressed(k)
    if k == "escape" then love.event.quit() end
    if state == "start" or state == "dead" then
        if k == "space" or k == "return" then startGame() end
    end
end
