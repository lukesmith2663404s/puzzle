let board = [];
let cells = [];
let gameOver = false;

function checkCode() {
  const code = document.getElementById('code-input').value.trim().toUpperCase();
  if (code === "JONES") {
    document.getElementById('puzzles').style.display = 'block';
    initGame();
  } else {
    alert("Incorrect code.");
  }
}

function initGame() {
  const boardDiv = document.getElementById('board');
  boardDiv.innerHTML = '';
  cells = [];
  board = Array.from({ length: 5 }, () => Array(5).fill(''));

  for (let r = 0; r < 5; r++) {
    cells[r] = [];
    for (let c = 0; c < 5; c++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      if (r === 0 || r === 4 || c === 0 || c === 4) {
        cell.classList.add('outer-cell');
      }
      cell.addEventListener('click', () => handleClick(r, c));
      boardDiv.appendChild(cell);
      cells[r][c] = cell;
    }
  }

  board[2][2] = 'X'; // Computer starts in center
  render();
  gameOver = false;
  document.getElementById('message').textContent = '';
}

function render() {
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      cells[r][c].textContent = board[r][c] || '';
    }
  }
}

function handleClick(r, c) {
  if (gameOver || board[r][c] !== '') return;

  board[r][c] = 'O';
  render();
  if (checkWin('O')) {
    document.getElementById('message').textContent = "You win!";
    gameOver = true;
    return;
  }
  if (isTie()) {
    const move = findOuterWinningMove();
    if (move) {
      revealCell(move.row, move.col);
      document.getElementById('message').textContent = "A secret move is now possible!";
    } else {
      document.getElementById('message').textContent = "It's a tie!";
      gameOver = true;
    }
    return;
  }
  computerMove();
}

function computerMove() {
  for (let r = 1; r <= 3; r++) {
    for (let c = 1; c <= 3; c++) {
      if (board[r][c] === '') {
        board[r][c] = 'X';
        render();
        if (checkWin('X')) {
          document.getElementById('message').textContent = "You lose!";
          gameOver = true;
        }
        return;
      }
    }
  }
}

function isTie() {
  for (let r = 1; r <= 3; r++) {
    for (let c = 1; c <= 3; c++) {
      if (board[r][c] === '') return false;
    }
  }
  return true;
}

function checkWin(player) {
  const dirs = [
    [1, 0], [0, 1], [1, 1], [1, -1]
  ];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (board[r][c] !== player) continue;
      for (let [dr, dc] of dirs) {
        let count = 1;
        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr < 5 && nc >= 0 && nc < 5 && board[nr][nc] === player) {
          count++;
          if (count === 3) return true;
          nr += dr;
          nc += dc;
        }
      }
    }
  }
  return false;
}

function findOuterWinningMove() {
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (board[r][c] === '') {
        board[r][c] = 'O';
        if (checkWin('O')) {
          board[r][c] = '';
          return { row: r, col: c };
        }
        board[r][c] = '';
      }
    }
  }
  return null;
}

function revealCell(r, c) {
  cells[r][c].classList.remove('outer-cell');
  cells[r][c].style.visibility = 'visible';
  cells[r][c].style.pointerEvents = 'auto';
}

function resetGame() {
  initGame();
}
