const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const TILE_SIZE = 40;
const MAP_COLS = WIDTH / TILE_SIZE;
const MAP_ROWS = HEIGHT / TILE_SIZE;
const PLAYER_SIZE = { width: 34, height: 42 };
const GHOST_SIZE = { width: 34, height: 38 };
const BOSS_SIZE = { width: 56, height: 60 };
const PLAYER_HITBOX = { width: 18, height: 16, offsetY: 10 };
const GHOST_HITBOX = { width: 18, height: 16, offsetY: 8 };
const BOSS_HITBOX = { width: 28, height: 24, offsetY: 12 };
const KEY_SIZE = 22;
const PLAYER_SPEED = 260;
const FLOOR_TIME_LIMIT = 30;
const PLAYER_HIT_RADIUS = 18;
const WHITE_THRESHOLD = 245;
const FLASH_WARNING_DURATION = 0.5;
const CORNER_ASSIST_STEP = 6;
const BOSS_LASER_MIN_INTERVAL = 3;
const BOSS_LASER_MAX_INTERVAL = 5;
const BOSS_LASER_MAX_LENGTH = 520;
const BOSS_LASER_WIDTH = 18;
const BOSS_LASER_CORE_WIDTH = 8;
const BOSS_LASER_LIFETIME = 0.95;
const BOSS_LASER_COLLISION_RADIUS = 20;
const BOSS_LASER_STEP = 8;
const GHOST_DOUBLE_MIN_INTERVAL = 7;
const GHOST_DOUBLE_MAX_INTERVAL = 10;
const FINAL_FLOOR_BOSS_ARRIVAL_DELAY = 6;
const EXIT_SEQUENCE_DURATION = 1.2;
const BOSS_CHASE_SPEED = 202;
const BOSS_MOVE_MULTIPLIER = 1.04;
const PATHFINDING_DIRECTIONS = [
  { col: 1, row: 0 },
  { col: -1, row: 0 },
  { col: 0, row: 1 },
  { col: 0, row: -1 },
];

const INPUT = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
};

const ASSET_FILES = {
  playerFront: 'player_front.png',
  playerBack: 'player_back.png',
  playerLeft: 'player_left.png',
  playerRight: 'player_right.png',
  ghost: 'ghost.png',
  boss: 'boss.png',
  key: 'key.png',
  jumpscare: 'jumpscare.png',
};

const FLOOR_LIBRARY = [
  {
    floorNumber: 3,
    theme: 'Abandoned Nursery',
    timeLimit: 30,
    ghostSpeed: 92,
    matrix: [
      '####################',
      '#....bbb...........#',
      '#....bbb....ttt....#',
      '#..................#',
      '#..cccc......###...#',
      '#..................#',
      '#......###.........#',
      '#......###....bbb..#',
      '#..................#',
      '#...tt.............#',
      '#..........cccc....#',
      '#..................#',
      '#......bbb.........#',
      '#..................#',
      '####################',
    ],
    playerSpawn: { x: 2.2, y: 2.5 },
    door: { x: 18.1, y: 12.2, width: 0.9, height: 1.3 },
    ghostSpawns: [{ x: 16.2, y: 2.4 }],
    keySpawns: [
      { x: 5.4, y: 10.5 },
      { x: 15.5, y: 8.6 },
      { x: 11.3, y: 3.4 },
      { x: 7.2, y: 12.2 },
    ],
  },
  {
    floorNumber: 2,
    theme: 'Collapsed Kitchen',
    timeLimit: 25,
    ghostSpeed: 126,
    matrix: [
      '####################',
      '#....###...........#',
      '#....###...ttt.....#',
      '#..................#',
      '#..bbb.....####....#',
      '#..bbb.............#',
      '#..........cccc....#',
      '#....####..........#',
      '#....####....bbb...#',
      '#..................#',
      '#..tt.......###....#',
      '#...........###....#',
      '#.....cccc.........#',
      '#..................#',
      '####################',
    ],
    playerSpawn: { x: 17.2, y: 2.6 },
    door: { x: 1.1, y: 12.0, width: 0.9, height: 1.3 },
    ghostSpawns: [{ x: 3.1, y: 3.4 }],
    keySpawns: [
      { x: 14.4, y: 10.5 },
      { x: 6.3, y: 6.5 },
      { x: 10.2, y: 2.5 },
      { x: 3.4, y: 12.2 },
    ],
  },
  {
    floorNumber: 1,
    theme: 'Red-Eyed Labyrinth',
    timeLimit: 20,
    ghostSpeed: 156,
    matrix: [
      '####################',
      '#....###.....###...#',
      '#....###..tt.###...#',
      '#.............##...#',
      '#.bbb..####........#',
      '#.bbb..#..#....ccc.#',
      '#......#..#........#',
      '#..##..#..####.....#',
      '#..##..#.......bbb.#',
      '#......####....bbb.#',
      '#..tt..............#',
      '#.....ccc..####....#',
      '#..........#.......#',
      '#.....###..#.......#',
      '####################',
    ],
    playerSpawn: { x: 2.4, y: 12.3 },
    door: { x: 18.1, y: 1.2, width: 0.9, height: 1.3 },
    ghostSpawns: [{ x: 16.4, y: 12.1 }],
    bossSpawn: { x: 17.0, y: 3.2 },
    keySpawns: [
      { x: 4.5, y: 4.5 },
      { x: 8.3, y: 10.2 },
      { x: 14.2, y: 6.4 },
      { x: 3.5, y: 2.5 },
    ],
  },
];

const state = {
  assets: {},
  loading: true,
  loadError: '',
  activeFloorIndex: 0,
  floors: [],
  player: null,
  keysDown: new Set(),
  gameStatus: 'loading',
  timeRemaining: FLOOR_TIME_LIMIT,
  lastFrameTime: 0,
  flashTimer: 0,
  shakeTimer: 0,
  shakeMagnitude: 0,
  messageTimer: 0,
  transientMessage: '',
  gameOverReason: '',
  exitSequence: null,
  audioContext: null,
  jumpscareSoundPlayed: false,
};

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function choose(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getAudioContext() {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }

  if (!state.audioContext) {
    state.audioContext = new AudioContextClass();
  }

  if (state.audioContext.state === 'suspended') {
    state.audioContext.resume().catch(() => {});
  }

  return state.audioContext;
}

function playJumpscareScream() {
  const audioContext = getAudioContext();
  if (!audioContext) {
    return;
  }

  const startTime = audioContext.currentTime;
  const masterGain = audioContext.createGain();
  masterGain.gain.setValueAtTime(0.0001, startTime);
  masterGain.gain.exponentialRampToValueAtTime(0.85, startTime + 0.04);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.6);
  masterGain.connect(audioContext.destination);

  const screamOscillator = audioContext.createOscillator();
  screamOscillator.type = 'sawtooth';
  screamOscillator.frequency.setValueAtTime(720, startTime);
  screamOscillator.frequency.exponentialRampToValueAtTime(260, startTime + 0.42);
  screamOscillator.frequency.exponentialRampToValueAtTime(520, startTime + 1.1);

  const screamGain = audioContext.createGain();
  screamGain.gain.setValueAtTime(0.0001, startTime);
  screamGain.gain.exponentialRampToValueAtTime(0.42, startTime + 0.03);
  screamGain.gain.exponentialRampToValueAtTime(0.08, startTime + 1.6);

  const vibrato = audioContext.createOscillator();
  vibrato.type = 'sine';
  vibrato.frequency.setValueAtTime(18, startTime);
  const vibratoGain = audioContext.createGain();
  vibratoGain.gain.setValueAtTime(34, startTime);
  vibrato.connect(vibratoGain);
  vibratoGain.connect(screamOscillator.frequency);

  const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 1.6, audioContext.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i += 1) {
    noiseData[i] = (Math.random() * 2 - 1) * (1 - i / noiseData.length);
  }

  const noiseSource = audioContext.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  const noiseFilter = audioContext.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(980, startTime);
  noiseFilter.Q.setValueAtTime(1.4, startTime);
  const noiseGain = audioContext.createGain();
  noiseGain.gain.setValueAtTime(0.0001, startTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.16, startTime + 0.06);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.4);

  screamOscillator.connect(screamGain);
  screamGain.connect(masterGain);
  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterGain);

  screamOscillator.start(startTime);
  vibrato.start(startTime);
  noiseSource.start(startTime);

  screamOscillator.stop(startTime + 1.65);
  vibrato.stop(startTime + 1.65);
  noiseSource.stop(startTime + 1.45);
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function pointDistanceSquared(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function pointToSegmentDistanceSquared(px, py, ax, ay, bx, by) {
  const abX = bx - ax;
  const abY = by - ay;
  const abLengthSquared = abX * abX + abY * abY;

  if (abLengthSquared === 0) {
    return pointDistanceSquared(px, py, ax, ay);
  }

  const projection = ((px - ax) * abX + (py - ay) * abY) / abLengthSquared;
  const t = clamp(projection, 0, 1);
  const closestX = ax + abX * t;
  const closestY = ay + abY * t;
  return pointDistanceSquared(px, py, closestX, closestY);
}

function segmentIntersectsRect(ax, ay, bx, by, rect) {
  if (
    (ax >= rect.x && ax <= rect.x + rect.width && ay >= rect.y && ay <= rect.y + rect.height)
    || (bx >= rect.x && bx <= rect.x + rect.width && by >= rect.y && by <= rect.y + rect.height)
  ) {
    return true;
  }

  const edges = [
    [rect.x, rect.y, rect.x + rect.width, rect.y],
    [rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height],
    [rect.x + rect.width, rect.y + rect.height, rect.x, rect.y + rect.height],
    [rect.x, rect.y + rect.height, rect.x, rect.y],
  ];

  return edges.some(([edgeAx, edgeAy, edgeBx, edgeBy]) => segmentsIntersect(ax, ay, bx, by, edgeAx, edgeAy, edgeBx, edgeBy));
}

function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  const orientation = (px, py, qx, qy, rx, ry) => {
    const value = (qy - py) * (rx - qx) - (qx - px) * (ry - qy);
    if (Math.abs(value) < 0.00001) {
      return 0;
    }
    return value > 0 ? 1 : 2;
  };

  const onSegment = (px, py, qx, qy, rx, ry) => (
    qx <= Math.max(px, rx)
    && qx >= Math.min(px, rx)
    && qy <= Math.max(py, ry)
    && qy >= Math.min(py, ry)
  );

  const first = orientation(ax, ay, bx, by, cx, cy);
  const second = orientation(ax, ay, bx, by, dx, dy);
  const third = orientation(cx, cy, dx, dy, ax, ay);
  const fourth = orientation(cx, cy, dx, dy, bx, by);

  if (first !== second && third !== fourth) {
    return true;
  }

  if (first === 0 && onSegment(ax, ay, cx, cy, bx, by)) {
    return true;
  }
  if (second === 0 && onSegment(ax, ay, dx, dy, bx, by)) {
    return true;
  }
  if (third === 0 && onSegment(cx, cy, ax, ay, dx, dy)) {
    return true;
  }
  if (fourth === 0 && onSegment(cx, cy, bx, by, dx, dy)) {
    return true;
  }

  return false;
}

function entityRect(entity) {
  const hitboxWidth = entity.hitboxWidth ?? entity.width;
  const hitboxHeight = entity.hitboxHeight ?? entity.height;
  const hitboxOffsetY = entity.hitboxOffsetY ?? 0;

  return {
    x: entity.x - hitboxWidth / 2,
    y: entity.y - hitboxHeight / 2 + hitboxOffsetY,
    width: hitboxWidth,
    height: hitboxHeight,
  };
}

function hasCollisionAt(entity, floor) {
  const rect = entityRect(entity);
  return floor.collisions.some((obstacle) => rectsOverlap(rect, obstacle));
}

function tileRect(col, row) {
  return {
    x: col * TILE_SIZE,
    y: row * TILE_SIZE,
    width: TILE_SIZE,
    height: TILE_SIZE,
  };
}

function tileCenter(col, row) {
  return {
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: row * TILE_SIZE + TILE_SIZE / 2,
  };
}

function toTileCoordinate(x, y) {
  return {
    col: clamp(Math.floor(x / TILE_SIZE), 0, MAP_COLS - 1),
    row: clamp(Math.floor(y / TILE_SIZE), 0, MAP_ROWS - 1),
  };
}

function cloneTileGrid(grid) {
  return grid.map((row) => [...row]);
}

function shuffleArray(array) {
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }

  return array;
}

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

function isWalkableTile(floor, col, row) {
  return row >= 0
    && row < MAP_ROWS
    && col >= 0
    && col < MAP_COLS
    && floor.walkableTiles[row][col];
}

