// script.js
// Replace existing JS with this file. Assumes index.html has:
// - <div id="board"></div>
// - <div id="message"></div>
// - a Reset button that calls resetGame()
// - code input handling elsewhere that calls initGame() once unlocked

const FULL = 5;
const V = 3;
const OFFSET = 1; // visible 3x3 starts at (1,1) in the 5x5
let board = new Array(FULL * FULL).fill(null); // 'X' | 'O' | null
let cells = []; // array of DOM elements mapped by full index
let gameOver = false;

// Utility conversions
const rcToIdx = (r, c) => r * FULL + c;
const idxToRC = (idx) => [Math.floor(idx / FULL), idx % FULL];
const isInner = (idx) => {
  const [r, c] = idxToRC(idx);
  return r >= OFFSET && r < OFFSET + V && c >= OFFSET && c < OFFSET + V;
};

// DOM refs
const boardEl = document.getElementById('board');
const msgEl = document.getElementById('message');

// Build the 5x5 grid DOM (center 3x3 visually distinct, outer cells hidden by CSS class)
function buildBoardDOM() {
  boardEl.innerHTML = '';
  cells = new Array(FULL * FULL);
  for (let r = 0; r < FULL; r++) {
    for (let c = 0; c < FULL; c++) {
      const idx = rcToIdx(r, c);
      const div = document.createElement('div');
      div.className = 'cell';
      if (!isInner(idx)) div.classList.add('outer-cell'); // outer cells initially hidden
      div.dataset.idx = idx;
      div.addEventListener('click', () => handlePlayerClick(idx));
      boardEl.appendChild(div);
      cells[idx] = div;
    }
  }
}

// Render function shows marks inside central 3x3 always.
// Outer cells are shown only when they have class 'revealed' (we reveal after final move)
function render() {
  for (let idx = 0; idx < FULL * FULL; idx++) {
    const el = cells[idx];
    if (!el) continue;
    if (isInner(idx)) {
      el.textContent = board[idx] || '';
      el.classList.toggle('x', board[idx] === 'X');
      el.classList.toggle('o', board[idx] === 'O');
      // disable clicking on taken inner cells
      if (board[idx]) {
        el.style.pointerEvents = 'none';
        el.style.cursor = 'not-allowed';
      } else {
        el.style.pointerEvents = 'auto';
        el.style.cursor = 'pointer';
      }
    } else {
      // outer cells: if revealed, show contents, otherwise keep empty
      if (el.classList.contains('revealed')) {
        el.textContent = board[idx] || '';
        el.classList.toggle('x', board[idx] === 'X');
        el.classList.toggle('o', board[idx] === 'O');
        el.style.pointerEvents = 'none'; // revealed for display only after reveal moment
        el.style.cursor = 'default';
      } else {
        el.textContent = ''; // invisible
        // pointer events are controlled by dataset.enabled attribute (set during tie-check)
        const enabled = el.dataset.enabled === 'true';
        el.style.pointerEvents = enabled ? 'auto' : 'none';
        el.style.cursor = enabled ? 'pointer' : 'default';
      }
    }
  }
}

// Check winner across full 5x5 for any 3 in a row (horizontal, vertical, diag)
function checkWinnerFull(player) {
  if (!player) return false;
  const dirs = [[1,0],[0,1],[1,1],[1,-1]];
  for (let r = 0; r < FULL; r++) {
    for (let c = 0; c < FULL; c++) {
      if (board[rcToIdx(r,c)] !== player) continue;
      for (const [dr, dc] of dirs) {
        let count = 1;
        for (let step = 1; step < 3; step++) {
          const nr = r + dr * step;
          const nc = c + dc * step;
          if (nr < 0 || nr >= FULL || nc < 0 || nc >= FULL) break;
          if (board[rcToIdx(nr,nc)] === player) count++;
          else break;
        }
        if (count === 3) return true;
      }
    }
  }
  return false;
}

/* -------------------------
   Minimax for optimal CPU play on the local 3x3 only
   ------------------------- */
function buildLocal() {
  // local indices 0..8 map to full positions OFFSET..OFFSET+2
  const local = new Array(9).fill(null);
  for (let lr = 0; lr < V; lr++) {
    for (let lc = 0; lc < V; lc++) {
      const fullR = OFFSET + lr;
      const fullC = OFFSET + lc;
      local[lr * V + lc] = board[rcToIdx(fullR, fullC)];
    }
  }
  return local;
}
function localIdxToFull(localIdx) {
  const lr = Math.floor(localIdx / V);
  const lc = localIdx % V;
  return rcToIdx(OFFSET + lr, OFFSET + lc);
}
function checkWinnerLocal(local, player) {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  return wins.some(combo => combo.every(i => local[i] === player));
}
function minimax(local, isMax) {
  if (checkWinnerLocal(local, 'X')) return 1;
  if (checkWinnerLocal(local, 'O')) return -1;
  if (local.every(v => v !== null)) return 0;
  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!local[i]) {
        local[i] = 'X';
        const score = minimax(local, false);
        local[i] = null;
        best = Math.max(best, score);
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!local[i]) {
        local[i] = 'O';
        const score = minimax(local, true);
        local[i] = null;
        best = Math.min(best, score);
      }
    }
    return best;
  }
}
function findBestLocalMove() {
  const local = buildLocal();
  let bestScore = -Infinity;
  let bestMove = null;
  for (let i = 0; i < 9; i++) {
    if (!local[i]) {
      local[i] = 'X';
      const score = minimax(local, false);
      local[i] = null;
      if (score > bestScore) { bestScore = score; bestMove = i; }
    }
  }
  return bestMove; // local index or null
}

