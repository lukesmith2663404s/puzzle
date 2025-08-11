:root {
  --bg: #f7fafc;
  --card: #ffffff;
  --muted: #6b7280;
  --accent: #0b7285;
  --cell-size: 76px;
  --gap: 8px;
}

* { box-sizing: border-box; }
body {
  font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
  background: var(--bg);
  color: #0f172a;
  margin: 0;
  padding: 28px;
  display: flex;
  justify-content: center;
}

.container { width: 920px; max-width: 96%; }

header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 14px; }
h1 { margin: 0; font-size: 20px; }
.subtitle { margin: 0; color: var(--muted); font-size: 13px; }

.card {
  background: var(--card);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 6px 18px rgba(12,20,30,0.06);
  margin-bottom: 14px;
}

.row { display:flex; gap: 10px; align-items:center; }
input[type="text"], input[type="search"], input[type="text"] {
  padding: 10px 12px;
  font-size: 15px;
  border-radius: 8px;
  border: 1px solid #e6eef0;
  min-width: 220px;
}
button {
  padding: 10px 14px;
  background: var(--accent);
  color: #fff;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}
.hint { color: var(--muted); margin-top: 8px; font-size: 13px; }

.small { color: var(--muted); margin-bottom: 8px; }

/* BOARD GRID */
.board {
  display: grid;
  grid-template-columns: repeat(5, var(--cell-size));
  grid-template-rows: repeat(5, var(--cell-size));
  gap: var(--gap);
  justify-content: center;
  margin: 18px auto;
  width: calc(5 * var(--cell-size) + 4 * var(--gap));
  user-select: none;
}

/* each cell */
.cell {
  width: var(--cell-size);
  height: var(--cell-size);
  display:flex;
  align-items:center;
  justify-content:center;
  font-size: 34px;
  font-weight: 700;
  border-radius: 8px;
  transition: background .12s, transform .08s;
  box-shadow: 0 1px 0 rgba(0,0,0,0.02) inset;
  border: 0;
}

/* centre visible cells visual style */
.center {
  background: #f0f6f7;
  border: 1px solid #e1ecee;
  cursor: pointer;
  color: #073642;
}
.center:hover { transform: translateY(-3px); }

/* outer cells: invisible placeholders until reveal */
.outer-cell {
  visibility: hidden;          /* invisible (preserves grid layout) */
  pointer-events: none;        /* not clickable */
  background: transparent;
}

/* when we want to reveal an outer cell's marker, we add .revealed */
.revealed {
  visibility: visible;
  pointer-events: none;
  background: transparent;
}

/* X/O colors */
.x { color: #0b3b44; }
.o { color: #0b725e; }

/* controls area */
.controls { display:flex; align-items:center; gap:12px; margin-top:6px; }
.status { font-weight: 600; min-height: 20px; color: #0f172a; }
.spacer { flex: 1; }

/* placeholders */
.placeholder { padding: 12px; border-radius: 8px; background: #fff; border: 1px dashed #eee; margin-top:8px; text-align:left; }
.hidden { display:none; }