function buildDistanceField(floor, targetCol, targetRow) {
  const distances = Array.from({ length: MAP_ROWS }, () => Array(MAP_COLS).fill(Infinity));

  if (!isWalkableTile(floor, targetCol, targetRow)) {
    return distances;
  }

  const queue = [{ col: targetCol, row: targetRow }];
  distances[targetRow][targetCol] = 0;

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    const currentDistance = distances[current.row][current.col];

    PATHFINDING_DIRECTIONS.forEach((direction) => {
      const nextCol = current.col + direction.col;
      const nextRow = current.row + direction.row;

      if (!isWalkableTile(floor, nextCol, nextRow) || distances[nextRow][nextCol] !== Infinity) {
        return;
      }

      distances[nextRow][nextCol] = currentDistance + 1;
      queue.push({ col: nextCol, row: nextRow });
    });
  }

  return distances;
}

function collectReservedFurnitureTiles(definition) {
  const reserved = new Set();
  const reserve = (position) => {
    const tile = toTileCoordinate(position.x * TILE_SIZE, position.y * TILE_SIZE);
    reserved.add(`${tile.col},${tile.row}`);
  };

  reserve(definition.playerSpawn);
  reserve({
    x: definition.door.x + definition.door.width / 2,
    y: definition.door.y + definition.door.height / 2,
  });
  definition.ghostSpawns.forEach(reserve);
  definition.keySpawns.forEach(reserve);

  if (definition.bossSpawn) {
    reserve(definition.bossSpawn);
  }

  return reserved;
}

function chooseFurnitureSpan(type, remainingTiles) {
  const minSpan = type === 'chair' ? 1 : 2;
  const maxSpan = type === 'chair' ? 2 : 4;
  const upperBound = Math.min(maxSpan, remainingTiles);
  const lowerBound = Math.min(minSpan, upperBound);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const span = randomInt(lowerBound, upperBound);
    const leftover = remainingTiles - span;

    if (leftover === 0) {
      return span;
    }

    if (leftover >= minSpan) {
      return span;
    }
  }

  return remainingTiles;
}

function chooseRandomFurnitureType(remainingTiles) {
  const availableTypes = ['chair'];

  if (remainingTiles >= 2) {
    availableTypes.push('bed', 'table');
  }

  return choose(availableTypes);
}

function buildFurniturePieces(totalFurnitureTiles) {
  const pieces = [];
  let remainingTiles = totalFurnitureTiles;

  while (remainingTiles > 0) {
    const furnitureType = chooseRandomFurnitureType(remainingTiles);
    const span = chooseFurnitureSpan(furnitureType, remainingTiles);
    const preferHorizontal = furnitureType !== 'chair' || Math.random() < 0.65;
    pieces.push({
      furnitureType,
      widthTiles: preferHorizontal ? span : 1,
      heightTiles: preferHorizontal ? 1 : span,
      footprint: span,
    });
    remainingTiles -= span;
  }

  return pieces.sort((left, right) => right.footprint - left.footprint);
}

function canPlaceFurniturePiece(baseWalkableTiles, occupiedTiles, reservedTiles, col, row, widthTiles, heightTiles) {
  for (let rowOffset = 0; rowOffset < heightTiles; rowOffset += 1) {
    for (let colOffset = 0; colOffset < widthTiles; colOffset += 1) {
      const tileCol = col + colOffset;
      const tileRow = row + rowOffset;
      const tileKey = `${tileCol},${tileRow}`;

      if (
        tileRow < 0
        || tileRow >= MAP_ROWS
        || tileCol < 0
        || tileCol >= MAP_COLS
        || !baseWalkableTiles[tileRow][tileCol]
        || reservedTiles.has(tileKey)
        || occupiedTiles.has(tileKey)
      ) {
        return false;
      }
    }
  }

  return true;
}

function occupyFurnitureTiles(occupiedTiles, walkableTiles, col, row, widthTiles, heightTiles) {
  for (let rowOffset = 0; rowOffset < heightTiles; rowOffset += 1) {
    for (let colOffset = 0; colOffset < widthTiles; colOffset += 1) {
      const tileCol = col + colOffset;
      const tileRow = row + rowOffset;
      occupiedTiles.add(`${tileCol},${tileRow}`);
      walkableTiles[tileRow][tileCol] = false;
    }
  }
}

function buildFurnitureLayout(definition) {
  const baseWalkableTiles = definition.matrix.map((row) => [...row].map((char) => char !== '#'));
  const fallbackFurniture = [];
  let totalFurnitureTiles = 0;
  const reservedTiles = collectReservedFurnitureTiles(definition);

  definition.matrix.forEach((row, rowIndex) => {
    [...row].forEach((char, colIndex) => {
      if (char === 'b' || char === 't' || char === 'c') {
        const furnitureType = char === 'b' ? 'bed' : char === 't' ? 'table' : 'chair';
        totalFurnitureTiles += 1;
        fallbackFurniture.push({ col: colIndex, row: rowIndex, furnitureType });
      }
    });
  });

  const tryBuildLayout = () => {
    const walkableTiles = cloneTileGrid(baseWalkableTiles);
    const occupiedTiles = new Set();
    const furniture = [];
    const furniturePieces = buildFurniturePieces(totalFurnitureTiles);

    for (const piece of furniturePieces) {
      const variants = shuffleArray([
        { widthTiles: piece.widthTiles, heightTiles: piece.heightTiles },
        { widthTiles: piece.heightTiles, heightTiles: piece.widthTiles },
      ].filter((variant, index, variantsList) => (
        index === variantsList.findIndex(
          (candidate) => candidate.widthTiles === variant.widthTiles && candidate.heightTiles === variant.heightTiles,
        )
      )));

      let placed = false;

      for (const variant of variants) {
        const candidates = [];
        for (let row = 0; row <= MAP_ROWS - variant.heightTiles; row += 1) {
          for (let col = 0; col <= MAP_COLS - variant.widthTiles; col += 1) {
            if (canPlaceFurniturePiece(
              baseWalkableTiles,
              occupiedTiles,
              reservedTiles,
              col,
              row,
              variant.widthTiles,
              variant.heightTiles,
            )) {
              candidates.push({ col, row });
            }
          }
        }

        if (candidates.length === 0) {
          continue;
        }

        const spot = choose(candidates);
        occupyFurnitureTiles(
          occupiedTiles,
          walkableTiles,
          spot.col,
          spot.row,
          variant.widthTiles,
          variant.heightTiles,
        );
        furniture.push({
          col: spot.col,
          row: spot.row,
          widthTiles: variant.widthTiles,
          heightTiles: variant.heightTiles,
          furnitureType: piece.furnitureType,
        });
        placed = true;
        break;
      }

      if (!placed) {
        return null;
      }
    }

    const importantTiles = Array.from(reservedTiles, (key) => {
      const [col, row] = key.split(',').map(Number);
      return { col, row };
    }).filter((tile) => walkableTiles[tile.row]?.[tile.col]);

    if (importantTiles.length === 0) {
      return { walkableTiles, furniture };
    }

    const distances = buildDistanceField({ walkableTiles }, importantTiles[0].col, importantTiles[0].row);
    const allReachable = importantTiles.every((tile) => Number.isFinite(distances[tile.row]?.[tile.col]));

    return allReachable ? { walkableTiles, furniture } : null;
  };

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const layout = tryBuildLayout();
    if (layout) {
      return layout;
    }
  }

  const walkableTiles = cloneTileGrid(baseWalkableTiles);
  fallbackFurniture.forEach((item) => {
    walkableTiles[item.row][item.col] = false;
  });
  return { walkableTiles, furniture: fallbackFurniture };
}

function updatePathfindingTarget(floor) {
  const playerTile = toTileCoordinate(state.player.x, state.player.y);
  const currentTarget = floor.pathTargetTile;

  if (
    currentTarget
    && currentTarget.col === playerTile.col
    && currentTarget.row === playerTile.row
  ) {
    return;
  }

  floor.pathTargetTile = playerTile;
  floor.pathDistances = buildDistanceField(floor, playerTile.col, playerTile.row);
}

function getChaseTarget(ghost, floor) {
  const ghostTile = toTileCoordinate(ghost.x, ghost.y);
  const currentDistance = floor.pathDistances[ghostTile.row]?.[ghostTile.col] ?? Infinity;

  if (!Number.isFinite(currentDistance) || currentDistance <= 0) {
    return { x: state.player.x, y: state.player.y };
  }

  let bestTile = null;
  let bestDistance = currentDistance;

  PATHFINDING_DIRECTIONS.forEach((direction) => {
    const nextCol = ghostTile.col + direction.col;
    const nextRow = ghostTile.row + direction.row;

    if (!isWalkableTile(floor, nextCol, nextRow)) {
      return;
    }

    const nextDistance = floor.pathDistances[nextRow][nextCol];
    if (nextDistance < bestDistance) {
      bestDistance = nextDistance;
      bestTile = { col: nextCol, row: nextRow };
    }
  });

  if (!bestTile) {
    return { x: state.player.x, y: state.player.y };
  }

  return tileCenter(bestTile.col, bestTile.row);
}

function scheduleNextHazard(floor) {
  floor.nextHazardCountdown = randomBetween(5, 10);
  floor.hazardWarningTimer = 0;
  floor.hazardQueued = false;
}

function scheduleNextBossLaser(floor) {
  floor.bossLaserTimer = randomBetween(BOSS_LASER_MIN_INTERVAL, BOSS_LASER_MAX_INTERVAL);
}

function scheduleNextGhostDouble(floor) {
  floor.nextGhostDoubleCountdown = randomBetween(GHOST_DOUBLE_MIN_INTERVAL, GHOST_DOUBLE_MAX_INTERVAL);
}

function removeWhiteBackground(image) {
  const offscreen = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(image.width, image.height)
    : document.createElement('canvas');

  offscreen.width = image.width;
  offscreen.height = image.height;

  const offscreenCtx = offscreen.getContext('2d', { willReadFrequently: true });
  offscreenCtx.imageSmoothingEnabled = false;
  offscreenCtx.drawImage(image, 0, 0);

  const imageData = offscreenCtx.getImageData(0, 0, image.width, image.height);
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const red = data[i];
    const green = data[i + 1];
    const blue = data[i + 2];
    const alpha = data[i + 3];

    if (alpha !== 0 && red >= WHITE_THRESHOLD && green >= WHITE_THRESHOLD && blue >= WHITE_THRESHOLD) {
      data[i + 3] = 0;
    }
  }

  offscreenCtx.putImageData(imageData, 0, 0);
  return offscreen;
}

function removeJumpscareBackground(image) {
  const offscreen = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(image.width, image.height)
    : document.createElement('canvas');

  offscreen.width = image.width;
  offscreen.height = image.height;

  const offscreenCtx = offscreen.getContext('2d', { willReadFrequently: true });
  offscreenCtx.imageSmoothingEnabled = false;
  offscreenCtx.drawImage(image, 0, 0);

  const imageData = offscreenCtx.getImageData(0, 0, image.width, image.height);
  const { data } = imageData;
  const visited = new Uint8Array(image.width * image.height);
  const queue = [];

  const isBackgroundPixel = (index) => {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const alpha = data[index + 3];

    if (alpha === 0) {
      return true;
    }

    const maxChannel = Math.max(red, green, blue);
    const minChannel = Math.min(red, green, blue);
    const lowSaturation = maxChannel - minChannel < 22;
    const brightEnough = maxChannel > 185;
    return lowSaturation && brightEnough;
  };

  const enqueuePixel = (x, y) => {
    if (x < 0 || x >= image.width || y < 0 || y >= image.height) {
      return;
    }

    const pixelIndex = y * image.width + x;
    if (visited[pixelIndex]) {
      return;
    }
    visited[pixelIndex] = 1;

    const dataIndex = pixelIndex * 4;
    if (!isBackgroundPixel(dataIndex)) {
      return;
    }

    queue.push({ x, y });
  };

  enqueuePixel(0, 0);
  enqueuePixel(image.width - 1, 0);
  enqueuePixel(0, image.height - 1);
  enqueuePixel(image.width - 1, image.height - 1);

  while (queue.length > 0) {
    const { x, y } = queue.pop();
    const pixelIndex = y * image.width + x;
    const dataIndex = pixelIndex * 4;
    data[dataIndex + 3] = 0;

    enqueuePixel(x + 1, y);
    enqueuePixel(x - 1, y);
    enqueuePixel(x, y + 1);
    enqueuePixel(x, y - 1);
  }

  offscreenCtx.putImageData(imageData, 0, 0);
  return offscreen;
}

function loadImage(src, variant = 'default') {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      if (variant === 'remove-white') {
        resolve(removeWhiteBackground(image));
        return;
      }
      if (variant === 'jumpscare') {
        resolve(removeJumpscareBackground(image));
        return;
      }
      resolve(image);
    };
    image.onerror = () => reject(new Error(`Failed to load ${src}`));
    image.src = src;
  });
}

