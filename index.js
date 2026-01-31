 const PIECES = {
            w: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
            b: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' }
        };

        const PIECE_VALUES = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };

        class ChessGame {
            constructor() {
                this.board = [];
                this.mode = null;
                this.turn = 'w';
                this.selected = null;
                this.validMoves = [];
                this.history = [];
                this.captured = { w: [], b: [] };
                this.gameOver = false;
                this.flipped = false;
                this.lastMove = null;
                this.moveCount = 0;
                this.startTime = null;
                this.timer = null;
                this.hintCooldown = 0;
                this.kingPos = { w: [7, 4], b: [0, 4] };
                this.castling = { wK: true, wQ: true, bK: true, bQ: true };
                this.enPassant = null;
            }

            start(mode) {
                this.mode = mode;
                this.board = [
                    ['bR','bN','bB','bQ','bK','bB','bN','bR'],
                    ['bP','bP','bP','bP','bP','bP','bP','bP'],
                    [null,null,null,null,null,null,null,null],
                    [null,null,null,null,null,null,null,null],
                    [null,null,null,null,null,null,null,null],
                    [null,null,null,null,null,null,null,null],
                    ['wP','wP','wP','wP','wP','wP','wP','wP'],
                    ['wR','wN','wB','wQ','wK','wB','wN','wR']
                ];
                this.turn = 'w';
                this.selected = null;
                this.validMoves = [];
                this.history = [];
                this.captured = { w: [], b: [] };
                this.gameOver = false;
                this.lastMove = null;
                this.moveCount = 0;
                this.hintCooldown = 0;
                this.kingPos = { w: [7, 4], b: [0, 4] };
                this.castling = { wK: true, wQ: true, bK: true, bQ: true };
                this.enPassant = null;
                
                document.getElementById('modeScreen').classList.add('hidden');
                document.getElementById('gameScreen').classList.remove('hidden');
                document.getElementById('gameTitle').textContent = 
                    mode === 'player' ? '♔ Chess' : `♔ vs 🤖 (${mode})`;
                
                this.startTimer();
                this.render();
            }

            reset() {
                if (this.history.length > 0 && !this.gameOver) {
                    this.showModal('Start New Game?', 'Progress will be lost.', [
                        { text: 'Cancel', class: '' },
                        { text: 'New Game', class: 'btn-danger', click: () => {
                            this.closeModal();
                            this.start(this.mode);
                        }}
                    ]);
                } else {
                    this.start(this.mode);
                }
            }

            backToMenu() {
                if (this.history.length > 0 && !this.gameOver) {
                    this.showModal('Back to Menu?', 'Current game progress will be lost.', [
                        { text: 'Cancel', class: '' },
                        { text: 'Main Menu', class: 'btn-danger', click: () => {
                            this.closeModal();
                            if (this.timer) clearInterval(this.timer);
                            document.getElementById('gameScreen').classList.add('hidden');
                            document.getElementById('modeScreen').classList.remove('hidden');
                        }}
                    ]);
                } else {
                    if (this.timer) clearInterval(this.timer);
                    document.getElementById('gameScreen').classList.add('hidden');
                    document.getElementById('modeScreen').classList.remove('hidden');
                }
            }

            startTimer() {
                if (this.timer) clearInterval(this.timer);
                this.startTime = Date.now();
                this.timer = setInterval(() => {
                    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
                    const min = Math.floor(elapsed / 60);
                    const sec = elapsed % 60;
                    document.getElementById('timer').textContent = 
                        `⏱ ${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
                }, 1000);
            }

            click(r, c) {
                if (this.gameOver) return;

                if (this.selected) {
                    const [fr, fc] = this.selected;
                    if (this.validMoves.some(([vr, vc]) => vr === r && vc === c)) {
                        this.makeMove(fr, fc, r, c);
                    } else {
                        const piece = this.board[r][c];
                        if (piece && piece[0] === this.turn) {
                            this.selectPiece(r, c);
                        } else {
                            this.selected = null;
                            this.validMoves = [];
                        }
                    }
                } else {
                    const piece = this.board[r][c];
                    if (piece && piece[0] === this.turn) {
                        this.selectPiece(r, c);
                    }
                }
                this.render();
            }

            selectPiece(r, c) {
                this.selected = [r, c];
                this.validMoves = this.getValidMoves(r, c);
            }

            makeMove(r1, c1, r2, c2) {
                const piece = this.board[r1][c1];
                const target = this.board[r2][c2];

                // Save state for undo
                this.history.push({
                    board: this.board.map(row => [...row]),
                    turn: this.turn,
                    captured: {...this.captured},
                    kingPos: {...this.kingPos},
                    castling: {...this.castling},
                    enPassant: this.enPassant
                });

                // En passant capture
                if (piece[1] === 'P' && this.enPassant && r2 === this.enPassant[0] && c2 === this.enPassant[1]) {
                    const captureRow = this.turn === 'w' ? r2 + 1 : r2 - 1;
                    const capturedPawn = this.board[captureRow][c2];
                    this.captured[this.turn].push(capturedPawn);
                    this.board[captureRow][c2] = null;
                }

                // Regular capture
                if (target) {
                    this.captured[this.turn].push(target);
                }

                // Castling - move rook
                if (piece[1] === 'K' && Math.abs(c2 - c1) === 2) {
                    if (c2 === c1 + 2) {
                        this.board[r1][c1 + 1] = this.board[r1][c1 + 3];
                        this.board[r1][c1 + 3] = null;
                    } else {
                        this.board[r1][c1 - 1] = this.board[r1][c1 - 4];
                        this.board[r1][c1 - 4] = null;
                    }
                }

                // Move piece
                this.board[r2][c2] = piece;
                this.board[r1][c1] = null;

                // Update king position
                if (piece[1] === 'K') {
                    this.kingPos[piece[0]] = [r2, c2];
                    if (piece[0] === 'w') {
                        this.castling.wK = false;
                        this.castling.wQ = false;
                    } else {
                        this.castling.bK = false;
                        this.castling.bQ = false;
                    }
                }

                // Update castling rights for rook moves
                if (piece[1] === 'R') {
                    if (piece[0] === 'w') {
                        if (r1 === 7 && c1 === 0) this.castling.wQ = false;
                        if (r1 === 7 && c1 === 7) this.castling.wK = false;
                    } else {
                        if (r1 === 0 && c1 === 0) this.castling.bQ = false;
                        if (r1 === 0 && c1 === 7) this.castling.bK = false;
                    }
                }

                // En passant setup
                this.enPassant = null;
                if (piece[1] === 'P' && Math.abs(r2 - r1) === 2) {
                    this.enPassant = [this.turn === 'w' ? r2 + 1 : r2 - 1, c2];
                }

                // Pawn promotion
                if (piece[1] === 'P' && (r2 === 0 || r2 === 7)) {
                    this.board[r2][c2] = piece[0] + 'Q';
                }

                this.lastMove = { from: [r1, c1], to: [r2, c2] };
                this.selected = null;
                this.validMoves = [];
                this.turn = this.turn === 'w' ? 'b' : 'w';
                this.moveCount++;
                this.hintCooldown = Math.max(0, this.hintCooldown - 1);

                document.getElementById('moveCount').textContent = `Move: ${this.moveCount}`;

                this.updateStatus();
                this.updateCaptured();
                this.render();

                // AI move
                if (this.mode !== 'player' && this.turn === 'b' && !this.gameOver) {
                    setTimeout(() => this.aiMove(), 500);
                }
            }

            undo() {
                if (this.history.length === 0 || this.gameOver) return;

                const count = this.mode !== 'player' && this.history.length >= 2 ? 2 : 1;
                
                for (let i = 0; i < count && this.history.length > 0; i++) {
                    const prev = this.history.pop();
                    this.board = prev.board;
                    this.turn = prev.turn;
                    this.captured = prev.captured;
                    this.kingPos = prev.kingPos;
                    this.castling = prev.castling;
                    this.enPassant = prev.enPassant;
                    this.moveCount--;
                }

                this.gameOver = false;
                this.selected = null;
                this.validMoves = [];
                this.lastMove = this.history.length > 0 ? 
                    { from: this.history[this.history.length-1].from, to: this.history[this.history.length-1].to } : null;

                document.getElementById('moveCount').textContent = `Move: ${this.moveCount}`;
                this.updateCaptured();
                this.updateStatus();
                this.render();
            }

            hint() {
                if (this.hintCooldown > 0 || this.gameOver) return;

                const moves = this.getAllMoves(this.turn === 'w');
                if (moves.length === 0) return;

                moves.forEach(m => m.score = this.evaluateMove(m));
                moves.sort((a, b) => b.score - a.score);

                const best = moves[0];
                const [fr, fc] = best.from;
                const [tr, tc] = best.to;

                this.selected = [fr, fc];
                this.validMoves = [[tr, tc]];
                this.render();

                setTimeout(() => {
                    this.selected = null;
                    this.validMoves = [];
                    this.render();
                }, 2000);

                this.hintCooldown = 3;
            }

            flip() {
                this.flipped = !this.flipped;
                document.getElementById('board').style.transform = 
                    this.flipped ? 'rotate(180deg)' : '';
                document.querySelectorAll('.square').forEach(sq => {
                    sq.style.transform = this.flipped ? 'rotate(180deg)' : '';
                });
            }

            aiMove() {
                const moves = this.getAllMoves(false);
                if (moves.length === 0) return;

                let move;
                if (this.mode === 'easy') {
                    move = moves[Math.floor(Math.random() * moves.length)];
                } else {
                    moves.forEach(m => m.score = this.evaluateMove(m));
                    moves.sort((a, b) => b.score - a.score);
                    
                    if (this.mode === 'medium') {
                        const top = moves.slice(0, 3);
                        move = top[Math.floor(Math.random() * top.length)];
                    } else {
                        move = moves[0];
                    }
                }

                const [fr, fc] = move.from;
                const [tr, tc] = move.to;
                this.makeMove(fr, fc, tr, tc);
            }

            evaluateMove(move) {
                const [fr, fc] = move.from;
                const [tr, tc] = move.to;
                let score = 0;

                const target = this.board[tr][tc];
                if (target) score += PIECE_VALUES[target[1]] * 10;

                const centerDist = Math.abs(3.5 - tr) + Math.abs(3.5 - tc);
                score += (7 - centerDist);

                return score;
            }

            getAllMoves(isWhite) {
                const color = isWhite ? 'w' : 'b';
                const moves = [];
                for (let r = 0; r < 8; r++) {
                    for (let c = 0; c < 8; c++) {
                        const piece = this.board[r][c];
                        if (piece && piece[0] === color) {
                            this.getValidMoves(r, c).forEach(([tr, tc]) => {
                                moves.push({ from: [r, c], to: [tr, tc] });
                            });
                        }
                    }
                }
                return moves;
            }

            getValidMoves(r, c) {
                const moves = [];
                for (let tr = 0; tr < 8; tr++) {
                    for (let tc = 0; tc < 8; tc++) {
                        if (this.isValidMove(r, c, tr, tc)) {
                            moves.push([tr, tc]);
                        }
                    }
                }
                return moves;
            }

            isValidMove(r1, c1, r2, c2) {
                const piece = this.board[r1][c1];
                if (!piece) return false;

                const target = this.board[r2][c2];
                const color = piece[0];
                const type = piece[1];

                // Can't capture own piece
                if (target && target[0] === color) return false;

                // Check piece-specific movement
                let validPattern = false;
                switch(type) {
                    case 'P':
                        validPattern = this.validPawn(r1, c1, r2, c2, color);
                        break;
                    case 'R':
                        validPattern = this.validRook(r1, c1, r2, c2);
                        break;
                    case 'N':
                        validPattern = this.validKnight(r1, c1, r2, c2);
                        break;
                    case 'B':
                        validPattern = this.validBishop(r1, c1, r2, c2);
                        break;
                    case 'Q':
                        validPattern = this.validQueen(r1, c1, r2, c2);
                        break;
                    case 'K':
                        validPattern = this.validKing(r1, c1, r2, c2, color);
                        break;
                }

                if (!validPattern) return false;

                // Check if move leaves king in check
                return !this.leavesInCheck(r1, c1, r2, c2);
            }

            validPawn(r1, c1, r2, c2, color) {
                const dir = color === 'w' ? -1 : 1;
                const startRow = color === 'w' ? 6 : 1;
                const target = this.board[r2][c2];

                // Forward one square
                if (c1 === c2 && r2 === r1 + dir && !target) return true;

                // Forward two squares from start
                if (c1 === c2 && r1 === startRow && r2 === r1 + 2 * dir && 
                    !target && !this.board[r1 + dir][c1]) return true;

                // Capture diagonally
                if (Math.abs(c2 - c1) === 1 && r2 === r1 + dir && target) return true;

                // En passant
                if (this.enPassant && Math.abs(c2 - c1) === 1 && r2 === r1 + dir && 
                    r2 === this.enPassant[0] && c2 === this.enPassant[1]) return true;

                return false;
            }

            validRook(r1, c1, r2, c2) {
                if (r1 !== r2 && c1 !== c2) return false;
                return this.pathClear(r1, c1, r2, c2);
            }

            validKnight(r1, c1, r2, c2) {
                const dr = Math.abs(r2 - r1);
                const dc = Math.abs(c2 - c1);
                return (dr === 2 && dc === 1) || (dr === 1 && dc === 2);
            }

            validBishop(r1, c1, r2, c2) {
                if (Math.abs(r2 - r1) !== Math.abs(c2 - c1)) return false;
                return this.pathClear(r1, c1, r2, c2);
            }

            validQueen(r1, c1, r2, c2) {
                if (r1 === r2 || c1 === c2 || Math.abs(r2 - r1) === Math.abs(c2 - c1)) {
                    return this.pathClear(r1, c1, r2, c2);
                }
                return false;
            }

            validKing(r1, c1, r2, c2, color) {
                // Normal move
                if (Math.abs(r2 - r1) <= 1 && Math.abs(c2 - c1) <= 1) return true;

                // Castling
                if (r1 !== r2 || this.inCheck(color)) return false;

                const enemy = color === 'w' ? 'b' : 'w';

                // Kingside castling
                if (c2 === c1 + 2) {
                    if (color === 'w' && !this.castling.wK) return false;
                    if (color === 'b' && !this.castling.bK) return false;
                    if (this.board[r1][c1 + 1] || this.board[r1][c1 + 2]) return false;
                    if (!this.board[r1][c1 + 3] || this.board[r1][c1 + 3] !== color + 'R') return false;
                    if (this.attackedBy(r1, c1 + 1, enemy) || this.attackedBy(r1, c1 + 2, enemy)) return false;
                    return true;
                }

                // Queenside castling
                if (c2 === c1 - 2) {
                    if (color === 'w' && !this.castling.wQ) return false;
                    if (color === 'b' && !this.castling.bQ) return false;
                    if (this.board[r1][c1 - 1] || this.board[r1][c1 - 2] || this.board[r1][c1 - 3]) return false;
                    if (!this.board[r1][c1 - 4] || this.board[r1][c1 - 4] !== color + 'R') return false;
                    if (this.attackedBy(r1, c1 - 1, enemy) || this.attackedBy(r1, c1 - 2, enemy)) return false;
                    return true;
                }

                return false;
            }

            pathClear(r1, c1, r2, c2) {
                const dr = Math.sign(r2 - r1);
                const dc = Math.sign(c2 - c1);
                let r = r1 + dr, c = c1 + dc;

                while (r !== r2 || c !== c2) {
                    if (this.board[r][c]) return false;
                    r += dr;
                    c += dc;
                }
                return true;
            }

            attackedBy(r, c, color) {
                for (let i = 0; i < 8; i++) {
                    for (let j = 0; j < 8; j++) {
                        const p = this.board[i][j];
                        if (p && p[0] === color) {
                            if (this.canAttack(i, j, r, c)) return true;
                        }
                    }
                }
                return false;
            }

            canAttack(r1, c1, r2, c2) {
                const piece = this.board[r1][c1];
                if (!piece) return false;

                const type = piece[1];
                const color = piece[0];

                switch(type) {
                    case 'P': {
                        const dir = color === 'w' ? -1 : 1;
                        return Math.abs(c2 - c1) === 1 && r2 === r1 + dir;
                    }
                    case 'R': return this.validRook(r1, c1, r2, c2);
                    case 'N': return this.validKnight(r1, c1, r2, c2);
                    case 'B': return this.validBishop(r1, c1, r2, c2);
                    case 'Q': return this.validQueen(r1, c1, r2, c2);
                    case 'K': return Math.abs(r2 - r1) <= 1 && Math.abs(c2 - c1) <= 1;
                }
                return false;
            }

            inCheck(color) {
                const king = this.kingPos[color];
                if (!king) return false;
                const enemy = color === 'w' ? 'b' : 'w';
                return this.attackedBy(king[0], king[1], enemy);
            }

            leavesInCheck(r1, c1, r2, c2) {
                const piece = this.board[r1][c1];
                const target = this.board[r2][c2];
                const oldKing = {...this.kingPos};

                // Make move
                this.board[r2][c2] = piece;
                this.board[r1][c1] = null;
                if (piece[1] === 'K') this.kingPos[piece[0]] = [r2, c2];

                const check = this.inCheck(piece[0]);

                // Undo
                this.board[r1][c1] = piece;
                this.board[r2][c2] = target;
                this.kingPos = oldKing;

                return check;
            }

            hasLegalMoves(color) {
                for (let r1 = 0; r1 < 8; r1++) {
                    for (let c1 = 0; c1 < 8; c1++) {
                        const p = this.board[r1][c1];
                        if (p && p[0] === color) {
                            for (let r2 = 0; r2 < 8; r2++) {
                                for (let c2 = 0; c2 < 8; c2++) {
                                    if (this.isValidMove(r1, c1, r2, c2)) return true;
                                }
                            }
                        }
                    }
                }
                return false;
            }

            updateStatus() {
                const check = this.inCheck(this.turn);
                const hasMove = this.hasLegalMoves(this.turn);

                const status = document.getElementById('status');
                status.className = 'status';

                if (check && !hasMove) {
                    this.gameOver = true;
                    clearInterval(this.timer);
                    const winner = this.turn === 'w' ? 'Black' : 'White';
                    this.showGameOver(`🏆 Checkmate! ${winner} Wins!`);
                    return;
                }

                if (!hasMove) {
                    this.gameOver = true;
                    clearInterval(this.timer);
                    this.showGameOver('🤝 Stalemate! Draw!');
                    return;
                }

                if (check) {
                    status.textContent = `⚠️ ${this.turn === 'w' ? 'White' : 'Black'} in Check!`;
                    status.className = 'status check';
                } else {
                    status.textContent = this.turn === 'w' ? "⚪ White's Turn" : "⚫ Black's Turn";
                    status.className = 'status';
                }
            }

            showGameOver(message) {
                const status = document.getElementById('status');
                status.textContent = message;
                status.className = 'status game-over';

                setTimeout(() => {
                    this.showModal(message, '', [
                        { text: 'New Game', class: 'btn-success', click: () => {
                            this.closeModal();
                            this.start(this.mode);
                        }},
                        { text: 'Main Menu', class: '', click: () => {
                            this.closeModal();
                            document.getElementById('gameScreen').classList.add('hidden');
                            document.getElementById('modeScreen').classList.remove('hidden');
                        }}
                    ]);
                }, 500);
            }

            updateCaptured() {
                document.getElementById('capturedWhite').innerHTML = 
                    this.captured.w.map(p => PIECES[p[0]][p[1]]).join(' ');
                document.getElementById('capturedBlack').innerHTML = 
                    this.captured.b.map(p => PIECES[p[0]][p[1]]).join(' ');
            }

            render() {
                const board = document.getElementById('board');
                board.innerHTML = '';

                this.board.forEach((row, r) => {
                    row.forEach((piece, c) => {
                        const square = document.createElement('div');
                        square.className = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
                        
                        if (piece) {
                            square.textContent = PIECES[piece[0]][piece[1]];
                            square.classList.add('has-piece');
                        }
                        
                        if (this.selected && this.selected[0] === r && this.selected[1] === c) {
                            square.classList.add('selected');
                        }
                        
                        if (this.validMoves.some(([vr, vc]) => vr === r && vc === c)) {
                            square.classList.add('valid-move');
                            if (this.board[r][c]) square.classList.add('has-piece');
                        }
                        
                        if (this.lastMove) {
                            const [fr, fc] = this.lastMove.from;
                            const [tr, tc] = this.lastMove.to;
                            if ((r === fr && c === fc) || (r === tr && c === tc)) {
                                square.classList.add('last-move');
                            }
                        }

                        // Check highlighting
                        if (this.inCheck(this.turn)) {
                            const [kr, kc] = this.kingPos[this.turn];
                            if (r === kr && c === kc) {
                                square.classList.add('check');
                            }
                        }
                        
                        if (this.gameOver) {
                            square.classList.add('disabled');
                            square.style.cursor = 'default';
                        }

                        square.onclick = () => this.click(r, c);
                        board.appendChild(square);
                    });
                });

                document.getElementById('undoBtn').disabled = this.history.length === 0 || this.gameOver;
                document.getElementById('hintBtn').disabled = this.hintCooldown > 0 || this.gameOver;
                document.getElementById('hintBtn').textContent = 
                    this.hintCooldown > 0 ? `💡 (${this.hintCooldown})` : '💡 Hint';
            }

            showModal(title, body, buttons) {
                document.getElementById('modalTitle').textContent = title;
                document.getElementById('modalBody').textContent = body;
                
                const btnContainer = document.getElementById('modalButtons');
                btnContainer.innerHTML = '';
                
                buttons.forEach(btn => {
                    const button = document.createElement('button');
                    button.textContent = btn.text;
                    button.className = btn.class;
                    button.onclick = btn.click || (() => this.closeModal());
                    btnContainer.appendChild(button);
                });

                document.getElementById('modal').classList.add('active');
            }

            closeModal() {
                document.getElementById('modal').classList.remove('active');
            }
        }

        const game = new ChessGame();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'u') game.undo();
            if (e.key === 'h') game.hint();
            if (e.key === 'f') game.flip();
        });