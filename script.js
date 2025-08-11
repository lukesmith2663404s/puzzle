// script.js
// CPU strategy follows user-specified mapping on Turn B, then blocks O immediate wins,
// otherwise goes for best line-building move for X (inside visible 3x3).
// Assumes HTML has #board and #message elements and CSS defines .outer-cell and .revealed.

const FULL = 5;
const V = 3;
const OFFSET = 1; // visible 3x3 starts at (1,1)
let board = new Array(FULL * FULL).fill(null); // 'X'|'O'|null
let cells = new Array(FULL * FULL).fill(null);
let gameOver = false;

const boardEl = document.getElementById('board');
const msgEl = document.getElementById('message');

// helper conversions
const rcToIdx = (r, c) => r * FULL + c;
const idxToRC = (idx) => [Math.floor(idx / FULL), idx % FULL];
const isInner = (idx) => {
  const [r, c] = idxToRC(idx);
  return r >= OFFSET && r < OFFSET + V && c >= OFFSET && c < OFFSET + V;
};
const localLabelFromFull = (idx) => { // 1..9 or null
  if (!isInner(idx)) return null;
  const [r, c] = idxToRC(idx);
  const lr = r - OFFSET;
  const lc = c - OFFSET;
  return lr * 3 + lc + 1;
};
const fullFromLocalLabel = (label) => { // label 1..9 -> full idx
  const li = label - 1;
  const lr = Math.floor(li / 3);
  const lc = li % 3;
  return rcToIdx(OFFSET + lr, OFFSET + lc);
};

// mapping for Turn B (player's first move -> CPU response)
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

// local lines indices (full-index triplets) for the 3x3 center
function getLocalLines() {
  // lines expressed in local labels -> convert to full indexes
  const linesLocal = [
    [1,2,3],[4,5,6],[7,8,9], // rows
    [1,4,7],[2,5,8],[3,6,9], // cols
    [1,5,9],[3,5,7]          // diags
  ];
  return linesLocal.map(line => line.map(l => fullFromLocalLabel(l)));
}

// build 5x5 DOM
function buildBoardDOM() {
  boardEl.innerHTML = '';
  for (let r = 0; r < FULL; r++) {
    for (let c = 0; c < FULL; c++) {
      const idx = rcToIdx(r, c);
      const div = document.createElement('div');
      div.className = 'cell';
      if (!isInner(idx)) div.classList.add('outer-cell'); // hidden outers initially
      div.dataset.idx = idx;
      div.addEventListener('click', () => handlePlayerClick(idx));
      boardEl.appendChild(div);
      cells[idx] = div;
    }
  }
}

// render visible state: show only center 3x3 by default; show outers only when 'revealed' class set
function render() {
  for (let idx = 0; idx < FULL * FULL; idx++) {
    const el = cells[idx];
    if (!el) continue;
    if (isInner(idx)) {
      el.textContent = board[idx] || '';
      el.classList.toggle('x', board[idx] === 'X');
      el.classList.toggle('o', board[idx] === 'O');
      if (board[idx]) {
        el.style.pointerEvents = 'none';
        el.style.cursor = 'not-allowed';
      } else {
        el.style.pointerEvents = 'auto';
        el.style.cursor = 'pointer';
      }
    } else {
      // outer: if revealed, display; else keep empty
      if (el.classList.contains('revealed')) {
        el.textContent = board[idx] || '';
        el.classList.toggle('x', board[idx] === 'X');
        el.classList.toggle('o', board[idx] === 'O');
        el.style.pointerEvents = 'none';
        el.style.cursor = 'default';
      } else {
        el.textContent = '';
        // pointer events controlled by dataset.enabled (set when outer winning move available)
        const enabled = el.dataset.enabled === 'true';
        el.style.pointerEvents = enabled ? 'auto' : 'none';
        el.style.cursor = enabled ? 'pointer' : 'default';
      }
    }
  }
}

// full-board 3-in-a-row checker (works across full 5x5)
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

// helper: count pieces in inner area
function countInInner(piece) {
  let cnt = 0;
  for (let idx = 0; idx < FULL * FULL; idx++) {
    if (isInner(idx) && board[idx] === piece) cnt++;
  }
  return cnt;
}

