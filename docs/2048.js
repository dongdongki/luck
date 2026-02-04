// 2048 게임 로직
const GRID_SIZE = 4;

let grid = [];
let score = 0;
let bestScore = 0;
let isGameOver = false;
let firebaseReady = false;
let allScores = [];
let touchStartX = 0;
let touchStartY = 0;
let nickname = '';

// 닉네임 체크
nickname = localStorage.getItem('luckGameNickname');
if (!nickname) {
    window.location.href = 'index.html';
}

// DOM 요소
const elements = {
    tileContainer: document.getElementById('tile-container'),
    currentScore: document.getElementById('current-score'),
    bestScore: document.getElementById('best-score'),
    gameMessage: document.getElementById('game-message'),
    messageText: document.getElementById('message-text'),
    retryBtn: document.getElementById('retry-btn'),
    newGameBtn: document.getElementById('new-game-btn'),
    resultRetryBtn: document.getElementById('result-retry-btn'),
    shareBtn: document.getElementById('share-btn'),
    resultIcon: document.getElementById('result-icon'),
    resultTitle: document.getElementById('result-title'),
    finalScore: document.getElementById('final-score'),
    maxTile: document.getElementById('max-tile'),
    resultMessage: document.getElementById('result-message'),
    gameScreen: document.getElementById('game-screen'),
    resultScreen: document.getElementById('result-screen'),
    playerName: document.getElementById('player-name'),
    gameRankingList: document.getElementById('game-ranking-list'),
    resultRankingList: document.getElementById('result-ranking-list')
};

// 플레이어 이름 표시
elements.playerName.textContent = nickname;

// 초기화
function init() {
    // 최고 점수 로드
    bestScore = parseInt(localStorage.getItem('2048BestScore')) || 0;
    elements.bestScore.textContent = bestScore;

    startNewGame();
    setupEventListeners();
}

// 새 게임 시작
function startNewGame() {
    grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
    score = 0;
    isGameOver = false;

    elements.currentScore.textContent = '0';
    elements.gameMessage.classList.remove('active');
    elements.tileContainer.innerHTML = '';

    addRandomTile();
    addRandomTile();

    renderGrid();
}

// 랜덤 타일 추가
function addRandomTile() {
    const emptyCells = [];

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c] === 0) {
                emptyCells.push({ r, c });
            }
        }
    }

    if (emptyCells.length === 0) return null;

    const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;

    return { r, c };
}

// 그리드 렌더링
function renderGrid(newTilePos = null, mergedPositions = []) {
    elements.tileContainer.innerHTML = '';

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c] !== 0) {
                const isNew = newTilePos && newTilePos.r === r && newTilePos.c === c;
                const isMerged = mergedPositions.some(pos => pos.r === r && pos.c === c);
                createTileElement(r, c, grid[r][c], isNew, isMerged);
            }
        }
    }
}

// 타일 요소 생성
function createTileElement(row, col, value, isNew = false, isMerged = false) {
    const tileEl = document.createElement('div');
    tileEl.className = `tile tile-${value}`;
    tileEl.textContent = value;
    tileEl.style.setProperty('--row', row);
    tileEl.style.setProperty('--col', col);

    if (isNew) {
        tileEl.classList.add('tile-new');
    } else if (isMerged) {
        tileEl.classList.add('tile-merged');
    }

    elements.tileContainer.appendChild(tileEl);
}

// 이동 처리
function move(direction) {
    if (isGameOver) return;

    let moved = false;
    let mergedPositions = [];

    switch (direction) {
        case 'up':
            ({ moved, mergedPositions } = moveUp());
            break;
        case 'down':
            ({ moved, mergedPositions } = moveDown());
            break;
        case 'left':
            ({ moved, mergedPositions } = moveLeft());
            break;
        case 'right':
            ({ moved, mergedPositions } = moveRight());
            break;
    }

    if (moved) {
        const newTilePos = addRandomTile();
        renderGrid(newTilePos, mergedPositions);
        updateScore();

        if (checkGameOver()) {
            gameOver();
        }
    }
}

// 왼쪽 이동
function moveLeft() {
    let moved = false;
    let mergedPositions = [];

    for (let r = 0; r < GRID_SIZE; r++) {
        const row = grid[r].filter(val => val !== 0);
        const merged = [];

        for (let i = 0; i < row.length; i++) {
            if (i + 1 < row.length && row[i] === row[i + 1]) {
                merged.push(row[i] * 2);
                score += row[i] * 2;
                mergedPositions.push({ r, c: merged.length - 1 });
                i++;
            } else {
                merged.push(row[i]);
            }
        }

        while (merged.length < GRID_SIZE) {
            merged.push(0);
        }

        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c] !== merged[c]) {
                moved = true;
            }
            grid[r][c] = merged[c];
        }
    }

    return { moved, mergedPositions };
}

