var canvas = document.getElementById("dinoCanvas");
var ctx = canvas.getContext("2d");

// Game Settings & State
var frames = 0;
var score = 0;
var best = 0;
var currentPhase = 'start'; // 'start', 'playing', 'gameover'
var groundY = 180;
var baseSpeed = 6;
var gameSpeed = 6;

// Audio Handlers (Relative paths pointing to root)
var dieSound = new Audio('../getout.mp3');
dieSound.preload = 'auto';

var activeJumpSounds = [];

function playJumpSound() {
    var snd = new Audio('../eat.mp3');
    var p = snd.play();
    if (p !== undefined) {
        p.catch(function() {});
    }
    activeJumpSounds.push(snd);
    snd.onended = function() {
        var idx = activeJumpSounds.indexOf(snd);
        if (idx !== -1) {
            activeJumpSounds.splice(idx, 1);
        }
    };
}

function stopAllJumpSounds() {
    for (var i = 0; i < activeJumpSounds.length; i++) {
        activeJumpSounds[i].pause();
        activeJumpSounds[i].currentTime = 0;
    }
    activeJumpSounds = [];
}

function playDieSound() {
    stopAllJumpSounds();
    dieSound.pause();
    dieSound.currentTime = 0;
    var p = dieSound.play();
    if (p !== undefined) {
        p.catch(function() {});
    }
}

// Dino Object
var dino = {
    x: 45,
    y: groundY - 44,
    width: 36,
    height: 44,
    dy: 0,
    gravity: 0.65,
    jumpPower: -11.5,
    grounded: true,
    legFrame: 0,

    reset: function() {
        this.y = groundY - this.height;
        this.dy = 0;
        this.grounded = true;
    },

    jump: function() {
        if (this.grounded) {
            this.dy = this.jumpPower;
            this.grounded = false;
            playJumpSound();
        }
    },

    update: function() {
        this.dy += this.gravity;
        this.y += this.dy;

        // Ground check
        if (this.y >= groundY - this.height) {
            this.y = groundY - this.height;
            this.dy = 0;
            this.grounded = true;
        }

        if (frames % 6 === 0) {
            this.legFrame = (this.legFrame + 1) % 2;
        }
    },

    draw: function() {
        ctx.fillStyle = "#535353";

        // Body
        ctx.fillRect(this.x + 8, this.y + 10, 20, 24);

        // Head & Snout
        ctx.fillRect(this.x + 16, this.y, 20, 16);
        ctx.fillRect(this.x + 28, this.y + 10, 8, 6);

        // Eye (Canvas background color cutout)
        ctx.fillStyle = "#f7f7f7";
        ctx.fillRect(this.x + 20, this.y + 3, 3, 3);
        ctx.fillStyle = "#535353";

        // Tail
        ctx.fillRect(this.x, this.y + 14, 8, 12);
        ctx.fillRect(this.x + 4, this.y + 26, 6, 6);

        // Arm
        ctx.fillRect(this.x + 26, this.y + 18, 5, 3);

        // Animated Running Legs
        if (!this.grounded) {
            // Jumping pose: both feet tucked
            ctx.fillRect(this.x + 12, this.y + 34, 4, 7);
            ctx.fillRect(this.x + 20, this.y + 34, 4, 7);
        } else if (this.legFrame === 0) {
            ctx.fillRect(this.x + 10, this.y + 34, 4, 10);
            ctx.fillRect(this.x + 10, this.y + 42, 6, 2);
            ctx.fillRect(this.x + 22, this.y + 34, 4, 6);
        } else {
            ctx.fillRect(this.x + 10, this.y + 34, 4, 6);
            ctx.fillRect(this.x + 22, this.y + 34, 4, 10);
            ctx.fillRect(this.x + 22, this.y + 42, 6, 2);
        }
    }
};

// Ground Line & Soil Details
var ground = {
    bumps: [],
    init: function() {
        this.bumps = [];
        for (var x = 0; x < canvas.width; x += 15) {
            if (Math.random() > 0.6) {
                this.bumps.push({ x: x, w: Math.random() * 8 + 3, h: 2 });
            }
        }
    },
    update: function() {
        for (var i = 0; i < this.bumps.length; i++) {
            this.bumps[i].x -= gameSpeed;
            if (this.bumps[i].x < -10) {
                this.bumps[i].x = canvas.width + Math.random() * 20;
            }
        }
    },
    draw: function() {
        ctx.fillStyle = "#535353";
        ctx.fillRect(0, groundY, canvas.width, 2); // Main horizon line

        // Small dirt specks
        for (var i = 0; i < this.bumps.length; i++) {
            var b = this.bumps[i];
            ctx.fillRect(b.x, groundY + 4, b.w, b.h);
        }
    }
};

