var canvas = document.getElementById("invaderCanvas");
var ctx = canvas.getContext("2d");

// Game State
var frames = 0;
var score = 0;
var best = 0;
var currentPhase = 'start'; // 'start', 'playing', 'gameover', 'victory'

// Audio Management with Instant Cutoff
var dieSound = new Audio('../getout.mp3');
dieSound.preload = 'auto';

var activeEatSounds = [];

function playEatSound() {
    var snd = new Audio('../eat.mp3');
    var p = snd.play();
    if (p !== undefined) {
        p.catch(function() {});
    }
    activeEatSounds.push(snd);
    snd.onended = function() {
        var idx = activeEatSounds.indexOf(snd);
        if (idx !== -1) {
            activeEatSounds.splice(idx, 1);
        }
    };
}

function stopAllEatSounds() {
    for (var i = 0; i < activeEatSounds.length; i++) {
        activeEatSounds[i].pause();
        activeEatSounds[i].currentTime = 0;
    }
    activeEatSounds = [];
}

function playDieSound() {
    stopAllEatSounds();
    dieSound.pause();
    dieSound.currentTime = 0;
    var p = dieSound.play();
    if (p !== undefined) {
        p.catch(function() {});
    }
}

// Player Ship
var player = {
    x: 220,
    y: 470,
    width: 36,
    height: 20,
    speed: 5,
    movingLeft: false,
    movingRight: false,
    shootCooldown: 0,

    reset: function() {
        this.x = canvas.width / 2 - this.width / 2;
        this.movingLeft = false;
        this.movingRight = false;
        this.shootCooldown = 0;
    },

    update: function() {
        if (this.movingLeft && this.x > 8) {
            this.x -= this.speed;
        }
        if (this.movingRight && this.x + this.width < canvas.width - 8) {
            this.x += this.speed;
        }
        if (this.shootCooldown > 0) {
            this.shootCooldown--;
        }
    },

    shoot: function() {
        if (this.shootCooldown === 0) {
            lasers.items.push({
                x: this.x + this.width / 2 - 2,
                y: this.y - 6,
                w: 4,
                h: 12,
                dy: -7
            });
            playEatSound();
            this.shootCooldown = 18; // Prevents bullet spam
        }
    },

    draw: function() {
        ctx.fillStyle = "#00ffcc";
        // Cannon base
        ctx.fillRect(this.x, this.y + 8, this.width, 12);
        // Middle turret
        ctx.fillRect(this.x + 8, this.y + 4, this.width - 16, 8);
        // Gun barrel
        ctx.fillRect(this.x + this.width / 2 - 2, this.y, 4, 6);
    }
};

// Player Lasers
var lasers = {
    items: [],
    update: function() {
        for (var i = 0; i < this.items.length; i++) {
            var l = this.items[i];
            l.y += l.dy;
            if (l.y + l.h < 0) {
                this.items.splice(i, 1);
                i--;
            }
        }
    },
    draw: function() {
        ctx.fillStyle = "#ffff00";
        for (var i = 0; i < this.items.length; i++) {
            var l = this.items[i];
            ctx.fillRect(l.x, l.y, l.w, l.h);
        }
    }
};

