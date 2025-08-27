// ==UserScript==
// @name         kwy Chess Bot (Pay/Stripe UI & Adaptive Depth)
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Chess.com assistant: clean PayPal/Stripe-like UI, adaptive engine depth (reduces if engine rejects), and safe auto-play only for your side. Drag panel, Ctrl+B to toggle.
// @author       kwy
// @match        https://www.chess.com/play/*
// @match        https://www.chess.com/game/*
// @license      MIT
// @icon         https://www.google.com/s2/favicons?sz=64&domain=chess.com
// @grant        none
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

  // ---------- UI (Pay/Stripe inspired, clean flat design) ----------
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
          <div class="kwy-infoRow"><span class="kwy-infoLabel">Evaluation</span><span id="kwy-eval">-</span></div>
          <div class="kwy-infoRow"><span class="kwy-infoLabel">Best Move</span><span id="kwy-best">-</span></div>
          <div class="kwy-infoRow"><span class="kwy-infoLabel">Depth (used)</span><span id="kwy-depthUsed">-</span></div>
        </div>

        <div style="margin-top:10px; font-size:12px; color:#2e3a59">Tip: Ctrl+B to show/hide. Auto move only plays for your color.</div>
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
        box-shadow: 0 6px 20px rgba(34, 60, 80, 0.18);
        background: #ffffff;
        border: 1px solid #e6eefc;
        color: #1f3550;
        overflow: hidden;
      }

      /* Header - Pay/Stripe lightweight brand */
      #kwy-header {
        display:flex;
        align-items:center;
        justify-content:space-between;
        padding:12px;
        background: linear-gradient(90deg, #f7fbff, #f1f6ff);
        border-bottom: 1px solid #e6eefc;
        cursor: grab;
      }
      #kwy-brand { display:flex; align-items:center; gap:10px; }
      #kwy-logo {
        width:36px; height:36px; border-radius:8px;
        background: linear-gradient(180deg,#0070f3,#0057d9);
        color:white; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:16px;
        box-shadow: 0 3px 8px rgba(3,102,214,0.18);
      }
      #kwy-title { font-weight:600; color:#0b2540; font-size:15px; }
      #kwy-actions button {
        background: #0070f3; color: white; border: none; border-radius:8px; padding:6px 10px; cursor:pointer; font-weight:600;
        box-shadow: 0 4px 12px rgba(3,102,214,0.14);
      }
      #kwy-actions button:active { transform: translateY(1px); }

      /* Body */
      #kwy-body { padding:12px; }
      .kwy-row { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
      .kwy-label { width:120px; color:#203049; font-size:13px; }
      #kwy-depthVal { min-width:30px; text-align:center; color:#203049; font-weight:700; }
      input[type="range"] { flex:1; }
      input[type="checkbox"] { transform: scale(1.1); }

      /* Info card */
      #kwy-infoCard {
        margin-top:10px;
        border-radius:8px;
        padding:10px;
        background: linear-gradient(180deg,#fbfdff,#f5f9ff);
        border:1px solid #e6eefc;
      }
      .kwy-infoRow { display:flex; justify-content:space-between; padding:6px 2px; font-size:13px; color:#0b2540; }
      .kwy-infoLabel { color:#6b7c9a; }

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
      depthEl: container.querySelector('#ky-depth') || container.querySelector('#kwy-depth'),
      speedEl: container.querySelector('#kwy-speed'),
      updateEl: container.querySelector('#kwy-update'),
      playerEl: container.querySelector('#kwy-player'),
      sideEl: container.querySelector('#kwy-side'),
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

    const board = getBoard();
    if (!board) {
      console.warn('kwy: board not found, retrying...');
      setTimeout(hookBot, 1500);
      return;
    }

    // overlay canvas
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = 0; canvas.style.left = 0;
    canvas.style.pointerEvents = 'none';
    canvas.width = board.clientWidth; canvas.height = board.clientHeight;
    board.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    new ResizeObserver(() => {
      canvas.width = board.clientWidth; canvas.height = board.clientHeight;
    }).observe(board);

    // state
    window.KWYState = {
      bestMove: null,
      evaluation: null,
      lastFEN: null,
      running: true,
      depthInUse: null
    };

    // main loop
    async function cycle() {
      try {
        const enabled = window.KWY && window.KWY.enableEl && window.KWY.enableEl.checked;
        if (!enabled) {
          clearCanvas();
          setTimeout(cycle, 1000);
          return;
        }

        // find game object (several heuristics)
        const game = board.game || (board.__vue__ && board.__vue__.game) || window.game || window.chessGame || null;
        if (!game || typeof safe(() => game.getFEN) !== 'function') {
          setTimeout(cycle, 1200);
          return;
        }

        const fen = safe(() => game.getFEN()) || null;
        if (!fen) return setTimeout(cycle, 1000);

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

        window.KWYState.bestMove = normalizeMove(effective.bestmove || effective.move || '');
        window.KWYState.evaluation = effective.evaluation || effective.eval || effective.score || null;
        window.KWYState.depthInUse = effective.depthUsed || effective.depth || requestedDepth;

        // update UI values
        if (window.KWY && window.KWY.evalEl) window.KWY.evalEl.textContent = formatEval(window.KWYState.evaluation);
        if (window.KWY && window.KWY.bestEl) window.KWY.bestEl.textContent = window.KWYState.bestMove || '-';
        if (window.KWY && window.KWY.depthUsedEl) window.KWY.depthUsedEl.textContent = window.KWYState.depthInUse;

        // draw suggestion (only on board)
        drawSuggestion(window.KWYState.bestMove, isUserWhite, canvas, ctx, game);

        // attempt auto-play only if:
        // - Auto enabled
        // - It's the user's color to move
        // - Best move legal
        const auto = window.KWY && window.KWY.autoEl && window.KWY.autoEl.checked;
        const userColor = isUserWhite ? 'w' : 'b';
        if (auto && userColor === activeColor && window.KWYState.bestMove) {
          attemptAutoPlay(game, window.KWYState.bestMove);
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

    // Normalize moves like "bestmove e2e4" or "e2e4"
    function normalizeMove(raw) {
      if (!raw) return null;
      raw = String(raw).trim();
      if (raw.indexOf(' ') >= 0) raw = raw.split(' ')[1];
      raw = raw.replace(/[^a-h1-8]/g, '');
      if (raw.length < 4) return null;
      return raw.substr(0,4);
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

    // Attempt auto-play, verifying legal moves and user's turn
    function attemptAutoPlay(game, bestmove) {
      try {
        if (!bestmove) return;
        const from = bestmove.slice(0,2);
        const to = bestmove.slice(2,4);
        const legalMoves = safe(() => game.getLegalMoves()) || [];
        const match = legalMoves.find(m => (m.from === from && m.to === to) || (m.san && m.san.includes(from) && m.san.includes(to)));
        if (!match) return; // not legal

        // ensure it's still user's turn
        const fen = safe(() => game.getFEN()) || '';
        const active = (fen.split(' ')[1] || 'w');
        const playingAs = safe(() => game.getPlayingAs());
        const isUserWhite = (playingAs === 1 || playingAs === 'white' || playingAs === 'w');
        if ((isUserWhite && active !== 'w') || (!isUserWhite && active !== 'b')) return;

        // schedule move using speed slider (higher speed -> smaller delay)
        const speed = parseInt((window.KWY && window.KWY.speedEl && window.KWY.speedEl.value) || 4, 10);
        const delay = Math.max(220, 1500 - speed * 150);

        setTimeout(() => {
          try {
            if (typeof game.move === 'function') {
              game.move({ ...match, promotion: match.promotion || false, animate: false, userGenerated: true });
            } else if (typeof match.move === 'function') {
              match.move();
            } else {
              // fallback to clicking squares
              clickSquare(from);
              setTimeout(() => clickSquare(to), 140);
            }
          } catch (e) {
            console.error('kwy auto-play error', e);
          }
        }, delay);
      } catch (e) {
        console.error('kwy attemptAutoPlay error', e);
      }
    }

    // best-effort click square fallback
    function clickSquare(coord) {
      try {
        const sq = board.querySelector(`[data-square="${coord}"]`) || board.querySelector(`.square-${coord}`) || null;
        if (!sq) return;
        sq.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        sq.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        sq.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      } catch (e) { /* ignore */ }
    }

    // Draw suggestion arrow and dot
    function drawSuggestion(bestmove, isUserWhite, canvas, ctx, game) {
      clearCanvas();
      if (!bestmove) return;
      const letters = ['a','b','c','d','e','f','g','h'];
      const tile = canvas.clientWidth / 8;
      const x1 = letters.indexOf(bestmove[0]);
      const y1 = 8 - Number(bestmove[1]);
      const x2 = letters.indexOf(bestmove[2]);
      const y2 = 8 - Number(bestmove[3]);

      // determine flip using actual board orientation (playingAs)
      const playingAs = safe(() => game.getPlayingAs());
      const userWhite = (playingAs === 1 || playingAs === 'white' || playingAs === 'w');
      const flipped = !userWhite;
      const toCanvasX = (x) => (flipped ? (7 - x) : x) * tile + tile/2;
      const toCanvasY = (y) => (flipped ? (7 - y) : y) * tile + tile/2;

      ctx.beginPath();
      ctx.moveTo(toCanvasX(x1), toCanvasY(y1));
      ctx.lineTo(toCanvasX(x2), toCanvasY(y2));
      ctx.lineWidth = Math.max(6, tile/6);
      ctx.strokeStyle = 'rgba(2,112,255,0.95)'; // Pay/Stripe blue accent
      ctx.lineCap = 'round';
      ctx.stroke();

      // endpoint circle
      ctx.beginPath();
      ctx.arc(toCanvasX(x2), toCanvasY(y2), Math.max(6, tile/8), 0, Math.PI*2);
      ctx.fillStyle = 'rgba(2,112,255,0.18)';
      ctx.fill();
    }

    function clearCanvas() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
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
