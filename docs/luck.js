// 게임 상태
let score = 0;
let nickname = '';
let isPlaying = true;
let firebaseReady = false;
let allScores = [];

// 닉네임 체크
nickname = localStorage.getItem('luckGameNickname');
if (!nickname) {
    window.location.href = 'index.html';
}

// DOM 요소
const screens = {
    game: document.getElementById('game-screen'),
    result: document.getElementById('result-screen')
};

const elements = {
    playerName: document.getElementById('player-name'),
    score: document.getElementById('score'),
    comboDisplay: document.getElementById('combo-display'),
    btn0: document.getElementById('btn-0'),
    btn1: document.getElementById('btn-1'),
    resultIcon: document.getElementById('result-icon'),
    resultTitle: document.getElementById('result-title'),
    resultMessage: document.getElementById('result-message'),
    finalScore: document.getElementById('final-score'),
    probabilityStat: document.getElementById('probability-stat'),
    retryBtn: document.getElementById('retry-btn'),
    shareBtn: document.getElementById('share-btn'),
    resultRankingList: document.getElementById('result-ranking-list'),
    gameRankingList: document.getElementById('game-ranking-list')
};

// 플레이어 이름 표시
elements.playerName.textContent = nickname;

// 화면 전환
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// 게임 초기화
function initGame() {
    score = 0;
    isPlaying = true;
    elements.score.textContent = '0';
    elements.comboDisplay.textContent = '';
    elements.comboDisplay.className = 'combo-display';
    elements.btn0.className = 'choice-btn';
    elements.btn1.className = 'choice-btn';
    showScreen('game');
}

// 선택 처리
function handleChoice(userChoice) {
    if (!isPlaying) return;

    isPlaying = false;
    const answer = Math.floor(Math.random() * 2);
    const chosenBtn = userChoice === 0 ? elements.btn0 : elements.btn1;

    if (userChoice === answer) {
        score++;
        elements.score.textContent = score;
        chosenBtn.classList.add('correct');

        // 이긴 상대 찾기
        const defeated = findDefeatedPlayer(score);
        let comboText = '';

        if (defeated) {
            comboText = `${defeated.nickname}님을 넘었다!`;
        } else {
            const comboMessages = [
                '좋아요!', '멋져요!', 'Nice!', 'Great!', '운이 좋네요!',
                '계속 가보자!', 'Amazing!', '대박!', 'Perfect!', '천재인가요?!'
            ];
            comboText = comboMessages[Math.min(score - 1, comboMessages.length - 1)];
        }

        elements.comboDisplay.textContent = comboText;
        elements.comboDisplay.className = 'combo-display success';

        setTimeout(() => {
            chosenBtn.classList.remove('correct');
            elements.comboDisplay.className = 'combo-display';
            isPlaying = true;
        }, 300);
    } else {
        chosenBtn.classList.add('wrong');
        setTimeout(() => {
            endGame();
        }, 500);
    }
}

// 게임 종료
async function endGame() {
    isPlaying = false;

    const probability = Math.pow(0.5, score) * 100;
    let probabilityText = '';

    if (score === 0) {
        probabilityText = '다음엔 더 잘할 수 있어요!';
    } else if (probability >= 1) {
        probabilityText = `이 점수를 기록할 확률: ${probability.toFixed(1)}%`;
    } else if (probability >= 0.01) {
        probabilityText = `이 점수를 기록할 확률: ${probability.toFixed(2)}%`;
    } else {
        probabilityText = `이 점수를 기록할 확률: ${probability.toExponential(2)}% (대단해요!)`;
    }

    elements.finalScore.textContent = score;
    elements.probabilityStat.textContent = probabilityText;
    elements.resultMessage.textContent = `${nickname}님의 운은 여기까지!`;

    if (score >= 10) {
        elements.resultIcon.textContent = '🏆';
        elements.resultTitle.textContent = '대단해요!';
    } else if (score >= 5) {
        elements.resultIcon.textContent = '🎉';
        elements.resultTitle.textContent = '잘했어요!';
    } else if (score >= 1) {
        elements.resultIcon.textContent = '👍';
        elements.resultTitle.textContent = '아쉬워요!';
    } else {
        elements.resultIcon.textContent = '💔';
        elements.resultTitle.textContent = '다시 도전!';
    }

    if (score > 0 && firebaseReady) {
        await window.firebaseDB.saveScore(nickname, score);
        allScores = await window.firebaseDB.getScores();
    }

    await loadRanking(elements.resultRankingList);
    showScreen('result');
}

// 랭킹 로드
async function loadRanking(listElement) {
    if (!firebaseReady) {
        listElement.innerHTML = '<li class="loading">연결 중...</li>';
        return;
    }

    try {
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
                    <span class="rank-score">${entry.score}점</span>
                </li>
            `;
        }).join('');
    } catch (error) {
        console.error('랭킹 로드 실패:', error);
        listElement.innerHTML = '<li class="loading">랭킹을 불러올 수 없습니다</li>';
    }
}

// XSS 방지
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 이긴 상대 찾기
function findDefeatedPlayer(currentScore) {
    const defeated = allScores.find(entry =>
        entry.score === currentScore && entry.nickname !== nickname
    );
    return defeated || null;
}

// 결과 공유
function shareResult() {
    const text = `🍀 운빨 테스트 결과\n\n` +
        `닉네임: ${nickname}\n` +
        `점수: ${score}점\n` +
        `확률: ${(Math.pow(0.5, score) * 100).toFixed(score > 6 ? 4 : 2)}%\n\n` +
        `나도 도전하기: ${window.location.origin}${window.location.pathname.replace('luck.html', '')}`;

    if (navigator.share) {
        navigator.share({
            title: '운빨 테스트',
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

// 이벤트 리스너
elements.btn0.addEventListener('click', () => handleChoice(0));
elements.btn1.addEventListener('click', () => handleChoice(1));

elements.retryBtn.addEventListener('click', () => {
    initGame();
});

elements.shareBtn.addEventListener('click', shareResult);

// 키보드 지원
document.addEventListener('keydown', (e) => {
    if (!screens.game.classList.contains('active') || !isPlaying) return;

    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        handleChoice(0);
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        handleChoice(1);
    }
});

// Firebase 준비 대기
window.addEventListener('firebaseReady', async () => {
    firebaseReady = true;
    allScores = await window.firebaseDB.getScores();
    // 게임 화면에도 랭킹 표시
    await loadRanking(elements.gameRankingList);
});
