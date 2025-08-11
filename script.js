// script.js
// This file: JONES gate -> initGame() -> builds visible 3x3 center of 5x5, CPU strategy per user's mapping,
// outer-ring invisible cells, reveal outer O when player places the winning outside O.

const CODE = "JONES";
const FULL = 5;
const V = 3;
const OFFSET = 1; // center 3x3 starts at (1,1) within 5x5
const FULL_CELLS = FULL * FULL;

let board = new Array(FULL_CELLS).fill(null); // 'X' | 'O' | null
let cells = new Array(FULL_CELLS);
let gameOver = false;

// DOM refs
const submitBtn = document.getElementById("submit-code");
const accessInput = document.getElementById("access-code");
const codeSection = document.getElementById("code-section");
const puzzleSection = document.getElementById("puzzle-section");
const placeholders = document.getElementById("placeholders");
const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const resetBtn = document.getElementById("reset-btn");

// index helpers
const rcToIdx = (r,c) => r * FULL + c;
const idxToRC = (idx) => [Math.floor(idx / FULL), idx % FULL];
const isInner = (idx) => {
  const [r,c] = idxToRC(idx);
  return r >= OFFSET && r < OFFSET + V && c >= OFFSET && c < OFFSET + V;
};
// local label 1..9 mapping (1..3 top row -> etc)
const fullFromLabel = (label) => {
  const li = label - 1;
  const lr = Math.floor(li / 3);
  const lc = li % 3;
  return rcToIdx(OFFSET + lr, OFFSET + lc);
};
const labelFromFull = (idx) => {
  if (!isInner(idx)) return null;
  const [r,c] = idxToRC(idx);
  const lr = r - OFFSET, lc = c - OFFSET;
  return lr * 3 + lc + 1;
};

// Turn-B mapping
const turnBMapping = {
  1: 3,
  3: 1,
  7: 9,
  9: 7,
  2: 7,
  6: 7,
  4: 3,
  8: 3
};

// Code gate
submitBtn.addEventListener("click", () => {
  const val = (accessInput.value || "").trim().toUpperCase();
  if (val === CODE) {
    codeSection.style.display = "none";
    puzzleSection.style.display = "block";
    placeholders.style.display = "block";
    initGame();
  } else {
    alert("Incorrect code.");
  }
});

// Build 5x5 DOM grid (center 3x3 visually distinct)
function buildBoardDOM() {
  boardEl.innerHTML = "";
  cells = new Array(FULL_CELLS);
  for (let r = 0; r < FULL; r++) {
    for (let c = 0; c < FULL; c++) {
      const idx = rcToIdx(r,c);
      const el = document.createElement("div");
      el.className = "cell";
      el.dataset.idx = idx;
      el.dataset.row = r;
      el.dataset.col = c;
      if (isInner(idx)) {
        el.classList.add("center");
      } else {
        el.classList.add("outer-cell");
      }
      el.addEventListener("click", () => handlePlayerClick(idx));
      boardEl.appendChild(el);
      cells[idx] = el;
    }
  }
}

// Render function: show inner marks; show outer marks only when revealed (class 'revealed')
function render() {
  for (let idx = 0; idx < FULL_CELLS; idx++) {
    const el = cells[idx];
    if (!el) continue;
    if (isInner(idx)) {
      el.textContent = board[idx] || "";
      el.classList.toggle("x", board[idx] === "X");
      el.classList.toggle("o", board[idx] === "O");
      if (board[idx]) {
        el.style.pointerEvents = "none";
        el.style.cursor = "not-allowed";
      } else {
        el.style.pointerEvents = "auto";
        el.style.cursor = "pointer";
      }
    } else {
      if (el.classList.contains("revealed")) {
        el.textContent = board[idx] || "";
        el.classList.toggle("x", board[idx] === "X");
        el.classList.toggle("o", board[idx] === "O");
        el.style.pointerEvents = "none";
        el.style.cursor = "default";
      } else {
        el.textContent = "";
        // pointer events depend on dataset.enabled (set when hidden outer becomes selectable)
        const enabled = el.dataset.enabled === "true";
        el.style.pointerEvents = enabled ? "auto" : "none";
        el.style.cursor = enabled ? "pointer" : "default";
      }
    }
  }
}