async function loadAssets() {
  const entries = Object.entries(ASSET_FILES);
  const results = await Promise.all(entries.map(([key, file]) => (
    loadImage(
      file,
      key === 'key' ? 'default' : key === 'jumpscare' ? 'jumpscare' : 'remove-white',
    )
  )));

  entries.forEach(([key], index) => {
    state.assets[key] = results[index];
  });
}

function buildFloor(definition) {
  const furnitureLayout = buildFurnitureLayout(definition);
  const floor = {
    floorNumber: definition.floorNumber,
    theme: definition.theme,
    timeLimit: definition.timeLimit ?? FLOOR_TIME_LIMIT,
    ghostSpeed: definition.ghostSpeed,
    tiles: definition.matrix.map((row) => [...row]),
    playerSpawn: {
      x: definition.playerSpawn.x * TILE_SIZE,
      y: definition.playerSpawn.y * TILE_SIZE,
    },
    door: {
      x: definition.door.x * TILE_SIZE,
      y: definition.door.y * TILE_SIZE,
      width: definition.door.width * TILE_SIZE,
      height: definition.door.height * TILE_SIZE,
      unlocked: false,
    },
    collisions: [],
    furniture: [],
    walkableTiles: furnitureLayout.walkableTiles,
    ghostSpawns: definition.ghostSpawns.map((spawn) => ({
      x: spawn.x * TILE_SIZE,
      y: spawn.y * TILE_SIZE,
    })),
    bossSpawn: definition.bossSpawn
      ? {
          x: definition.bossSpawn.x * TILE_SIZE,
          y: definition.bossSpawn.y * TILE_SIZE,
        }
      : null,
    keySpawns: definition.keySpawns.map((spawn) => ({
      x: spawn.x * TILE_SIZE,
      y: spawn.y * TILE_SIZE,
    })),
    ghosts: [],
    bloodTrails: [],
    lasers: [],
    key: null,
    nextHazardCountdown: 0,
    hazardWarningTimer: 0,
    hazardQueued: false,
    nextGhostDoubleCountdown: randomBetween(GHOST_DOUBLE_MIN_INTERVAL, GHOST_DOUBLE_MAX_INTERVAL),
    bossArrivalCountdown: FINAL_FLOOR_BOSS_ARRIVAL_DELAY,
    pathTargetTile: null,
    pathDistances: [],
    bossLaserTimer: randomBetween(BOSS_LASER_MIN_INTERVAL, BOSS_LASER_MAX_INTERVAL),
  };

  definition.matrix.forEach((row, rowIndex) => {
    [...row].forEach((char, colIndex) => {
      const rect = tileRect(colIndex, rowIndex);

      if (char === '#') {
        floor.collisions.push(rect);
      }
    });
  });

  furnitureLayout.furniture.forEach((item) => {
    const rect = {
      x: item.col * TILE_SIZE,
      y: item.row * TILE_SIZE,
      width: (item.widthTiles ?? 1) * TILE_SIZE,
      height: (item.heightTiles ?? 1) * TILE_SIZE,
    };
    floor.collisions.push(rect);
    floor.furniture.push({ ...rect, furnitureType: item.furnitureType });
  });

  scheduleNextHazard(floor);
  return floor;
}

function createGhost(x, y, speed, type = 'ghost', lifetime = 0) {
  const isBoss = type === 'boss';
  return {
    x,
    y,
    previousX: x,
    previousY: y,
    width: isBoss ? BOSS_SIZE.width : GHOST_SIZE.width,
    height: isBoss ? BOSS_SIZE.height : GHOST_SIZE.height,
    hitboxWidth: isBoss ? BOSS_HITBOX.width : GHOST_HITBOX.width,
    hitboxHeight: isBoss ? BOSS_HITBOX.height : GHOST_HITBOX.height,
    hitboxOffsetY: isBoss ? BOSS_HITBOX.offsetY : GHOST_HITBOX.offsetY,
    speed,
    type,
    lifetime,
    detourDirection: Math.random() < 0.5 ? -1 : 1,
  };
}

function getCurrentFloor() {
  return state.floors[state.activeFloorIndex];
}

function resetPlayer(position) {
  state.player = {
    x: position.x,
    y: position.y,
    width: PLAYER_SIZE.width,
    height: PLAYER_SIZE.height,
    hitboxWidth: PLAYER_HITBOX.width,
    hitboxHeight: PLAYER_HITBOX.height,
    hitboxOffsetY: PLAYER_HITBOX.offsetY,
    direction: 'front',
    hasKey: false,
    moving: false,
  };
}

function getExitProgress() {
  if (!state.exitSequence) {
    return 0;
  }

  return clamp(state.exitSequence.timer / state.exitSequence.duration, 0, 1);
}

function placeKey(floor) {
  const validSpawns = floor.keySpawns.filter((spawn) => {
    const probe = {
      x: spawn.x,
      y: spawn.y,
      width: KEY_SIZE,
      height: KEY_SIZE,
      hitboxWidth: KEY_SIZE,
      hitboxHeight: KEY_SIZE,
      hitboxOffsetY: 0,
    };

    return !hasCollisionAt(probe, floor);
  });

  const spawn = choose(validSpawns.length > 0 ? validSpawns : floor.keySpawns);
  floor.key = {
    x: spawn.x,
    y: spawn.y,
    width: KEY_SIZE,
    height: KEY_SIZE,
    collected: false,
  };
}

function spawnFloorGhosts(floor) {
  floor.ghosts = floor.ghostSpawns.map((spawn) => createGhost(spawn.x, spawn.y, floor.ghostSpeed));

  floor.lasers = [];
  scheduleNextBossLaser(floor);
}

function seedGhostSpawnBlood(floor) {
  floor.ghosts.forEach((ghost) => {
    const baseY = ghost.y + ghost.height * 0.26;
    const spillRadius = ghost.type === 'boss' ? 18 : 11;
    const splatters = [];

    for (let i = 0; i < (ghost.type === 'boss' ? 7 : 5); i += 1) {
      splatters.push({
        x: ghost.x + randomBetween(-spillRadius * 1.15, spillRadius * 1.15),
        y: baseY + randomBetween(-spillRadius * 0.35, spillRadius * 0.85),
        radius: randomBetween(1.4, ghost.type === 'boss' ? 5.2 : 3.6),
      });
    }

    floor.bloodTrails.push({
      startX: ghost.x - spillRadius * 0.7,
      startY: baseY,
      endX: ghost.x + spillRadius * 0.7,
      endY: baseY + randomBetween(1.5, 5),
      midX: ghost.x + randomBetween(-4, 4),
      midY: baseY + randomBetween(-2, 4),
      width: ghost.type === 'boss' ? 16 : 9,
      glowWidth: ghost.type === 'boss' ? 7 : 4,
      colorStart: ghost.type === 'boss' ? 'rgba(170, 0, 0, 0.94)' : 'rgba(152, 0, 14, 0.84)',
      colorMid: ghost.type === 'boss' ? 'rgba(120, 0, 0, 0.78)' : 'rgba(102, 0, 10, 0.62)',
      colorEnd: ghost.type === 'boss' ? 'rgba(88, 0, 0, 0.58)' : 'rgba(70, 0, 8, 0.42)',
      dropletColor: ghost.type === 'boss' ? 'rgba(148, 0, 0, 0.88)' : 'rgba(128, 0, 12, 0.8)',
      dropletCount: ghost.type === 'boss' ? 5 : 4,
      splatters,
    });
  });

  if (floor.bloodTrails.length > 900) {
    floor.bloodTrails.splice(0, floor.bloodTrails.length - 900);
  }
}

function startFloor(index) {
  state.activeFloorIndex = index;
  const floor = getCurrentFloor();
  placeKey(floor);
  spawnFloorGhosts(floor);
  floor.bloodTrails = [];
  seedGhostSpawnBlood(floor);
  floor.door.unlocked = false;
  floor.door.openAmount = 0;
  floor.bossArrived = false;
  floor.bossArrivalCountdown = FINAL_FLOOR_BOSS_ARRIVAL_DELAY;
  scheduleNextHazard(floor);
  scheduleNextGhostDouble(floor);
  resetPlayer(floor.playerSpawn);
  state.timeRemaining = floor.timeLimit;
  state.gameStatus = 'playing';
  state.flashTimer = 0;
  state.shakeTimer = 0;
  state.shakeMagnitude = 0;
  state.gameOverReason = '';
  state.exitSequence = null;
  state.jumpscareSoundPlayed = false;
  state.transientMessage = `Floor ${floor.floorNumber}: ${floor.theme}`;
  state.messageTimer = 2.6;
}

function initGame() {
  state.floors = FLOOR_LIBRARY.map(buildFloor);
  state.activeFloorIndex = 0;
  state.gameStatus = 'instructions';
  state.timeRemaining = state.floors[0].timeLimit;
  state.flashTimer = 0;
  state.shakeTimer = 0;
  state.shakeMagnitude = 0;
  state.gameOverReason = '';
  state.exitSequence = null;
  state.jumpscareSoundPlayed = false;
  state.transientMessage = '';
  state.messageTimer = 0;
  resetPlayer(state.floors[0].playerSpawn);
}

function currentPlayerSprite() {
  if (state.player.direction === 'back') {
    return state.assets.playerBack;
  }

  if (state.player.direction === 'left') {
    return state.assets.playerLeft;
  }

  if (state.player.direction === 'right') {
    return state.assets.playerRight;
  }

  return state.assets.playerFront;
}

function getInputVector() {
  let horizontal = 0;
  let vertical = 0;

  if (INPUT.left.some((key) => state.keysDown.has(key))) {
    horizontal -= 1;
  }
  if (INPUT.right.some((key) => state.keysDown.has(key))) {
    horizontal += 1;
  }
  if (INPUT.up.some((key) => state.keysDown.has(key))) {
    vertical -= 1;
  }
  if (INPUT.down.some((key) => state.keysDown.has(key))) {
    vertical += 1;
  }

  return { horizontal, vertical };
}

function setPlayerDirection(horizontal, vertical) {
  if (Math.abs(horizontal) > Math.abs(vertical)) {
    state.player.direction = horizontal < 0 ? 'left' : 'right';
    return;
  }

  if (vertical !== 0) {
    state.player.direction = vertical < 0 ? 'back' : 'front';
  }
}

function tryMoveEntity(entity, moveX, moveY, floor) {
  const startX = entity.x;
  const startY = entity.y;

  entity.x += moveX;
  if (hasCollisionAt(entity, floor)) {
    entity.x = startX;

    if (moveX !== 0 && moveY === 0) {
      for (const offsetY of [-CORNER_ASSIST_STEP, CORNER_ASSIST_STEP, -CORNER_ASSIST_STEP * 2, CORNER_ASSIST_STEP * 2]) {
        entity.y = startY + offsetY;
        entity.x = startX + moveX;
        if (!hasCollisionAt(entity, floor)) {
          break;
        }
        entity.x = startX;
        entity.y = startY;
      }
    }
  }

  entity.y += moveY;
  if (hasCollisionAt(entity, floor)) {
    entity.y = startY;

    if (moveY !== 0 && moveX === 0) {
      for (const offsetX of [-CORNER_ASSIST_STEP, CORNER_ASSIST_STEP, -CORNER_ASSIST_STEP * 2, CORNER_ASSIST_STEP * 2]) {
        entity.x = startX + offsetX;
        entity.y = startY + moveY;
        if (!hasCollisionAt(entity, floor)) {
          break;
        }
        entity.x = startX;
        entity.y = startY;
      }
    }
  }

  const hitboxWidth = entity.hitboxWidth ?? entity.width;
  const hitboxHeight = entity.hitboxHeight ?? entity.height;
  const hitboxOffsetY = entity.hitboxOffsetY ?? 0;

  entity.x = clamp(entity.x, hitboxWidth / 2, WIDTH - hitboxWidth / 2);
  entity.y = clamp(entity.y, hitboxHeight / 2 - hitboxOffsetY, HEIGHT - hitboxHeight / 2 - hitboxOffsetY);

  return Math.abs(entity.x - startX) > 0.01 || Math.abs(entity.y - startY) > 0.01;
}