// Alien Invaders Fleet
var invaders = {
    rows: 4,
    cols: 8,
    items: [],
    dx: 1.2,
    dropDist: 14,
    bombs: [],

    init: function() {
        this.items = [];
        this.bombs = [];
        this.dx = 1.2;
        var startX = 35;
        var startY = 50;
        var spacingX = 48;
        var spacingY = 32;

        for (var r = 0; r < this.rows; r++) {
            for (var c = 0; c < this.cols; c++) {
                this.items.push({
                    x: startX + c * spacingX,
                    y: startY + r * spacingY,
                    w: 28,
                    h: 18,
                    alive: true,
                    row: r
                });
            }
        }
    },

    update: function() {
        var shiftDown = false;
        var aliveCount = 0;

        for (var i = 0; i < this.items.length; i++) {
            var inv = this.items[i];
            if (!inv.alive) continue;
            aliveCount++;

            inv.x += this.dx;

            // Check screen edges
            if (inv.x + inv.w >= canvas.width - 10 || inv.x <= 10) {
                shiftDown = true;
            }

            // Invaders reached player defense line
            if (inv.y + inv.h >= player.y) {
                playDieSound();
                currentPhase = 'gameover';
                return;
            }
        }

        // Fleet defeated
        if (aliveCount === 0) {
            currentPhase = 'victory';
            return;
        }

        if (shiftDown) {
            this.dx = -this.dx * 1.05; // Reverse and slightly speed up
            for (var j = 0; j < this.items.length; j++) {
                if (this.items[j].alive) {
                    this.items[j].y += this.dropDist;
                }
            }
        }

        // Random alien bomb drop
        if (frames % 45 === 0 && Math.random() < 0.7) {
            var living = this.items.filter(function(a) { return a.alive; });
            if (living.length > 0) {
                var shooter = living[Math.floor(Math.random() * living.length)];
                this.bombs.push({
                    x: shooter.x + shooter.w / 2 - 2,
                    y: shooter.y + shooter.h,
                    w: 4,
                    h: 10,
                    dy: 3.5
                });
            }
        }

        // Update Alien Bombs
        for (var b = 0; b < this.bombs.length; b++) {
            var bomb = this.bombs[b];
            bomb.y += bomb.dy;

            // Bomb hits player
            if (bomb.x < player.x + player.width &&
                bomb.x + bomb.w > player.x &&
                bomb.y < player.y + player.height &&
                bomb.y + bomb.h > player.y) {
                playDieSound();
                currentPhase = 'gameover';
                return;
            }

            // Off screen
            if (bomb.y > canvas.height) {
                this.bombs.splice(b, 1);
                b--;
            }
        }

        // Laser vs Invader Collision
        for (var k = 0; k < lasers.items.length; k++) {
            var l = lasers.items[k];
            for (var m = 0; m < this.items.length; m++) {
                var alien = this.items[m];
                if (alien.alive &&
                    l.x < alien.x + alien.w &&
                    l.x + l.w > alien.x &&
                    l.y < alien.y + alien.h &&
                    l.y + l.h > alien.y) {

                    alien.alive = false;
                    lasers.items.splice(k, 1);
                    k--;
                    score += 10;
                    best = Math.max(score, best);
                    playEatSound();
                    break;
                }
            }
        }
    },

    draw: function() {
        for (var i = 0; i < this.items.length; i++) {
            var inv = this.items[i];
            if (!inv.alive) continue;

            // Invader pixel shape
            ctx.fillStyle = inv.row === 0 ? "#ff4757" : (inv.row <= 2 ? "#ffa502" : "#2ed573");
            ctx.fillRect(inv.x + 4, inv.y, inv.w - 8, 4);
            ctx.fillRect(inv.x, inv.y + 4, inv.w, 8);
            ctx.fillRect(inv.x + 4, inv.y + 12, 4, 6);
            ctx.fillRect(inv.x + inv.w - 8, inv.y + 12, 4, 6);

            // Alien Eyes
            ctx.fillStyle = "#000000";
            ctx.fillRect(inv.x + 6, inv.y + 6, 3, 3);
            ctx.fillRect(inv.x + inv.w - 9, inv.y + 6, 3, 3);
        }

        // Draw bombs
        ctx.fillStyle = "#ff4757";
        for (var b = 0; b < this.bombs.length; b++) {
            var bomb = this.bombs[b];
            ctx.fillRect(bomb.x, bomb.y, bomb.w, bomb.h);
        }
    }
};

// Input Handling (Keyboard)
window.addEventListener("keydown", function(e) {
    if (e.code === "ArrowLeft" || e.code === "KeyA") {
        player.movingLeft = true;
    }
    if (e.code === "ArrowRight" || e.code === "KeyD") {
        player.movingRight = true;
    }
    if (e.code === "Space") {
        e.preventDefault();
        handleActionInput();
    }
});

window.addEventListener("keyup", function(e) {
    if (e.code === "ArrowLeft" || e.code === "KeyA") {
        player.movingLeft = false;
    }
    if (e.code === "ArrowRight" || e.code === "KeyD") {
        player.movingRight = false;
    }
});

