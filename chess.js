// ==UserScript==
// @name         kwy Chess Bot
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  LiquidGlass is a chess bot using Stockfish to suggest and optionally auto-play moves on Chess.com. Improved UI, glassmorphic design, and fixed auto-play so it only plays for the side you're playing (no dual-side play). Drag to move the panel. Ctrl+B to toggle.
// @author       kwy
// @match        https://www.chess.com/play/*
// @match        https://www.chess.com/game/*
// @license      MIT
// @icon         https://www.google.com/s2/favicons?sz=64&domain=chess.com
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // Delay startup so chess.com has time to initialize
  setTimeout(initLiquidGlass, 2200);

  function initLiquidGlass() {
    try {
      createUI();
      hookBot();
      console.log('LiquidGlass loaded');
      alert('LiquidGlass Loaded!');
    } catch (e) {
      console.error('LiquidGlass init error', e);
    }
  }

  // ------------------ UI ------------------
  function createUI() {
    if (document.getElementById('liquidGlassBot')) return;

    const wrap = document.createElement('div');
    wrap.id = 'liquidGlassBot';
    wrap.innerHTML = `
      <div id="lg-header">
        <div id="lg-title">kwy404</div>
        <div id="lg-controls">
          <button id="lg-toggle">Hide</button>
        </div>
      </div>
      <div id="lg-body">
        <div class="lg-row"><label>Enable Bot</label><input id="lg-enable" type="checkbox"></div>
        <div class="lg-row"><label>Auto Move</label><input id="lg-auto" type="checkbox"></div>
        <div class="lg-row"><label>Bot Power (depth)</label><input id="lg-depth" type="range" min="6" max="24" value="12"></div>
        <div class="lg-row"><label>Auto Move Speed</label><input id="lg-speed" type="range" min="1" max="8" value="4"></div>
        <div class="lg-row"><label>Update Interval</label><input id="lg-update" type="range" min="2" max="12" value="8"></div>
        <div class="lg-info">
          <div>Player: <span id="lg-player">-</span></div>
          <div>Side to Move: <span id="lg-side">-</span></div>
          <div>Evaluation: <span id="lg-eval">-</span></div>
          <div>Best Move: <span id="lg-best">-</span></div>
        </div>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      #liquidGlassBot{
        position: absolute; top: 80px; left: 90px; width: 360px; z-index: 1000000; font-family: Inter, system-ui, monospace; user-select: none;
        border-radius: 14px; overflow: hidden; backdrop-filter: blur(8px) saturate(140%);
        background: linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
        border: 1px solid rgba(255,255,255,0.06); box-shadow: 0 8px 30px rgba(0,0,0,0.4);
      }
      #lg-header{ display:flex; align-items:center; justify-content:space-between; padding:10px 12px; cursor:grab; }
      #lg-title{ font-weight:600; color:#e9f0ff; font-size:16px; }
      #lg-controls button{ padding:6px 8px; border-radius:8px; border:none; background:rgba(255,255,255,0.06); color:#e9f0ff; cursor:pointer }
      #lg-body{ padding:12px; color:#dfe7ff }
      .lg-row{ display:flex; align-items:center; justify-content:space-between; margin-bottom:10px }
      .lg-row label{ flex:1 }
      .lg-row input[type=range]{ flex:1; margin-left:10px }
      .lg-row input[type=checkbox]{ transform:scale(1.15); margin-left:8px }
      .lg-info{ margin-top:8px; font-size:13px; display:grid; grid-template-columns:1fr 1fr; gap:6px }
      .lg-info div{ background:rgba(0,0,0,0.15); padding:8px; border-radius:8px; }
    `;

    document.body.appendChild(style);
    document.body.appendChild(wrap);

    // append content after style so innerHTML is parsed
    const container = document.getElementById('liquidGlassBot');
    container.addEventListener('mousedown', startDrag);

    // controls
    const btnToggle = container.querySelector('#lg-toggle');
    btnToggle.addEventListener('click', () => {
      const body = container.querySelector('#lg-body');
      const hidden = body.style.display === 'none';
      body.style.display = hidden ? 'block' : 'none';
      btnToggle.textContent = hidden ? 'Hide' : 'Show';
    });

    // keyboard ctrl+b
    document.addEventListener('keyup', (e) => {
      if (e.key.toLowerCase() === 'b' && e.ctrlKey) {
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
      }
    });

    // expose controls to window for bot code
    window.LGB = {
      enableEl: container.querySelector('#lg-enable'),
      autoEl: container.querySelector('#lg-auto'),
      depthEl: container.querySelector('#lg-depth'),
      speedEl: container.querySelector('#lg-speed'),
      updateEl: container.querySelector('#lg-update'),
      playerEl: container.querySelector('#lg-player'),
      sideEl: container.querySelector('#lg-side'),
      evalEl: container.querySelector('#lg-eval'),
      bestEl: container.querySelector('#lg-best')
    };

    // initial states
    window.LGB.enableEl.checked = false;
    window.LGB.autoEl.checked = false;
  }

  // simple drag implementation
  let dragOffset = { x: 0, y: 0 }, dragging = false;
  function startDrag(e) {
    const root = document.getElementById('liquidGlassBot');
    if (!root) return;
    // only start drag if header area clicked
    const header = root.querySelector('#lg-header');
    if (!header.contains(e.target)) return;
    dragging = true;
    dragOffset.x = e.clientX - root.offsetLeft;
    dragOffset.y = e.clientY - root.offsetTop;
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', endDrag);
  }
  function onDrag(e) {
    if (!dragging) return;
    const root = document.getElementById('liquidGlassBot');
    root.style.left = (e.clientX - dragOffset.x) + 'px';
    root.style.top = (e.clientY - dragOffset.y) + 'px';
  }
  function endDrag() {
    dragging = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
  }

  // ------------------ Bot Logic ------------------
  function hookBot() {
    // drawing canvas overlay for move suggestion
    function getBoardElement() {
      return document.querySelector('.board') || document.querySelector('[data-cy="board"]') || null;
    }

    const board = getBoardElement();
    if (!board) {
      console.warn('LiquidGlass: chess.com board not found yet. Will retry.');
      setTimeout(hookBot, 1800);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = 0; canvas.style.left = 0; canvas.style.pointerEvents = 'none';
    canvas.width = board.clientWidth; canvas.height = board.clientHeight;
    board.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // keep canvas sized to board
    new ResizeObserver(() => {
      canvas.width = board.clientWidth; canvas.height = board.clientHeight;
    }).observe(board);

    // state
    window.LGState = {
      bestMove: null,
      evaluation: null,
      lastFEN: null,
      running: true
    };

    async function updateCycle() {
      try {
        const enable = window.LGB && window.LGB.enableEl && window.LGB.enableEl.checked;
        if (!enable) {
          clearCanvas();
          setTimeout(updateCycle, 1000);
          return;
        }

        // attempt to get game instance from board
        const game = board.game || (board.__vue__ && board.__vue__.game) || null; // try few possibilities
        if (!game || typeof game.getFEN !== 'function') {
          // fallback: try to find a global game object on the page
          const globalGame = window.game || window.chessGame || null;
          if (globalGame && typeof globalGame.getFEN === 'function') {
            runWithGame(globalGame);
          } else {
            // can't find API; wait and retry
            setTimeout(updateCycle, 1200);
          }
          return;
        }

        runWithGame(game);
      } catch (err) {
        console.error('LiquidGlass updateCycle error', err);
        setTimeout(updateCycle, 1200);
      }
    }

    function runWithGame(game) {
      try {
        const fen = safe(() => game.getFEN()) || null;
        if (!fen) return setTimeout(updateCycle, 1000);

        // update displayed player and side
        const playingAs = safe(() => game.getPlayingAs()); // 1 for white in original script
        const isUserWhite = (playingAs === 1 || playingAs === 'white' || playingAs === 'w');
        const activeColor = fen.split(' ')[1] || 'w'; // 'w' or 'b'
        const sideToMove = activeColor === 'w' ? 'white' : 'black';
        if (window.LGB && window.LGB.playerEl) window.LGB.playerEl.textContent = isUserWhite ? 'White' : 'Black';
        if (window.LGB && window.LGB.sideEl) window.LGB.sideEl.textContent = sideToMove;

        // remember last FEN
        window.LGState.lastFEN = fen;

        // query engine only if different position or on interval
        const depth = parseInt(window.LGB.depthEl.value || 12, 10);
        const updateInterval = Math.max(2, 13 - parseInt(window.LGB.updateEl.value || 8, 10)); // smaller value = faster

        // call engine API
        fetchBestMove(fen, depth).then(data => {
          if (!data) return;
          window.LGState.bestMove = normalizeBestmove(data.bestmove || data.move || '');
          window.LGState.evaluation = data.evaluation || data.eval || data.score || null;
          // update UI fields
          if (window.LGB && window.LGB.evalEl) window.LGB.evalEl.textContent = formatEval(window.LGState.evaluation);
          if (window.LGB && window.LGB.bestEl) window.LGB.bestEl.textContent = window.LGState.bestMove || '-';
          drawSuggestion(window.LGState.bestMove, isUserWhite, canvas, ctx, game);

          // Auto-play logic: only auto-play if:
          // 1) Auto Move checked
          // 2) The side to move matches the side the user is playing
          // 3) There is a legal matching move
          const auto = window.LGB && window.LGB.autoEl && window.LGB.autoEl.checked;
          const userColor = isUserWhite ? 'w' : 'b';
          if (auto && userColor === activeColor && window.LGState.bestMove) {
            attemptAutoPlay(game, window.LGState.bestMove);
          }
        }).catch(err => console.error('fetchBestMove error', err));

        setTimeout(updateCycle, updateInterval * 750);
      } catch (e) {
        console.error('runWithGame error', e);
        setTimeout(updateCycle, 1200);
      }
    }

    updateCycle();

    // helper: safely call fn
    function safe(fn) { try { return fn(); } catch (e) { return null; } }

    // normalize bestmove string (accepts "bestmove e2e4" or "e2e4")
    function normalizeBestmove(raw) {
      if (!raw) return null;
      raw = String(raw).trim();
      if (raw.indexOf(' ') >= 0) raw = raw.split(' ')[1];
      // remove possible trailing chars
      raw = raw.replace(/[^a-h1-8]/g, '');
      if (raw.length < 4) return null;
      return raw.substr(0,4);
    }

    // fetch best move from Stockfish API (or fallback to simple local evaluation if desired)
    async function fetchBestMove(fen, depth) {
      try {
        // example public endpoint used by original script
        const url = `https://stockfish.online/api/s/v2.php?fen=${encodeURIComponent(fen)}&depth=${encodeURIComponent(depth)}`;
        const res = await fetch(url, { method: 'GET' });
        if (!res.ok) throw new Error('engine responded ' + res.status);
        const data = await res.json();
        return data;
      } catch (e) {
        console.warn('Stockfish API failed, returning null', e);
        return null;
      }
    }

    // attempt to auto-play the best move, ensure it's legal and only on user's turn
    function attemptAutoPlay(game, bestmove) {
      try {
        if (!bestmove) return;
        // bestmove is like e2e4
        const from = bestmove.slice(0,2);
        const to = bestmove.slice(2,4);
        const legalMoves = safe(() => game.getLegalMoves()) || [];
        const match = legalMoves.find(m => (m.from === from && m.to === to) || (m.san && m.san.includes(from) && m.san.includes(to)));
        if (!match) return; // not legal here

        // ensure it's user's turn by checking FEN active color again
        const fen = safe(() => game.getFEN()) || '';
        const active = (fen.split(' ')[1] || 'w');
        const playingAs = safe(() => game.getPlayingAs());
        const isUserWhite = (playingAs === 1 || playingAs === 'white' || playingAs === 'w');
        if ((isUserWhite && active !== 'w') || (!isUserWhite && active !== 'b')) return; // not user's turn

        // perform the move after a small delay based on speed setting
        const speed = parseInt(window.LGB.speedEl.value || 4, 10);
        const delay = Math.max(300, 1500 - speed * 150);
        setTimeout(() => {
          try {
            // use game's move API; set animate false and userGenerated true if supported
            if (typeof game.move === 'function') {
              game.move({ ...match, promotion: match.promotion || false, animate: false, userGenerated: true });
            } else if (typeof match.move === 'function') {
              match.move();
            } else {
              // fallback: attempt to click source and target squares (best effort)
              clickSquare(from);
              setTimeout(() => clickSquare(to), 120);
            }
          } catch (e) { console.error('Auto-play error', e); }
        }, delay);
      } catch (e) { console.error('attemptAutoPlay error', e); }
    }

    // best-effort click square (for fallback when game.move isn't available)
    function clickSquare(coord) {
      try {
        // squares on chess.com often have data-square attribute like data-square="e2"
        const sq = board.querySelector(`[data-square="${coord}"]`) || board.querySelector(`.square-${coord}`) || null;
        if (!sq) return;
        sq.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        sq.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        sq.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      } catch (e) { /* ignore */ }
    }

    function formatEval(val) {
      if (val === null || val === undefined) return '-';
      if (typeof val === 'object') {
        if (val.cp !== undefined) return (val.cp / 100).toFixed(2);
        if (val.mate !== undefined) return '#'+val.mate;
      }
      if (typeof val === 'number') return (val/100).toFixed(2);
      return String(val);
    }

    // draw suggestion arrow
    function drawSuggestion(bestmove, isUserWhite, canvas, ctx, game) {
      clearCanvas();
      if (!bestmove) return;
      // compute coordinates
      const letters = ['a','b','c','d','e','f','g','h'];
      const tile = canvas.clientWidth / 8;
      const x1 = letters.indexOf(bestmove[0]);
      const y1 = 8 - Number(bestmove[1]);
      const x2 = letters.indexOf(bestmove[2]);
      const y2 = 8 - Number(bestmove[3]);
      // rotate if board is flipped for black player
      const playingAs = safe(() => game.getPlayingAs());
      const userWhite = (playingAs === 1 || playingAs === 'white' || playingAs === 'w');
      const flipped = !userWhite;
      const toCanvasX = (x) => (flipped ? (7 - x) : x) * tile + tile/2;
      const toCanvasY = (y) => (flipped ? (7 - y) : y) * tile + tile/2;

      ctx.beginPath();
      ctx.moveTo(toCanvasX(x1), toCanvasY(y1));
      ctx.lineTo(toCanvasX(x2), toCanvasY(y2));
      ctx.lineWidth = Math.max(6, tile/6);
      ctx.strokeStyle = 'rgba(0,255,128,0.45)';
      ctx.lineCap = 'round';
      ctx.stroke();

      // dot at target
      ctx.beginPath();
      ctx.arc(toCanvasX(x2), toCanvasY(y2), Math.max(6, tile/8), 0, Math.PI*2);
      ctx.fillStyle = 'rgba(0,255,128,0.35)';
      ctx.fill();
    }

    function clearCanvas() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
    }
  }
})();
