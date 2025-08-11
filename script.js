// Code entry gate
document.getElementById("submit-code").addEventListener("click", function () {
    const code = document.getElementById("access-code").value.trim().toUpperCase();
    if (code === "JONES") {
        document.getElementById("code-section").style.display = "none";
        document.getElementById("puzzle-section").style.display = "block";
        initGame();
    } else {
        alert("Incorrect code. Try again.");
    }
});

let board = [];
let gameActive = true;
let revealedOuterCell = null;

function initGame() {
    const boardContainer = document.getElementById("board");
    boardContainer.innerHTML = "";
    board = Array.from({ length: 5 }, () => Array(5).fill(null));
    gameActive = true;
    revealedOuterCell = null;
    document.getElementById("status").textContent = "";

    // Build 5x5 grid
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");
            if (r < 1 || r > 3 || c < 1 || c > 3) {
                cell.classList.add("outer-cell");
            }
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.addEventListener("click", onCellClick);
            boardContainer.appendChild(cell);
        }
    }

    // CPU starts in center (5)
    board[2][2] = "X";
    render();
}

function onCellClick(e) {
    if (!gameActive) return;

    const r = parseInt(e.target.dataset.row);
    const c = parseInt(e.target.dataset.col);

    if (board[r][c]) return;

    board[r][c] = "O";
    render();

    if (checkWinner("O")) {
        endGame("You win!");
        return;
    }
    if (isTie()) {
        // Try to reveal outer ring move
        if (tryRevealOuterWin()) {
            document.getElementById("status").textContent = "Place your final O!";
            return;
        }
        endGame("It's a tie!");
        return;
    }

    cpuMove(r, c);

    if (checkWinner("X")) {
        endGame("CPU wins!");
    } else if (isTie()) {
        if (tryRevealOuterWin()) {
            document.getElementById("status").textContent = "Place your final O!";
        } else {
            endGame("It's a tie!");
        }
    }
}

function cpuMove(lastOrow, lastOcol) {
    // Second move mapping strategy
    const pos = coordToPos(lastOrow, lastOcol);
    if (countMoves("X") === 1) {
        let target;
        switch (pos) {
            case 1: target = 3; break;
            case 3: target = 1; break;
            case 7: target = 9; break;
            case 9: target = 7; break;
            case 2: case 6: target = 7; break;
            case 4: case 8: target = 3; break;
        }
        const [r, c] = posToCoord(target);
        if (!board[r][c]) {
            board[r][c] = "X";
            render();
            return;
        }
    }

    // Block O's win
    const block = findWinningMove("O");
    if (block) {
        board[block[0]][block[1]] = "X";
        render();
        return;
    }

    // Try to win
    const win = findWinningMove("X");
    if (win) {
        board[win[0]][win[1]] = "X";
        render();
        return;
    }

    // Otherwise pick first free
    for (let r = 1; r <= 3; r++) {
        for (let c = 1; c <= 3; c++) {
            if (!board[r][c]) {
                board[r][c] = "X";
                render();
                return;
            }
        }
    }
}

function countMoves(player) {
    return board.flat().filter(v => v === player).length;
}

function findWinningMove(player) {
    for (let r = 1; r <= 3; r++) {
        for (let c = 1; c <= 3; c++) {
            if (!board[r][c]) {
                board[r][c] = player;
                if (checkWinner(player)) {
                    board[r][c] = null;
                    return [r, c];
                }
                board[r][c] = null;
            }
        }
    }
    return null;
}

function isTie() {
    for (let r = 1; r <= 3; r++) {
        for (let c = 1; c <= 3; c++) {
            if (!board[r][c]) return false;
        }
    }
    return true;
}

function tryRevealOuterWin() {
    // Check each direction from O pairs
    const directions = [
        [[0,1],[0,-1]],
        [[1,0],[-1,0]],
        [[1,1],[-1,-1]],
        [[1,-1],[-1,1]]
    ];
    for (let r = 1; r <= 3; r++) {
        for (let c = 1; c <= 3; c++) {
            if (board[r][c] === "O") {
                for (let dir of directions) {
                    const r1 = r + dir[0][0], c1 = c + dir[0][1];
                    const r2 = r + dir[1][0], c2 = c + dir[1][1];
                    if (inMain(r1,c1) && board[r1][c1] === "O" && !inMain(r2,c2) && !board[r2][c2]) {
                        revealOuter(r2,c2);
                        return true;
                    }
                    if (inMain(r2,c2) && board[r2][c2] === "O" && !inMain(r1,c1) && !board[r1][c1]) {
                        revealOuter(r1,c1);
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

function revealOuter(r,c) {
    revealedOuterCell = [r,c];
    const cells = document.querySelectorAll(".cell");
    cells.forEach(cell => {
        if (parseInt(cell.dataset.row) === r && parseInt(cell.dataset.col) === c) {
            cell.classList.remove("outer-cell");
            cell.classList.add("revealed-outer");
            cell.addEventListener("click", function placeO() {
                board[r][c] = "O";
                render();
                endGame("You win!");
            }, { once: true });
        }
    });
}

function inMain(r,c) {
    return r >= 1 && r <= 3 && c >= 1 && c <= 3;
}

function coordToPos(r,c) {
    const map = {
        "1,1": 1, "1,2": 2, "1,3": 3,
        "2,1": 4, "2,2": 5, "2,3": 6,
        "3,1": 7, "3,2": 8, "3,3": 9
    };
    return map[`${r},${c}`];
}

function posToCoord(pos) {
    const map = {
        1: [1,1], 2: [1,2], 3: [1,3],
        4: [2,1], 5: [2,2], 6: [2,3],
        7: [3,1], 8: [3,2], 9: [3,3]
    };
    return map[pos];
}

function render() {
    const cells = document.querySelectorAll(".cell");
    cells.forEach(cell => {
        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);
        cell.textContent = board[r][c] || "";
    });
}

function checkWinner(player) {
    const lines = [
        [[1,1],[1,2],[1,3]],
        [[2,1],[2,2],[2,3]],
        [[3,1],[3,2],[3,3]],
        [[1,1],[2,1],[3,1]],
        [[1,2],[2,2],[3,2]],
        [[1,3],[2,3],[3,3]],
        [[1,1],[2,2],[3,3]],
        [[1,3],[2,2],[3,1]]
    ];
    return lines.some(line => line.every(([r,c]) => board[r][c] === player));
}

function endGame(message) {
    gameActive = false;
    document.getElementById("status").textContent = message;
}

document.getElementById("reset-btn").addEventListener("click", initGame);