// 오른쪽 이동
function moveRight() {
    let moved = false;
    let mergedPositions = [];

    for (let r = 0; r < GRID_SIZE; r++) {
        const row = grid[r].filter(val => val !== 0);
        const merged = [];

        for (let i = row.length - 1; i >= 0; i--) {
            if (i - 1 >= 0 && row[i] === row[i - 1]) {
                merged.unshift(row[i] * 2);
                score += row[i] * 2;
                mergedPositions.push({ r, c: GRID_SIZE - merged.length });
                i--;
            } else {
                merged.unshift(row[i]);
            }
        }

        while (merged.length < GRID_SIZE) {
            merged.unshift(0);
        }

        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c] !== merged[c]) {
                moved = true;
            }
            grid[r][c] = merged[c];
        }
    }

    return { moved, mergedPositions };
}

// 위로 이동
function moveUp() {
    let moved = false;
    let mergedPositions = [];

    for (let c = 0; c < GRID_SIZE; c++) {
        const col = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            if (grid[r][c] !== 0) {
                col.push(grid[r][c]);
            }
        }

        const merged = [];
        for (let i = 0; i < col.length; i++) {
            if (i + 1 < col.length && col[i] === col[i + 1]) {
                merged.push(col[i] * 2);
                score += col[i] * 2;
                mergedPositions.push({ r: merged.length - 1, c });
                i++;
            } else {
                merged.push(col[i]);
            }
        }

        while (merged.length < GRID_SIZE) {
            merged.push(0);
        }

        for (let r = 0; r < GRID_SIZE; r++) {
            if (grid[r][c] !== merged[r]) {
                moved = true;
            }
            grid[r][c] = merged[r];
        }
    }

    return { moved, mergedPositions };
}

// 아래로 이동
function moveDown() {
    let moved = false;
    let mergedPositions = [];

    for (let c = 0; c < GRID_SIZE; c++) {
        const col = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            if (grid[r][c] !== 0) {
                col.push(grid[r][c]);
            }
        }

        const merged = [];
        for (let i = col.length - 1; i >= 0; i--) {
            if (i - 1 >= 0 && col[i] === col[i - 1]) {
                merged.unshift(col[i] * 2);
                score += col[i] * 2;
                mergedPositions.push({ r: GRID_SIZE - merged.length, c });
                i--;
            } else {
                merged.unshift(col[i]);
            }
        }

        while (merged.length < GRID_SIZE) {
            merged.unshift(0);
        }

        for (let r = 0; r < GRID_SIZE; r++) {
            if (grid[r][c] !== merged[r]) {
                moved = true;
            }
            grid[r][c] = merged[r];
        }
    }

    return { moved, mergedPositions };
}

// 점수 업데이트
function updateScore() {
    elements.currentScore.textContent = score;

    if (score > bestScore) {
        bestScore = score;
        elements.bestScore.textContent = bestScore;
        localStorage.setItem('2048BestScore', bestScore);
    }
}

// 게임 오버 체크
function checkGameOver() {
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c] === 0) return false;
        }
    }

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const current = grid[r][c];

            if (c + 1 < GRID_SIZE && grid[r][c + 1] === current) return false;
            if (r + 1 < GRID_SIZE && grid[r + 1][c] === current) return false;
        }
    }

    return true;
}

// 최대 타일 값 찾기
function getMaxTile() {
    let max = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c] > max) {
                max = grid[r][c];
            }
        }
    }
    return max;
}

// 게임 오버
async function gameOver() {
    isGameOver = true;

    const maxTile = getMaxTile();

    elements.gameMessage.classList.add('active');
    elements.messageText.textContent = '게임 오버!';

    elements.finalScore.textContent = score;
    elements.maxTile.textContent = maxTile;

    if (maxTile >= 2048) {
        elements.resultIcon.textContent = '🏆';
        elements.resultTitle.textContent = '축하합니다!';
        elements.resultMessage.textContent = `${nickname}님, 2048 달성! 대단해요!`;
    } else if (maxTile >= 1024) {
        elements.resultIcon.textContent = '🎉';
        elements.resultTitle.textContent = '아쉬워요!';
        elements.resultMessage.textContent = `${nickname}님, 조금만 더 하면 2048!`;
    } else if (maxTile >= 512) {
        elements.resultIcon.textContent = '👍';
        elements.resultTitle.textContent = '잘했어요!';
        elements.resultMessage.textContent = `${nickname}님, 다음엔 더 높이!`;
    } else {
        elements.resultIcon.textContent = '💪';
        elements.resultTitle.textContent = '다시 도전!';
        elements.resultMessage.textContent = `${nickname}님, 연습하면 늘어요!`;
    }

    // Firebase에 점수 저장
    if (firebaseReady) {
        await window.firebaseDB.saveScore(nickname, maxTile, score);
        allScores = await window.firebaseDB.getScores();
    }

    loadRanking(elements.resultRankingList);
}