function moveGhostTowardPlayer(ghost, floor, moveDistance) {
  const chaseTarget = getChaseTarget(ghost, floor);
  const deltaX = chaseTarget.x - ghost.x;
  const deltaY = chaseTarget.y - ghost.y;
  const distance = Math.hypot(deltaX, deltaY) || 1;

  const directMoveX = (deltaX / distance) * moveDistance;
  const directMoveY = (deltaY / distance) * moveDistance;
  if (tryMoveEntity(ghost, directMoveX, directMoveY, floor)) {
    return;
  }

  const prioritizeHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
  const axisMoves = prioritizeHorizontal
    ? [
        [Math.sign(deltaX) * moveDistance, 0],
        [0, Math.sign(deltaY) * moveDistance],
      ]
    : [
        [0, Math.sign(deltaY) * moveDistance],
        [Math.sign(deltaX) * moveDistance, 0],
      ];

  for (const [moveX, moveY] of axisMoves) {
    if ((moveX !== 0 || moveY !== 0) && tryMoveEntity(ghost, moveX, moveY, floor)) {
      return;
    }
  }

  const sidestepX = prioritizeHorizontal ? 0 : ghost.detourDirection * moveDistance;
  const sidestepY = prioritizeHorizontal ? ghost.detourDirection * moveDistance : 0;
  if (tryMoveEntity(ghost, sidestepX, sidestepY, floor)) {
    return;
  }

  ghost.detourDirection *= -1;
  const reverseSidestepX = prioritizeHorizontal ? 0 : ghost.detourDirection * moveDistance;
  const reverseSidestepY = prioritizeHorizontal ? ghost.detourDirection * moveDistance : 0;
  tryMoveEntity(ghost, reverseSidestepX, reverseSidestepY, floor);
}

function updatePlayer(deltaSeconds, floor) {
  const input = getInputVector();
  const hasMovement = input.horizontal !== 0 || input.vertical !== 0;
  state.player.moving = hasMovement;

  if (!hasMovement) {
    return;
  }

  const length = Math.hypot(input.horizontal, input.vertical) || 1;
  const velocityX = (input.horizontal / length) * PLAYER_SPEED * deltaSeconds;
  const velocityY = (input.vertical / length) * PLAYER_SPEED * deltaSeconds;

  setPlayerDirection(input.horizontal, input.vertical);
  tryMoveEntity(state.player, velocityX, velocityY, floor);
}

function findRandomSpawnPosition(floor, entitySize) {
  let spawnX = randomBetween(60, WIDTH - 60);
  let spawnY = randomBetween(70, HEIGHT - 60);

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const candidateX = randomBetween(60, WIDTH - 60);
    const candidateY = randomBetween(70, HEIGHT - 60);
    const probe = entityRect({
      x: candidateX,
      y: candidateY,
      width: entitySize.width,
      height: entitySize.height,
    });

    const blocked = floor.collisions.some((obstacle) => rectsOverlap(probe, obstacle));

    if (!blocked) {
      spawnX = candidateX;
      spawnY = candidateY;
      break;
    }
  }

  return { x: spawnX, y: spawnY };
}

function findRandomGhostSpawn(floor) {
  return findRandomSpawnPosition(floor, GHOST_SIZE);
}

function findRandomBossSpawn(floor) {
  return findRandomSpawnPosition(floor, BOSS_SIZE);
}

function spawnDoorTrapGhost(floor) {
  if (floor.floorNumber === 1) {
    return;
  }

  const spawn = findRandomGhostSpawn(floor);
  floor.ghosts.push(createGhost(spawn.x, spawn.y, floor.ghostSpeed + 18));
}

function updateKeyAndDoor(floor) {
  if (!floor.key || floor.key.collected) {
    return;
  }

  const pickupDistance = 28;
  if (pointDistanceSquared(state.player.x, state.player.y, floor.key.x, floor.key.y) > pickupDistance * pickupDistance) {
    return;
  }

  floor.key.collected = true;
  floor.door.unlocked = true;
  floor.hazardQueued = false;
  floor.hazardWarningTimer = 0;
  state.player.hasKey = true;
  state.transientMessage = 'KEY ACQUIRED';
  state.messageTimer = 2.5;
  spawnDoorTrapGhost(floor);
  triggerShake(0.35, 10);
}

function triggerShake(duration, magnitude) {
  state.shakeTimer = Math.max(state.shakeTimer, duration);
  state.shakeMagnitude = Math.max(state.shakeMagnitude, magnitude);
}

function resolveExit(floor) {
  const playerRect = entityRect(state.player);
  const expandedDoor = {
    x: floor.door.x - 6,
    y: floor.door.y - 6,
    width: floor.door.width + 12,
    height: floor.door.height + 12,
  };

  if (!rectsOverlap(playerRect, expandedDoor)) {
    return;
  }

  if (!floor.door.unlocked) {
    if (state.messageTimer <= 0 || state.transientMessage !== 'key not found') {
      state.transientMessage = 'key not found';
      state.messageTimer = 1.2;
    }
    return;
  }

  const doorCenterX = floor.door.x + floor.door.width / 2;
  const doorCenterY = floor.door.y + floor.door.height / 2 + 8;
  state.exitSequence = {
    timer: 0,
    duration: EXIT_SEQUENCE_DURATION,
    startX: state.player.x,
    startY: state.player.y,
    endX: doorCenterX,
    endY: doorCenterY,
    targetFloorIndex: state.activeFloorIndex + 1,
    finalFloor: floor.floorNumber === 1,
  };
  state.gameStatus = 'exiting';
  state.player.moving = true;
}

function updateExitSequence(deltaSeconds, floor) {
  if (!state.exitSequence) {
    return;
  }

  state.exitSequence.timer = Math.min(
    state.exitSequence.duration,
    state.exitSequence.timer + deltaSeconds,
  );

  const progress = getExitProgress();
  const easedProgress = 1 - ((1 - progress) * (1 - progress));
  state.player.x = state.exitSequence.startX
    + (state.exitSequence.endX - state.exitSequence.startX) * easedProgress;
  state.player.y = state.exitSequence.startY
    + (state.exitSequence.endY - state.exitSequence.startY) * easedProgress;

  const directionX = state.exitSequence.endX - state.exitSequence.startX;
  const directionY = state.exitSequence.endY - state.exitSequence.startY;
  setPlayerDirection(directionX, directionY);
  state.player.moving = progress < 1;
  floor.door.openAmount = progress;

  if (progress < 1) {
    return;
  }

  const completedExit = state.exitSequence;
  state.exitSequence = null;
  state.player.moving = false;

  if (completedExit.finalFloor) {
    state.gameStatus = 'victory';
    state.transientMessage = 'You escaped Doll House.';
    state.messageTimer = 4;
    return;
  }

  startFloor(completedExit.targetFloorIndex);
}

function duplicateGhosts(floor) {
  const nonBossGhosts = floor.ghosts.filter((ghost) => ghost.type === 'ghost');
  const additions = [];

  nonBossGhosts.forEach((ghost) => {
    if (floor.ghosts.length + additions.length >= 24) {
      return;
    }

    const spawn = findRandomGhostSpawn(floor);
    additions.push(createGhost(spawn.x, spawn.y, ghost.speed + 8));
  });

  floor.ghosts.push(...additions);
  return additions.length;
}

function amplifyGhostsForElapsedTime(floor) {
  const addedGhostCount = duplicateGhosts(floor);

  if (addedGhostCount > 0) {
    state.transientMessage = 'The doll ghosts have doubled.';
    state.messageTimer = 1.4;
    triggerShake(0.3, 8);
  }
}

function updateFloorGhostMultiplier(deltaSeconds, floor) {
  floor.nextGhostDoubleCountdown -= deltaSeconds;
  while (floor.nextGhostDoubleCountdown <= 0) {
    amplifyGhostsForElapsedTime(floor);
    scheduleNextGhostDouble(floor);
  }
}

function escalateHazardGhosts(floor) {
  duplicateGhosts(floor);
  floor.ghosts.forEach((ghost) => {
    ghost.speed += ghost.type === 'boss' ? 8 : 12;
  });
}

function jumpscareSpawn(floor) {
  const spawn = findRandomGhostSpawn(floor);
  const type = floor.floorNumber === 1 ? 'boss' : 'ghost';
  const speedBoost = floor.floorNumber === 1 ? 92 : 70;
  const lifetime = 0;
  floor.ghosts.push(createGhost(spawn.x, spawn.y, floor.ghostSpeed + speedBoost, type, lifetime));

  state.transientMessage = 'JUMPSCARE!';
  state.messageTimer = 1.2;
  triggerShake(0.55, 18);
}

function processHazard(floor) {
  escalateHazardGhosts(floor);

  if (Math.random() < 0.4) {
    jumpscareSpawn(floor);
  } else {
    state.transientMessage = 'The dolls are multiplying...';
    state.messageTimer = 1.4;
  }

  state.flashTimer = Math.max(state.flashTimer, 0.45);
  scheduleNextHazard(floor);
}

function getBoss(floor) {
  return floor.ghosts.find((ghost) => ghost.type === 'boss') ?? null;
}

function getBossMuzzle(boss) {
  return {
    x: boss.x,
    y: boss.y - 12,
  };
}

function castBossLaserLength(floor, originX, originY, directionX, directionY) {
  let distance = 0;

  while (distance < BOSS_LASER_MAX_LENGTH) {
    distance += BOSS_LASER_STEP;
    const sampleX = originX + directionX * distance;
    const sampleY = originY + directionY * distance;

    const probe = {
      x: sampleX,
      y: sampleY,
      width: BOSS_LASER_CORE_WIDTH,
      height: BOSS_LASER_CORE_WIDTH,
      hitboxWidth: BOSS_LASER_CORE_WIDTH,
      hitboxHeight: BOSS_LASER_CORE_WIDTH,
      hitboxOffsetY: 0,
    };

    if (
      sampleX < 0 ||
      sampleX > WIDTH ||
      sampleY < 0 ||
      sampleY > HEIGHT ||
      hasCollisionAt(probe, floor)
    ) {
      return Math.max(BOSS_LASER_STEP * 2, distance - BOSS_LASER_STEP * 0.5);
    }
  }

  return BOSS_LASER_MAX_LENGTH;
}

function spawnBossLasers(floor, boss) {
  const muzzle = getBossMuzzle(boss);
  const angle = randomBetween(0, Math.PI * 2);
  const directionX = Math.cos(angle);
  const directionY = Math.sin(angle);
  const length = castBossLaserLength(floor, muzzle.x, muzzle.y, directionX, directionY);

  floor.lasers = [{
    originX: muzzle.x,
    originY: muzzle.y,
    angle,
    directionX,
    directionY,
    length,
    width: BOSS_LASER_WIDTH,
    lifetime: BOSS_LASER_LIFETIME,
    maxLifetime: BOSS_LASER_LIFETIME,
    sourceType: 'boss',
  }];

  state.transientMessage = 'BOSS BEAM!';
  state.messageTimer = 0.9;
  state.flashTimer = Math.max(state.flashTimer, 0.35);
}

function spawnFinalFloorBoss(floor) {
  if (!floor.bossSpawn || floor.bossArrived) {
    return;
  }

  const spawn = findRandomBossSpawn(floor);
  floor.ghosts.push(createGhost(spawn.x, spawn.y, BOSS_CHASE_SPEED, 'boss'));
  floor.bossArrived = true;
  floor.lasers = [];
  scheduleNextBossLaser(floor);
  state.transientMessage = 'THE BOSS HAS ARRIVED!';
  state.messageTimer = 1.6;
  triggerShake(0.5, 14);
}

function updateBossFloor(deltaSeconds, floor) {
  floor.bossArrivalCountdown -= deltaSeconds;
  if (floor.bossArrivalCountdown <= 0) {
    spawnFinalFloorBoss(floor);
  }

  const boss = getBoss(floor);
  if (!boss) {
    return;
  }

  floor.bossLaserTimer -= deltaSeconds;
  if (floor.bossLaserTimer <= 0) {
    spawnBossLasers(floor, boss);
    scheduleNextBossLaser(floor);
  }
}

function updateLasers(deltaSeconds, floor) {
  if (!floor.lasers.length) {
    return;
  }

  const activeLasers = [];
  const playerRect = entityRect(state.player);

  for (const laser of floor.lasers) {
    laser.lifetime -= deltaSeconds;

    if (laser.lifetime <= 0) {
      continue;
    }

    const beamEndX = laser.originX + laser.directionX * laser.length;
    const beamEndY = laser.originY + laser.directionY * laser.length;

    if (
      segmentIntersectsRect(
        laser.originX,
        laser.originY,
        beamEndX,
        beamEndY,
        playerRect,
      )
      || pointToSegmentDistanceSquared(
        state.player.x,
        state.player.y,
        laser.originX,
        laser.originY,
        beamEndX,
        beamEndY,
      )
      < BOSS_LASER_COLLISION_RADIUS * BOSS_LASER_COLLISION_RADIUS
    ) {
      state.gameStatus = 'gameover';
      state.gameOverReason = 'boss-laser';
      state.transientMessage = 'Game Over - Got hit by the laser';
      state.messageTimer = 1.6;
      state.flashTimer = Math.max(state.flashTimer, 0.2);
      activeLasers.push(laser);
      break;
    }

    activeLasers.push(laser);
  }

  floor.lasers = activeLasers;
}

