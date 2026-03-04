// ===== GLOBAL STATE =====
let canvas, ctx;
const grid = 40;

let numLanes;
let roadStartY;
let frog;
let lives = 3;
let cars = [];

let currentLevel = 1;
let score = 0;
let highScore = Number(localStorage.getItem('froggerHighScore') || 0);

let sounds = {};

// ===== LEVEL CONFIGS =====
const levels = {
  1: { name: 'Easy',   baseSpeed: 1.5, numLanes: 4, carsPerLane: 1 },
  2: { name: 'Medium', baseSpeed: 2.5, numLanes: 6, carsPerLane: 2 },
  3: { name: 'Hard',   baseSpeed: 4.0, numLanes: 9, carsPerLane: 3 }
};

// ===== SOUND SETUP =====
function loadSounds() {
  try {
    sounds.jump    = new Howl({ src: ['jump.mp3'] });
    sounds.hit     = new Howl({ src: ['hit.mp3'] });
    sounds.win     = new Howl({ src: ['win.mp3'] });
    sounds.lose    = new Howl({ src: ['gameover.mp3'] });
    sounds.levelup = new Howl({ src: ['levelup.mp3'] });
  } catch (e) {
    console.warn('Sounds not loaded.');
  }
}

function playSound(name) {
  if (sounds[name] && typeof sounds[name].play === 'function') sounds[name].play();
}

// ===== SAFE ZONE =====
function getSafeZoneY() {
  return canvas.height - grid * 3;
}

// ===== SNAP TO GRID =====
function snapToGrid(val) {
  return Math.round(val / grid) * grid;
}

// ===== INITIALIZATION =====
function initCanvas() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  resizeCanvas();
  createFrog();
  cars = createCars(currentLevel);
  updateUI();
}

// Grid-perfect resize so frog always lands exactly center of lane
function resizeCanvas() {
  // Force canvas width and height to be exact multiples of grid (40px)
  canvas.width  = Math.floor(Math.min(window.innerWidth  * 0.95, 1400) / grid) * grid;
  canvas.height = Math.floor(Math.min(window.innerHeight * 0.7,   800) / grid) * grid;

  numLanes   = levels[currentLevel].numLanes;
  roadStartY = canvas.height - grid * (numLanes + 4);

  if (frog) resetFrog();
}

function createFrog() {
  frog = {
    x: snapToGrid(canvas.width  / 2 - grid / 2),
    y: snapToGrid(getSafeZoneY()),
    width:  grid,
    height: grid,
    color: 'green'
  };
}

function resetFrog() {
  frog.x = snapToGrid(canvas.width / 2 - grid / 2);
  frog.y = snapToGrid(getSafeZoneY());
}

// ===== CAR GENERATION =====
function createCars(levelNum) {
  const level = levels[levelNum];
  numLanes = level.numLanes;

  const newCars = [];
  for (let lane = 0; lane < level.numLanes; lane++) {
    const base      = level.baseSpeed + lane * 0.2;
    const direction = lane % 2 === 0 ? base : -base;

    for (let i = 0; i < level.carsPerLane; i++) {
      newCars.push({
        x:      Math.random() * canvas.width - 100,
        y:      roadStartY + lane * grid,
        width:  grid * 2,
        height: grid,
        speed:  direction,
        color:  ['#f44','#4f4','#ff4','#f4f','#44f','#4ff','#fa0','#0af','#f0a'][lane % 9]
      });
    }
  }
  return newCars;
}

// ===== INPUT =====
document.addEventListener('keydown', e => {
  if (!frog) return;

  let moved = false;

  if (e.key === 'ArrowUp')    { frog.y -= grid; moved = true; }
  if (e.key === 'ArrowDown')  { frog.y += grid; moved = true; }
  if (e.key === 'ArrowLeft')  { frog.x -= grid; moved = true; }
  if (e.key === 'ArrowRight') { frog.x += grid; moved = true; }

  if (moved) {
    // clamp first then snap so frog always lands on exact grid cell
    frog.x = Math.min(Math.max(0, frog.x), canvas.width  - frog.width);
    frog.y = Math.min(Math.max(0, frog.y), canvas.height - frog.height);
    frog.x = snapToGrid(frog.x);
    frog.y = snapToGrid(frog.y);

    playSound('jump');
  }
});