// find immediate winning move for a player limited to inner cells if requested
function findImmediateWinningMove(player, innerOnly = true) {
  for (let idx = 0; idx < FULL * FULL; idx++) {
    if (innerOnly && !isInner(idx)) continue;
    if (board[idx]) continue;
    board[idx] = player;
    const win = checkWinnerFull(player);
    board[idx] = null;
    if (win) return idx;
  }
  return null;
}

// find all local lines (arrays of full indices)
const LOCAL_LINES = getLocalLines();

// pick best inner move to "work towards a line for X"
function pickBestInnerMoveForX() {
  const candidates = [];
  for (let idx = 0; idx < FULL * FULL; idx++) {
    if (!isInner(idx)) continue;
    if (board[idx]) continue;
    candidates.push(idx);
  }
  if (candidates.length === 0) return null;

  // scoring: for every local line that contains candidate:
  // if line contains any 'O' -> that line contributes 0.
  // else contribute (1 + number of X in that line). This prefers lines with more Xs.
  let best = null;
  let bestScore = -Infinity;
  for (const idx of candidates) {
    let score = 0;
    for (const line of LOCAL_LINES) {
      if (!line.includes(idx)) continue;
      let hasO = false, countX = 0;
      for (const li of line) {
        if (board[li] === 'O') { hasO = true; break; }
        if (board[li] === 'X') countX++;
      }
      if (!hasO) score += (1 + countX);
    }
    // small tie-breakers: prefer center (label 5), then corners (1,3,7,9)
    const label = localLabelFromFull(idx);
    if (score === bestScore) {
      if (best !== null) {
        const prefOrder = [5,1,3,7,9,2,4,6,8];
        const aIdx = prefOrder.indexOf(localLabelFromFull(best));
        const bIdx = prefOrder.indexOf(label);
        if (bIdx < aIdx) best = idx;
      } else {
        best = idx;
      }
    } else if (score > bestScore) {
      bestScore = score;
      best = idx;
    }
  }
  return best;
}

// Turn-B mapping handler (player's first move)
function handleTurnBResponse(playerFullIdx) {
  const plLabel = localLabelFromFull(playerFullIdx);
  if (!plLabel) return null;
  const targetLabel = turnBMapping[plLabel];
  if (!targetLabel) return null;
  const targetFull = fullFromLocalLabel(targetLabel);
  if (!board[targetFull]) {
    return targetFull;
  }
  return null;
}

// find all outer winning moves (where placing O would win)
function findAllOuterWinningMoves() {
  const arr = [];
  for (let idx = 0; idx < FULL * FULL; idx++) {
    if (isInner(idx)) continue;
    if (board[idx]) continue;
    board[idx] = 'O';
    const win = checkWinnerFull('O');
    board[idx] = null;
    if (win) arr.push(idx);
  }
  return arr;
}

// reveal outer ring (make hidden outers visible)
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

// finish the game
function finish(state, text) {
  gameOver = true;
  if (msgEl) msgEl.textContent = text;
  // disable any enabled outer flags
  for (let idx = 0; idx < FULL * FULL; idx++) {
    const el = cells[idx];
    if (el) {
      el.dataset.enabled = 'false';
      el.style.pointerEvents = 'none';
    }
  }
  // reveal outer ring on win or loss for clarity
  if (state === 'win' || state === 'lose') revealOuterRing();
  render();
}

// message helper
function setMsg(txt) {
  if (msgEl) msgEl.textContent = txt;
}
function flashMsg(txt) {
  const prev = msgEl ? msgEl.textContent : '';
  setMsg(txt);
  setTimeout(() => { if (!gameOver) setMsg(prev); }, 800);
}