function updateHazards(deltaSeconds, floor) {
  if (floor.floorNumber === 1) {
    return;
  }

  if (floor.key && floor.key.collected) {
    floor.hazardQueued = false;
    floor.hazardWarningTimer = 0;
    return;
  }

  if (floor.hazardWarningTimer > 0) {
    floor.hazardWarningTimer -= deltaSeconds;
    if (floor.hazardWarningTimer <= 0 && floor.hazardQueued) {
      processHazard(floor);
    }
    return;
  }

  floor.nextHazardCountdown -= deltaSeconds;
  if (floor.nextHazardCountdown > 0) {
    return;
  }

  floor.hazardQueued = true;
  floor.hazardWarningTimer = FLASH_WARNING_DURATION;
  state.flashTimer = Math.max(state.flashTimer, FLASH_WARNING_DURATION);
}

function updateGhosts(deltaSeconds, floor) {
  const remainingGhosts = [];
  updatePathfindingTarget(floor);

  for (const ghost of floor.ghosts) {
    ghost.previousX = ghost.x;
    ghost.previousY = ghost.y;
    const moveDistance = ghost.speed * deltaSeconds;
    if (ghost.type === 'boss') {
      moveGhostTowardPlayer(ghost, floor, moveDistance * BOSS_MOVE_MULTIPLIER);
    } else {
      moveGhostTowardPlayer(ghost, floor, moveDistance);
    }
    recordGhostBloodTrail(ghost, floor);

    if (ghost.lifetime > 0) {
      ghost.lifetime -= deltaSeconds;
      if (ghost.lifetime <= 0) {
        continue;
      }
    }

    const collisionDistance = ghost.type === 'boss' ? PLAYER_HIT_RADIUS + 10 : PLAYER_HIT_RADIUS;
    if (pointDistanceSquared(ghost.x, ghost.y, state.player.x, state.player.y) < collisionDistance * collisionDistance) {
      state.gameStatus = 'gameover';
      state.gameOverReason = ghost.type === 'boss' ? 'boss-caught' : 'caught';
      state.transientMessage = ghost.type === 'boss' ? 'Game Over - Got caught by the Boss' : 'Caught by the dolls.';
      state.messageTimer = 1.6;
      remainingGhosts.push(ghost);
      break;
    }

    remainingGhosts.push(ghost);
  }

  floor.ghosts = remainingGhosts;
}

function recordGhostBloodTrail(ghost, floor) {
  const deltaX = ghost.x - ghost.previousX;
  const deltaY = ghost.y - ghost.previousY;
  const movement = Math.hypot(deltaX, deltaY);

  if (movement < 1.5) {
    return;
  }

  const directionX = deltaX / movement;
  const directionY = deltaY / movement;
  const normalX = -directionY;
  const normalY = directionX;
  const trailLength = Math.min(movement * 0.55, ghost.type === 'boss' ? 16 : 11);
  const splatterSpread = ghost.type === 'boss' ? 12 : 8;
  const baseX = ghost.x - directionX * trailLength * 0.5;
  const baseY = ghost.y + ghost.height * 0.2 - directionY * trailLength * 0.5;
  const startX = baseX - directionX * trailLength * 0.5 + normalX * randomBetween(-2.5, 2.5);
  const startY = baseY - directionY * trailLength * 0.5 + normalY * randomBetween(-2.5, 2.5);
  const endX = baseX + directionX * trailLength * 0.35 + normalX * randomBetween(-4, 4);
  const endY = baseY + directionY * trailLength * 0.35 + normalY * randomBetween(-4, 4);
  const splatters = [];

  for (let i = 0; i < (ghost.type === 'boss' ? 6 : 4); i += 1) {
    const along = randomBetween(-0.15, 1.1);
    const scatter = randomBetween(-splatterSpread, splatterSpread);
    splatters.push({
      x: startX + (endX - startX) * along + normalX * scatter,
      y: startY + (endY - startY) * along + normalY * scatter * randomBetween(0.65, 1.15),
      radius: randomBetween(1.3, ghost.type === 'boss' ? 4.6 : 3.2),
    });
  }

  floor.bloodTrails.push({
    startX,
    startY,
    endX,
    endY,
    midX: (startX + endX) / 2 + normalX * randomBetween(-6, 6),
    midY: (startY + endY) / 2 + normalY * randomBetween(-6, 6),
    width: ghost.type === 'boss' ? 13 : 7,
    glowWidth: ghost.type === 'boss' ? 6 : 3.5,
    colorStart: ghost.type === 'boss' ? 'rgba(168, 0, 0, 0.9)' : 'rgba(146, 0, 12, 0.78)',
    colorMid: ghost.type === 'boss' ? 'rgba(116, 0, 0, 0.68)' : 'rgba(102, 0, 10, 0.52)',
    colorEnd: 'rgba(38, 0, 0, 0)',
    dropletColor: ghost.type === 'boss' ? 'rgba(138, 0, 0, 0.84)' : 'rgba(122, 0, 12, 0.74)',
    dropletCount: ghost.type === 'boss' ? 4 : 3,
    splatters,
  });

  if (floor.bloodTrails.length > 900) {
    floor.bloodTrails.shift();
  }
}

function updateTimers(deltaSeconds) {
  if (state.gameStatus === 'playing') {
    state.timeRemaining = Math.max(0, state.timeRemaining - deltaSeconds);
    if (state.timeRemaining === 0) {
      state.gameStatus = 'gameover';
      state.gameOverReason = 'timeout';
    }
  }

  state.flashTimer = Math.max(0, state.flashTimer - deltaSeconds);
  state.shakeTimer = Math.max(0, state.shakeTimer - deltaSeconds);
  if (state.shakeTimer === 0) {
    state.shakeMagnitude = 0;
  }
  state.messageTimer = Math.max(0, state.messageTimer - deltaSeconds);
}

function update(deltaSeconds) {
  if (state.gameStatus === 'exiting') {
    updateExitSequence(deltaSeconds, getCurrentFloor());
    updateTimers(deltaSeconds);
    return;
  }

  if (state.gameStatus !== 'playing') {
    updateTimers(deltaSeconds);
    return;
  }

  const floor = getCurrentFloor();
  updateFloorGhostMultiplier(deltaSeconds, floor);
  updatePlayer(deltaSeconds, floor);
  updateKeyAndDoor(floor);
  if (floor.floorNumber === 1) {
    updateBossFloor(deltaSeconds, floor);
  }
  updateHazards(deltaSeconds, floor);
  updateGhosts(deltaSeconds, floor);
  updateLasers(deltaSeconds, floor);

  if (state.gameStatus !== 'playing') {
    updateTimers(deltaSeconds);
    return;
  }

  resolveExit(floor);
  updateTimers(deltaSeconds);
}

function drawCrack(x, y, length, angle, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);

  let currentX = x;
  let currentY = y;

  for (let step = 0; step < 4; step += 1) {
    currentX += Math.cos(angle + step * 0.35) * (length / 4);
    currentY += Math.sin(angle - step * 0.22) * (length / 4);
    ctx.lineTo(currentX, currentY);
  }

  ctx.stroke();
}

function drawCobweb(x, y, radius) {
  ctx.strokeStyle = 'rgba(210, 220, 230, 0.12)';
  ctx.lineWidth = 1;

  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.arc(x, y, radius - i * 4, Math.PI, Math.PI * 1.5);
    ctx.stroke();
  }

  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - Math.cos(i * 0.4) * radius, y - Math.sin(i * 0.4) * radius);
    ctx.stroke();
  }
}

function drawFloorProp(tile, x, y, row, col) {
  const hash = (row * 31 + col * 17 + tile.charCodeAt(0)) % 7;

  if (tile === 'd') {
    ctx.fillStyle = 'rgba(78, 58, 40, 0.34)';
    ctx.fillRect(x + 8, y + 26, 12, 4);
    ctx.fillRect(x + 22, y + 18, 8, 3);
    ctx.fillRect(x + 25, y + 29, 5, 3);
    return;
  }

  if (tile === 's') {
    ctx.fillStyle = 'rgba(108, 10, 24, 0.22)';
    ctx.beginPath();
    ctx.arc(x + 21, y + 20, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + 18, y + 20, 16, 3);
    return;
  }

  if (hash === 0) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
    ctx.fillRect(x + 5, y + 30, 24, 2);
  } else if (hash === 1) {
    ctx.fillStyle = 'rgba(92, 80, 54, 0.18)';
    ctx.fillRect(x + 10, y + 8, 3, 18);
    ctx.fillRect(x + 16, y + 12, 3, 14);
  } else if (hash === 2) {
    drawCrack(x + 10, y + 9, 18, 0.6, 'rgba(25, 22, 20, 0.3)');
  }
}

function drawBed(rect) {
  ctx.fillStyle = '#422e26';
  ctx.fillRect(rect.x + 1, rect.y + 2, rect.width - 2, rect.height - 4);
  ctx.fillStyle = '#5f4437';
  ctx.fillRect(rect.x + 3, rect.y + 4, rect.width - 6, rect.height - 8);
  ctx.fillStyle = '#7e6355';
  ctx.fillRect(rect.x + 5, rect.y + 6, rect.width - 10, rect.height - 12);

  ctx.fillStyle = '#d2c6bb';
  ctx.fillRect(rect.x + 7, rect.y + 7, rect.width - 14, 8);
  ctx.fillStyle = '#efe6dd';
  ctx.fillRect(rect.x + 9, rect.y + 8, rect.width - 24, 5);
  ctx.fillStyle = '#7f4f54';
  ctx.fillRect(rect.x + 7, rect.y + 16, rect.width - 14, 10);
  ctx.fillStyle = '#5b2f33';
  ctx.fillRect(rect.x + 7, rect.y + 25, rect.width - 14, 5);

  ctx.fillStyle = '#3a261f';
  ctx.fillRect(rect.x + 4, rect.y + 4, 4, rect.height - 8);
  ctx.fillRect(rect.x + rect.width - 8, rect.y + 4, 4, rect.height - 8);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.fillRect(rect.x + 8, rect.y + rect.height - 9, rect.width - 16, 4);

  ctx.strokeStyle = 'rgba(120, 78, 64, 0.65)';
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x + 5, rect.y + 6, rect.width - 10, rect.height - 12);
}

function drawRitualTable(rect) {
  ctx.fillStyle = '#3a281e';
  ctx.fillRect(rect.x + 5, rect.y + 7, rect.width - 10, rect.height - 14);
  ctx.fillStyle = '#6c4a33';
  ctx.fillRect(rect.x + 6, rect.y + 8, rect.width - 12, rect.height - 16);
  ctx.fillStyle = '#7f5a41';
  ctx.fillRect(rect.x + 8, rect.y + 10, rect.width - 16, 7);

  ctx.fillStyle = '#241713';
  ctx.fillRect(rect.x + 9, rect.y + 12, 4, rect.height - 17);
  ctx.fillRect(rect.x + rect.width - 13, rect.y + 12, 4, rect.height - 17);
  ctx.fillRect(rect.x + rect.width / 2 - 2, rect.y + 12, 4, rect.height - 17);

  ctx.fillStyle = '#b5af92';
  ctx.fillRect(rect.x + rect.width / 2 - 10, rect.y + 18, 20, 10);
  ctx.fillStyle = '#d7c85d';
  ctx.fillRect(rect.x + rect.width / 2 - 3, rect.y + 14, 6, 8);
  ctx.fillStyle = '#86202b';
  ctx.fillRect(rect.x + 14, rect.y + 11, rect.width - 28, 3);
  ctx.fillRect(rect.x + 14, rect.y + rect.height - 14, rect.width - 28, 3);
}

function drawBrokenChair(rect) {
  ctx.fillStyle = '#503b2e';
  ctx.fillRect(rect.x + 12, rect.y + 14, rect.width - 24, 8);
  ctx.fillStyle = '#6c5342';
  ctx.fillRect(rect.x + 12, rect.y + 10, rect.width - 24, 5);
  ctx.fillRect(rect.x + 12, rect.y + 8, 5, 12);
  ctx.fillRect(rect.x + rect.width - 17, rect.y + 8, 5, 12);

  ctx.fillStyle = '#2b1c14';
  ctx.fillRect(rect.x + 14, rect.y + 21, 3, rect.height - 11);
  ctx.fillRect(rect.x + rect.width - 17, rect.y + 21, 3, rect.height - 11);
  ctx.fillRect(rect.x + 13, rect.y + 9, rect.width - 26, 3);

  ctx.strokeStyle = 'rgba(24, 16, 12, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rect.x + rect.width - 14, rect.y + 10);
  ctx.lineTo(rect.x + rect.width - 7, rect.y + 5);
  ctx.moveTo(rect.x + 15, rect.y + rect.height - 6);
  ctx.lineTo(rect.x + 10, rect.y + rect.height - 1);
  ctx.stroke();
}