// ===== GAME LOOP =====
function update() {
  // move + randomize car wrap
  cars.forEach(car => {
    car.x += car.speed;
    if (car.speed > 0 && car.x > canvas.width)  car.x = -car.width - Math.random() * 200;
    if (car.speed < 0 && car.x + car.width < 0) car.x = canvas.width + Math.random() * 200;
  });

  // skip collisions while frog is in safe zone
  if (frog.y < getSafeZoneY()) {
    for (const car of cars) {
      const hit =
        frog.x              < car.x + car.width  &&
        frog.x + frog.width > car.x              &&
        frog.y              < car.y + car.height  &&
        frog.y + frog.height > car.y;

      if (hit) {
        lives--;
        playSound('hit');

        if (lives <= 0) {
          playSound('lose');
          alert('Game Over! You Lose!');
          if (score > highScore) {
            highScore = score;
            localStorage.setItem('froggerHighScore', highScore);
          }
          lives = 3;
          score = 0;
          currentLevel = 1;
          initCanvas();
        } else {
          resetFrog();
        }

        updateUI();
        break;
      }
    }
  }

  // win: reached top goal
  if (frog.y <= 0) {
    playSound('win');
    score += 100 * currentLevel;

    if (score > highScore) {
      highScore = score;
      localStorage.setItem('froggerHighScore', highScore);
    }

    if (currentLevel < 3) {
      currentLevel++;
      playSound('levelup');
      alert(`Level Complete! Now Level ${currentLevel} (${levels[currentLevel].name})`);
    } else {
      alert('You beat all levels! Starting over.');
      currentLevel = 1;
    }

    initCanvas();
    resetFrog();
    updateUI();
  }
}

// ===== DRAW =====
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // background
  ctx.fillStyle = '#333';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // safe zone grass
  ctx.fillStyle = '#2a5e1e';
  ctx.fillRect(0, getSafeZoneY() - grid, canvas.width, grid * 4);

  // goal area
  ctx.fillStyle = '#224488';
  ctx.fillRect(0, 0, canvas.width, grid);

  // road
  ctx.fillStyle = '#555';
  ctx.fillRect(0, roadStartY, canvas.width, grid * numLanes);

  // lane lines
  ctx.fillStyle = '#fff';
  for (let i = 1; i < numLanes; i++) {
    ctx.fillRect(0, roadStartY + grid * i, canvas.width, 4);
  }

  // cars
  for (const car of cars) {
    ctx.fillStyle = car.color;
    ctx.fillRect(car.x, car.y, car.width, car.height);
  }

  // frog
  ctx.fillStyle = frog.color;
  ctx.fillRect(frog.x, frog.y, frog.width, frog.height);
}

// ===== LOOP =====
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// ===== UI =====
function updateUI() {
  const scoreDiv = document.getElementById('score');
  const levelDiv = document.getElementById('level');
  if (scoreDiv) scoreDiv.textContent = `Score: ${score} | High Score: ${highScore} | Lives: ${lives}`;
  if (levelDiv) levelDiv.textContent = `Level ${currentLevel} (${levels[currentLevel].name})`;
}

window.setLevel = function(level) {
  if (!levels[level]) return;
  currentLevel = level;
  lives = 3;
  score = 0;
  initCanvas();
  resetFrog();
  updateUI();
};

window.resetGame = function() {
  lives = 3;
  score = 0;
  currentLevel = 1;
  initCanvas();
  resetFrog();
  updateUI();
};

// ===== BOOTSTRAP =====
window.addEventListener('load', () => {
  loadSounds();
  initCanvas();
  loop();
});

window.addEventListener('resize', () => {
  if (!canvas) return;
  resizeCanvas();
  cars = createCars(currentLevel);
});
