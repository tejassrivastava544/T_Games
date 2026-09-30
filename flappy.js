var canvas = document.getElementById("flappyCanvas");
var ctx = canvas.getContext("2d");

// Game Variables
var frames = 0;
var score = 0;
var best = 0;
var currentPhase = 'start'; // 'start', 'playing', 'gameover'

// Load sound effect (reusing 'eat.mp3')
var scoreSound = new Audio('eat.mp3');

// Bird Object
var bird = {
    x: 50,
    y: 150,
    width: 20,
    height: 20,
    gravity: 0.25,
    jump: 4.6,
    velocity: 1,
    
    draw: function() {
        ctx.fillStyle = "#f1c40f"; // Yellow bird
        ctx.fillRect(this.x, this.y, this.width, this.height);
    },
    
    flap: function() {
        this.velocity = -this.jump;
    },
    
    update: function() {
        this.velocity += this.gravity;
        this.y += this.velocity;
        
        // Hit the ground
        if (this.y + this.height >= canvas.height) {
            this.y = canvas.height - this.height;
            currentPhase = 'gameover';
        }
        // Hit the ceiling
        if (this.y <= 0) {
            this.y = 0;
            this.velocity = 0;
        }
    }
};

// Pipes Object
var pipes = {
    position: [],
    width: 50,
    gap: 120,
    dx: 2, // Pipe speed
    
    draw: function() {
        ctx.fillStyle = "#2ecc71"; // Green pipes
        for (var i = 0; i < this.position.length; i++) {
            var p = this.position[i];
            var topY = p.y;
            var bottomY = p.y + this.gap;
            
            // Draw top pipe
            ctx.fillRect(p.x, 0, this.width, topY);
            // Draw bottom pipe
            ctx.fillRect(p.x, bottomY, this.width, canvas.height - bottomY);
        }
    },
    
    update: function() {
        // Add new pipes every 100 frames
        if (frames % 100 === 0) {
            this.position.push({
                x: canvas.width,
                y: Math.floor(Math.random() * (canvas.height - this.gap - 100)) + 50
            });
        }
        
        for (var i = 0; i < this.position.length; i++) {
            var p = this.position[i];
            
            // Move pipes left
            p.x -= this.dx;
            
            // Remove pipes that go off screen
            if (p.x + this.width <= 0) {
                this.position.shift();
                score++;
                best = Math.max(score, best);
                
                // Play sound and prevent browser autoplay errors
                var playPromise = scoreSound.play();
                if (playPromise !== undefined) {
                    playPromise.catch(function(error) {
                        console.log("Audio prevented by browser.", error);
                    });
                }
                
                i--;
                continue;
            }
            
            // Collision Detection
            if (bird.x + bird.width > p.x && bird.x < p.x + this.width) {
                if (bird.y < p.y || bird.y + bird.height > p.y + this.gap) {
                    currentPhase = 'gameover';
                }
            }
        }
    },
    
    reset: function() {
        this.position = [];
    }
};

// Controls (Tap, Click, or Spacebar)
window.addEventListener("keydown", function(e) {
    if (e.code === "Space") handleInput();
});
canvas.addEventListener("mousedown", handleInput);
canvas.addEventListener("touchstart", function(e) {
    e.preventDefault(); // Prevents zooming on mobile
    handleInput();
});

function handleInput() {
    switch (currentPhase) {
        case 'start':
            currentPhase = 'playing';
            break;
        case 'playing':
            bird.flap();
            break;
        case 'gameover':
            bird.y = 150;
            bird.velocity = 0;
            pipes.reset();
            score = 0;
            currentPhase = 'start';
            break;
    }
}

// Main Game Loop
function loop() {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    bird.draw();
    pipes.draw();
    
    if (currentPhase === 'playing') {
        bird.update();
        pipes.update();
    }
    
    // Draw Score
    ctx.fillStyle = "white";
    ctx.font = "24px sans-serif";
    if (currentPhase === 'start') {
        ctx.fillText("Tap to Start", 130, 250);
    } else if (currentPhase === 'gameover') {
        ctx.fillText("Game Over", 135, 230);
        ctx.fillText("Score: " + score, 155, 270);
        ctx.fillText("Best: " + best, 160, 310);
        ctx.fillText("Tap to Restart", 120, 360);
    } else {
        ctx.fillText(score, canvas.width / 2 - 10, 50);
    }
    
    frames++;
    requestAnimationFrame(loop);
}

// Start the game loop
loop();
