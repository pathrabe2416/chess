        // ============================================================
        // GAME CONSTANTS & INITIALIZATION
        // ============================================================
        
        const PIECES = {
            K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
            k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟'
        };

        const PIECE_VALUES = {
            p: 1, n: 3, b: 3, r: 5, q: 9, k: 0
        };

        const INITIAL_BOARD = [
            ['r','n','b','q','k','b','n','r'],
            ['p','p','p','p','p','p','p','p'],
            ['','','','','','','',''],
            ['','','','','','','',''],
            ['','','','','','','',''],
            ['','','','','','','',''],
            ['P','P','P','P','P','P','P','P'],
            ['R','N','B','Q','K','B','N','R']
        ];

        const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

        // ============================================================
        // GAME STATE
        // ============================================================
        
        let board = [];
        let gameMode = null;
        let difficulty = 'easy';
        let currentPlayer = 'white';
        let selectedSquare = null;
        let validMoves = [];
        let lastMove = null;
        let gameOver = false;
        let moveHistory = [];
        let capturedPieces = { white: [], black: [] };
        let boardFlipped = false;
        let soundEnabled = true;
        let animationsEnabled = true;
        let hintCooldown = 0;
        let gameStartTime = null;
        let timerInterval = null;
        let elapsedTime = 0;
        let moveCount = 0;

        // Audio context for sound effects
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // ============================================================
        // SOUND SYSTEM
        // ============================================================

        function playSound(type) {
            if (!soundEnabled) return;
            
            try {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                osc.connect(gain);
                gain.connect(audioContext.destination);

                const now = audioContext.currentTime;
                
                switch(type) {
                    case 'move':
                        osc.frequency.value = 440;
                        gain.gain.setValueAtTime(0.1, now);
                        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                        osc.start(now);
                        osc.stop(now + 0.1);
                        break;
                    case 'capture':
                        osc.frequency.value = 330;
                        gain.gain.setValueAtTime(0.15, now);
                        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                        osc.start(now);
                        osc.stop(now + 0.15);
                        break;
                    case 'check':
                        osc.frequency.value = 600;
                        gain.gain.setValueAtTime(0.12, now);
                        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                        osc.start(now);
                        osc.stop(now + 0.15);
                        break;
                    case 'checkmate':
                        osc.frequency.value = 440;
                        gain.gain.setValueAtTime(0.15, now);
                        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                        osc.start(now);
                        osc.stop(now + 0.3);
                        break;
                    case 'select':
                        osc.frequency.value = 500;
                        gain.gain.setValueAtTime(0.08, now);
                        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                        osc.start(now);
                        osc.stop(now + 0.05);
                        break;
                }
            } catch(e) {
                console.log('Sound error:', e);
            }
        }

        function toggleSound() {
            soundEnabled = !soundEnabled;
            document.getElementById('soundBtn').textContent = soundEnabled ? '🔊' : '🔇';
            saveSettings();
            playSound('select');
        }

        // ============================================================
        // LOCAL STORAGE & PERSISTENCE
        // ============================================================

        function saveGameState() {
            const state = {
                board: board,
                gameMode: gameMode,
                difficulty: difficulty,
                currentPlayer: currentPlayer,
                moveHistory: moveHistory,
                capturedPieces: capturedPieces,
                gameOver: gameOver,
                lastMove: lastMove,
                moveCount: moveCount,
                elapsedTime: elapsedTime,
                timestamp: Date.now()
            };
            localStorage.setItem('chessGameState', JSON.stringify(state));
        }

        function loadGameState() {
            const saved = localStorage.getItem('chessGameState');
            if (!saved) return null;
            
            try {
                const state = JSON.parse(saved);
                // Check if game is less than 24 hours old
                if (Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
                    return null;
                }
                return state;
            } catch(e) {
                return null;
            }
        }

        function clearGameState() {
            localStorage.removeItem('chessGameState');
        }

        function saveSettings() {
            const settings = {
                soundEnabled: soundEnabled,
                animationsEnabled: animationsEnabled,
                difficulty: difficulty
            };
            localStorage.setItem('chessSettings', JSON.stringify(settings));
        }

        function loadSettings() {
            const saved = localStorage.getItem('chessSettings');
            if (!saved) return;
            
            try {
                const settings = JSON.parse(saved);
                soundEnabled = settings.soundEnabled !== undefined ? settings.soundEnabled : true;
                animationsEnabled = settings.animationsEnabled !== undefined ? settings.animationsEnabled : true;
                difficulty = settings.difficulty || 'easy';
                
                document.getElementById('soundBtn').textContent = soundEnabled ? '🔊' : '🔇';
            } catch(e) {
                console.log('Error loading settings:', e);
            }
        }

        function saveStatistics(result) {
            let stats = getStatistics();
            stats.total++;
            
            if (result === 'win') stats.wins++;
            else if (result === 'loss') stats.losses++;
            else if (result === 'draw') stats.draws++;
            
            localStorage.setItem('chessStats', JSON.stringify(stats));
            updateStatisticsDisplay();
        }

        function getStatistics() {
            const saved = localStorage.getItem('chessStats');
            if (!saved) return { wins: 0, losses: 0, draws: 0, total: 0 };
            
            try {
                return JSON.parse(saved);
            } catch(e) {
                return { wins: 0, losses: 0, draws: 0, total: 0 };
            }
        }

        function updateStatisticsDisplay() {
            const stats = getStatistics();
            document.getElementById('statWins').textContent = stats.wins;
            document.getElementById('statLosses').textContent = stats.losses;
            document.getElementById('statDraws').textContent = stats.draws;
            document.getElementById('statGames').textContent = stats.total;
        }

        // ============================================================
        // NAVIGATION & MODE SELECTION
        // ============================================================

        function showModeScreen() {
            document.getElementById('modeScreen').classList.remove('hidden');
            document.getElementById('gameScreen').classList.add('hidden');
            document.getElementById('difficultySelector').classList.add('hidden');
            stopTimer();
        }

        function showDifficultySelect() {
            document.getElementById('difficultySelector').classList.remove('hidden');
        }

        function selectDifficulty(level) {
            difficulty = level;
            
            // Update button styles
            const buttons = document.querySelectorAll('.difficulty-buttons button');
            buttons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            
            saveSettings();
        }

        function startGameWithDifficulty() {
            startGame('computer');
        }

        function startGame(mode) {
            gameMode = mode;
            document.getElementById('modeScreen').classList.add('hidden');
            document.getElementById('gameScreen').classList.remove('hidden');
            document.getElementById('gameTitle').textContent = 
                mode === 'computer' ? `♔ vs 🤖 (${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)})` : '♔ Chess';
            
            // Check for saved game
            const savedState = loadGameState();
            if (savedState && !gameOver) {
                showResumeDialog(savedState);
            } else {
                resetGame();
                if (isFirstTimeUser()) {
                    showTutorial();
                }
            }
        }

        function isFirstTimeUser() {
            const visited = localStorage.getItem('chessVisited');
            if (!visited) {
                localStorage.setItem('chessVisited', 'true');
                return true;
            }
            return false;
        }

        // ============================================================
        // GAME INITIALIZATION & RESET
        // ============================================================

        function resetGame() {
            board = JSON.parse(JSON.stringify(INITIAL_BOARD));
            currentPlayer = 'white';
            selectedSquare = null;
            validMoves = [];
            lastMove = null;
            gameOver = false;
            moveHistory = [];
            capturedPieces = { white: [], black: [] };
            hintCooldown = 0;
            moveCount = 0;
            elapsedTime = 0;
            
            clearGameState();
            startTimer();
            render();
            updateMoveHistoryDisplay();
            updateCapturedPiecesDisplay();
            document.getElementById('undoBtn').disabled = false;
            document.getElementById('hintBtn').disabled = false;
        }

        function confirmNewGame() {
            if (moveHistory.length > 0 && !gameOver) {
                showConfirmDialog(
                    'Start New Game?',
                    'Current game progress will be lost. Continue?',
                    () => {
                        resetGame();
                        playSound('select');
                    }
                );
            } else {
                resetGame();
                playSound('select');
            }
        }

        function confirmBackToMenu() {
            if (moveHistory.length > 0 && !gameOver) {
                showConfirmDialog(
                    'Back to Menu?',
                    'Current game progress will be lost. Continue?',
                    () => {
                        clearGameState();
                        showModeScreen();
                        playSound('select');
                    }
                );
            } else {
                clearGameState();
                showModeScreen();
                playSound('select');
            }
        }

        // ============================================================
        // TIMER
        // ============================================================

        function startTimer() {
            stopTimer();
            gameStartTime = Date.now() - (elapsedTime * 1000);
            timerInterval = setInterval(updateTimer, 1000);
        }

        function stopTimer() {
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
        }

        function updateTimer() {
            elapsedTime = Math.floor((Date.now() - gameStartTime) / 1000);
            const minutes = Math.floor(elapsedTime / 60);
            const seconds = elapsedTime % 60;
            document.getElementById('timer').textContent = 
                `⏱ ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        // ============================================================
        // CHESS GAME LOGIC
        // ============================================================

        function isValidMove(fromR, fromC, toR, toC) {
            if (toR < 0 || toR > 7 || toC < 0 || toC > 7) return false;
            
            const piece = board[fromR][fromC];
            const target = board[toR][toC];
            const isWhite = piece === piece.toUpperCase();
            
            if (target && (target === target.toUpperCase()) === isWhite) return false;

            const type = piece.toLowerCase();
            const dR = toR - fromR;
            const dC = toC - fromC;

            switch(type) {
                case 'p': {
                    const dir = isWhite ? -1 : 1;
                    if (dC === 0 && !target) {
                        if (dR === dir) return true;
                        const startRow = isWhite ? 6 : 1;
                        if (fromR === startRow && dR === dir * 2 && !board[fromR + dir][fromC]) return true;
                    }
                    if (Math.abs(dC) === 1 && dR === dir && target) return true;
                    return false;
                }
                case 'r':
                    return (dR === 0 || dC === 0) && isPathClear(fromR, fromC, toR, toC);
                case 'n':
                    return (Math.abs(dR) === 2 && Math.abs(dC) === 1) || 
                           (Math.abs(dR) === 1 && Math.abs(dC) === 2);
                case 'b':
                    return Math.abs(dR) === Math.abs(dC) && isPathClear(fromR, fromC, toR, toC);
                case 'q':
                    return (dR === 0 || dC === 0 || Math.abs(dR) === Math.abs(dC)) && 
                           isPathClear(fromR, fromC, toR, toC);
                case 'k':
                    return Math.abs(dR) <= 1 && Math.abs(dC) <= 1;
                default:
                    return false;
            }
        }

        function isPathClear(fromR, fromC, toR, toC) {
            const stepR = Math.sign(toR - fromR);
            const stepC = Math.sign(toC - fromC);
            let r = fromR + stepR;
            let c = fromC + stepC;
            while (r !== toR || c !== toC) {
                if (board[r][c]) return false;
                r += stepR;
                c += stepC;
            }
            return true;
        }

        function getValidMoves(row, col) {
            const moves = [];
            const piece = board[row][col];
            const isWhite = piece === piece.toUpperCase();
            
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    if (isValidMove(row, col, r, c)) {
                        // Simulate move and check if king is safe
                        const temp = JSON.parse(JSON.stringify(board));
                        temp[r][c] = temp[row][col];
                        temp[row][col] = '';
                        if (!isKingInCheck(temp, isWhite)) {
                            moves.push([r, c]);
                        }
                    }
                }
            }
            return moves;
        }

        function findKing(b, isWhite) {
            const king = isWhite ? 'K' : 'k';
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    if (b[r][c] === king) return [r, c];
                }
            }
            return null;
        }

        function isKingInCheck(b, isWhite) {
            const kingPos = findKing(b, isWhite);
            if (!kingPos) return false;
            const [kr, kc] = kingPos;
            
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const piece = b[r][c];
                    if (piece && (piece === piece.toUpperCase()) !== isWhite) {
                        if (isValidMove(r, c, kr, kc)) return true;
                    }
                }
            }
            return false;
        }

        function hasValidMoves(isWhite) {
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const piece = board[r][c];
                    if (piece && (piece === piece.toUpperCase()) === isWhite) {
                        if (getValidMoves(r, c).length > 0) return true;
                    }
                }
            }
            return false;
        }

        function checkGameStatus() {
            const isWhite = currentPlayer === 'white';
            const inCheck = isKingInCheck(board, isWhite);
            
            if (!hasValidMoves(isWhite)) {
                gameOver = true;
                stopTimer();
                if (inCheck) {
                    playSound('checkmate');
                    return 'checkmate';
                }
                return 'stalemate';
            }
            if (inCheck) {
                playSound('check');
                return 'check';
            }
            return 'normal';
        }

        // ============================================================
        // MOVE NOTATION
        // ============================================================

        function getMoveNotation(fromR, fromC, toR, toC, piece, captured) {
            const type = piece.toLowerCase();
            const file = FILES[toC];
            const rank = 8 - toR;
            
            let notation = '';
            
            if (type === 'k') notation = 'K';
            else if (type === 'q') notation = 'Q';
            else if (type === 'r') notation = 'R';
            else if (type === 'b') notation = 'B';
            else if (type === 'n') notation = 'N';
            else if (type === 'p') {
                if (captured) {
                    notation = FILES[fromC];
                }
            }
            
            if (captured) notation += 'x';
            notation += file + rank;
            
            // Check for check/checkmate
            const status = checkGameStatus();
            if (status === 'checkmate') notation += '#';
            else if (status === 'check') notation += '+';
            
            return notation;
        }

        // ============================================================
        // MOVE HISTORY
        // ============================================================

        function updateMoveHistoryDisplay() {
            const historyEl = document.getElementById('moveHistory');
            
            if (moveHistory.length === 0) {
                historyEl.innerHTML = '<div style="color: #999; font-size: 12px; text-align: center; padding: 20px;">No moves yet</div>';
                return;
            }
            
            let html = '';
            for (let i = 0; i < moveHistory.length; i += 2) {
                const moveNum = Math.floor(i / 2) + 1;
                const whiteMove = moveHistory[i].notation;
                const blackMove = moveHistory[i + 1] ? moveHistory[i + 1].notation : '';
                
                html += `<div class="move-entry ${i === moveHistory.length - 1 || i === moveHistory.length - 2 ? 'current' : ''}">${moveNum}. ${whiteMove} ${blackMove}</div>`;
            }
            
            historyEl.innerHTML = html;
            historyEl.scrollTop = historyEl.scrollHeight;
        }

        function clearMoveHistory() {
            if (moveHistory.length > 0) {
                showConfirmDialog(
                    'Clear Move History?',
                    'This will clear the display but not undo moves.',
                    () => {
                        updateMoveHistoryDisplay();
                        playSound('select');
                    }
                );
            }
        }

        // ============================================================
        // CAPTURED PIECES
        // ============================================================

        function updateCapturedPiecesDisplay() {
            const whiteEl = document.getElementById('capturedByWhite');
            const blackEl = document.getElementById('capturedByBlack');
            
            whiteEl.innerHTML = capturedPieces.white.map(p => PIECES[p]).join(' ');
            blackEl.innerHTML = capturedPieces.black.map(p => PIECES[p]).join(' ');
            
            // Calculate material advantage
            const whiteMaterial = capturedPieces.white.reduce((sum, p) => sum + PIECE_VALUES[p.toLowerCase()], 0);
            const blackMaterial = capturedPieces.black.reduce((sum, p) => sum + PIECE_VALUES[p.toLowerCase()], 0);
            const advantage = whiteMaterial - blackMaterial;
            
            const whiteAdvEl = document.getElementById('materialWhite');
            const blackAdvEl = document.getElementById('materialBlack');
            
            if (advantage > 0) {
                whiteAdvEl.textContent = `+${advantage}`;
                whiteAdvEl.className = 'material-advantage';
                blackAdvEl.textContent = '';
            } else if (advantage < 0) {
                blackAdvEl.textContent = `+${Math.abs(advantage)}`;
                blackAdvEl.className = 'material-advantage';
                whiteAdvEl.textContent = '';
            } else {
                whiteAdvEl.textContent = '';
                blackAdvEl.textContent = '';
            }
        }

        // ============================================================
        // USER INTERACTION
        // ============================================================

        function handleClick(row, col) {
            if (gameOver) return;
            
            if (selectedSquare) {
                const [fromR, fromC] = selectedSquare;
                const isValid = validMoves.some(([r, c]) => r === row && c === col);
                
                if (isValid) {
                    makeMove(fromR, fromC, row, col);
                } else {
                    // Clicked on another piece of same color
                    const piece = board[row][col];
                    if (piece) {
                        const isWhite = piece === piece.toUpperCase();
                        if ((currentPlayer === 'white') === isWhite) {
                            selectedSquare = [row, col];
                            validMoves = getValidMoves(row, col);
                            playSound('select');
                            render();
                            return;
                        }
                    }
                    
                    // Invalid move
                    selectedSquare = null;
                    validMoves = [];
                }
            } else {
                const piece = board[row][col];
                if (piece) {
                    const isWhite = piece === piece.toUpperCase();
                    if ((currentPlayer === 'white') === isWhite) {
                        selectedSquare = [row, col];
                        validMoves = getValidMoves(row, col);
                        
                        if (validMoves.length === 0) {
                            showToast('No valid moves for this piece');
                            selectedSquare = null;
                        } else {
                            playSound('select');
                        }
                    } else {
                        showToast('Not your piece!');
                    }
                }
            }
            render();
        }

        function makeMove(fromR, fromC, toR, toC) {
            const piece = board[fromR][fromC];
            const target = board[toR][toC];
            const isWhite = piece === piece.toUpperCase();
            
            // Save move for undo
            const moveData = {
                from: [fromR, fromC],
                to: [toR, toC],
                piece: piece,
                captured: target,
                board: JSON.parse(JSON.stringify(board))
            };
            
            // Handle capture
            if (target) {
                playSound('capture');
                const capturedBy = isWhite ? 'white' : 'black';
                capturedPieces[capturedBy].push(target);
            } else {
                playSound('move');
            }
            
            // Move piece
            board[toR][toC] = piece;
            board[fromR][fromC] = '';
            
            // Pawn promotion
            if (piece.toLowerCase() === 'p' && (toR === 0 || toR === 7)) {
                showPawnPromotion(toR, toC, isWhite, moveData);
                return; // Will continue after promotion
            }
            
            completeMoveAfterPromotion(moveData, null);
        }

        function completeMoveAfterPromotion(moveData, promotedTo) {
            const [toR, toC] = moveData.to;
            const [fromR, fromC] = moveData.from;
            
            if (promotedTo) {
                board[toR][toC] = promotedTo;
            }
            
            const notation = getMoveNotation(fromR, fromC, toR, toC, board[toR][toC], moveData.captured);
            moveData.notation = notation;
            
            moveHistory.push(moveData);
            lastMove = { from: moveData.from, to: moveData.to };
            
            moveCount++;
            document.getElementById('moveCounter').textContent = `Move: ${moveCount}`;
            
            selectedSquare = null;
            validMoves = [];
            currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
            
            if (hintCooldown > 0) hintCooldown--;
            
            render();
            updateMoveHistoryDisplay();
            updateCapturedPiecesDisplay();
            saveGameState();
            
            // Check for computer move
            if (gameMode === 'computer' && currentPlayer === 'black' && !gameOver) {
                setTimeout(makeComputerMove, 600);
            }
        }

        // ============================================================
        // UNDO FUNCTIONALITY
        // ============================================================

        function undoMove() {
            if (moveHistory.length === 0 || gameOver) return;
            
            // In computer mode, undo both player and AI moves
            const undoCount = (gameMode === 'computer' && moveHistory.length >= 2) ? 2 : 1;
            
            for (let i = 0; i < undoCount && moveHistory.length > 0; i++) {
                const lastMove = moveHistory.pop();
                
                // Restore board state
                board = JSON.parse(JSON.stringify(lastMove.board));
                
                // Restore captured pieces
                if (lastMove.captured) {
                    const capturedBy = lastMove.piece === lastMove.piece.toUpperCase() ? 'white' : 'black';
                    const idx = capturedPieces[capturedBy].lastIndexOf(lastMove.captured);
                    if (idx !== -1) {
                        capturedPieces[capturedBy].splice(idx, 1);
                    }
                }
                
                moveCount--;
            }
            
            currentPlayer = 'white'; // Always return to white after undo
            selectedSquare = null;
            validMoves = [];
            lastMove = moveHistory.length > 0 ? { from: moveHistory[moveHistory.length - 1].from, to: moveHistory[moveHistory.length - 1].to } : null;
            
            document.getElementById('moveCounter').textContent = `Move: ${moveCount}`;
            
            playSound('move');
            render();
            updateMoveHistoryDisplay();
            updateCapturedPiecesDisplay();
            saveGameState();
        }

        // ============================================================
        // HINT SYSTEM
        // ============================================================

        function showHint() {
            if (hintCooldown > 0) {
                showToast(`Hint available in ${hintCooldown} moves`);
                return;
            }
            
            if (gameOver) return;
            
            const isWhite = currentPlayer === 'white';
            const allMoves = [];
            
            // Collect all valid moves
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const piece = board[r][c];
                    if (piece && (piece === piece.toUpperCase()) === isWhite) {
                        const moves = getValidMoves(r, c);
                        moves.forEach(([toR, toC]) => {
                            allMoves.push({
                                from: [r, c],
                                to: [toR, toC],
                                score: evaluateMove(r, c, toR, toC)
                            });
                        });
                    }
                }
            }
            
            if (allMoves.length === 0) return;
            
            // Sort by score and pick best move
            allMoves.sort((a, b) => b.score - a.score);
            const bestMove = allMoves[0];
            
            // Highlight the hint
            const hintSquares = document.querySelectorAll('.square');
            const fromIdx = bestMove.from[0] * 8 + bestMove.from[1];
            const toIdx = bestMove.to[0] * 8 + bestMove.to[1];
            
            hintSquares[fromIdx].classList.add('hint-move');
            hintSquares[toIdx].classList.add('hint-move');
            
            setTimeout(() => {
                hintSquares[fromIdx].classList.remove('hint-move');
                hintSquares[toIdx].classList.remove('hint-move');
            }, 2000);
            
            hintCooldown = 3;
            document.getElementById('hintBtn').disabled = true;
            
            playSound('select');
            showToast('💡 Best move highlighted!');
        }

        function evaluateMove(fromR, fromC, toR, toC) {
            let score = 0;
            const target = board[toR][toC];
            
            // Capture value
            if (target) {
                score += PIECE_VALUES[target.toLowerCase()] * 10;
            }
            
            // Center control
            const centerDist = Math.abs(3.5 - toR) + Math.abs(3.5 - toC);
            score += (7 - centerDist);
            
            // Development bonus for early moves
            if (moveCount < 10) {
                if (fromR === 0 || fromR === 7) score += 2;
            }
            
            return score;
        }

        // ============================================================
        // COMPUTER AI
        // ============================================================

        function makeComputerMove() {
            document.getElementById('loadingMessage').classList.remove('hidden');
            
            setTimeout(() => {
                const move = difficulty === 'easy' ? getRandomMove() :
                             difficulty === 'medium' ? getSmartMove() :
                             getBestMove();
                
                if (move) {
                    const [fromR, fromC] = move.from;
                    const [toR, toC] = move.to;
                    
                    // Highlight AI move briefly
                    selectedSquare = [fromR, fromC];
                    validMoves = [[toR, toC]];
                    render();
                    
                    setTimeout(() => {
                        makeMove(fromR, fromC, toR, toC);
                        document.getElementById('loadingMessage').classList.add('hidden');
                    }, 400);
                }
            }, 300);
        }

        function getRandomMove() {
            const moves = getAllValidMoves(false);
            return moves.length > 0 ? moves[Math.floor(Math.random() * moves.length)] : null;
        }

        function getSmartMove() {
            const moves = getAllValidMoves(false);
            if (moves.length === 0) return null;
            
            // Score each move
            moves.forEach(move => {
                move.score = evaluateMove(move.from[0], move.from[1], move.to[0], move.to[1]);
            });
            
            // Sort by score
            moves.sort((a, b) => b.score - a.score);
            
            // Pick from top 3 moves with some randomness
            const topMoves = moves.slice(0, Math.min(3, moves.length));
            return topMoves[Math.floor(Math.random() * topMoves.length)];
        }

        function getBestMove() {
            const moves = getAllValidMoves(false);
            if (moves.length === 0) return null;
            
            let bestMove = null;
            let bestScore = -Infinity;
            
            // Simple minimax (depth 1)
            moves.forEach(move => {
                const [fromR, fromC] = move.from;
                const [toR, toC] = move.to;
                
                // Simulate move
                const tempBoard = JSON.parse(JSON.stringify(board));
                const captured = tempBoard[toR][toC];
                tempBoard[toR][toC] = tempBoard[fromR][fromC];
                tempBoard[fromR][fromC] = '';
                
                // Evaluate position
                let score = evaluateMove(fromR, fromC, toR, toC);
                
                // Check if move leads to check
                if (isKingInCheck(tempBoard, true)) {
                    score += 50;
                }
                
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            });
            
            return bestMove;
        }

        function getAllValidMoves(isWhite) {
            const moves = [];
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const piece = board[r][c];
                    if (piece && (piece === piece.toUpperCase()) === isWhite) {
                        getValidMoves(r, c).forEach(([toR, toC]) => {
                            moves.push({ from: [r, c], to: [toR, toC] });
                        });
                    }
                }
            }
            return moves;
        }

        // ============================================================
        // PAWN PROMOTION
        // ============================================================

        function showPawnPromotion(row, col, isWhite, moveData) {
            const pieces = isWhite ? ['Q', 'R', 'B', 'N'] : ['q', 'r', 'b', 'n'];
            const pieceNames = ['Queen', 'Rook', 'Bishop', 'Knight'];
            
            let html = '<div class="promotion-pieces">';
            pieces.forEach((piece, idx) => {
                html += `<div class="promotion-piece" onclick="selectPromotion('${piece}', ${row}, ${col}, ${JSON.stringify(moveData).replace(/"/g, '&quot;')})" title="${pieceNames[idx]}">
                    ${PIECES[piece]}
                </div>`;
            });
            html += '</div>';
            
            showModal('Pawn Promotion', 'Choose a piece:', html, [], false);
        }

        function selectPromotion(piece, row, col, moveData) {
            closeModal();
            completeMoveAfterPromotion(moveData, piece);
        }

        // ============================================================
        // BOARD UTILITIES
        // ============================================================

        function flipBoard() {
            boardFlipped = !boardFlipped;
            document.getElementById('boardWrapper').classList.toggle('flipped');
            playSound('select');
        }

        // ============================================================
        // RENDERING
        // ============================================================

        function render() {
            const boardEl = document.getElementById('board');
            const statusEl = document.getElementById('status');
            boardEl.innerHTML = '';
            
            board.forEach((row, r) => {
                row.forEach((piece, c) => {
                    const square = document.createElement('div');
                    square.className = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
                    square.textContent = piece ? PIECES[piece] : '';
                    square.setAttribute('role', 'gridcell');
                    square.setAttribute('aria-label', `${FILES[c]}${8-r}${piece ? ' ' + piece : ' empty'}`);
                    
                    if (piece) {
                        square.classList.add('has-piece');
                    }
                    
                    if (selectedSquare && selectedSquare[0] === r && selectedSquare[1] === c) {
                        square.classList.add('selected');
                    }
                    
                    if (validMoves.some(([vr, vc]) => vr === r && vc === c)) {
                        square.classList.add('valid-move');
                        if (board[r][c]) square.classList.add('has-piece');
                    }
                    
                    if (lastMove) {
                        const [fr, fc] = lastMove.from;
                        const [tr, tc] = lastMove.to;
                        if ((r === fr && c === fc) || (r === tr && c === tc)) {
                            square.classList.add('last-move');
                        }
                    }
                    
                    if (gameOver) {
                        square.classList.add('disabled');
                        square.style.cursor = 'default';
                    }
                    
                    square.onclick = () => handleClick(r, c);
                    boardEl.appendChild(square);
                });
            });
            
            // Update status
            const status = checkGameStatus();
            const kingPos = findKing(board, currentPlayer === 'white');
            
            if (kingPos && status === 'check') {
                const [kr, kc] = kingPos;
                const squares = boardEl.children;
                squares[kr * 8 + kc].classList.add('in-check');
            }
            
            // Update button states
            document.getElementById('undoBtn').disabled = moveHistory.length === 0 || gameOver;
            document.getElementById('hintBtn').disabled = hintCooldown > 0 || gameOver;
            if (hintCooldown > 0) {
                document.getElementById('hintBtn').textContent = `💡 (${hintCooldown})`;
            } else {
                document.getElementById('hintBtn').textContent = '💡 Hint';
            }
            
            // Update status text
            if (status === 'checkmate') {
                const winner = currentPlayer === 'white' ? 'Black' : 'White';
                statusEl.textContent = `🏆 Checkmate! ${winner} Wins!`;
                statusEl.className = 'status checkmate';
                
                // Save statistics
                if (gameMode === 'computer') {
                    saveStatistics(winner === 'White' ? 'win' : 'loss');
                }
                
                // Show victory modal
                setTimeout(() => showVictoryModal(winner), 500);
            } else if (status === 'stalemate') {
                statusEl.textContent = '🤝 Stalemate! Draw!';
                statusEl.className = 'status stalemate';
                saveStatistics('draw');
                setTimeout(() => showVictoryModal('Draw'), 500);
            } else if (status === 'check') {
                statusEl.textContent = `⚠️ ${currentPlayer === 'white' ? 'White' : 'Black'} is in Check!`;
                statusEl.className = 'status check';
            } else {
                statusEl.textContent = currentPlayer === 'white' ? "⚪ White's Turn" : "⚫ Black's Turn";
                statusEl.className = 'status';
            }
        }

        // ============================================================
        // MODAL SYSTEM
        // ============================================================

        function showModal(title, content, extraHtml = '', buttons = [], closeOnClickOutside = true) {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.id = 'modalOverlay';
            
            let buttonsHtml = '';
            if (buttons.length > 0) {
                buttonsHtml = '<div class="modal-buttons">';
                buttons.forEach(btn => {
                    buttonsHtml += `<button class="${btn.class || ''}" onclick="${btn.onclick}">${btn.text}</button>`;
                });
                buttonsHtml += '</div>';
            }
            
            overlay.innerHTML = `
                <div class="modal">
                    <div class="modal-title">${title}</div>
                    <div class="modal-content">${content}</div>
                    ${extraHtml}
                    ${buttonsHtml}
                </div>
            `;
            
            document.body.appendChild(overlay);
            
            if (closeOnClickOutside) {
                overlay.onclick = (e) => {
                    if (e.target === overlay) closeModal();
                };
            }
        }

        function closeModal() {
            const modal = document.getElementById('modalOverlay');
            if (modal) modal.remove();
        }

        function showConfirmDialog(title, message, onConfirm) {
            showModal(title, message, '', [
                { text: 'Cancel', class: 'btn-secondary', onclick: 'closeModal()' },
                { text: 'Confirm', class: 'btn-danger', onclick: `closeModal(); (${onConfirm.toString()})()` }
            ]);
        }

        function showResumeDialog(savedState) {
            showModal(
                'Resume Game?',
                'You have a saved game in progress. Would you like to continue?',
                '',
                [
                    { 
                        text: 'New Game', 
                        class: 'btn-secondary', 
                        onclick: 'closeModal(); resetGame();' 
                    },
                    { 
                        text: 'Resume', 
                        class: 'btn-success', 
                        onclick: `closeModal(); restoreGameState(${JSON.stringify(savedState).replace(/"/g, '&quot;')})` 
                    }
                ],
                false
            );
        }

        function restoreGameState(state) {
            board = state.board;
            gameMode = state.gameMode;
            difficulty = state.difficulty;
            currentPlayer = state.currentPlayer;
            moveHistory = state.moveHistory;
            capturedPieces = state.capturedPieces;
            gameOver = state.gameOver;
            lastMove = state.lastMove;
            moveCount = state.moveCount;
            elapsedTime = state.elapsedTime;
            
            document.getElementById('gameTitle').textContent = 
                gameMode === 'computer' ? `♔ vs 🤖 (${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)})` : '♔ Chess';
            
            if (!gameOver) startTimer();
            
            render();
            updateMoveHistoryDisplay();
            updateCapturedPiecesDisplay();
            document.getElementById('moveCounter').textContent = `Move: ${moveCount}`;
        }

        function showVictoryModal(winner) {
            const html = `
                <div class="victory-stats">
                    <div class="victory-stat">
                        <div class="victory-stat-value">${moveCount}</div>
                        <div class="victory-stat-label">Total Moves</div>
                    </div>
                    <div class="victory-stat">
                        <div class="victory-stat-value">${Math.floor(elapsedTime / 60)}:${String(elapsedTime % 60).padStart(2, '0')}</div>
                        <div class="victory-stat-label">Time</div>
                    </div>
                    <div class="victory-stat">
                        <div class="victory-stat-value">${capturedPieces.white.length}</div>
                        <div class="victory-stat-label">White Captured</div>
                    </div>
                    <div class="victory-stat">
                        <div class="victory-stat-value">${capturedPieces.black.length}</div>
                        <div class="victory-stat-label">Black Captured</div>
                    </div>
                </div>
            `;
            
            showModal(
                winner === 'Draw' ? '🤝 Stalemate!' : `🏆 ${winner} Wins!`,
                winner === 'Draw' ? 'The game ended in a draw!' : `Congratulations! ${winner} has won the game!`,
                html,
                [
                    { text: 'Main Menu', class: 'btn-secondary', onclick: 'closeModal(); clearGameState(); showModeScreen();' },
                    { text: 'Play Again', class: 'btn-success', onclick: 'closeModal(); resetGame();' }
                ],
                false
            );
        }

        function showToast(message) {
            const toast = document.createElement('div');
            toast.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #333;
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                z-index: 10000;
                animation: slideUp 0.3s;
            `;
            toast.textContent = message;
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.animation = 'fadeIn 0.3s reverse';
                setTimeout(() => toast.remove(), 300);
            }, 2000);
        }

        function showSettings() {
            const html = `
                <div class="settings-content">
                    <div class="setting-item">
                        <span class="setting-label">🔊 Sound Effects</span>
                        <label class="toggle-switch">
                            <input type="checkbox" ${soundEnabled ? 'checked' : ''} onchange="soundEnabled = this.checked; saveSettings(); document.getElementById('soundBtn').textContent = soundEnabled ? '🔊' : '🔇';">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="setting-item">
                        <span class="setting-label">✨ Animations</span>
                        <label class="toggle-switch">
                            <input type="checkbox" ${animationsEnabled ? 'checked' : ''} onchange="animationsEnabled = this.checked; saveSettings();">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="setting-item" style="flex-direction: column; align-items: flex-start; gap: 10px;">
                        <span class="setting-label">🎯 AI Difficulty</span>
                        <div style="display: flex; gap: 10px; width: 100%;">
                            <button onclick="difficulty='easy'; saveSettings(); showToast('Difficulty: Easy');" style="flex: 1;">Easy</button>
                            <button onclick="difficulty='medium'; saveSettings(); showToast('Difficulty: Medium');" style="flex: 1;">Medium</button>
                            <button onclick="difficulty='hard'; saveSettings(); showToast('Difficulty: Hard');" style="flex: 1;">Hard</button>
                        </div>
                    </div>
                </div>
            `;
            
            showModal('⚙️ Settings', '', html, [
                { text: 'Close', class: 'btn-primary', onclick: 'closeModal()' }
            ]);
        }

        function showTutorial() {
            const html = `
                <div class="tutorial-steps">
                    <div class="tutorial-step">
                        <div class="step-number">1</div>
                        <div>
                            <strong>Select a Piece</strong><br>
                            Click on any of your pieces to see valid moves
                        </div>
                    </div>
                    <div class="tutorial-step">
                        <div class="step-number">2</div>
                        <div>
                            <strong>Make a Move</strong><br>
                            Click on a highlighted square to move there
                        </div>
                    </div>
                    <div class="tutorial-step">
                        <div class="step-number">3</div>
                        <div>
                            <strong>Use Features</strong><br>
                            Try Undo, Hint, and Flip Board buttons
                        </div>
                    </div>
                </div>
            `;
            
            showModal(
                '👋 Welcome to Chess Master!',
                'Here\'s how to play:',
                html,
                [{ text: 'Got it!', class: 'btn-success', onclick: 'closeModal()' }]
            );
        }

        // ============================================================
        // KEYBOARD NAVIGATION
        // ============================================================

        document.addEventListener('keydown', (e) => {
            if (document.getElementById('modalOverlay')) return; // Don't handle if modal is open
            
            switch(e.key.toLowerCase()) {
                case 'u':
                    if (!gameOver && moveHistory.length > 0) {
                        undoMove();
                    }
                    break;
                case 'h':
                    if (!gameOver && hintCooldown === 0) {
                        showHint();
                    }
                    break;
                case 'f':
                    flipBoard();
                    break;
                case 'r':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        confirmNewGame();
                    }
                    break;
                case 's':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        toggleSound();
                    }
                    break;
            }
        });

        // ============================================================
        // INITIALIZATION
        // ============================================================

        function init() {
            loadSettings();
            updateStatisticsDisplay();
            render();
            
            // Prevent accidental refresh
            window.addEventListener('beforeunload', (e) => {
                if (moveHistory.length > 0 && !gameOver) {
                    e.preventDefault();
                    e.returnValue = '';
                }
            });
        }

        // Start the game
        init();