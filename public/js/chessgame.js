const socket = io();
const chess = new Chess();
const boardElement = document.querySelector('.chessboard');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const connectionStatus = document.getElementById('connection-status');
const playerRoleStatus = document.getElementById('player-role-status');

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

// Render the chessboard
const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = ''; // Clear the board before re-rendering

    board.forEach((row, rowIndex) => {
        row.forEach((square, squareIndex) => {
            const squareElement = document.createElement('div');
            squareElement.classList.add('square', (rowIndex + squareIndex) % 2 === 0 ? 'light' : 'dark');

            squareElement.dataset.row = rowIndex;
            squareElement.dataset.col = squareIndex;

          // Inside renderBoard function, modify pieceElement class addition
if (square) {
    const pieceElement = document.createElement('div');
    pieceElement.classList.add('piece', square.color === 'w' ? 'white' : 'black');  // Correct piece color
    pieceElement.innerText = getPieceUnicode(square);
    pieceElement.draggable = playerRole === square.color;

    // Add drag events, etc.
    squareElement.appendChild(pieceElement);


                // Drag events for desktop
                pieceElement.addEventListener('dragstart', (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowIndex, col: squareIndex };
                        e.dataTransfer.setData('text/plain', '');
                    }
                });

                pieceElement.addEventListener('dragend', () => {
                    draggedPiece = null;
                    sourceSquare = null;
                });

                // Touch events for mobile
                pieceElement.addEventListener('touchstart', (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowIndex, col: squareIndex };
                        e.preventDefault();
                    }
                });

                pieceElement.addEventListener('touchend', (e) => {
                    if (draggedPiece) {
                        const touch = e.changedTouches[0];
                        const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
                        if (targetElement && targetElement.classList.contains('square')) {
                            const targetSquare = {
                                row: parseInt(targetElement.dataset.row),
                                col: parseInt(targetElement.dataset.col)
                            };
                            handleMove(sourceSquare, targetSquare);
                        }
                    }
                    draggedPiece = null;
                    sourceSquare = null;
                    e.preventDefault();
                });

                squareElement.appendChild(pieceElement);
            }

            // Drop events for desktop
            squareElement.addEventListener('dragover', (e) => e.preventDefault());
            squareElement.addEventListener('drop', (e) => {
                e.preventDefault();
                if (draggedPiece) {
                    const targetSquare = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col)
                    };
                    handleMove(sourceSquare, targetSquare);
                }
            });

            // Touch move event for mobile
            squareElement.addEventListener('touchmove', (e) => e.preventDefault());

            boardElement.appendChild(squareElement);
        });
    });

    // Ensure the chessboard grid is displaying correctly
    boardElement.style.display = 'grid';

    // Flip the board if the player is black
    if (playerRole === 'b') {
        boardElement.classList.add('flipped');
    } else {
        boardElement.classList.remove('flipped');
    }
};


// Handle chess moves
const handleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: 'q' // Always promote to a queen for simplicity
    };

    const result = chess.move(move);
    if (result) {
        socket.emit('move', move);
        renderBoard();
    }
};

// Get Unicode representation of a chess piece
const getPieceUnicode = (piece) => {
    const unicodePieces = {
        p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚',
        P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔'
    };
    return unicodePieces[piece.color === 'b' ? piece.type.toLowerCase() : piece.type] || '';
};

// Add a message to the chat window
const addMessageToChat = (message, sender) => {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');

    // Check if the sender is the current user
    if (sender === playerRole || (sender === 'Spectator' && !playerRole)) {
        messageElement.classList.add('user'); // User's message (right side)
    } else {
        messageElement.classList.add('opponent'); // Opponent's message (left side)
    }

    messageElement.innerHTML = ` ${message}`;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to the bottom
};

// Send chat message
sendButton.addEventListener('click', () => {
    const message = chatInput.value.trim();
    if (message) {
        socket.emit('chatMessage', { message, sender: playerRole || 'Spectator' });
        chatInput.value = '';
    }
});

// Send chat message on pressing Enter
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const message = chatInput.value.trim();
        if (message) {
            socket.emit('chatMessage', { message, sender: playerRole || 'Spectator' });
            chatInput.value = '';
        }
    }
});

// Socket event listeners
socket.on('connectionStatus', (status) => {
    connectionStatus.textContent = status;
});

socket.on('playerRole', (role) => {
    playerRole = role;
    playerRoleStatus.textContent = `You are playing as ${role === 'w' ? 'White' : 'Black'}`;
    renderBoard();
});

socket.on('spectatorRole', () => {
    playerRole = null;
    playerRoleStatus.textContent = 'You are a spectator';
    renderBoard();
});

socket.on('move', (move) => {
    chess.move(move);
    renderBoard();
});

socket.on('chatMessage', (data) => {
    addMessageToChat(data.message, data.sender);
});

// Initial render
renderBoard();