function drawWallSegment(rect) {
  ctx.fillStyle = '#1b2028';
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.fillStyle = '#2a313c';
  ctx.fillRect(rect.x + 3, rect.y + 3, rect.width - 6, rect.height - 6);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(rect.x + 3, rect.y + 3, rect.width - 6, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(rect.x + rect.width - 5, rect.y + 3, 2, rect.height - 6);
  ctx.fillRect(rect.x + 3, rect.y + rect.height - 5, rect.width - 6, 2);
  drawCrack(rect.x + 8, rect.y + 10, 15, 0.8, 'rgba(70, 76, 90, 0.42)');
  if (((rect.x / TILE_SIZE) + (rect.y / TILE_SIZE)) % 5 === 0) {
    ctx.fillStyle = 'rgba(90, 12, 20, 0.16)';
    ctx.fillRect(rect.x + 12, rect.y + rect.height - 8, 11, 3);
  }
}

function drawDiamondFloorTile(x, y, primary, secondary, grout) {
  ctx.fillStyle = grout;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  ctx.fillStyle = secondary;
  ctx.beginPath();
  ctx.moveTo(x + TILE_SIZE / 2, y + 2);
  ctx.lineTo(x + TILE_SIZE - 2, y + TILE_SIZE / 2);
  ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE - 2);
  ctx.lineTo(x + 2, y + TILE_SIZE / 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = primary;
  ctx.beginPath();
  ctx.moveTo(x + TILE_SIZE / 2, y + 7);
  ctx.lineTo(x + TILE_SIZE - 7, y + TILE_SIZE / 2);
  ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE - 7);
  ctx.lineTo(x + 7, y + TILE_SIZE / 2);
  ctx.closePath();
  ctx.fill();
}

function drawWallPanels(yStart, wallHeight, upperColor, lowerColor, trimColor) {
  ctx.fillStyle = upperColor;
  ctx.fillRect(0, yStart, WIDTH, wallHeight);

  ctx.fillStyle = lowerColor;
  ctx.fillRect(0, yStart + wallHeight - 84, WIDTH, 84);

  ctx.fillStyle = trimColor;
  ctx.fillRect(0, yStart + wallHeight - 86, WIDTH, 6);
  ctx.fillRect(0, yStart + 24, WIDTH, 4);

  for (let x = 0; x < WIDTH; x += 64) {
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(x + 12, yStart + wallHeight - 72, 3, 72);
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(x + 40, yStart + wallHeight - 70, 2, 66);
  }
}

function drawWindowProp(x, y, width, height, tint) {
  ctx.fillStyle = '#2d221b';
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = '#5a4030';
  ctx.fillRect(x + 4, y + 4, width - 8, height - 8);
  ctx.fillStyle = tint;
  ctx.fillRect(x + 8, y + 8, width - 16, height - 16);
  ctx.fillStyle = 'rgba(215, 227, 255, 0.16)';
  ctx.fillRect(x + 12, y + 10, 10, height - 24);
  ctx.fillRect(x + width / 2 - 2, y + 10, 4, height - 24);
  ctx.fillRect(x + width - 22, y + 10, 10, height - 24);
  ctx.fillRect(x + 10, y + height / 2 - 2, width - 20, 4);
}

function drawCurtains(x, y, width, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x - 4, y, 14, 34);
  ctx.fillRect(x + width - 10, y, 14, 34);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(x, y + 2, 6, 28);
  ctx.fillRect(x + width - 6, y + 2, 6, 28);
}

function drawFramePainting(x, y, width, height, innerColor) {
  ctx.fillStyle = '#513725';
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = '#7b573b';
  ctx.fillRect(x + 4, y + 4, width - 8, height - 8);
  ctx.fillStyle = innerColor;
  ctx.fillRect(x + 8, y + 8, width - 16, height - 16);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(x + 10, y + 10, width - 20, 5);
}

function drawHospitalBed(x, y) {
  ctx.fillStyle = '#5b616d';
  ctx.fillRect(x + 4, y + 10, 114, 8);
  ctx.fillRect(x + 8, y, 5, 63);
  ctx.fillRect(x + 109, y, 5, 63);
  ctx.fillStyle = '#cfd5df';
  ctx.fillRect(x + 14, y + 4, 88, 34);
  ctx.fillStyle = '#e6ebf0';
  ctx.fillRect(x + 16, y + 6, 28, 12);
  ctx.fillStyle = '#8ea7bc';
  ctx.fillRect(x + 46, y + 6, 54, 30);
  ctx.fillStyle = '#7b1b25';
  ctx.fillRect(x + 56, y + 12, 34, 10);
  ctx.fillStyle = '#511019';
  ctx.fillRect(x + 68, y + 21, 26, 9);
  ctx.fillStyle = '#8f949f';
  ctx.fillRect(x + 10, y + 53, 10, 10);
  ctx.fillRect(x + 102, y + 53, 10, 10);
  ctx.fillStyle = '#d9dde3';
  ctx.fillRect(x + 10, y + 50, 10, 3);
  ctx.fillRect(x + 102, y + 50, 10, 3);
}

function drawCabinet(x, y, width, height) {
  ctx.fillStyle = '#34261f';
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = '#563f33';
  ctx.fillRect(x + 4, y + 4, width - 8, height - 8);
  ctx.fillStyle = '#715443';
  ctx.fillRect(x + 8, y + 10, width - 16, height - 20);
  ctx.fillStyle = '#8d6d57';
  ctx.fillRect(x + 10, y + 12, width - 20, 6);
  ctx.fillRect(x + 10, y + 30, width - 20, 6);
  ctx.fillRect(x + 10, y + 48, width - 20, 6);
  ctx.fillStyle = '#2f2018';
  ctx.fillRect(x + width / 2 - 2, y + 10, 4, height - 20);
  ctx.fillStyle = '#d3bc73';
  ctx.fillRect(x + width / 2 - 7, y + 16, 3, 3);
  ctx.fillRect(x + width / 2 + 4, y + 16, 3, 3);
  ctx.fillRect(x + width / 2 - 7, y + 34, 3, 3);
  ctx.fillRect(x + width / 2 + 4, y + 34, 3, 3);
  ctx.fillRect(x + width / 2 - 7, y + 52, 3, 3);
  ctx.fillRect(x + width / 2 + 4, y + 52, 3, 3);
}