function handleActionInput() {
    if (currentPhase === 'start') {
        currentPhase = 'playing';
    } else if (currentPhase === 'playing') {
        player.shoot();
    } else if (currentPhase === 'gameover' || currentPhase === 'victory') {
        invaders.init();
        lasers.items = [];
        player.reset();
        score = 0;
        frames = 0;
        currentPhase = 'start';
    }
}

// Input Handling (Mobile Buttons)
var btnLeft = document.getElementById("btnLeft");
var btnRight = document.getElementById("btnRight");
var btnFire = document.getElementById("btnFire");

btnLeft.addEventListener("touchstart", function(e) { e.preventDefault(); player.movingLeft = true; }, {passive: false});
btnLeft.addEventListener("touchend", function(e) { e.preventDefault(); player.movingLeft = false; }, {passive: false});
btnLeft.addEventListener("mousedown", function() { player.movingLeft = true; });
btnLeft.addEventListener("mouseup", function() { player.movingLeft = false; });

btnRight.addEventListener("touchstart", function(e) { e.preventDefault(); player.movingRight = true; }, {passive: false});
btnRight.addEventListener("touchend", function(e) { e.preventDefault(); player.movingRight = false; }, {passive: false});
btnRight.addEventListener("mousedown", function() { player.movingRight = true; });
btnRight.addEventListener("mouseup", function() { player.movingRight = false; });

btnFire.addEventListener("touchstart", function(e) { e.preventDefault(); handleActionInput(); }, {passive: false});
btnFire.addEventListener("mousedown", function() { handleActionInput(); });

canvas.addEventListener("touchstart", function(e) {
    e.preventDefault();
    if (currentPhase !== 'playing') handleActionInput();
}, {passive: false});
canvas.addEventListener("mousedown", function() {
    if (currentPhase !== 'playing') handleActionInput();
});

// Game Loop
function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Stars background
    ctx.fillStyle = "#ffffff";
    if (frames % 2 === 0) {
        ctx.fillRect(60, 40, 2, 2);
        ctx.fillRect(180, 120, 1, 1);
        ctx.fillRect(340, 90, 2, 2);
        ctx.fillRect(420, 260, 1, 1);
        ctx.fillRect(110, 360, 2, 2);
    }

    player.draw();
    lasers.draw();
    invaders.draw();

    if (currentPhase === 'playing') {
        player.update();
        lasers.update();
        invaders.update();
        frames++;
    }

    // Top Header UI
    ctx.fillStyle = "#00ffcc";
    ctx.font = "bold 15px monospace";
    ctx.textAlign = "left";
    ctx.fillText("SCORE: " + score, 15, 25);
    ctx.textAlign = "right";
    ctx.fillText("HI-SCORE: " + best, canvas.width - 15, 25);

    // Phase Overlays
    ctx.textAlign = "center";
    if (currentPhase === 'start') {
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#00ffcc";
        ctx.font = "bold 22px monospace";
        ctx.fillText("SPACE INVADERS", canvas.width / 2, 220);
        ctx.fillStyle = "#ffffff";
        ctx.font = "14px monospace";
        ctx.fillText("TAP FIRE OR PRESS SPACE TO START", canvas.width / 2, 260);
    } else if (currentPhase === 'gameover') {
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ff4757";
        ctx.font = "bold 26px monospace";
        ctx.fillText("GAME OVER", canvas.width / 2, 210);
        ctx.fillStyle = "#ffffff";
        ctx.font = "16px monospace";
        ctx.fillText("FINAL SCORE: " + score, canvas.width / 2, 250);
        ctx.fillText("TAP FIRE TO RESTART", canvas.width / 2, 290);
    } else if (currentPhase === 'victory') {
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#2ed573";
        ctx.font = "bold 26px monospace";
        ctx.fillText("FLEET DESTROYED!", canvas.width / 2, 210);
        ctx.fillStyle = "#ffffff";
        ctx.font = "16px monospace";
        ctx.fillText("SCORE: " + score, canvas.width / 2, 250);
        ctx.fillText("TAP FIRE TO PLAY AGAIN", canvas.width / 2, 290);
    }
    ctx.textAlign = "left";

    requestAnimationFrame(loop);
}

// Boot Game
invaders.init();
player.reset();
loop();