/* -------------------------
   Outer cell winning detection:
   Find all outer cells where placing O would make O win on full board.
   ------------------------- */
function findAllOuterWinningMoves() {
  const winning = [];
  for (let idx = 0; idx < FULL * FULL; idx++) {
    if (isInner(idx)) continue;
    if (board[idx]) continue;
    // simulate O
    board[idx] = 'O';
    const win = checkWinnerFull('O');
    board[idx] = null;
    if (win) winning.push(idx);
  }
  return winning; // array of full-index positions
}

/* -------------------------
   Game flow: player clicks, computer moves, tie-handling
   ------------------------- */
function handlePlayerClick(idx) {
  if (gameOver) return;
  if (board[idx]) return;

  // If outer cell and enabled (dataset.enabled), allow placement
  const el = cells[idx];
  if (!isInner(idx)) {
    if (el && el.dataset.enabled === 'true') {
      // allowed final secret move
      board[idx] = 'O';
      revealOuterRing(); // reveal all outers for visual feedback
      render();
      if (checkWinnerFull('O')) {
        finish('win', 'You win — secret outer placement!');
      } else {
        finish('tie', 'Result: tie after outer placement.');
      }
      return;
    } else {
      // clicking hidden/disallowed outer does nothing
      flashMsg("Nothing happens when you click there.");
      return;
    }
  }

  // inner cell click: normal play
  board[idx] = 'O';
  render();

  // immediate full-board win check (rare)
  if (checkWinnerFull('O')) {
    revealOuterRing();
    finish('win', 'You win!');
    return;
  }

  // If local (visible) is not yet full, computer replies
  setTimeout(() => {
    // if local is full after player's move, handle tie-check
    const local = buildLocal();
    if (local.every(v => v !== null)) {
      // local finished -> check outer-winning moves
      onVisibleTie();
    } else {
      // computer plays optimally inside the 3x3
      computerMove();
    }
  }, 140);
}

function computerMove() {
  if (gameOver) return;
  const bestLocal = findBestLocalMove();
  if (bestLocal === null) {
    // no visible moves left -> tie path
    onVisibleTie();
    return;
  }
  const fullIdx = localIdxToFull(bestLocal);
  board[fullIdx] = 'X';
  render();

  // check if computer wins on full board
  if (checkWinnerFull('X')) {
    revealOuterRing();
    finish('lose', 'Computer wins.');
    return;
  }

  // after computer's move, check if visible local is now full
  const local = buildLocal();
  if (local.every(v => v !== null)) {
    onVisibleTie();
  } else {
    setMsg("Your turn — place an O.");
  }
}

/* Called when visible 3x3 is full and no winner inside it */
function onVisibleTie() {
  if (gameOver) return;
  // scan for any outer winning moves for O
  const outs = findAllOuterWinningMoves();
  if (outs.length > 0) {
    // enable those outer cells (still invisible visually) so player can click them
    for (const idx of outs) {
      const el = cells[idx];
      if (el) {
        el.dataset.enabled = 'true';
        el.style.pointerEvents = 'auto';
        el.style.cursor = 'pointer';
      }
    }
    setMsg("Visible result: Tie. Hidden outer winning move(s) available — find one.");
  } else {
    // no secret move -> real tie
    finish('tie', 'Result: Tie — no hidden winning move available.');
  }
}

/* Reveal all outer cells (visualize full 5x5). Called when player places winning outer O. */
function revealOuterRing() {
  for (let idx = 0; idx < FULL * FULL; idx++) {
    if (!isInner(idx)) {
      const el = cells[idx];
      if (!el) continue;
      el.classList.remove('outer-cell');
      el.classList.add('revealed');
      el.style.pointerEvents = 'none';
      el.style.cursor = 'default';
    }
  }
}

/* Finish the game and display message */
function finish(state, text) {
  gameOver = true;
  if (state === 'win') {
    setMsg(text);
    // reveal outer ring for clarity
    revealOuterRing();
    // reveal next puzzles / unlock UI here if needed (call external)
  } else if (state === 'lose') {
    setMsg(text);
    revealOuterRing();
  } else {
    setMsg(text);
  }
  // disable all outer enabled flags
  for (let idx = 0; idx < FULL * FULL; idx++) {
    const el = cells[idx];
    if (el) {
      el.dataset.enabled = 'false';
      el.style.pointerEvents = 'none';
    }
  }
}

/* Helper to set message */
function setMsg(text) {
  if (msgEl) msgEl.textContent = text;
}
function flashMsg(text) {
  const prev = msgEl.textContent;
  setMsg(text);
  setTimeout(() => { if (!gameOver) setMsg(prev); }, 800);
}

/* Reset -> starting state: center X placed, outer cells hidden/disabled */
function resetGame() {
  board.fill(null);
  gameOver = false;
  for (let idx = 0; idx < FULL * FULL; idx++) {
    const el = cells[idx];
    if (el) {
      delete el.dataset.enabled;
      el.classList.remove('revealed');
      if (!isInner(idx) && !el.classList.contains('outer-cell')) el.classList.add('outer-cell');
      el.style.pointerEvent