// 화면 전환
function showScreen(screenName) {
    elements.gameScreen.classList.remove('active');
    elements.resultScreen.classList.remove('active');

    if (screenName === 'game') {
        elements.gameScreen.classList.add('active');
    } else if (screenName === 'result') {
        elements.resultScreen.classList.add('active');
    }
}

// 랭킹 로드
function loadRanking(listElement) {
    if (!firebaseReady) {
        listElement.innerHTML = '<li class="loading">연결 중...</li>';
        return;
    }

    const scores = allScores.slice(0, 10);

    if (scores.length === 0) {
        listElement.innerHTML = '<li class="loading">아직 기록이 없습니다</li>';
        return;
    }

    listElement.innerHTML = scores.map((entry, index) => {
        let rankClass = '';
        if (index === 0) rankClass = 'gold';
        else if (index === 1) rankClass = 'silver';
        else if (index === 2) rankClass = 'bronze';

        return `
            <li>
                <div class="rank-info">
                    <span class="rank-number ${rankClass}">${index + 1}</span>
                    <span class="rank-name">${escapeHtml(entry.nickname)}</span>
                </div>
                <span class="rank-score">${entry.maxTile}</span>
            </li>
        `;
    }).join('');
}

// XSS 방지
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 결과 공유
function shareResult() {
    const maxTile = getMaxTile();
    const text = `🎮 2048 게임 결과\n\n` +
        `닉네임: ${nickname}\n` +
        `점수: ${score}\n` +
        `최고 타일: ${maxTile}\n\n` +
        `나도 도전하기: ${window.location.origin}${window.location.pathname.replace('2048.html', '')}`;

    if (navigator.share) {
        navigator.share({
            title: '2048 게임',
            text: text,
            url: window.location.href
        }).catch(() => {
            copyToClipboard(text);
        });
    } else {
        copyToClipboard(text);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('결과가 클립보드에 복사되었습니다!');
    }).catch(() => {
        alert('공유 기능을 사용할 수 없습니다.');
    });
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 키보드 이벤트
    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                e.preventDefault();
                move('up');
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                e.preventDefault();
                move('down');
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                e.preventDefault();
                move('left');
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                e.preventDefault();
                move('right');
                break;
        }
    });

    // 터치 이벤트 (스마트폰용)
    const gameContainer = document.querySelector('.game-container');
    const gameArea = document.querySelector('.game-area');
    let isTouchingGame = false;

    // 게임 영역 터치 시작
    gameContainer.addEventListener('touchstart', (e) => {
        isTouchingGame = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        e.preventDefault();
    }, { passive: false });

    // 게임 영역 터치 이동 - 스크롤 방지
    gameContainer.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });

    // document 레벨에서도 게임 터치 중이면 스크롤 방지
    document.addEventListener('touchmove', (e) => {
        if (isTouchingGame) {
            e.preventDefault();
        }
    }, { passive: false });

    gameContainer.addEventListener('touchend', (e) => {
        if (!touchStartX || !touchStartY) {
            isTouchingGame = false;
            return;
        }

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;

        const minSwipeDistance = 30;

        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (Math.abs(diffX) > minSwipeDistance) {
                move(diffX > 0 ? 'right' : 'left');
            }
        } else {
            if (Math.abs(diffY) > minSwipeDistance) {
                move(diffY > 0 ? 'down' : 'up');
            }
        }

        touchStartX = 0;
        touchStartY = 0;
        isTouchingGame = false;
    }, { passive: true });

    document.addEventListener('touchend', () => {
        isTouchingGame = false;
    }, { passive: true });

    // 버튼 이벤트
    elements.retryBtn.addEventListener('click', startNewGame);
    elements.newGameBtn.addEventListener('click', startNewGame);
    elements.resultRetryBtn.addEventListener('click', () => {
        showScreen('game');
        startNewGame();
    });
    elements.shareBtn.addEventListener('click', shareResult);
}

// Firebase 준비 대기
window.addEventListener('firebaseReady', async () => {
    firebaseReady = true;
    console.log('Firebase 준비 완료');

    try {
        allScores = await window.firebaseDB.getScores();
        console.log('랭킹 로드 완료:', allScores.length, '개');
        loadRanking(elements.gameRankingList);
    } catch (error) {
        console.error('초기화 에러:', error);
    }
});

// Firebase가 이미 준비되었을 수 있음 (스크립트 로드 순서에 따라)
if (window.firebaseDB) {
    window.dispatchEvent(new Event('firebaseReady'));
}

// 게임 시작
init();
