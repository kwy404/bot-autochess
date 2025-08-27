// ==UserScript==
// @name         kwy Chess Bot (full, modal-safe)
// @namespace    http://tampermonkey.net/
// @version      1.9
// @description  kwy Chess Bot
// @author       kwy
// @match        https://www.chess.com/play/*
// @match        https://www.chess.com/game/*
// @match        https://www.chess.com/*/live/*
// @license      MIT
// @icon         https://www.google.com/s2/favicons?sz=64&domain=chess.com
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // short delayed start so chess.com initializes
  setTimeout(initBot, 1600);

  function initBot() {
    try {
      createUI();
      hookBot();
      console.log('kwy Chess Bot loaded (full).');
    } catch (e) {
      console.error('kwy init error', e);
    }
  }

  // ---------------- UI ----------------
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
          <label class="kwy-label">Auto New on Win</label>
          <input id="kwy-autonew" type="checkbox" />
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
      #kwyChessBot {
        position: fixed;
        top: 70px;
        left: 80px;
        width: 360px;
        z-index: 1000000;
        font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
        user-select: none;
        border-radius: 12px;
        box-shadow: 0 6px 20px rgba(99, 91, 255, 0.18);
        background: #0f1720;
        border: 1px solid #22252a;
        color: #e6eef8;
        overflow: hidden;
      }
      #kwy-header {
        display:flex;
        align-items:center;
        justify-content:space-between;
        padding:12px;
        background: linear-gradient(90deg, #111318, #0b1220);
        border-bottom: 1px solid #222;
        cursor: grab;
      }
      #kwy-brand { display:flex; align-items:center; gap:10px; }
      #kwy-logo { width:38px; height:38px; border-radius:8px; background: linear-gradient(180deg,#635bff,#4338ca); color:white; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:16px; box-shadow: 0 3px 8px rgba(99,91,255,0.18); }
      #kwy-title { font-weight:700; color:#fff; font-size:15px; }
      #kwy-actions button { background: #635bff; color: white; border: none; border-radius:8px; padding:6px 10px; cursor:pointer; font-weight:600; box-shadow: 0 4px 12px rgba(99,91,255,0.14); }
      #kwy-body { padding:12px; }
      .kwy-row { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
      .kwy-label { width:140px; color:#9aa4b2; font-size:13px; }
      #kwy-depthVal { min-width:30px; text-align:center; color:#a0a0a0; font-weight:700; }
      input[type="range"] { flex:1; }
      input[type="checkbox"] { transform: scale(1.05); }
      #kwy-infoCard { margin-top:10px; border-radius:8px; padding:10px; background: linear-gradient(180deg,#0b0f14,#071018); border:1px solid #23272b; }
      .kwy-infoRow { display:flex; justify-content:space-between; padding:6px 2px; font-size:13px; color:#e6eef8; }
      .kwy-infoLabel { color:#7d8895; }
      @media (max-width:720px) { #kwyChessBot { left:10px; top:80px; width:300px; } }
    `;
    document.body.appendChild(style);
    document.body.appendChild(wrap);

    // make draggable
    const container = document.getElementById('kwyChessBot');
    container.addEventListener('mousedown', startDrag);
    function startDrag(e) {
      const header = container.querySelector('#kwy-header');
      if (!header.contains(e.target)) return;
      const offsetX = e.clientX - container.offsetLeft;
      const offsetY = e.clientY - container.offsetTop;
      function onMove(ev) {
        container.style.left = Math.max(2, ev.clientX - offsetX) + 'px';
        container.style.top = Math.max(2, ev.clientY - offsetY) + 'px';
      }
      function up() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', up);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', up);
    }

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
      autonewEl: container.querySelector('#kwy-autonew'),
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

    const depthSlider = document.getElementById('kwy-depth');
    const depthVal = document.getElementById('kwy-depthVal');
    depthVal.textContent = depthSlider.value;
    depthSlider.addEventListener('input', () => depthVal.textContent = depthSlider.value);

    // defaults
    if (window.KWY && window.KWY.enableEl) window.KWY.enableEl.checked = false;
    if (window.KWY && window.KWY.autoEl) window.KWY.autoEl.checked = false;
    if (window.KWY && window.KWY.autonewEl) window.KWY.autonewEl.checked = false;
  }

  // ---------------- Bot Core ----------------
  function hookBot() {
    function getBoard() {
      // common board selectors on chess.com
      return document.querySelector('.board') || document.querySelector('[data-cy="board"]') || document.querySelector('.board-wrap') || null;
    }

    // State
    window.KWYState = {
      bestMove: null,
      evaluation: null,
      lastFEN: null,
      lastStatus: null,
      running: true,
      depthInUse: null,
      canvas: null,
      ctx: null,
      resizeObserver: null
    };

    const startingFEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    // Main cycle
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
          // not on a game page yet
          updateStatus('No Board');
          setTimeout(cycle, 1500);
          return;
        }

        ensureCanvas(board);

        // try to locate game object (heuristics)
        const game =
          board.game ||
          (board.__vue__ && board.__vue__.game) ||
          (window.__CHESS_APP__ && window.__CHESS_APP__.game) ||
          window.game ||
          window.chessGame ||
          null;

        // if no game object, try to read FEN from page
        let fen = null;
        if (game && typeof safe(() => game.getFEN) === 'function') {
          fen = safe(() => game.getFEN());
        } else {
          // fallback: attempt to get fen from DOM attributes (rare)
          const fenEl = document.querySelector('[data-fen]') || document.querySelector('[data-current-fen]');
          if (fenEl) fen = fenEl.getAttribute('data-fen') || fenEl.getAttribute('data-current-fen');
        }

        if (!fen) {
          updateStatus('No Game Detected');
          setTimeout(cycle, 1200);
          return;
        }

        // Determine status: In Progress, New Game Started, Game Over
        let status = 'In Progress';
        if (fen === startingFEN && window.KWYState.lastFEN !== fen) {
          status = 'New Game Started';
          // reset
          window.KWYState.bestMove = null;
          window.KWYState.evaluation = null;
          window.KWYState.depthInUse = null;
          clearCanvas();
        } else if (isGameOver()) {
          status = 'Game Over';
        }
        updateStatus(status);
        window.KWYState.lastFEN = fen;

        // who is playing as user & which side to move
        const playingAs = safe(() => (game && typeof game.getPlayingAs === 'function') ? game.getPlayingAs() : null);
        const isUserWhite = (playingAs === 1 || playingAs === 'white' || playingAs === 'w');
        const activeColor = fen.split(' ')[1] || 'w';
        const sideToMove = activeColor === 'w' ? 'white' : 'black';

        // update UI
        if (window.KWY && window.KWY.playerEl) window.KWY.playerEl.textContent = isUserWhite ? 'White' : 'Black';
        if (window.KWY && window.KWY.sideEl) window.KWY.sideEl.textContent = sideToMove;

        // Auto new game on win logic (detect transition into Game Over)
        const autonew = window.KWY && window.KWY.autonewEl && window.KWY.autonewEl.checked;
        if (autonew && status === 'Game Over' && window.KWYState.lastStatus !== 'Game Over') {
          // only fire once per transition
          tryStartNewGame();
        }
        window.KWYState.lastStatus = status;

        // if game over -> skip engine calls
        if (status === 'Game Over') {
          setTimeout(cycle, 1200);
          return;
        }

        // requested depth
        const requestedDepth = parseInt((window.KWY && window.KWY.depthEl && window.KWY.depthEl.value) || 12, 10);

        // fetch best move (adaptive)
        const effective = await fetchBestMoveAdaptive(fen, requestedDepth);
        if (!effective) {
          setTimeout(cycle, 1200);
          return;
        }

        const moveData = normalizeMove(effective.bestmove || effective.move || '');
        window.KWYState.bestMove = moveData;
        window.KWYState.evaluation = effective.evaluation || effective.eval || effective.score || null;
        window.KWYState.depthInUse = effective.depthUsed || effective.depth || requestedDepth;

        // update UI
        if (window.KWY && window.KWY.evalEl) window.KWY.evalEl.textContent = formatEval(window.KWYState.evaluation);
        if (window.KWY && window.KWY.bestEl) window.KWY.bestEl.textContent = moveData ? (moveData.from + moveData.to + (moveData.promotion || '')) : '-';
        if (window.KWY && window.KWY.depthUsedEl) window.KWY.depthUsedEl.textContent = window.KWYState.depthInUse;

        // draw suggestion
        drawSuggestion(moveData, isUserWhite, game);

        // attempt auto-play: only if Auto Move enabled and it's user's color
        const auto = window.KWY && window.KWY.autoEl && window.KWY.autoEl.checked;
        const userColor = isUserWhite ? 'w' : 'b';
        if (auto && userColor === activeColor && moveData && (status === 'In Progress' || status === 'New Game Started')) {
          attemptAutoPlay(game, moveData, isUserWhite);
        }

        // schedule next cycle
        const uiInterval = Math.max(2, 13 - parseInt((window.KWY && window.KWY.updateEl && window.KWY.updateEl.value) || 8, 10));
        setTimeout(cycle, uiInterval * 700);

      } catch (err) {
        console.error('kwy cycle error', err);
        setTimeout(cycle, 1200);
      }
    } // end cycle

    cycle();

    // ---------- helpers ----------
    function safe(fn) { try { return fn(); } catch (e) { return null; } }
    function updateStatus(text) { if (window.KWY && window.KWY.statusEl) window.KWY.statusEl.textContent = text; }

    // Normaliza "e2e4", "bestmove e2e4", "e7e8q", etc.
    function normalizeMove(raw) {
      if (!raw) return null;
      raw = String(raw).trim();
      if (raw.indexOf(' ') >= 0) raw = raw.split(' ')[1];
      raw = raw.replace(/[^a-h1-8qbrn]/gi, '');
      if (raw.length < 4) return null;
      const from = raw.substr(0,2);
      const to = raw.substr(2,2);
      const promotion = raw.length > 4 ? raw[4].toLowerCase() : null;
      return { from, to, promotion };
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

    // ---------------- Canvas overlay for arrows ----------------
    function ensureCanvas(board) {
      if (window.KWYState.canvas && window.KWYState.canvas.parentNode === board) {
        window.KWYState.canvas.width = board.clientWidth;
        window.KWYState.canvas.height = board.clientHeight;
        return;
      }
      if (window.KWYState.resizeObserver) window.KWYState.resizeObserver.disconnect();
      if (window.KWYState.canvas) window.KWYState.canvas.remove();

      const canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.top = 0; canvas.style.left = 0;
      canvas.style.pointerEvents = 'none';
      canvas.width = board.clientWidth; canvas.height = board.clientHeight;
      board.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      window.KWYState.canvas = canvas;
      window.KWYState.ctx = ctx;

      window.KWYState.resizeObserver = new ResizeObserver(() => {
        canvas.width = board.clientWidth; canvas.height = board.clientHeight;
        if (window.KWYState.bestMove) {
          const game = board.game || (board.__vue__ && board.__vue__.game) || window.game || window.chessGame || null;
          const playingAs = safe(() => game && typeof game.getPlayingAs === 'function' ? game.getPlayingAs() : null);
          const isUserWhite = (playingAs === 1 || playingAs === 'white' || playingAs === 'w');
          drawSuggestion(window.KWYState.bestMove, isUserWhite, game);
        }
      });
      window.KWYState.resizeObserver.observe(board);
    }

    function clearCanvas() {
      if (window.KWYState.ctx && window.KWYState.canvas) {
        window.KWYState.ctx.clearRect(0,0,window.KWYState.canvas.width, window.KWYState.canvas.height);
      }
    }

    function drawSuggestion(moveData, isUserWhite, game) {
      clearCanvas();
      if (!moveData || !window.KWYState.ctx || !window.KWYState.canvas) return;

      const letters = ['a','b','c','d','e','f','g','h'];
      const tile = window.KWYState.canvas.clientWidth / 8;
      const x1 = letters.indexOf(moveData.from[0]);
      const y1 = 8 - Number(moveData.from[1]);
      const x2 = letters.indexOf(moveData.to[0]);
      const y2 = 8 - Number(moveData.to[1]);

      const playingAs = safe(() => game && typeof game.getPlayingAs === 'function' ? game.getPlayingAs() : null);
      const userWhite = (playingAs === 1 || playingAs === 'white' || playingAs === 'w');
      const flipped = !userWhite;

      const toCanvasX = (x) => (flipped ? (7 - x) : x) * tile + tile/2;
      const toCanvasY = (y) => (flipped ? (7 - y) : y) * tile + tile/2;

      const ctx = window.KWYState.ctx;
      ctx.beginPath();
      ctx.moveTo(toCanvasX(x1), toCanvasY(y1));
      ctx.lineTo(toCanvasX(x2), toCanvasY(y2));
      ctx.lineWidth = Math.max(6, tile/6);
      ctx.strokeStyle = 'rgba(99,91,255,0.95)';
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(toCanvasX(x2), toCanvasY(y2), Math.max(6, tile/8), 0, Math.PI*2);
      ctx.fillStyle = 'rgba(99,91,255,0.18)';
      ctx.fill();
    }

    // ---------------- Auto-play mechanics ----------------
    function attemptAutoPlay(game, moveData, isUserWhite) {
      try {
        if (!moveData) return;
        const { from, to, promotion } = moveData;
        const legalMoves = safe(() => (typeof game.getLegalMoves === 'function' ? game.getLegalMoves() : [])) || [];
        const match = legalMoves.find(m => m.from === from && m.to === to && (promotion ? (m.promotion === promotion) : !m.promotion));
        if (!match) return;

        // ensure it's still user's turn
        const fen = safe(() => (typeof game.getFEN === 'function' ? game.getFEN() : '')) || '';
        const active = (fen.split(' ')[1] || 'w');
        const playingAs = safe(() => (typeof game.getPlayingAs === 'function' ? game.getPlayingAs() : null));
        const isWhite = (playingAs === 1 || playingAs === 'white' || playingAs === 'w');
        if ((isWhite && active !== 'w') || (!isWhite && active !== 'b')) return;

        const speed = parseInt((window.KWY && window.KWY.speedEl && window.KWY.speedEl.value) || 4, 10);
        const delay = Math.max(200, 1500 - speed * 150);

        setTimeout(() => {
          try {
            if (typeof game.move === 'function') {
              // many chess.com internal game objects accept move({from,to})
              game.move({ ...match, animate: false, userGenerated: true });
              console.log('kwy: move via game.move()', match);
            } else if (typeof match.move === 'function') {
              match.move();
              console.log('kwy: move via match.move()');
            } else {
              // simulate drag as fallback
              simulateDrag(from, to);
              if (promotion) setTimeout(() => selectPromotion(promotion, isWhite), 200);
              console.log('kwy: move via simulateDrag', from, to);
            }
          } catch (e) {
            console.error('kwy auto-play error inner', e);
          }
        }, delay);
      } catch (e) {
        console.error('kwy attemptAutoPlay error', e);
      }
    }

    function simulateDrag(fromCoord, toCoord) {
      try {
        const fromSq = getSquareElement(fromCoord);
        const toSq = getSquareElement(toCoord);
        if (!fromSq || !toSq) return;
        const fromRect = fromSq.getBoundingClientRect();
        const toRect = toSq.getBoundingClientRect();
        const downEvt = new MouseEvent('mousedown', { bubbles: true, clientX: fromRect.left + fromRect.width / 2, clientY: fromRect.top + fromRect.height / 2 });
        fromSq.dispatchEvent(downEvt);
        setTimeout(() => {
          const moveEvt = new MouseEvent('mousemove', { bubbles: true, clientX: toRect.left + toRect.width / 2, clientY: toRect.top + toRect.height / 2 });
          document.dispatchEvent(moveEvt);
          setTimeout(() => {
            const upEvt = new MouseEvent('mouseup', { bubbles: true, clientX: toRect.left + toRect.width / 2, clientY: toRect.top + toRect.height / 2 });
            toSq.dispatchEvent(upEvt);
          }, 60);
        }, 60);
      } catch (e) { /* ignore */ }
    }

    function getSquareElement(coord) {
      // chess.com variations: .square-<file><rank> or data-square attr on square div
      const byData = document.querySelector(`[data-square="${coord}"]`);
      if (byData) return byData;
      // older classes like .square-55d63 or .square-<file><rank>
      const file = coord.charCodeAt(0) - 96;
      const rank = coord[1];
      return document.querySelector(`.square-${file}${rank}`) || document.querySelector(`.square-${coord}`) || null;
    }

    function selectPromotion(promo, isWhite) {
      try {
        const color = isWhite ? 'w' : 'b';
        const el = document.querySelector(`.promotion-piece-${color}${promo}`) || [...document.querySelectorAll('.promotion-piece')].find(x => x.textContent && x.textContent.toLowerCase().includes(promo));
        if (el) el.click();
      } catch (e) { /* ignore */ }
    }

    // ---------------- Adaptive engine fetch ----------------
    async function fetchBestMoveAdaptive(fen, requestedDepth) {
      const minDepth = 6;
      const step = 2;
      let depth = Math.max(minDepth, Math.min(28, parseInt(requestedDepth || 12, 10)));
      while (depth >= minDepth) {
        try {
          const res = await fetchBestMove(fen, depth);
          if (!res) { depth -= step; continue; }
          if (res.error || res.status === 'error' || (res.code && res.code >= 400)) { depth -= step; continue; }
          res.depthUsed = depth;
          return res;
        } catch (e) {
          depth -= step;
        }
      }
      return null;
    }

    async function fetchBestMove(fen, depth) {
      try {
        // public endpoint used previously; keep GET semantics
        const url = `https://stockfish.online/api/s/v2.php?fen=${encodeURIComponent(fen)}&depth=${encodeURIComponent(depth)}`;
        const r = await fetch(url, { method: 'GET' });
        if (!r.ok) return { error: true, code: r.status };
        const data = await r.json();
        return data;
      } catch (e) {
        console.warn('kwy fetchBestMove network error', e);
        return null;
      }
    }

    // ---------------- Game-over / Modal detection & auto-new ----------------
    function isGameOverModalOpen() {
      return !!(document.querySelector('.game-over-modal-container') || document.querySelector('.board-modal-component.game-over-modal-container') || document.querySelector('.game-over-modal') || document.querySelector('.game-over'));
    }

    function isGameOver() {
      // check common signals
      const modal = isGameOverModalOpen();
      // some pages add .game-over to board wrap
      const board = getBoard();
      const boardGameOver = board && (board.classList.contains('game-over') || board.querySelector('.game-over') || document.querySelector('.game-over'));
      return !!(modal || boardGameOver);
    }

    function findButtonByTexts(container, texts) {
      if (!container) container = document;
      const spans = Array.from(container.querySelectorAll('button span, button, a span, a'));
      const lower = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
      for (const t of texts) {
        const tc = t.toLowerCase();
        // first try button elements directly
        for (const el of spans) {
          const text = lower(el.textContent || el.innerText || el.getAttribute('aria-label') || '');
          if (text.includes(tc)) {
            // return the actual clickable element (closest button or a)
            const btn = el.closest('button') || el.closest('a') || el;
            if (btn) return btn;
          }
        }
      }
      // if nothing found, try plain button elements (no span)
      const allButtons = Array.from(container.querySelectorAll('button, a'));
      for (const t of texts) {
        const tc = t.toLowerCase();
        for (const btn of allButtons) {
          const text = (btn.getAttribute('aria-label') || btn.textContent || '').toLowerCase();
          if (text.includes(tc)) return btn;
        }
      }
      return null;
    }

    function tryStartNewGame() {
      // prefer rematch -> new 10 min -> any "New" or "Play again" label
      const modal = document.querySelector('.game-over-modal-container') || document.querySelector('.board-modal-component.game-over-modal-container') || document.querySelector('.game-over-modal') || document.querySelector('.game-over');
      const containerCandidates = [modal, document];
      const preferredTexts = ['rematch', 'rematch', 'play again', 'new 10 min', 'new 5 min', 'new 3 min', 'new game', 'new 15 min', 'play again', 'new'];
      for (const c of containerCandidates) {
        if (!c) continue;
        // first try Rematch specifically
        let btn = findButtonByTexts(c, ['Rematch', 'rematch']);
        if (!btn) btn = findButtonByTexts(c, ['New 10 min', 'New 5 min', 'New 3 min', 'New game', 'New']);
        if (!btn) btn = findButtonByTexts(c, preferredTexts);
        if (btn) {
          try {
            // if it's inside a span, get closest clickable
            const clickable = btn.closest('button') || btn.closest('a') || btn;
            console.log('[kwy] Clicking button to start new game:', (clickable && (clickable.textContent || clickable.getAttribute('aria-label'))));
            clickable.click();
            return true;
          } catch (e) {
            console.warn('[kwy] click attempt failed', e);
          }
        }
      }
      // fallback: try to click header-close then try UI new game buttons
      const headerClose = document.querySelector('.board-modal-header-close') || document.querySelector('.game-over .cc-close-button-component') || null;
      if (headerClose) {
        try { headerClose.click(); } catch(e){}
      }
      // try normal new-game buttons outside modal
      const btnOut = findButtonByTexts(document, ['New 10 min', 'New', 'Play again']);
      if (btnOut) { try { btnOut.click(); return true;} catch(e){} }
      console.log('[kwy] Não conseguiu encontrar botão de nova partida (Rematch/New).');
      return false;
    }

    // expose method for manual click from console
    window.KWY_tryStartNewGame = tryStartNewGame;

  } // end hookBot
})();