function drawShrineTable(x, y) {
  ctx.fillStyle = '#6a4a34';
  ctx.fillRect(x, y + 28, 128, 18);
  ctx.fillStyle = '#82593d';
  ctx.fillRect(x + 6, y + 24, 116, 10);
  ctx.fillStyle = '#2e1a15';
  ctx.fillRect(x + 12, y + 18, 104, 8);
  ctx.fillStyle = '#efe4b7';
  ctx.beginPath();
  ctx.arc(x + 36, y + 20, 12, 0, Math.PI * 2);
  ctx.arc(x + 64, y + 16, 10, 0, Math.PI * 2);
  ctx.arc(x + 92, y + 21, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#281516';
  ctx.fillRect(x + 30, y + 20, 14, 6);
  ctx.fillRect(x + 58, y + 16, 12, 6);
  ctx.fillRect(x + 86, y + 20, 12, 6);
  ctx.strokeStyle = 'rgba(137, 20, 32, 0.7)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + 18, y + 30);
  ctx.lineTo(x + 114, y + 34);
  ctx.stroke();
}

function drawRoomBackdrop(floor) {
  if (floor.floorNumber === 3) {
    drawWallPanels(0, 178, '#3a1e29', '#2b171f', '#6c4d57');
    drawWindowProp(208, 48, 92, 92, 'rgba(69, 84, 136, 0.7)');
    drawCurtains(208, 50, 92, '#5d2a36');
    drawWindowProp(418, 48, 92, 92, 'rgba(69, 84, 136, 0.7)');
    drawCurtains(418, 50, 92, '#5d2a36');
    drawFramePainting(60, 36, 118, 56, '#2f2228');
    drawFramePainting(610, 36, 106, 52, '#2b2026');
    drawShrineTable(322, 118);
  } else if (floor.floorNumber === 2) {
    drawWallPanels(0, 170, '#222849', '#1b2032', '#5b638c');
    drawHospitalBed(94, 70);
    drawCabinet(530, 70, 168, 68);
    drawFramePainting(32, 24, 76, 40, '#424656');
    ctx.fillStyle = '#7d1b2d';
    ctx.fillRect(126, 106, 28, 10);
    ctx.fillRect(146, 112, 18, 10);
  } else {
    drawWallPanels(0, 182, '#3a2d21', '#2b1f16', '#735641');
    drawWindowProp(246, 50, 100, 96, 'rgba(67, 84, 121, 0.62)');
    drawCurtains(246, 50, 100, '#6a3436');
    drawWindowProp(392, 50, 100, 96, 'rgba(67, 84, 121, 0.62)');
    drawCurtains(392, 50, 100, '#6a3436');
    drawFramePainting(78, 44, 72, 96, '#302821');
    drawFramePainting(624, 44, 70, 94, '#302821');
    ctx.fillStyle = '#5a4332';
    ctx.fillRect(332, 126, 74, 16);
    ctx.fillStyle = '#7c5d45';
    ctx.fillRect(342, 102, 54, 24);
  }
}

function drawBloodPool(x, y, radiusX, radiusY, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, Math.sin(x * 0.02 + y * 0.01) * 0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(28, 0, 0, 0.28)';
  ctx.beginPath();
  ctx.ellipse(x + radiusX * 0.16, y + radiusY * 0.12, radiusX * 0.45, radiusY * 0.3, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBloodSmear(points, width, color) {
  if (points.length < 2) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }

  ctx.stroke();
  ctx.restore();
}

function drawPersistentBloodTrails(floor) {
  floor.bloodTrails.forEach((trail, index) => {
    const gradient = ctx.createLinearGradient(trail.startX, trail.startY, trail.endX, trail.endY);
    gradient.addColorStop(0, trail.colorStart);
    gradient.addColorStop(0.45, trail.colorMid);
    gradient.addColorStop(1, trail.colorEnd);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = gradient;
    ctx.lineWidth = trail.width;
    ctx.beginPath();
    ctx.moveTo(trail.startX, trail.startY);
    ctx.quadraticCurveTo(trail.midX, trail.midY, trail.endX, trail.endY);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 72, 72, 0.08)';
    ctx.lineWidth = trail.glowWidth;
    ctx.beginPath();
    ctx.moveTo(trail.startX + 1, trail.startY);
    ctx.quadraticCurveTo(trail.midX, trail.midY, trail.endX - 2, trail.endY + 1);
    ctx.stroke();

    ctx.fillStyle = trail.dropletColor;
    for (let i = 0; i < trail.dropletCount; i += 1) {
      const progress = (i + 1) / (trail.dropletCount + 1);
      const dropletX = trail.startX + (trail.endX - trail.startX) * progress + Math.sin(index * 0.7 + i) * 3;
      const dropletY = trail.startY + (trail.endY - trail.startY) * progress + Math.cos(index * 0.5 + i) * 2;
      const radius = Math.max(1.4, trail.width * 0.16 - i * 0.35);
      ctx.beginPath();
      ctx.arc(dropletX, dropletY, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    trail.splatters.forEach((splatter, splatterIndex) => {
      ctx.globalAlpha = 0.7 - splatterIndex * 0.08;
      ctx.beginPath();
      ctx.arc(splatter.x, splatter.y, splatter.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  });
}

function drawFloorBackground(floor) {
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  const darkness = floor.floorNumber === 1 ? '#130306' : floor.floorNumber === 2 ? '#071015' : '#09070f';
  gradient.addColorStop(0, darkness);
  gradient.addColorStop(0.55, '#040508');
  gradient.addColorStop(1, '#010102');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawRoomBackdrop(floor);

  for (let row = 0; row < MAP_ROWS; row += 1) {
    for (let col = 0; col < MAP_COLS; col += 1) {
      const tile = floor.tiles[row][col];
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;

      if (tile !== '#') {
        if (floor.floorNumber === 3) {
          drawDiamondFloorTile(x, y, (row + col) % 2 === 0 ? '#6c3b49' : '#58313d', '#311923', '#1f0f14');
        } else if (floor.floorNumber === 2) {
          drawDiamondFloorTile(x, y, (row + col) % 2 === 0 ? '#5c617d' : '#444a66', '#262b43', '#141827');
        } else {
          drawDiamondFloorTile(x, y, (row + col) % 2 === 0 ? '#7a4d4b' : '#654040', '#33211f', '#201111');
        }
      }

      let baseColor = 'rgba(0,0,0,0)';

      if (tile === 'r') {
        baseColor = 'rgba(46, 29, 52, 0.42)';
      } else if (tile === 'p') {
        baseColor = 'rgba(34, 49, 38, 0.42)';
      } else if (tile === 's') {
        baseColor = 'rgba(32, 13, 18, 0.42)';
      } else if (tile === 'd') {
        baseColor = 'rgba(24, 18, 13, 0.42)';
      }

      if (baseColor !== 'rgba(0,0,0,0)') {
        ctx.fillStyle = baseColor;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      }

      if (tile !== '#') {
        ctx.fillStyle = 'rgba(255,255,255,0.012)';
        ctx.fillRect(x, y, TILE_SIZE, 1);
        ctx.fillRect(x, y, 1, TILE_SIZE);
        drawFloorProp(tile, x, y, row, col);
      }
    }
  }

  drawPersistentBloodTrails(floor);

  const moonlight = floor.floorNumber === 3
    ? { x: 110, y: 70, w: 150, h: 230, color: 'rgba(138, 166, 222, 0.07)' }
    : floor.floorNumber === 2
      ? { x: 520, y: 50, w: 150, h: 190, color: 'rgba(172, 153, 98, 0.05)' }
      : { x: 560, y: 20, w: 170, h: 210, color: 'rgba(152, 18, 38, 0.08)' };

  ctx.fillStyle = moonlight.color;
  ctx.fillRect(moonlight.x, moonlight.y, moonlight.w, moonlight.h);

  const fogTime = performance.now() * 0.00035;
  for (let i = 0; i < 4; i += 1) {
    const fogX = ((fogTime * (30 + i * 7) + i * 180) % (WIDTH + 220)) - 110;
    const fogY = 95 + i * 112 + Math.sin(fogTime * 4 + i) * 16;
    const fogRadius = 118 + i * 16;
    const fog = ctx.createRadialGradient(fogX, fogY, 10, fogX, fogY, fogRadius);
    fog.addColorStop(0, 'rgba(182, 190, 208, 0.05)');
    fog.addColorStop(1, 'rgba(182, 190, 208, 0)');
    ctx.fillStyle = fog;
    ctx.beginPath();
    ctx.arc(fogX, fogY, fogRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = `rgba(124, 14, 30, ${floor.floorNumber === 1 ? 0.24 : 0.1})`;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(105, 520);
  ctx.lineTo(210, 470);
  ctx.lineTo(310, 492);
  ctx.lineTo(438, 430);
  ctx.stroke();

  drawCobweb(64, 58, 24);
  drawCobweb(742, 42, 21);

  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fillRect(0, 152, WIDTH, 8);
}

function drawWallsAndFurniture(floor) {
  floor.collisions.forEach((rect) => {
    const furniture = floor.furniture.find((item) => item.x === rect.x && item.y === rect.y);

    if (!furniture) {
      drawWallSegment(rect);
      return;
    }

    if (furniture.furnitureType === 'bed') {
      drawBed(rect);
    } else if (furniture.furnitureType === 'table') {
      drawRitualTable(rect);
    } else {
      drawBrokenChair(rect);
    }

    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(rect.x + 4, rect.y + rect.height - 6, rect.width - 8, 3);
  });
}

function drawDoor(floor) {
  const { door } = floor;
  const openAmount = clamp(door.openAmount ?? 0, 0, 1);
  const panelGap = door.width * 0.46 * openAmount;
  const panelWidth = Math.max(6, (door.width - panelGap) / 2);
  ctx.fillStyle = door.unlocked ? '#244330' : '#43151d';
  ctx.fillRect(door.x, door.y, panelWidth, door.height);
  ctx.fillRect(door.x + door.width - panelWidth, door.y, panelWidth, door.height);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  ctx.fillRect(door.x + 4, door.y + 4, Math.max(2, panelWidth - 8), door.height - 8);
  ctx.fillRect(
    door.x + door.width - panelWidth + 4,
    door.y + 4,
    Math.max(2, panelWidth - 8),
    door.height - 8,
  );
  ctx.strokeStyle = door.unlocked ? '#8ed39c' : '#d86173';
  ctx.lineWidth = 2;
  ctx.strokeRect(door.x, door.y, door.width, door.height);
  ctx.strokeRect(door.x + 4, door.y + 4, Math.max(2, panelWidth - 8), door.height - 8);
  ctx.strokeRect(
    door.x + door.width - panelWidth + 4,
    door.y + 4,
    Math.max(2, panelWidth - 8),
    door.height - 8,
  );
  ctx.fillStyle = '#d7bb62';
  ctx.fillRect(door.x + panelWidth - 6, door.y + door.height / 2, 4, 4);
  ctx.fillRect(door.x + door.width - panelWidth + 2, door.y + door.height / 2, 4, 4);

  if (openAmount > 0) {
    const bloodAlpha = 0.28 + openAmount * 0.44;
    const gapCenterX = door.x + door.width / 2;
    const gapWidth = Math.max(8, panelGap * 0.9);
    const sourceTop = door.y + 6;
    const thresholdY = door.y + door.height - 4;
    const spillLength = 18 + openAmount * 22;

    const doorBloodGradient = ctx.createLinearGradient(gapCenterX, sourceTop, gapCenterX, thresholdY + spillLength);
    doorBloodGradient.addColorStop(0, `rgba(44, 0, 0, ${bloodAlpha * 0.95})`);
    doorBloodGradient.addColorStop(0.3, `rgba(118, 0, 0, ${bloodAlpha + 0.12})`);
    doorBloodGradient.addColorStop(0.75, `rgba(156, 10, 14, ${bloodAlpha + 0.16})`);
    doorBloodGradient.addColorStop(1, `rgba(82, 0, 0, ${bloodAlpha * 0.85})`);
    ctx.fillStyle = doorBloodGradient;
    ctx.fillRect(gapCenterX - gapWidth / 2, sourceTop, gapWidth, thresholdY - sourceTop);

    ctx.strokeStyle = `rgba(176, 10, 14, ${bloodAlpha + 0.18})`;
    ctx.lineWidth = Math.max(4, gapWidth * 0.26);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(gapCenterX - gapWidth * 0.18, sourceTop + 4);
    ctx.lineTo(gapCenterX - gapWidth * 0.1, thresholdY - 8);
    ctx.lineTo(gapCenterX - gapWidth * 0.16, thresholdY + spillLength * 0.72);
    ctx.moveTo(gapCenterX + gapWidth * 0.15, sourceTop + 2);
    ctx.lineTo(gapCenterX + gapWidth * 0.08, thresholdY - 4);
    ctx.lineTo(gapCenterX + gapWidth * 0.2, thresholdY + spillLength * 0.9);
    ctx.moveTo(gapCenterX, sourceTop + 8);
    ctx.lineTo(gapCenterX, thresholdY + spillLength);
    ctx.stroke();

    ctx.fillStyle = `rgba(168, 0, 10, ${bloodAlpha + 0.2})`;
    ctx.beginPath();
    ctx.ellipse(gapCenterX, thresholdY + spillLength, 8 + gapWidth * 0.42, 5 + openAmount * 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(gapCenterX - gapWidth * 0.34, thresholdY + spillLength * 0.76, 3.4 + openAmount * 2.1, 0, Math.PI * 2);
    ctx.arc(gapCenterX + gapWidth * 0.28, thresholdY + spillLength * 0.86, 2.8 + openAmount * 1.9, 0, Math.PI * 2);
    ctx.arc(gapCenterX + gapWidth * 0.06, thresholdY + spillLength * 0.54, 2.2 + openAmount * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  if (!door.unlocked) {
    ctx.strokeStyle = 'rgba(148, 18, 40, 0.72)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(door.x + 6, door.y + 8);
    ctx.lineTo(door.x + door.width - 6, door.y + door.height - 8);
    ctx.moveTo(door.x + door.width - 6, door.y + 8);
    ctx.lineTo(door.x + 6, door.y + door.height - 8);
    ctx.stroke();
  }
}

function drawKey(floor) {
  if (!floor.key || floor.key.collected) {
    return;
  }

  const time = performance.now() * 0.006;
  const bob = Math.sin(time) * 4;
  const glowPulse = 0.72 + (Math.sin(time * 1.4) * 0.5 + 0.5) * 0.28;
  const drawX = floor.key.x;
  const drawY = floor.key.y + bob;

  ctx.save();

  const halo = ctx.createRadialGradient(drawX, drawY, 3, drawX, drawY, 22);
  halo.addColorStop(0, `rgba(255, 244, 150, ${0.32 + glowPulse * 0.2})`);
  halo.addColorStop(0.42, `rgba(255, 208, 68, ${0.22 + glowPulse * 0.16})`);
  halo.addColorStop(1, 'rgba(255, 208, 68, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(drawX, drawY, 22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(drawX, drawY + 12, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(255, 248, 188, ${0.58 + glowPulse * 0.24})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(drawX, drawY, 16, 0, Math.PI * 2);
  ctx.stroke();

  ctx.drawImage(
    state.assets.key,
    drawX - KEY_SIZE / 2,
    drawY - KEY_SIZE / 2,
    KEY_SIZE,
    KEY_SIZE,
  );

  ctx.fillStyle = `rgba(255, 255, 230, ${0.8 + glowPulse * 0.18})`;
  ctx.beginPath();
  ctx.arc(drawX - 4, drawY - 5, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(255, 255, 255, ${0.38 + glowPulse * 0.16})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(drawX, drawY - 20);
  ctx.lineTo(drawX, drawY - 14);
  ctx.moveTo(drawX - 3, drawY - 17);
  ctx.lineTo(drawX + 3, drawY - 17);
  ctx.stroke();

  ctx.restore();
}

function drawGhost(ghost) {
  const asset = ghost.type === 'boss' ? state.assets.boss : state.assets.ghost;
  ctx.drawImage(
    asset,
    ghost.x - ghost.width / 2,
    ghost.y - ghost.height / 2,
    ghost.width,
    ghost.height,
  );
}

function drawLasers(floor) {
  if (!floor.lasers.length) {
    return;
  }

  for (const laser of floor.lasers) {
    const pulse = 0.88 + Math.sin(performance.now() * 0.02) * 0.12;
    const beamEndX = laser.originX + laser.directionX * laser.length;
    const beamEndY = laser.originY + laser.directionY * laser.length;
    const glowWidth = laser.width * (2.2 + pulse * 0.3);
    const beamGradient = ctx.createLinearGradient(laser.originX, laser.originY, beamEndX, beamEndY);
    beamGradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    beamGradient.addColorStop(0.08, 'rgba(255, 92, 92, 1)');
    beamGradient.addColorStop(0.45, 'rgba(255, 44, 44, 0.98)');
    beamGradient.addColorStop(1, 'rgba(255, 118, 118, 0.88)');

    ctx.strokeStyle = 'rgba(255, 0, 0, 0.18)';
    ctx.lineWidth = glowWidth;
    ctx.beginPath();
    ctx.moveTo(laser.originX, laser.originY);
    ctx.lineTo(beamEndX, beamEndY);
    ctx.stroke();

    ctx.strokeStyle = beamGradient;
    ctx.lineWidth = laser.width * pulse;
    ctx.beginPath();
    ctx.moveTo(laser.originX, laser.originY);
    ctx.lineTo(beamEndX, beamEndY);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 240, 240, 0.96)';
    ctx.lineWidth = BOSS_LASER_CORE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(laser.originX, laser.originY);
    ctx.lineTo(beamEndX, beamEndY);
    ctx.stroke();

    const muzzleGlow = ctx.createRadialGradient(laser.originX, laser.originY, 6, laser.originX, laser.originY, 36);
    muzzleGlow.addColorStop(0, 'rgba(255, 248, 248, 0.98)');
    muzzleGlow.addColorStop(0.25, 'rgba(255, 86, 86, 0.96)');
    muzzleGlow.addColorStop(0.65, 'rgba(255, 20, 20, 0.58)');
    muzzleGlow.addColorStop(1, 'rgba(255, 0, 0, 0)');
    ctx.fillStyle = muzzleGlow;
    ctx.beginPath();
    ctx.arc(laser.originX, laser.originY, 36, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.arc(beamEndX, beamEndY, laser.width * 0.75, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 84, 84, 0.98)';
    ctx.beginPath();
    ctx.arc(laser.originX, laser.originY, laser.width * 0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff4f4';
    ctx.beginPath();
    ctx.arc(laser.originX, laser.originY, BOSS_LASER_CORE_WIDTH * 0.95, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer() {
  const sprite = currentPlayerSprite();
  const exitProgress = getExitProgress();
  const jumpOffset = state.exitSequence
    ? Math.sin(exitProgress * Math.PI) * 18
    : state.player.moving
      ? Math.abs(Math.sin(Date.now() * 0.015)) * 12
      : 0;
  const playerAlpha = state.exitSequence ? 1 - exitProgress * 0.55 : 1;
  const carriedKeyOffset = {
    front: { x: 16, y: 6 },
    back: { x: 14, y: 2 },
    left: { x: -16, y: 6 },
    right: { x: 16, y: 6 },
  };

  ctx.save();
  ctx.globalAlpha = playerAlpha;
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(state.player.x, state.player.y + state.player.height / 2 + 8, 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.drawImage(
    sprite,
    state.player.x - state.player.width / 2,
    state.player.y - state.player.height / 2 - jumpOffset,
    state.player.width,
    state.player.height,
  );

  if (state.player.hasKey) {
    const keyOffset = carriedKeyOffset[state.player.direction] ?? carriedKeyOffset.front;
    const bob = state.player.moving ? Math.sin(Date.now() * 0.02) * 2 : 0;
    ctx.drawImage(
      state.assets.key,
      state.player.x + keyOffset.x - KEY_SIZE / 2,
      state.player.y - state.player.height / 2 + keyOffset.y - jumpOffset + bob,
      KEY_SIZE,
      KEY_SIZE,
    );
  }
  ctx.restore();
}

function drawHud(floor) {
  const topPanelY = 8;
  const sidePanelHeight = 44;
  const floorBadgeWidth = 148;
  const floorBadgeHeight = 28;
  const floorBadgeX = (WIDTH - floorBadgeWidth) / 2;

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(2, 5, 8, 0.68)';
  ctx.fillRect(10, topPanelY, 150, sidePanelHeight);
  ctx.strokeStyle = 'rgba(233, 242, 255, 0.14)';
  ctx.strokeRect(10, topPanelY, 150, sidePanelHeight);

  ctx.fillStyle = '#ffcad1';
  ctx.font = 'bold 18px Trebuchet MS';
  ctx.fillText(`TIME ${state.timeRemaining.toFixed(1)}s`, 20, 28);
  ctx.fillStyle = '#c8d3e8';
  ctx.font = '15px Trebuchet MS';
  ctx.fillText(`SPIRITS ${floor.ghosts.length}`, 20, 46);

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(2, 5, 8, 0.68)';
  ctx.fillRect(WIDTH - 190, topPanelY, 180, sidePanelHeight);
  ctx.strokeStyle = 'rgba(233, 242, 255, 0.14)';
  ctx.strokeRect(WIDTH - 190, topPanelY, 180, sidePanelHeight);

  ctx.font = '15px Trebuchet MS';
  ctx.fillStyle = state.player.hasKey ? '#f4d77d' : '#9cb0cc';
  ctx.fillText(state.player.hasKey ? 'KEY ACQUIRED' : 'FIND THE KEY', WIDTH - 20, 28);

  if (floor.floorNumber === 1) {
    ctx.fillStyle = '#ff8899';
    ctx.fillText(`LASERS ${floor.lasers.length}`, WIDTH - 20, 46);
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(8, 11, 18, 0.84)';
  ctx.fillRect(floorBadgeX, 6, floorBadgeWidth, floorBadgeHeight);
  ctx.strokeStyle = 'rgba(233, 242, 255, 0.18)';
  ctx.strokeRect(floorBadgeX, 6, floorBadgeWidth, floorBadgeHeight);
  ctx.fillStyle = '#eef3ff';
  ctx.font = 'bold 18px Trebuchet MS';
  ctx.fillText(`FLOOR ${floor.floorNumber}`, WIDTH / 2, 26);

  if (state.messageTimer > 0 && state.transientMessage) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px Trebuchet MS';
    ctx.fillStyle = '#ff94a0';
    ctx.fillText(state.transientMessage, WIDTH / 2, HEIGHT - 18);
  }
}

function drawFlower(x, y, scale, petalColor, centerColor, rotation) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);

  for (let i = 0; i < 6; i += 1) {
    ctx.rotate(Math.PI / 3);
    ctx.fillStyle = petalColor;
    ctx.beginPath();
    ctx.ellipse(0, -12, 8, 15, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = centerColor;
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawVictoryFlowers() {
  const time = performance.now() * 0.001;
  const bouquets = [
    { x: 92, y: 506, scale: 1.15, petal: '#ff7aa8', center: '#fff1a8' },
    { x: 168, y: 548, scale: 0.9, petal: '#ffb36b', center: '#fff0c2' },
    { x: 690, y: 520, scale: 1.05, petal: '#ff8ec2', center: '#fff4b8' },
    { x: 742, y: 474, scale: 0.82, petal: '#9ee37d', center: '#fff4c6' },
    { x: 400, y: 530, scale: 1.25, petal: '#ffd36f', center: '#fff8d1' },
  ];

  bouquets.forEach((flower, index) => {
    const sway = Math.sin(time * 1.8 + index) * 8;
    const bloom = 1 + Math.sin(time * 2.6 + index * 0.7) * 0.08;

    ctx.strokeStyle = 'rgba(110, 180, 96, 0.9)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(flower.x, HEIGHT);
    ctx.quadraticCurveTo(flower.x + sway, flower.y + 36, flower.x, flower.y + 8);
    ctx.stroke();

    ctx.fillStyle = 'rgba(120, 195, 94, 0.9)';
    ctx.beginPath();
    ctx.ellipse(flower.x - 11, flower.y + 34, 7, 15, -0.8, 0, Math.PI * 2);
    ctx.ellipse(flower.x + 11, flower.y + 24, 7, 15, 0.8, 0, Math.PI * 2);
    ctx.fill();

    drawFlower(
      flower.x,
      flower.y + Math.sin(time * 2 + index) * 4,
      flower.scale * bloom,
      flower.petal,
      flower.center,
      Math.sin(time + index) * 0.12,
    );
  });

  for (let i = 0; i < 12; i += 1) {
    const sparkleX = 60 + i * 62 + Math.sin(time * 1.3 + i) * 8;
    const sparkleY = 94 + (i % 4) * 34 + Math.cos(time * 1.5 + i * 0.4) * 10;
    ctx.fillStyle = 'rgba(255, 250, 220, 0.75)';
    ctx.beginPath();
    ctx.arc(sparkleX, sparkleY, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCaughtJumpscare() {
  const jumpscare = state.assets.jumpscare;
  if (!jumpscare) {
    return;
  }

  const pulse = 1 + Math.sin(performance.now() * 0.025) * 0.035;
  const coverScale = Math.max(WIDTH / jumpscare.width, HEIGHT / jumpscare.height);
  const scale = coverScale * 1.08 * pulse;
  const drawWidth = jumpscare.width * scale;
  const drawHeight = jumpscare.height * scale;
  const drawX = (WIDTH - drawWidth) / 2;
  const drawY = (HEIGHT - drawHeight) / 2;

  ctx.save();
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.globalAlpha = 1;
  ctx.drawImage(jumpscare, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
}

function drawOverlay() {
  if (state.flashTimer > 0) {
    const intensity = clamp(state.flashTimer / FLASH_WARNING_DURATION, 0, 1) * 0.35;
    ctx.fillStyle = `rgba(255, 52, 80, ${intensity})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  if (state.gameStatus === 'gameover') {
    ctx.fillStyle = 'rgba(58, 0, 8, 0.74)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    if (state.gameOverReason === 'caught' || state.gameOverReason === 'boss-caught') {
      if (!state.jumpscareSoundPlayed) {
        playJumpscareScream();
        state.jumpscareSoundPlayed = true;
      }
      drawCaughtJumpscare();
      ctx.fillStyle = 'rgba(20, 0, 0, 0.2)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff0f3';
    ctx.font = 'bold 34px Trebuchet MS';
    const gameOverText = state.gameOverReason === 'timeout'
      ? 'GAME OVER - run out of time'
      : state.gameOverReason === 'boss-laser'
        ? 'GAME OVER - Got hit by the laser'
      : state.gameOverReason === 'boss-caught'
        ? 'GAME OVER - Got caught by the Boss'
        : 'GAME OVER - Caught by the dolls';
    ctx.fillText(gameOverText, WIDTH / 2, HEIGHT / 2 - 16);
    ctx.font = '18px Trebuchet MS';
    ctx.fillText('Press SPACEBAR to Retry', WIDTH / 2, HEIGHT / 2 + 22);
  }

  if (state.gameStatus === 'victory') {
    ctx.fillStyle = 'rgba(5, 40, 24, 0.72)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    drawVictoryFlowers();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f6ffe8';
    ctx.font = 'bold 34px Trebuchet MS';
    ctx.fillText('VICTORY - You escaped Doll House', WIDTH / 2, HEIGHT / 2 - 18);
    ctx.font = '18px Trebuchet MS';
    ctx.fillText('Press SPACEBAR to brave the mansion again.', WIDTH / 2, HEIGHT / 2 + 24);
  }

  if (state.gameStatus === 'instructions') {
    ctx.fillStyle = 'rgba(5, 6, 12, 0.86)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = 'rgba(10, 14, 22, 0.9)';
    ctx.fillRect(76, 68, WIDTH - 152, HEIGHT - 136);
    ctx.strokeStyle = 'rgba(238, 243, 255, 0.18)';
    ctx.lineWidth = 2;
    ctx.strokeRect(76, 68, WIDTH - 152, HEIGHT - 136);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff0f3';
    ctx.font = 'bold 30px Trebuchet MS';
    ctx.fillText('DOLL HOUSE RULES', WIDTH / 2, 118);

    ctx.fillStyle = '#d7e3f7';
    ctx.font = '18px Trebuchet MS';
    ctx.fillText('1. Move with Arrow Keys or W A S D.', WIDTH / 2, 172);
    ctx.fillText('2. Find the key, then reach the exit door before time runs out.', WIDTH / 2, 208);
    ctx.fillText('3. Avoid ghosts, hazards, and the boss laser on Floor 1.', WIDTH / 2, 244);
    ctx.fillText('4. If you get caught, the run restarts from the beginning.', WIDTH / 2, 280);

    ctx.fillStyle = '#f4d77d';
    ctx.font = 'bold 20px Trebuchet MS';
    ctx.fillText('Press ENTER to start immediately', WIDTH / 2, HEIGHT - 108);

    ctx.fillStyle = '#9cb0cc';
    ctx.font = '16px Trebuchet MS';
    ctx.fillText('Survive all floors and escape the house.', WIDTH / 2, HEIGHT - 74);
  }

  if (state.loading) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eef3ff';
    ctx.font = 'bold 28px Trebuchet MS';
    ctx.fillText('Loading haunted assets...', WIDTH / 2, HEIGHT / 2);
  }

  if (state.loadError) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffbec8';
    ctx.font = 'bold 26px Trebuchet MS';
    ctx.fillText('Asset loading failed', WIDTH / 2, HEIGHT / 2 - 16);
    ctx.font = '16px Trebuchet MS';
    ctx.fillText(state.loadError, WIDTH / 2, HEIGHT / 2 + 16);
  }

  const vignette = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 120, WIDTH / 2, HEIGHT / 2, 520);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(0.58, 'rgba(0, 0, 0, 0.16)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.64)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (!state.loading && !state.loadError && state.gameStatus === 'playing') {
    const pulse = 0.05 + Math.abs(Math.sin(performance.now() * 0.003)) * 0.05;
    ctx.fillStyle = `rgba(58, 0, 10, ${pulse})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

function render() {
  ctx.save();
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  if (state.shakeTimer > 0) {
    const shakeX = (Math.random() - 0.5) * state.shakeMagnitude;
    const shakeY = (Math.random() - 0.5) * state.shakeMagnitude;
    ctx.translate(shakeX, shakeY);
  }

  if (!state.loading && !state.loadError) {
    const floor = getCurrentFloor();
    drawFloorBackground(floor);
    drawDoor(floor);
    drawWallsAndFurniture(floor);
    drawKey(floor);
    floor.ghosts.forEach(drawGhost);
    drawLasers(floor);
    drawPlayer();
    drawHud(floor);
  }

  drawOverlay();
  ctx.restore();
}

function gameLoop(timestamp) {
  if (!state.lastFrameTime) {
    state.lastFrameTime = timestamp;
  }

  const deltaSeconds = Math.min(0.033, (timestamp - state.lastFrameTime) / 1000);
  state.lastFrameTime = timestamp;

  if (!state.loading && !state.loadError) {
    update(deltaSeconds);
  }

  render();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (event) => {
  state.keysDown.add(event.code);

  if (event.code === 'Enter' && state.gameStatus === 'instructions') {
    startFloor(0);
  }

  if (event.code === 'Space' && (state.gameStatus === 'gameover' || state.gameStatus === 'victory')) {
    initGame();
  }

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter'].includes(event.code)) {
    event.preventDefault();
  }
});

window.addEventListener('keyup', (event) => {
  state.keysDown.delete(event.code);
});

async function bootstrap() {
  try {
    await loadAssets();
    state.loading = false;
    initGame();
  } catch (error) {
    state.loading = false;
    state.loadError = error.message;
  }
}

bootstrap();
requestAnimationFrame(gameLoop);
