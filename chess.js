// ==UserScript==
// @name kwy Chess Bot
// @namespace http://tampermonkey.net/
// @version 1.6
// @description Chess.com assistant
// @author kwy
// @match https://www.chess.com/play/*
// @match https://www.chess.com/game/*
// @license MIT
// @icon https://www.google.com/s2/favicons?sz=64&domain=chess.com
// @grant none
// ==/UserScript==
(function () {
  'use strict';
  // Start after a short delay so chess.com initializes
  setTimeout(initBot, 1800);
  function initBot() {
    try {
      createUI();
      hookBot();
      console.log('kwy Chess Bot loaded');
      // Use a subtle console message instead of alert to avoid annoyance
    } catch (e) {
      console.error('kwy init error', e);
    }
  }
  // ---------- UI (Stripe inspired, purple/black dark theme) ----------
  function createUI() {
    if (document.getElementById('kwyChessBot')) return;
    const wrap = document.createElement('div');
    wrap.id = 'kwyChessBot';
    wrap.innerHTML = `
      <div id="kwy-header">
        <div id="kwy-brand">
          <div id="kwy-logo">kwy</div>
          <div id="kwy-title">Smart Assist</div>
        </div>
        <div id="kwy-actions">
          <button id="kwy-toggle">Hide</button>
        </div>
      </div>
      <div id="kwy-body">
        <div class="kwy-row">
          <label class="kwy-label">Enable Bot</label>
          <input id="kwy-enable" type="checkbox" />
        </div>
        <div class="kwy-row">
          <label class="kwy-label">Auto Move</label>
          <input id="kwy-auto" type="checkbox" />
        </div>
        <div class="kwy-row">
          <label class="kwy-label">Requested Depth</label>
          <input id="kwy-depth" type="range" min="6" max="28" value="12" />
          <div id="kwy-depthVal">12</div>
        </div>
        <div class="kwy-row">
          <label class="kwy-label">Auto Move Speed</label>
          <input id="kwy-speed" type="range" min="1" max="8" value="4" />
        </div>
        <div class="kwy-row">
          <label class="kwy-label">Update Interval</label>
          <input id="kwy-update" type="range" min="2" max="12" value="8" />
        </div>
        <div id="kwy-infoCard">
          <div class="kwy-infoRow"><span class="kwy-infoLabel">Player</span><span id="kwy-player">-</span></div>
          <div class="kwy-infoRow"><span class="kwy-infoLabel">Side to Move</span><span id="kwy-side">-</span></div>
          <div class="kwy-infoRow"><span class="kwy-infoLabel">Game Status</span><span id="kwy-status">-</span></div>
          <div class="kwy-infoRow"><span class="kwy-infoLabel">Evaluation</span><span id="kwy-eval">-</span></div>
          <div class="kwy-infoRow"><span class="kwy-infoLabel">Best Move</span><span id="kwy-best">-</span></div>
          <div class="kwy-infoRow"><span class="kwy-infoLabel">Depth (used)</span><span id="kwy-depthUsed">-</span></div>
        </div>
        <div style="margin-top:10px; font-size:12px; color:#a0a0a0">Tip: Ctrl+B to show/hide. Auto move only plays for your color. Validates new/in-game status.</div>
      </div>
    `;
    const style = document.createElement('style');
    style.textContent = `
      /* Container */
      #kwyChessBot {
        position: absolute;
        top: 70px;
        left: 80px;
        width: 340px;
        z-index: 1000000;
        font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
        user-select: none;
        border-radius: 12px;
        box-shadow: 0 6px 20px rgba(99, 91, 255, 0.18);
        background: #121212;
        border: 1px solid #2a2a2a;
        color: #e0e0e0;
        overflow: hidden;
      }
      /* Header - Stripe lightweight brand, dark purple */
      #kwy-header {
        display:flex;
        align-items:center;
        justify-content:space-between;
        padding:12px;
        background: linear-gradient(90deg, #1f1f1f, #252525);
        border-bottom: 1px solid #2a2a2a;
        cursor: grab;
      }
      #kwy-brand { display:flex; align-items:center; gap:10px; }
      #kwy-logo {
        width:36px; height:36px; border-radius:8px;
        background: linear-gradient(180deg,#635bff,#4338ca);
        color:white; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:16px;
        box-shadow: 0 3px 8px rgba(99,91,255,0.18);
      }
      #kwy-title { font-weight:600; color:#ffffff; font-size:15px; }
      #kwy-actions button {
        background: #635bff; color: white; border: none; border-radius:8px; padding:6px 10px; cursor:pointer; font-weight:600;
        box-shadow: 0 4px 12px rgba(99,91,255,0.14);
      }
      #kwy-actions button:active { transform: translateY(1px); }
      /* Body */
      #kwy-body { padding:12px; }
      .kwy-row { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
      .kwy-label { width:120px; color:#a0a0a0; font-size:13px; }
      #kwy-depthVal { min-width:30px; text-align:center; color:#a0a0a0; font-weight:700; }
      input[type="range"] { flex:1; }
      input[type="checkbox"] { transform: scale(1.1); }
      /* Info card */
      #kwy-infoCard {
        margin-top:10px;
        border-radius:8px;
        padding:10px;
        background: linear-gradient(180deg,#1e1e1e,#181818);
        border:1px solid #2a2a2a;
      }
      .kwy-infoRow { display:flex; justify-content:space-between; padding:6px 2px; font-size:13px; color:#e0e0e0; }
      .kwy-infoLabel { color:#808080; }
      /* Small responsive */
      @media (max-width:720px) {
        #kwyChessBot { left:10px; top:80px; width:300px; }
      }
    `;
    document.body.appendChild(style);
    document.body.appendChild(wrap);
    // make it draggable
    const container = document.getElementById('kwyChessBot');
    container.addEventListener('mousedown', startDrag);
    // Toggle hide/show
    const btnToggle = container.querySelector('#kwy-toggle');
    btnToggle.addEventListener('click', () => {
      const body = container.querySelector('#kwy-body');
      const hidden = body.style.display === 'none';
      body.style.display = hidden ? 'block' : 'none';
      btnToggle.textContent = hidden ? 'Hide' : 'Show';
    });
    // Ctrl+B shortcut
    document.addEventListener('keyup', (e) => {
      if (e.key.toLowerCase() === 'b' && e.ctrlKey) {
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
      }
    });
    // expose controls
    window.KWY = {
      enableEl: container.querySelector('#kwy-enable'),
      autoEl: container.querySelector('#kwy-auto'),
      depthEl: container.querySelector('#kwy-depth'),
      speedEl: container.querySelector('#kwy-speed'),
      updateEl: container.querySelector('#kwy-update'),
      playerEl: container.querySelector('#kwy-player'),
      sideEl: container.querySelector('#kwy-side'),
      statusEl: container.querySelector('#kwy-status'),
      evalEl: container.querySelector('#kwy-eval'),
      bestEl: container.querySelector('#kwy-best'),
      depthValEl: container.querySelector('#kwy-depthVal'),
      depthUsedEl: container.querySelector('#kwy-depthUsed')
    };
    // initialize values and events
    const depthSlider = document.getElementById('kwy-depth');
    const depthVal = document.getElementById('kwy-depthVal');
    depthVal.textContent = depthSlider.value;
    depthSlider.addEventListener('input', () => {
      depthVal.textContent = depthSlider.value;
    });
    // ensure defaults
    if (window.KWY && window.KWY.enableEl) window.KWY.enableEl.checked = false;
    if (window.KWY && window.KWY.autoEl) window.KWY.autoEl.checked = false;
  }
  // ---------- Drag helpers ----------
  let dragging = false, dragOffset = {x:0,y:0};
  function startDrag(e) {
    const root = document.getElementById('kwyChessBot');
    if (!root) return;
    const header = root.querySelector('#kwy-header');
    if (!header.contains(e.target)) return;
    dragging = true;
    dragOffset.x = e.clientX - root.offsetLeft;
    dragOffset.y = e.clientY - root.offsetTop;
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', endDrag);
  }
  function onDrag(e) {
    if (!dragging) return;
    const root = document.getElementById('kwyChessBot');
    root.style.left = (e.clientX - dragOffset.x) + 'px';
    root.style.top = (e.clientY - dragOffset.y) + 'px';
  }
  function endDrag() {
    dragging = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
  }
  // ---------- Bot core ----------
  function hookBot() {
    function getBoard() {
      return document.querySelector('.board') || document.querySelector('[data-cy="board"]') || null;
    }
    // state
    window.KWYState = {
      bestMove: null,
      evaluation: null,
      lastFEN: null,
      running: true,
      depthInUse: null,
      canvas: null,
      ctx: null,
      resizeObserver: null
    };
    const startingFEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    // main loop
    async function cycle() {
      try {
        const enabled = window.KWY && window.KWY.enableEl && window.KWY.enableEl.checked;
        if (!enabled) {
          clearCanvas();
          setTimeout(cycle, 1000);
          return;
        }
        const board = getBoard();
        if (!board) {
          console.warn('kwy: board not found, retrying...');
          setTimeout(cycle, 1500);
          return;
        }
        // Ensure canvas is attached and sized
        ensureCanvas(board);
        // find game object (several heuristics)
        const game = board.game || (board.__vue__ && board.__vue__.game) || window.game || window.chessGame || null;
        if (!game || typeof safe(() => game.getFEN) !== 'function') {
          updateStatus('No Game Detected');
          setTimeout(cycle, 1200);
          return;
        }
        const fen = safe(() => game.getFEN()) || null;
        if (!fen) {
          updateStatus('No Game Detected');
          return setTimeout(cycle, 1000);
        }
        // Validate game status
        let status = 'In Progress';
        if (fen === startingFEN && window.KWYState.lastFEN !== fen) {
          status = 'New Game Started';
          console.log('kwy: New game detected');
          // Reset state for new game
          window.KWYState.bestMove = null;
          window.KWYState.evaluation = null;
          window.KWYState.depthInUse = null;
          clearCanvas();
        } else if (document.querySelector('.game-over') || document.querySelector('[data-cy="game-over"]')) {
          status = 'Game Over';
        }
        updateStatus(status);
        window.KWYState.lastFEN = fen;
        const playingAs = safe(() => game.getPlayingAs());
        const isUserWhite = (playingAs === 1 || playingAs === 'white' || playingAs === 'w');
        const activeColor = fen.split(' ')[1] || 'w';
        const sideToMove = activeColor === 'w' ? 'white' : 'black';
        // update UI
        if (window.KWY && window.KWY.playerEl) window.KWY.playerEl.textContent = isUserWhite ? 'White' : 'Black';
        if (window.KWY && window.KWY.sideEl) window.KWY.sideEl.textContent = sideToMove;
        // requested depth
        const requestedDepth = parseInt((window.KWY && window.KWY.depthEl && window.KWY.depthEl.value) || 12, 10);
        // adaptive fetch - try requested depth, if API fails reduce depth progressively
        const effective = await fetchBestMoveAdaptive(fen, requestedDepth);
        if (!effective) {
          // engine failed entirely
          setTimeout(cycle, 1200);
          return;
        }
        const moveData = normalizeMove(effective.bestmove || effective.move || '');
        window.KWYState.bestMove = moveData;
        window.KWYState.evaluation = effective.evaluation || effective.eval || effective.score || null;
        window.KWYState.depthInUse = effective.depthUsed || effective.depth || requestedDepth;
        // update UI values
        if (window.KWY && window.KWY.evalEl) window.KWY.evalEl.textContent = formatEval(window.KWYState.evaluation);
        if (window.KWY && window.KWY.bestEl) window.KWY.bestEl.textContent = moveData ? (moveData.from + moveData.to + (moveData.promotion || '')) : '-';
        if (window.KWY && window.KWY.depthUsedEl) window.KWY.depthUsedEl.textContent = window.KWYState.depthInUse;
        // draw suggestion (only on board)
        drawSuggestion(moveData, isUserWhite, game);
        // attempt auto-play only if:
        // - Auto enabled
        // - It's the user's color to move
        // - Best move legal
        // - Status is In Progress or New Game
        const auto = window.KWY && window.KWY.autoEl && window.KWY.autoEl.checked;
        const userColor = isUserWhite ? 'w' : 'b';
        if (auto && userColor === activeColor && moveData && (status === 'In Progress' || status === 'New Game Started')) {
          attemptAutoPlay(game, moveData, isUserWhite);
        }
        // schedule next cycle (update slider smaller -> faster)
        const uiInterval = Math.max(2, 13 - parseInt((window.KWY && window.KWY.updateEl && window.KWY.updateEl.value) || 8, 10));
        setTimeout(cycle, uiInterval * 700);
      } catch (err) {
        console.error('kwy cycle error', err);
        setTimeout(cycle, 1200);
      }
    } // end cycle
    cycle();
    // ---------- helpers ----------
    // safe call wrapper
    function safe(fn) { try { return fn(); } catch (e) { return null; } }
    // Update status in UI
    function updateStatus(text) {
      if (window.KWY && window.KWY.statusEl) window.KWY.statusEl.textContent = text;
    }
    // Normalize moves like "bestmove e2e4" or "e7e8q"
    function normalizeMove(raw) {
      if (!raw) return null;
      raw = String(raw).trim();
      if (raw.indexOf(' ') >= 0) raw = raw.split(' ')[1];
      raw = raw.replace(/[^a-h1-8qbrn]/g, ''); // allow promotion letters
      if (raw.length < 4) return null;
      const from = raw.substr(0,2);
      const to = raw.substr(2,2);
      const promotion = raw.length > 4 ? raw[4].toLowerCase() : null;
      return { from, to, promotion };
    }
    // Format evaluation object/number
    function formatEval(val) {
      if (val === null || val === undefined) return '-';
      if (typeof val === 'object') {
        if (val.cp !== undefined) return (val.cp / 100).toFixed(2);
        if (val.mate !== undefined) return '#'+val.mate;
      }
      if (typeof val === 'number') return (val/100).toFixed(2);
      return String(val);
    }
    // Ensure canvas is created and attached
    function ensureCanvas(board) {
      if (window.KWYState.canvas && window.KWYState.canvas.parentNode === board) {
        // Resize if needed
        window.KWYState.canvas.width = board.clientWidth;
        window.KWYState.canvas.height = board.clientHeight;
        return;
      }
      // Clean up old
      if (window.KWYState.resizeObserver) window.KWYState.resizeObserver.disconnect();
      if (window.KWYState.canvas) window.KWYState.canvas.remove();
      // Create new
      const canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.top = 0; canvas.style.left = 0;
      canvas.style.pointerEvents = 'none';
      canvas.width = board.clientWidth; canvas.height = board.clientHeight;
      board.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      window.KWYState.canvas = canvas;
      window.KWYState.ctx = ctx;
      // Observe resize
      window.KWYState.resizeObserver = new ResizeObserver(() => {
        canvas.width = board.clientWidth; canvas.height = board.clientHeight;
        // Redraw if needed
        if (window.KWYState.bestMove) {
          const game = board.game || (board.__vue__ && board.__vue__.game) || window.game || window.chessGame || null;
          const playingAs = safe(() => game.getPlayingAs());
          const isUserWhite = (playingAs === 1 || playingAs === 'white' || playingAs === 'w');
          drawSuggestion(window.KWYState.bestMove, isUserWhite, game);
        }
      });
      window.KWYState.resizeObserver.observe(board);
    }
    // Attempt auto-play, verifying legal moves and user's turn
    function attemptAutoPlay(game, moveData, isUserWhite) {
      try {
        if (!moveData) return;
        const { from, to, promotion } = moveData;
        const legalMoves = safe(() => game.getLegalMoves()) || [];
        const match = legalMoves.find(m => m.from === from && m.to === to && (promotion ? m.promotion === promotion : !m.promotion));
        if (!match) return; // not legal
        // ensure it's still user's turn
        const fen = safe(() => game.getFEN()) || '';
        const active = (fen.split(' ')[1] || 'w');
        const playingAs = safe(() => game.getPlayingAs());
        const isWhite = (playingAs === 1 || playingAs === 'white' || playingAs === 'w');
        if ((isWhite && active !== 'w') || (!isWhite && active !== 'b')) return;
        // schedule move using speed slider (higher speed -> smaller delay)
        const speed = parseInt((window.KWY && window.KWY.speedEl && window.KWY.speedEl.value) || 4, 10);
        const delay = Math.max(220, 1500 - speed * 150);
        setTimeout(() => {
          try {
            if (typeof game.move === 'function') {
              game.move({ ...match, animate: false, userGenerated: true });
            } else if (typeof match.move === 'function') {
              match.move();
            } else {
              // fallback to simulating drag
              simulateDrag(from, to);
              if (promotion) {
                // Handle promotion UI if needed
                setTimeout(() => selectPromotion(promotion, isWhite), 200);
              }
            }
          } catch (e) {
            console.error('kwy auto-play error', e);
          }
        }, delay);
      } catch (e) {
        console.error('kwy attemptAutoPlay error', e);
      }
    }
    // Simulate drag for move
    function simulateDrag(fromCoord, toCoord) {
      try {
        const fromSq = getSquareElement(fromCoord);
        const toSq = getSquareElement(toCoord);
        if (!fromSq || !toSq) return;
        const fromRect = fromSq.getBoundingClientRect();
        const toRect = toSq.getBoundingClientRect();
        // Mousedown on from
        const downEvt = new MouseEvent('mousedown', {
          bubbles: true,
          clientX: fromRect.left + fromRect.width / 2,
          clientY: fromRect.top + fromRect.height / 2
        });
        fromSq.dispatchEvent(downEvt);
        // Mousemove to to
        setTimeout(() => {
          const moveEvt = new MouseEvent('mousemove', {
            bubbles: true,
            clientX: toRect.left + toRect.width / 2,
            clientY: toRect.top + toRect.height / 2
          });
          document.dispatchEvent(moveEvt);
          // Mouseup on to
          setTimeout(() => {
            const upEvt = new MouseEvent('mouseup', {
              bubbles: true,
              clientX: toRect.left + toRect.width / 2,
              clientY: toRect.top + toRect.height / 2
            });
            toSq.dispatchEvent(upEvt);
          }, 50);
        }, 50);
      } catch (e) { /* ignore */ }
    }
    // Get square element
    function getSquareElement(coord) {
      const file = coord.charCodeAt(0) - 96;
      const rank = coord[1];
      return document.querySelector(`.square-${file}${rank}`);
    }
    // best-effort select promotion (if UI appears)
    function selectPromotion(promo, isWhite) {
      try {
        const color = isWhite ? 'w' : 'b';
        const piece = color + promo;
        const el = document.querySelector(`.promotion-piece-${piece}`);
        if (el) el.click();
      } catch (e) { /* ignore */ }
    }
    // Draw suggestion arrow and dot
    function drawSuggestion(moveData, isUserWhite, game) {
      clearCanvas();
      if (!moveData || !window.KWYState.ctx) return;
      const { from, to } = moveData;
      const letters = ['a','b','c','d','e','f','g','h'];
      const tile = window.KWYState.canvas.clientWidth / 8;
      const x1 = letters.indexOf(from[0]);
      const y1 = 8 - Number(from[1]);
      const x2 = letters.indexOf(to[0]);
      const y2 = 8 - Number(to[1]);
      // determine flip using actual board orientation (playingAs)
      const playingAs = safe(() => game.getPlayingAs());
      const userWhite = (playingAs === 1 || playingAs === 'white' || playingAs === 'w');
      const flipped = !userWhite;
      const toCanvasX = (x) => (flipped ? (7 - x) : x) * tile + tile/2;
      const toCanvasY = (y) => (flipped ? (7 - y) : y) * tile + tile/2;
      const ctx = window.KWYState.ctx;
      ctx.beginPath();
      ctx.moveTo(toCanvasX(x1), toCanvasY(y1));
      ctx.lineTo(toCanvasX(x2), toCanvasY(y2));
      ctx.lineWidth = Math.max(6, tile/6);
      ctx.strokeStyle = 'rgba(99,91,255,0.95)'; // Stripe purple accent
      ctx.lineCap = 'round';
      ctx.stroke();
      // endpoint circle
      ctx.beginPath();
      ctx.arc(toCanvasX(x2), toCanvasY(y2), Math.max(6, tile/8), 0, Math.PI*2);
      ctx.fillStyle = 'rgba(99,91,255,0.18)';
      ctx.fill();
    }
    function clearCanvas() {
      if (window.KWYState.ctx) window.KWYState.ctx.clearRect(0,0,window.KWYState.canvas.width,window.KWYState.canvas.height);
    }
    // Adaptive fetch: attempt requested depth, if engine returns error reduce depth until success or minDepth
    async function fetchBestMoveAdaptive(fen, requestedDepth) {
      const minDepth = 6;
      const step = 2; // reduce by 2 each attempt to converge faster
      // clamp requestedDepth to reasonable bounds (UI max is 28)
      let depth = Math.max(minDepth, Math.min(28, parseInt(requestedDepth || 12, 10)));
      // try descending depths until success or minimum reached
      while (depth >= minDepth) {
        try {
          const res = await fetchBestMove(fen, depth);
          if (!res) {
            // treat as failure -> try lower depth
            depth -= step;
            continue;
          }
          // some APIs include explicit error fields or status - check common patterns
          if (res.error || res.status === 'error' || res.code >= 400) {
            // API signalled error (maybe depth too large)
            depth -= step;
            continue;
          }
          // success: attach depthUsed info for display
          res.depthUsed = depth;
          return res;
        } catch (e) {
          // network or parsing error -> try lower depth
          depth -= step;
        }
      }
      // failed to get any usable response
      return null;
    }
    // fetch from public Stockfish endpoint (originally used)
    async function fetchBestMove(fen, depth) {
      try {
        const url = `https://stockfish.online/api/s/v2.php?fen=${encodeURIComponent(fen)}&depth=${encodeURIComponent(depth)}`;
        const r = await fetch(url, { method: 'GET' });
        if (!r.ok) {
          // non-2xx status -> return an object signaling error
          return { error: true, code: r.status };
        }
        const data = await r.json();
        return data;
      } catch (e) {
        console.warn('kwy fetchBestMove network error', e);
        return null;
      }
    }
  } // end hookBot
})();