// Check winner across full 5x5 for any 3 in a row
function checkWinnerFull(player) {
  if (!player) return false;
  const dirs = [[1,0],[0,1],[1,1],[1,-1]];
  for (let r = 0; r < FULL; r++) {
    for (let c = 0; c < FULL; c++) {
      if (board[rcToIdx(r,c)] !== player) continue;
      for (const [dr,dc] of dirs) {
        let count = 1;
        for (let step = 1; step < 3; step++) {
          const nr = r + dr * step, nc = c + dc * step;
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

// Count inner pieces
function countInner(player) {
  let n = 0;
  for (let idx = 0; idx < FULL_CELLS; idx++) {
    if (isInner(idx) && board[idx] === player) n++;
  }
  return n;
}

// Find immediate winning move (optionally inner-only)
function findImmediateWinningMove(player, innerOnly = true) {
  for (let idx = 0; idx < FULL_CELLS; idx++) {
    if (innerOnly && !isInner(idx)) continue;
    if (board[idx]) continue;
    board[idx] = player;
    const win = checkWinnerFull(player);
    board[idx] = null;
    if (win) return idx;
  }
  return null;
}

// Turn-B mapping handler
function handleTurnB(playerIdx) {
  const label = labelFromFull(playerIdx);
  if (!label) return null;
  const mapped = turnBMapping[label];
  if (!mapped) return null;
  const targetFull = fullFromLabel(mapped);
  if (!board[targetFull]) return targetFull;
  return null;
}

// Find all outer indices that become a winning O
function findAllOuterWinningMoves() {
  const arr = [];
  for (let idx = 0; idx < FULL_CELLS; idx++) {
    if (isInner(idx)) continue;
    if (board[idx]) continue;
    board[idx] = "O";
    const win = checkWinnerFull("O");
    board[idx] = null;
    if (win) arr.push(idx);
  }
  return arr;
}

// Reveal the entire outer ring visually (used after final outer O placed or for clarity)
function revealOuterRing() {
  for (let idx = 0; idx < FULL_CELLS; idx++) {
    if (!isInner(idx)) {
      const el = cells[idx];
      if (!el) continue;
      el.classList.remove("outer-cell");
      el.classList.add("revealed");
      el.style.pointerEvents = "none";
    }
  }
}

// Finish game
function finish(state, text) {
  gameOver = true;
  statusEl.textContent = text || (state === "win" ? "You win!" : "Game over");
  // disable all outer dataset flags
  for (let idx = 0; idx < FULL_CELLS; idx++) {
    const el = cells[idx];
    if (el) {
      el.dataset.enabled = "false";
      el.style.pointerEvents = "none";
    }
  }
  if (state === "win" || state === "lose") revealOuterRing();
  render();
}

// When visible 3x3 is tie: enable outer cells that would win for O
function onVisibleTie() {
  if (gameOver) return;
  const outs = findAllOuterWinningMoves();
  if (outs.length > 0) {
    for (const idx of outs) {
      const el = cells[idx];
      if (!el) continue;
      el.dataset.enabled = "true";
      el.style.pointerEvents = "auto";
      el.style.cursor = "pointer";
    }
    statusEl.textContent = "Visible result: tie. Hidden outer winning move(s) available — find one.";
  } else {
    finish("tie", "Result: Tie — no hidden winning move available.");
  }
}

// Handle player clicks on any cell (inner or enabled outer)
function handlePlayerClick(idx) {
  if (gameOver) return;
  if (board[idx]) return;
  const el = cells[idx];
  if (!isInner(idx)) {
    // outer cell: only allowed if dataset.enabled === 'true'
    if (!el || el.dataset.enabled !== "true") {
      // nothing happens
      statusEl.textContent = "Nothing happens when you click there.";
      setTimeout(() => { if (!gameOver) statusEl.textContent = ""; }, 700);
      return;
    }
    // Accept outer placement
    board[idx] = "O";
    revealOuterRing();
    render();
    if (checkWinnerFull("O")) {
      finish("win", "You win — secret outer placement!");
    } else {
      finish("tie", "Result: tie after outer placement.");
    }
    return;
  }

  // Inner cell normal move
  board[idx] = "O";
  render();

  if (checkWinnerFull("O")) {
    revealOuterRing();
    finish("win", "You win!");
    return;
  }

  // Determine if this was Turn B (player's first inner move after center X)
  const numOInner = countInner("O");
  const numXInner = countInner("X");

  if (numOInner === 1 && numXInner === 1) {
    // mapping reply
    const mapped = handleTurnB(idx);
    if (mapped !== null) {
      board[mapped] = "X";
      render();
      if (checkWinnerFull("X")) { finish("lose", "CPU wins."); return; }
      const local = buildLocal();
      if (local.every(v => v !== null)) { onVisibleTie(); return; }
      statusEl.textContent = "Your turn — place an O.";
      return;
    }
    // fall through to blocking logic if mapping not applicable
  }

  // Priority: block O immediate wins in inner
  const blockIdx = findImmediateWinningMove("O", true);
  if (blockIdx !== null) {
    board[blockIdx] = "X";
    render();
    if (checkWinnerFull("X")) { finish("lose", "CPU wins."); return; }
    const local = buildLocal();
    if (local.every(v => v !== null)) { onVisibleTie(); return; }
    statusEl.textContent = "Your turn — place an O.";
    return;
  }

  // Otherwise, if CPU can win in inner, do so
  const winIdx = findImmediateWinningMove("X", true);
  if (winIdx !== null) {
    board[winIdx] = "X";
    render();
    finish("lose", "CPU wins.");
    return;
  }

  // Otherwise choose a heuristic inner move (prefer center/corners etc)
  const pick = pickBestInnerMove();
  if (pick !== null) {
    board[pick] = "X";
    render();
    if (checkWinnerFull("X")) { finish("lose", "CPU wins."); return; }
    const local = buildLocal();
    if (local.every(v => v !== null)) { onVisibleTie(); return; }
    statusEl.textContent = "Your turn — place an O.";
    return;
  }

  // If inner full -> visible tie
  onVisibleTie();
}

// Build local 3x3 array (for inner-only checks)
function buildLocal() {
  const local = new Array(9).fill(null);
  for (let lr = 0; lr < V; lr++) {
    for (let lc = 0; lc < V; lc++) {
      const fullIdx = rcToIdx(OFFSET + lr, OFFSET + lc);
      local[lr * V + lc] = board[fullIdx];
    }
  }
  return local;
}

// Heuristic pick for X when no forced win/block: prefer center(5), then corners, then edges
function pickBestInnerMove() {
  const pref = [5,1,3,7,9,2,4,6,8]; // local labels
  for (const lab of pref) {
    const idx = fullFromLabel(labToLocal(lab));
    if (!board[idx]) return idx;
  }
  // fallback: any inner empty
  for (let idx = 0; idx < FULL_CELLS; idx++) {
    if (isInner(idx) && !board[idx]) return idx;
  }
  return null;
}

function labToLocal(label) {
  // Return full index from label 1..9
  return label;
}
function fullFromLabel(label) {
  // return full idx for label 1..9
  const li = label - 1;
  const lr = Math.floor(li / 3);
  const lc = li % 3;
  return rcToIdx(OFFSET + lr, OFFSET + lc);
}

// Reset game to starting state (center X)
function resetGame() {
  board.fill(null);
  gameOver = false;
  // reset DOM flags for outer
  for (let idx = 0; idx < FULL_CELLS; idx++) {
    const el = cells[idx];
    if (!el) continue;
    delete el.dataset.enabled;
    el.classList.remove("revealed");
    if (!isInner(idx) && !el.classList.contains("outer-cell")) el.classList.add("outer-cell");
    el.style.pointerEvents = isInner(idx) ? "auto" : "none";
    el.style.cursor = isInner(idx) ? "pointer" : "default";
  }
  const center = rcToIdx(OFFSET+1, OFFSET+1);
  board[center] = "X";
  render();
  statusEl.textContent = "Computer (X) placed at centre. Your turn — place an O.";
}

// Initialization
function initGame() {
  buildBoardDOM();
  resetGame();
}

// wire reset button
resetBtn.addEventListener("click", () => {
  if (puzzleSection.style.display === "block") resetGame();
});

// expose initGame for manual calling if needed
window.initGame = initGame;
