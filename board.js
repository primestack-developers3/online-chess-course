document.addEventListener('DOMContentLoaded', () => {
    const boardElement = document.getElementById('chessboard');
    const moveListElement = document.getElementById('move-list');
    let draggedPiece = null;
    let sourceSquare = null;
    let moveCount = 0;

    // Unicode characters for chess pieces
    const pieces = {
        'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟', // Black
        'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'  // White
    };

    // Standard chess starting position (FEN notation)
    const startPosition = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

    function createBoard() {
        // Create labels
        createLabels();

        // Create squares and pieces
        const fenRows = startPosition.split('/');
        for (let i = 0; i < 8; i++) {
            const fenRow = fenRows[i];
            let file = 0;
            for (const char of fenRow) {
                if (isNaN(char)) {
                    createSquare(i, file, char);
                    file++;
                } else {
                    const emptySquares = parseInt(char, 10);
                    for (let j = 0; j < emptySquares; j++) {
                        createSquare(i, file);
                        file++;
                    }
                }
            }
        }
    }

    function createLabels() {
        const ranksContainer = document.querySelector('.ranks');
        const filesContainer = document.querySelector('.files');
        const files = 'abcdefgh';

        for (let i = 0; i < 8; i++) {
            const rank = document.createElement('div');
            rank.textContent = 8 - i;
            ranksContainer.appendChild(rank);
            const file = document.createElement('div');
            file.textContent = files[i];
            filesContainer.appendChild(file);
        }
    }

    function createSquare(row, col, pieceChar = null) {
        const square = document.createElement('div');
        square.classList.add('square');
        square.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
        square.dataset.row = row;
        square.dataset.col = col;

        if (pieceChar) {
            const piece = document.createElement('span');
            piece.classList.add('piece');
            // Add color class based on FEN character case
            const isWhite = pieceChar === pieceChar.toUpperCase();
            piece.classList.add(isWhite ? 'white-piece' : 'black-piece');
            piece.dataset.piece = pieceChar;
            piece.textContent = pieces[pieceChar];
            piece.draggable = true;
            square.appendChild(piece);
        }

        boardElement.appendChild(square);
    }

    function handleDragStart(e) {
        if (e.target.classList.contains('piece')) {
            draggedPiece = e.target;
            sourceSquare = e.target.parentElement;
            console.log("Drag Start - Piece:", draggedPiece, "Source:", sourceSquare); // ADDED
            setTimeout(() => {
                e.target.style.display = 'none';
            }, 0);
        }
    }

    function handleDragEnd(e) {
        if (draggedPiece) {
            draggedPiece.style.display = 'block';

            draggedPiece = null;
            sourceSquare = null;
        }
    }

    function handleDragOver(e) {
        e.preventDefault(); // Necessary to allow dropping
    }

    function handleDrop(e) {
        e.preventDefault();
        if (draggedPiece) {
            const targetElement = e.target;
            const targetSquare = targetElement.classList.contains('square') ? targetElement : targetElement.parentElement;

            console.log("Drop - Target Element:", targetElement, "Target Square:", targetSquare); // ADDED

            // Prevent dropping on the same square
            if (targetSquare === sourceSquare) {
                return;
            }
          
            // Check if the target square contains a piece of the same color
            if (targetSquare.firstChild && draggedPiece.classList.contains('white-piece') === targetSquare.firstChild.classList.contains('white-piece')) {
                return;
            }

            const isCapture = targetSquare.firstChild && targetSquare.firstChild !== draggedPiece;

            logMove(sourceSquare, targetSquare, draggedPiece.dataset.piece, isCapture);

             // If target square has a piece, remove it (capture)
             if (isCapture) {
                targetSquare.innerHTML = '';
            }

            // Castling Implementation (basic, without check validation)
            const startCol = parseInt(sourceSquare.dataset.col, 10);
            const endCol = parseInt(targetSquare.dataset.col, 10);
            const row = parseInt(sourceSquare.dataset.row, 10);

            if (draggedPiece.dataset.piece === 'k' || draggedPiece.dataset.piece === 'K') {
                if (startCol - endCol === 2) { // Kingside castling
                    const rookSquare = boardElement.querySelector(`[data-row="${row}"][data-col="0"]`);
                    const rook = rookSquare.firstChild;
                    const newRookSquare = boardElement.querySelector(`[data-row="${row}"][data-col="3"]`);

                    newRookSquare.appendChild(rook);
                    rookSquare.innerHTML = '';

                } else if (endCol - startCol === 2) { // Queenside castling
                    const rookSquare = boardElement.querySelector(`[data-row="${row}"][data-col="7"]`);
                    const rook = rookSquare.firstChild;
                    const newRookSquare = boardElement.querySelector(`[data-row="${row}"][data-col="5"]`);

                    newRookSquare.appendChild(rook);
                    rookSquare.innerHTML = '';
                }







            }
            
            targetSquare.appendChild(draggedPiece);
        }
    }

    function getAlgebraic(square) {
        const col = parseInt(square.dataset.col, 10);
        const row = parseInt(square.dataset.row, 10);
        const file = 'abcdefgh'[col];
        const rank = 8 - row;
        return `${file}${rank}`;
    }

    function logMove(startSq, endSq, piece, isCapture) {
        if (startSq && endSq) {
            const moveNotation = `${getAlgebraic(startSq)}${isCapture ? 'x' : '-'}${getAlgebraic(endSq)}`;
            const listItem = document.createElement('li');
            listItem.textContent = moveNotation;
            moveListElement.appendChild(listItem);
            moveCount++;
            
        }
    }

    createBoard();

    boardElement.addEventListener('dragstart', handleDragStart);
    boardElement.addEventListener('dragend', handleDragEnd);
    boardElement.addEventListener('dragover', handleDragOver);
   boardElement.addEventListener('drop', handleDrop);
});