// Cacti Obstacles
var obstacles = {
    items: [],
    spawnTimer: 0,

    reset: function() {
        this.items = [];
        this.spawnTimer = 60;
    },

    update: function() {
        this.spawnTimer--;
        if (this.spawnTimer <= 0) {
            var isDouble = Math.random() > 0.65;
            var cHeight = 35 + Math.floor(Math.random() * 12);
            var cWidth = isDouble ? 34 : 18;

            this.items.push({
                x: canvas.width,
                y: groundY - cHeight,
                w: cWidth,
                h: cHeight,
                isDouble: isDouble
            });

            // Randomize next spawn interval based on current speed
            this.spawnTimer = Math.floor(Math.random() * 45) + Math.floor(280 / gameSpeed);
        }

        for (var i = 0; i < this.items.length; i++) {
            var item = this.items[i];
            item.x -= gameSpeed;

            if (item.x + item.w < 0) {
                this.items.shift();
                i--;
                continue;
            }

            // Hitbox Detection (with slight padding for fair pixel collision)
            var padX = 4;
            var padY = 4;
            if (dino.x + dino.width - padX > item.x &&
                dino.x + padX < item.x + item.w &&
                dino.y + dino.height > item.y + padY) {

                if (currentPhase !== 'gameover') {
                    playDieSound();
                    currentPhase = 'gameover';
                }
                return;
            }
        }
    },

    draw: function() {
        ctx.fillStyle = "#535353";
        for (var i = 0; i < this.items.length; i++) {
            var obs = this.items[i];

            if (obs.isDouble) {
                // Two cacti grouped together
                this.drawCactus(obs.x, obs.y, 16, obs.h);
                this.drawCactus(obs.x + 18, obs.y + 4, 16, obs.h - 4);
            } else {
                this.drawCactus(obs.x, obs.y, obs.w, obs.h);
            }
        }
    },

    drawCactus: function(x, y, w, h) {
        // Main stem
        ctx.fillRect(x + 4, y, w - 8, h);
        // Left arm
        ctx.fillRect(x, y + 10, 4, 12);
        ctx.fillRect(x, y + 18, 6, 4);
        // Right arm
        ctx.fillRect(x + w - 4, y + 6, 4, 12);
        ctx.fillRect(x + w - 6, y + 14, 6, 4);
    }
};

// Input Handling
function handleInput() {
    if (currentPhase === 'start') {
        currentPhase = 'playing';
        dino.jump();
    } else if (currentPhase === 'playing') {
        dino.jump();
    } else if (currentPhase === 'gameover') {
        dino.reset();
        obstacles.reset();
        score = 0;
        frames = 0;
        gameSpeed = baseSpeed;
        currentPhase = 'start';
    }
}

window.addEventListener("keydown", function(e) {
    if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        handleInput();
    }
});
canvas.addEventListener("mousedown", handleInput);
canvas.addEventListener("touchstart", function(e) {
    e.preventDefault();
    handleInput();
}, { passive: false });

// Helper to format 5-digit classic score (e.g. 00042)
function padScore(val) {
    var str = "" + Math.floor(val);
    while (str.length < 5) str = "0" + str;
    return str;
}

// Game Loop
function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ground.draw();
    obstacles.draw();
    dino.draw();

    if (currentPhase === 'playing') {
        dino.update();
        obstacles.update();
        ground.update();

        // Increment score and gradually accelerate
        if (frames % 4 === 0) {
            score++;
            best = Math.max(score, best);
        }
        if (frames > 0 && frames % 600 === 0) {
            gameSpeed += 0.4;
        }
        frames++;
    }

    // Classic Top-Right Score Display
    ctx.fillStyle = "#535353";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "right";
    ctx.fillText("HI " + padScore(best) + "  " + padScore(score), canvas.width - 20, 30);

    // Overlays
    ctx.textAlign = "center";
    if (currentPhase === 'start') {
        ctx.font = "bold 16px monospace";
        ctx.fillText("PRESS SPACE OR TAP TO JUMP", canvas.width / 2, 90);
    } else if (currentPhase === 'gameover') {
        ctx.font = "bold 20px monospace";
        ctx.fillText("G A M E  O V E R", canvas.width / 2, 80);
        ctx.font = "14px monospace";
        ctx.fillText("TAP OR SPACE TO RESTART", canvas.width / 2, 110);
    }
    ctx.textAlign = "left";

    requestAnimationFrame(loop);
}

// Init Game
ground.init();
dino.reset();
obstacles.reset();
loop();
