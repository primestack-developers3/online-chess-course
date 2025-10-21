document.addEventListener('DOMContentLoaded', () => {
  const boardEl = document.getElementById('chessboard');
  const ranksEl = document.querySelector('.ranks');
  const filesEl = document.querySelector('.files');
  const moveListEl = document.getElementById('move-list');
  const undoBtn = document.getElementById('undo-button');
  const resetBtn = document.getElementById('reset-button');

  // pieces map (unicode)
  const pieces = {
    'r':'♜','n':'♞','b':'♝','q':'♛','k':'♚','p':'♟',
    'R':'♖','N':'♘','B':'♗','Q':'♕','K':'♔','P':'♙'
  };

  // board state as 8x8 array (row 0 = rank 8)
  let board = [];
  let moveHistory = [];

  // castling rights
  let castling = { wK:true, wQ:true, bK:true, bQ:true };

  // starting FEN (no en-passant in this simple model)
  const startFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

  function resetBoard() {
    board = Array.from({length:8}, ()=>Array(8).fill(null));
    const rows = startFEN.split('/');
    for (let r=0;r<8;r++){
      let file = 0;
      for (const ch of rows[r]){
        if (!isNaN(ch)){
          file += Number(ch);
        } else {
          board[r][file] = ch;
          file++;
        }
      }
    }
    // initial castling rights (standard start)
    castling = { wK:true, wQ:true, bK:true, bQ:true };
    moveHistory = [];
    renderBoard();
    renderMoveList();
  }

  function renderBoard(){
    boardEl.innerHTML = '';
    ranksEl.innerHTML = '';
    filesEl.innerHTML = '';

    // ranks 8..1
    for (let r=0;r<8;r++){
      const rank = document.createElement('div');
      rank.textContent = 8 - r;
      ranksEl.appendChild(rank);
    }
    // files a..h
    const files = 'abcdefgh';
    for (let f=0; f<8; f++){
      const file = document.createElement('div');
      file.textContent = files[f];
      filesEl.appendChild(file);
    }

    for (let r=0;r<8;r++){
      for (let c=0;c<8;c++){
        const sq = document.createElement('div');
        sq.className = 'square ' + (((r+c)%2===0)? 'light':'dark');
        sq.dataset.row = r;
        sq.dataset.col = c;
        sq.setAttribute('role','button');
        sq.tabIndex = 0;

        const pieceChar = board[r][c];
        if (pieceChar){
          const span = document.createElement('span');
          span.className = 'piece ' + (isWhite(pieceChar)? 'white-piece' : 'black-piece');
          span.textContent = pieces[pieceChar] || pieceChar;
          span.dataset.piece = pieceChar;
          sq.appendChild(span);
        }

        // interactions: select on pointerdown / click
        sq.addEventListener('click', squareClick);
        sq.addEventListener('keydown', (e)=>{
          if (e.key === 'Enter' || e.key === ' ') { squareClick.call(sq, e); e.preventDefault(); }
        });

        boardEl.appendChild(sq);
      }
    }
  }

  // utilities
  function isWhite(ch){ return ch === ch.toUpperCase(); }
  function inBounds(r,c){ return r>=0 && r<8 && c>=0 && c<8; }
  function clonePiece(ch){ return ch ? String(ch) : null; }

  // detect if square (r,c) is attacked by color 'attackerIsWhite'
  function isSquareAttacked(attackerIsWhite, r, c){
    // pawns
    const pawnDir = attackerIsWhite ? -1 : 1; // attacker pawns move toward decreasing/increasing rows? attacker white attacks upward (-1)
    const pawnRows = [
      [r + -1, c - 1],
      [r + -1, c + 1]
    ];
    if (!attackerIsWhite) {
      pawnRows[0] = [r + 1, c - 1];
      pawnRows[1] = [r + 1, c + 1];
    }
    for (const [pr,pc] of pawnRows){
      if (inBounds(pr,pc)){
        const p = board[pr][pc];
        if (p && (p.toLowerCase() === 'p') && (isWhite(p) === attackerIsWhite)) return true;
      }
    }
    // knights
    const knightOffsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr,dc] of knightOffsets){
      const nr = r+dr, nc = c+dc;
      if (!inBounds(nr,nc)) continue;
      const p = board[nr][nc];
      if (p && p.toLowerCase() === 'n' && isWhite(p) === attackerIsWhite) return true;
    }
    // sliding pieces: bishops/queens (diagonals), rooks/queens (orthogonal)
    const sliders = [
      {dirs:[[-1,-1],[-1,1],[1,-1],[1,1]], types:['b','q']},
      {dirs:[[-1,0],[1,0],[0,-1],[0,1]], types:['r','q']}
    ];
    for (const group of sliders){
      for (const [dr,dc] of group.dirs){
        let nr = r+dr, nc = c+dc;
        while(inBounds(nr,nc)){
          const p = board[nr][nc];
          if (p){
            if (isWhite(p) === attackerIsWhite && group.types.includes(p.toLowerCase())) return true;
            break;
          }
          nr+=dr; nc+=dc;
        }
      }
    }
    // king adjacent
    for (let dr=-1; dr<=1; dr++){
      for (let dc=-1; dc<=1; dc++){
        if (dr===0 && dc===0) continue;
        const nr = r+dr, nc = c+dc;
        if (!inBounds(nr,nc)) continue;
        const p = board[nr][nc];
        if (p && p.toLowerCase() === 'k' && isWhite(p) === attackerIsWhite) return true;
      }
    }
    return false;
  }

  // find king square for color
  function findKingSquare(isWhiteKing){
    for (let r=0;r<8;r++) for (let c=0;c<8;c++){
      const p = board[r][c];
      if (p && p.toLowerCase()==='k' && isWhite(p) === isWhiteKing) return [r,c];
    }
    return null;
  }

  // move generation (simple: ignores pins, en-passant but includes castling legality checks)
  function generateMoves(r, c){
    const piece = board[r][c];
    if (!piece) return [];
    const moves = [];
    const colorWhite = isWhite(piece);
    const enemy = (ch)=> ch && (isWhite(ch) !== colorWhite);

    const addMove = (nr,nc)=>{
      if (!inBounds(nr,nc)) return;
      const occupant = board[nr][nc];
      if (!occupant) moves.push([nr,nc,false]);
      else if (enemy(occupant)) moves.push([nr,nc,true]);
    };

    const p = piece.toLowerCase();
    if (p === 'p'){
      const dir = colorWhite ? -1 : 1;
      const startRow = colorWhite ? 6 : 1;
      // forward
      if (inBounds(r+dir,c) && !board[r+dir][c]) {
        moves.push([r+dir,c,false]);
        if (r === startRow && !board[r+2*dir][c]) moves.push([r+2*dir,c,false]);
      }
      // captures
      for (const dc of [-1,1]){
        const nr = r+dir, nc = c+dc;
        if (inBounds(nr,nc) && enemy(board[nr][nc])) moves.push([nr,nc,true]);
      }
    } else if (p === 'n'){
      const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      for (const [dr,dc] of offsets) addMove(r+dr,c+dc);
    } else if (p === 'b' || p === 'r' || p === 'q'){
      const dirs = [];
      if (p==='b' || p==='q') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
      if (p==='r' || p==='q') dirs.push([-1,0],[1,0],[0,-1],[0,1]);
      for (const [dr,dc] of dirs){
        let nr = r+dr, nc = c+dc;
        while(inBounds(nr,nc)){
          if (!board[nr][nc]) { moves.push([nr,nc,false]); nr+=dr; nc+=dc; continue; }
          if (isWhite(board[nr][nc]) !== isWhite(piece)) moves.push([nr,nc,true]);
          break;
        }
      }
    } else if (p === 'k'){
      for (let dr=-1; dr<=1; dr++){
        for (let dc=-1; dc<=1; dc++){
          if (dr===0 && dc===0) continue;
          addMove(r+dr,c+dc);
        }
      }

      // Castling: only if king not in check and rights available and path clear and squares not attacked
      const kingRow = r;
      const kingCol = c;
      // determine side
      if (colorWhite){
        // white king start at e1 => row 7 col 4
        if (kingRow === 7 && kingCol === 4 && !isSquareAttacked(false,7,4)){
          // kingside: f1 (7,5) g1 (7,6) empty, rook on h1
          if (castling.wK && !board[7][5] && !board[7][6] && board[7][7] && board[7][7].toLowerCase() === 'r'){
            if (!isSquareAttacked(false,7,5) && !isSquareAttacked(false,7,6)){
              moves.push([7,6,false]); // castle kingside -> king to g1
            }
          }
          // queenside: d1 (7,3), c1 (7,2), b1 (7,1) empty, rook on a1
          if (castling.wQ && !board[7][3] && !board[7][2] && !board[7][1] && board[7][0] && board[7][0].toLowerCase() === 'r'){
            if (!isSquareAttacked(false,7,3) && !isSquareAttacked(false,7,2)){
              moves.push([7,2,false]); // castle queenside -> king to c1
            }
          }
        }
      } else {
        // black king start at e8 => row 0 col 4
        if (kingRow === 0 && kingCol === 4 && !isSquareAttacked(true,0,4)){
          // kingside: f8 (0,5) g8 (0,6)
          if (castling.bK && !board[0][5] && !board[0][6] && board[0][7] && board[0][7].toLowerCase() === 'r'){
            if (!isSquareAttacked(true,0,5) && !isSquareAttacked(true,0,6)){
              moves.push([0,6,false]);
            }
          }
          // queenside: d8 (0,3), c8 (0,2), b8 (0,1)
          if (castling.bQ && !board[0][3] && !board[0][2] && !board[0][1] && board[0][0] && board[0][0].toLowerCase() === 'r'){
            if (!isSquareAttacked(true,0,3) && !isSquareAttacked(true,0,2)){
              moves.push([0,2,false]);
            }
          }
        }
      }
    }
    return moves;
  }

  // UI selection state
  let selected = null;
  let currentHighlights = [];

  function clearHighlights(){
    currentHighlights.forEach(sq => {
      sq.classList.remove('highlight','capture');
      const dot = sq.querySelector('.dot');
      if (dot) dot.remove();
    });
    currentHighlights = [];
  }

  function squareClick(e){
    const sq = this;
    const r = Number(sq.dataset.row), c = Number(sq.dataset.col);

    // if a highlighted move clicked -> perform move
    if (sq.classList.contains('highlight')){
      performMove(selected.row, selected.col, r, c);
      clearHighlights();
      selected = null;
      return;
    }

    // otherwise select piece if present
    const pieceChar = board[r][c];
    clearHighlights();
    selected = null;
    if (pieceChar){
      selected = {row:r, col:c, piece:pieceChar};
      const moves = generateMoves(r,c);
      for (const mv of moves){
        const mr = mv[0], mc = mv[1], isCap = mv[2];
        const idx = mr*8 + mc;
        const target = boardEl.children[idx];
        target.classList.add('highlight');
        if (isCap) target.classList.add('capture');
        else {
          const dot = document.createElement('span'); dot.className = 'dot'; target.appendChild(dot);
        }
        currentHighlights.push(target);
      }
    }
  }

  function performMove(sr, sc, tr, tc){
    const piece = board[sr][sc];
    const captured = board[tr][tc];

    // detect castling: king moves two files
    const isKing = piece && piece.toLowerCase() === 'k';
    const isCastling = isKing && Math.abs(tc - sc) === 2;

    // move in data
    board[tr][tc] = piece;
    board[sr][sc] = null;

    // handle rook move for castling
    if (isCastling){
      if (tc === 6){ // kingside
        const rookFromCol = 7;
        const rookToCol = 5;
        const rookRow = sr;
        board[rookRow][rookToCol] = board[rookRow][rookFromCol];
        board[rookRow][rookFromCol] = null;
      } else if (tc === 2){ // queenside
        const rookFromCol = 0;
        const rookToCol = 3;
        const rookRow = sr;
        board[rookRow][rookToCol] = board[rookRow][rookFromCol];
        board[rookRow][rookFromCol] = null;
      }
    }

    // update castling rights: if king or rook moved or rook captured on initial squares
    if (piece === 'K') { castling.wK = castling.wQ = false; }
    if (piece === 'k') { castling.bK = castling.bQ = false; }
    // white rooks initial squares (7,0)=a1 , (7,7)=h1
    if (sr === 7 && sc === 7) castling.wK = false;
    if (sr === 7 && sc === 0) castling.wQ = false;
    // black rooks initial squares (0,0)=a8, (0,7)=h8
    if (sr === 0 && sc === 7) castling.bK = false;
    if (sr === 0 && sc === 0) castling.bQ = false;
    // if a rook was captured on its initial square, remove rights
    if (captured === 'r' && tr === 0 && tc === 7) castling.bK = false;
    if (captured === 'r' && tr === 0 && tc === 0) castling.bQ = false;
    if (captured === 'R' && tr === 7 && tc === 7) castling.wK = false;
    if (captured === 'R' && tr === 7 && tc === 0) castling.wQ = false;

    // update DOM pieces (full rerender simpler to keep DOM consistent)
    renderBoard();

    // record move
    const move = {from:[sr,sc], to:[tr,tc], piece:piece, captured: clonePiece(captured), castling: isCastling};
    moveHistory.push(move);
    appendMoveList(move);
  }

  function appendMoveList(move){
    const li = document.createElement('li');
    const castleNote = move.castling ? ' (O-O or O-O-O)' : '';
    li.textContent = `${algebraic(move.from)}${move.captured? 'x' : '-'}${algebraic(move.to)} (${move.piece})${castleNote}`;
    moveListEl.appendChild(li);
    moveListEl.scrollTop = moveListEl.scrollHeight;
  }

  function renderMoveList(){
    moveListEl.innerHTML = '';
    for (const m of moveHistory) appendMoveList(m);
  }

  function algebraic([r,c]){
    const files = 'abcdefgh';
    return files[c] + (8 - r);
  }

  function undo(){
    if (!moveHistory.length) return;
    const last = moveHistory.pop();
    const [sr,sc] = last.from;
    const [tr,tc] = last.to;

    // move back
    board[sr][sc] = last.piece;
    board[tr][tc] = last.captured || null;

    // if last move was castling, move rook back
    if (last.castling){
      if (tc === 6){ // kingside
        const rookRow = sr;
        board[rookRow][7] = board[rookRow][5];
        board[rookRow][5] = null;
      } else if (tc === 2){ // queenside
        const rookRow = sr;
        board[rookRow][0] = board[rookRow][3];
        board[rookRow][3] = null;
      }
      // Note: castling rights are not fully restored in this simple undo model.
    }

    // full rerender
    renderBoard();
    renderMoveList();
  }

  // event handlers
  if (undoBtn) undoBtn.addEventListener('click', ()=>{ undo(); clearHighlights(); selected=null; });
  if (resetBtn) resetBtn.addEventListener('click', ()=>{ resetBoard(); clearHighlights(); selected=null; });

  // init
  resetBoard();
});