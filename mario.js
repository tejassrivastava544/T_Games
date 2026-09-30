var canvas = document.getElementById("marioCanvas");
var ctx = canvas.getContext("2d");

// Keep pixel art sharp and crisp
ctx.imageSmoothingEnabled = false;

// Game Variables
var frames = 0;
var score = 0;
var best = 0;
var failCount = 0;
var currentPhase = 'start'; // 'start', 'playing', 'gameover', 'won'
var groundHeight = 60;
var TARGET_SCORE = 10;
var activeRedeemCode = "";

// Generate random Google Play-style 16-character redeem code (XXXX-XXXX-XXXX-XXXX)
function generateRedeemCode() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
    var code = "";
    for (var i = 0; i < 16; i++) {
        if (i > 0 && i % 4 === 0) code += "-";
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Asset Setup: Background, Mario Sprite, Pipe Sprite, and Fail Meme Image
var bgImg = new Image();
bgImg.src = "mario-bg.jpg";
var bgX = 0;

var marioImg = new Image();
marioImg.src = "mario.jpg";

var pipeImg = new Image();
pipeImg.src = "pipe.png";

var failImg = new Image();
failImg.src = "fail.jpg";

// Process pipe image to remove side borders and black background
var cleanPipeCanvas = document.createElement("canvas");
var cleanPipeCtx = cleanPipeCanvas.getContext("2d");
var pipeReady = false;

function processPipeImage() {
    if (!pipeImg.naturalWidth) return;
    try {
        var temp = document.createElement("canvas");
        temp.width = pipeImg.naturalWidth;
        temp.height = pipeImg.naturalHeight;
        var tctx = temp.getContext("2d");
        tctx.drawImage(pipeImg, 0, 0);

        var imgData = tctx.getImageData(0, 0, temp.width, temp.height);
        var d = imgData.data;

        var minX = temp.width, maxX = 0, minY = temp.height, maxY = 0;
        var found = false;

        for (var y = 0; y < temp.height; y++) {
            for (var x = 0; x < temp.width; x++) {
                var idx = (y * temp.width + x) * 4;
                var r = d[idx];
                var g = d[idx + 1];
                var b = d[idx + 2];

                // Turn black background pixels transparent
                if (r < 35 && g < 35 && b < 35) {
                    d[idx + 3] = 0;
                } else {
                    found = true;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        if (found && maxX > minX && maxY > minY) {
            tctx.putImageData(imgData, 0, 0);
            cleanPipeCanvas.width = maxX - minX + 1;
            cleanPipeCanvas.height = maxY - minY + 1;
            cleanPipeCtx.drawImage(
                temp,
                minX, minY, cleanPipeCanvas.width, cleanPipeCanvas.height,
                0, 0, cleanPipeCanvas.width, cleanPipeCanvas.height
            );
            pipeReady = true;
        }
    } catch (e) {}
}

pipeImg.onload = processPipeImage;
if (pipeImg.complete) processPipeImage();

// Audio Setup & Instant Playback Handlers
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

// Mario Player Object
var mario = {
    x: 50,
    y: 300,
    width: 48,
    height: 56,
    dy: 0,
    gravity: 0.65,
    jumpPower: -12.5,
    grounded: false,

    reset: function() {
        this.y = canvas.height - groundHeight - this.height;
        this.dy = 0;
        this.grounded = true;
    },

    draw: function() {
        if (marioImg.complete && marioImg.naturalWidth !== 0) {
            ctx.drawImage(marioImg, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = "#ff0000";
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
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

        // Ground Collision
        var floor = canvas.height - groundHeight - this.height;
        if (this.y >= floor) {
            this.y = floor;
            this.dy = 0;
            this.grounded = true;
        }
    }
};

// Pipes (Obstacles) Object
var pipes = {
    items: [],
    baseSpeed: 5,
    dx: 5,

    draw: function() {
        for (var i = 0; i < this.items.length; i++) {
            var p = this.items[i];
            if (pipeReady) {
                ctx.drawImage(cleanPipeCanvas, p.x, p.y, p.w, p.h);
            } else if (pipeImg.complete && pipeImg.naturalWidth !== 0) {
                var sx = pipeImg.naturalWidth * 0.34;
                var sy = pipeImg.naturalHeight * 0.05;
                var sw = pipeImg.naturalWidth * 0.32;
                var sh = pipeImg.naturalHeight * 0.95;
                ctx.drawImage(pipeImg, sx, sy, sw, sh, p.x, p.y, p.w, p.h);
            } else {
                ctx.fillStyle = "#00aa00";
                ctx.fillRect(p.x, p.y, p.w, p.h);
                ctx.fillRect(p.x - 2, p.y, p.w + 4, 10);
            }
        }
    },

    update: function() {
        // Spawn pipes every 95 frames
        if (frames % 95 === 0) {
            var height = 50 + Math.random() * 45;
            this.items.push({
                x: canvas.width,
                y: canvas.height - groundHeight - height,
                w: 52,
                h: height
            });
        }

        for (var i = 0; i < this.items.length; i++) {
            var p = this.items[i];
            p.x -= this.dx;

            // Remove pipe when off-screen
            if (p.x + p.w <= 0) {
                this.items.shift();
                score++;
                failCount = 0;
                best = Math.max(score, best);

                // Win Condition Check (10 Pipes)
                if (score >= TARGET_SCORE) {
                    stopAllJumpSounds();
                    activeRedeemCode = generateRedeemCode();
                    currentPhase = 'won';
                    return;
                }

                i--;
                continue;
            }

            // Accurate Collision Box
            var mLeft = mario.x + 8;
            var mRight = mario.x + mario.width - 8;
            var mBottom = mario.y + mario.height;
            var pLeft = p.x + 2;
            var pRight = p.x + p.w - 2;
            var pTop = p.y + 4;

            if (mRight > pLeft && mLeft < pRight && mBottom > pTop) {
                if (currentPhase !== 'gameover' && currentPhase !== 'won') {
                    playDieSound();
                    failCount++;
                    currentPhase = 'gameover';
                }
                return;
            }
        }
    },

    reset: function() {
        this.items = [];
        this.dx = this.baseSpeed;
    }
};

// Controls
function handleInput() {
    if (currentPhase === 'start') {
        currentPhase = 'playing';
        mario.jump();
    } else if (currentPhase === 'playing') {
        mario.jump();
    } else if (currentPhase === 'gameover' || currentPhase === 'won') {
        pipes.reset();
        mario.reset();
        score = 0;
        frames = 0;
        bgX = 0;
        currentPhase = 'start';
    }
}

window.addEventListener("keydown", function(e) {
    if (e.code === "Space") handleInput();
});
canvas.addEventListener("mousedown", handleInput);
canvas.addEventListener("touchstart", function(e) {
    e.preventDefault();
    handleInput();
}, { passive: false });

// Game Loop
function loop() {
    // 1. Draw Scrolling Background & Floor
    if (bgImg.complete && bgImg.naturalWidth !== 0) {
        ctx.drawImage(bgImg, bgX, 0, canvas.width, canvas.height);
        ctx.drawImage(bgImg, bgX + canvas.width, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = "#5c94fc";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#c84c0c";
        ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);
    }

    // 2. Draw Sprites
    pipes.draw();
    mario.draw();

    // 3. Update Positions if Running
    if (currentPhase === 'playing') {
        mario.update();
        pipes.update();

        bgX -= pipes.dx;
        if (bgX <= -canvas.width) {
            bgX = 0;
        }

        if (frames > 0 && frames % 500 === 0) {
            pipes.dx += 0.5;
        }
        frames++;
    }

    // 4. Attractive Top Banner
    if (currentPhase === 'start' || currentPhase === 'playing') {
        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.fillRect(0, 0, canvas.width, 36);

        ctx.fillStyle = "#ffeb3b";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🎁 Complete 10 pipes to get redeem code! (" + score + "/10)", canvas.width / 2, 23);
        ctx.textAlign = "left";
    }

    // 5. UI Overlays
    ctx.fillStyle = "white";
    ctx.font = "20px sans-serif";

    if (currentPhase === 'start') {
        ctx.fillText("Tap or Space to Jump", 200, 160);
    } else if (currentPhase === 'gameover') {
        var startY = 130;

        if (failCount >= 4) {
            if (failImg.complete && failImg.naturalWidth !== 0) {
                ctx.drawImage(failImg, canvas.width / 2 - 75, 40, 150, 110);
            }
            ctx.fillStyle = "#ffeb3b";
            ctx.font = "bold 16px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("kya hua beta nhi kr pa rha", canvas.width / 2, 165);
            ctx.textAlign = "left";
            startY = 185;
        }

        ctx.fillStyle = "white";
        ctx.font = "20px sans-serif";
        ctx.fillText("Game Over", 250, startY);
        ctx.fillText("Score: " + score, 260, startY + 35);
        ctx.fillText("Best: " + best, 265, startY + 70);
        ctx.fillText("Tap to Restart", 240, startY + 105);
    } else if (currentPhase === 'won') {
        // Overlay Card for Redeem Code
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80);

        ctx.strokeStyle = "#4CAF50";
        ctx.lineWidth = 4;
        ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

        ctx.textAlign = "center";

        ctx.fillStyle = "#4CAF50";
        ctx.font = "bold 24px sans-serif";
        ctx.fillText("🎉 LEVEL COMPLETED! 🎉", canvas.width / 2, 90);

        ctx.fillStyle = "#ffffff";
        ctx.font = "16px sans-serif";
        ctx.fillText("Here is your Google Play Redeem Code:", canvas.width / 2, 130);

        // Redeem Code Box
        ctx.fillStyle = "#222222";
        ctx.fillRect(canvas.width / 2 - 170, 150, 340, 50);
        ctx.strokeStyle = "#ffeb3b";
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width / 2 - 170, 150, 340, 50);

        ctx.fillStyle = "#00e676";
        ctx.font = "bold 22px monospace";
        ctx.fillText(activeRedeemCode, canvas.width / 2, 183);

        ctx.fillStyle = "#cccccc";
        ctx.font = "14px sans-serif";
        ctx.fillText("Take a screenshot or note it down!", canvas.width / 2, 230);

        ctx.fillStyle = "#ffffff";
        ctx.font = "18px sans-serif";
        ctx.fillText("Tap or Space to Play Again", canvas.width / 2, 280);

        ctx.textAlign = "left";
    } else {
        ctx.fillText("Score: " + score, 20, 60);
    }

    requestAnimationFrame(loop);
}

// Initial boot
mario.reset();
loop();