// Core player click handler (works for inner clicks and enabled outer clicks)
function handlePlayerClick(fullIdx) {
  if (gameOver) return;
  if (board[fullIdx]) return;
  const el = cells[fullIdx];

  // Outer click allowed only if dataset.enabled === 'true'
  if (!isInner(fullIdx)) {
    if (!el || el.dataset.enabled !== 'true') {
      flashMsg("Nothing happens when you click there.");
      return;
    }
    // allowed outer final move
    board[fullIdx] = 'O';
    // reveal outers (player chose secret outer to win)
    revealOuterRing();
    render();
    if (checkWinnerFull('O')) {
      finish('win', 'You win — secret outer placement!');
      return;
    } else {
      finish('tie', 'Result: tie after outer placement.');
      return;
    }
  }

  // Inner click (normal move)
  board[fullIdx] = 'O';
  render();

  // immediate full win?
  if (checkWinnerFull('O')) {
    revealOuterRing();
    finish('win', 'You win!');
    return;
  }

  // Count moves in inner to detect Turn B (player's first reply after center)
  const oCountInner = countInInner('O');
  const xCountInner = countInInner('X');

  // If this is player's first inner move (Turn B), attempt mapping response
  if (oCountInner === 1 && xCountInner === 1) {
    // mapping response
    const mappedFull = handleTurnBResponse(fullIdx);
    if (mappedFull !== null) {
      // place X at mappedFull
      board[mappedFull] = 'X';
      render();
      if (checkWinnerFull('X')) {
        finish('lose', 'Computer wins.');
        return;
      }
      // if visible local now full, handle tie path
      const local = buildLocal();
      if (local.every(v => v !== null)) {
        handleVisibleTie();
      } else {
        setMsg("Your turn — place an O.");
      }
      return;
    }
    // else fall through to normal logic
  }

  // Normal CPU reaction: block immediate O win in inner (highest priority)
  const blockIdx = findImmediateWinningMove('O', true);
  if (blockIdx !== null) {
    board[blockIdx] = 'X';
    render();
    if (checkWinnerFull('X')) {
      finish('lose', 'Computer wins.');
      return;
    }
    const local = buildLocal();
    if (local.every(v => v !== null)) {
      handleVisibleTie();
    } else {
      setMsg("Your turn — place an O.");
    }
    return;
  }

  // Else, if CPU has immediate winning inner move, take it
  const winIdx = findImmediateWinningMove('X', true);
  if (winIdx !== null) {
    board[winIdx] = 'X';
    render();
    finish('lose', 'Computer wins.');
    return;
  }

  // Otherwise pick a best inner move towards a line
  const pick = pickBestInnerMoveForX();
  if (pick !== null) {
    board[pick] = 'X';
    render();
    if (checkWinnerFull('X')) {
      finish('lose', 'Computer wins.');
      return;
    }
    const local = buildLocal();
    if (local.every(v => v !== null)) {
      handleVisibleTie();
      return;
    } else {
      setMsg("Your turn — place an O.");
      return;
    }
  }

  // If we reach here, no moves left in inner -> visible tie
  handleVisibleTie();
}

// returns local board mapping (9 cells) from full board (null for empty)
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

// Called when visible 3x3 is full and no winner inside: enable any outer cells where placing O would win
function handleVisibleTie() {
  if (gameOver) return;
  const outs = findAllOuterWinningMoves();
  if (outs.length > 0) {
    // enable those outer cells invisibly
    for (const idx of outs) {
      const el = cells[idx];
      if (!el) continue;
      el.dataset.enabled = 'true';
      el.style.pointerEvents = 'auto';
      el.style.cursor = 'pointer';
    }
    setMsg("Visible result: Tie. Hidden outer winning move(s) available — find one.");
  } else {
    finish('tie', 'Result: Tie — no hidden winning move available.');
  }
}

/* -------------------------
   Reset logic
   ------------------------- */
function resetGame() {
  board.fill(null);
  gameOver = false;
  // reset DOM states
  for (let i = 0; i < FULL * FULL; i++) {
    const el = cells[i];
    if (!el) continue;
    delete el.dataset.enabled;
    el.classList.remove('revealed');
    if (!isInner(i)) {
      if (!el.classList.contains('outer-cell')) el.classList.add('outer-cell');
    }
    el.style.pointerEvents = 'none';
    el.style.cursor = 'default';
  }
  // place center X at label 5 => full center
  const centerIdx = fullFromLocalLabel(5);
  board[centerIdx] = 'X';
  render();
  setMsg("Computer (X) placed at centre. Your turn — place an O.");
}

// Initialize everything and place center X
function initGame() {
  buildBoardDOM();
  resetGame();
}

// expose for your HTML to call
window.initGame = initGame;
window.resetGame = resetGame;
window.handlePlayerClick = handlePlayerClick;

// NOTE: Do NOT auto-init here; call initGame() from your code-unlock handler when appropriate.
