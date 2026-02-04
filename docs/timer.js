// 게임 상태
let startTime = 0;
let isRunning = false;
let nickname = '';
let firebaseReady = false;
let allScores = [];
let lastTimeDiff = 0;

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
    comboDisplay: document.getElementById('combo-display'),
    timerBtn: document.getElementById('timer-btn'),
    btnText: document.getElementById('btn-text'),
    resultIcon: document.getElementById('result-icon'),
    resultTitle: document.getElementById('result-title'),
    timeResult: document.getElementById('time-result'),
    timeDiff: document.getElementById('time-diff'),
    resultMessage: document.getElementById('result-message'),
    retryBtn: document.getElementById('retry-btn'),
    shareBtn: document.getElementById('share-btn'),
    resultRankingList: document.getElementById('result-ranking-list')
};

// 플레이어 이름 표시
elements.playerName.textContent = nickname;

// 화면 전환
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// 타이머 버튼 클릭
function handleTimerClick() {
    if (!isRunning) {
        // 시작
        startTime = Date.now();
        isRunning = true;
        elements.timerBtn.classList.add('running');
        elements.btnText.textContent = 'STOP!';
        elements.comboDisplay.textContent = '7초를 세어보세요...';
        elements.comboDisplay.className = 'combo-display';
    } else {
        // 정지
        const endTime = Date.now();
        const elapsed = (endTime - startTime) / 1000;
        const diff = elapsed - 7;
        lastTimeDiff = diff;

        isRunning = false;
        elements.timerBtn.classList.remove('running');
        elements.btnText.textContent = '시작';

        endGame(elapsed, diff);
    }
}

// 게임 종료
async function endGame(elapsed, diff) {
    // 결과 화면 설정
    elements.timeResult.textContent = `${elapsed.toFixed(2)}초`;

    const absDiff = Math.abs(diff);
    let diffText = '';
    let icon = '';
    let title = '';
    let message = '';

    if (absDiff === 0) {
        diffText = '완벽! 정확히 7초!';
        elements.timeDiff.className = 'time-diff perfect';
        icon = '🏆';
        title = '완벽!';
        message = '당신은 시간의 마스터!';
    } else if (absDiff <= 0.1) {
        diffText = `${diff > 0 ? '+' : ''}${diff.toFixed(2)}초 (거의 완벽!)`;
        elements.timeDiff.className = 'time-diff perfect';
        icon = '🎯';
        title = '대단해요!';
        message = '놀라운 감각이에요!';
    } else if (absDiff <= 0.3) {
        diffText = `${diff > 0 ? '+' : ''}${diff.toFixed(2)}초`;
        elements.timeDiff.className = 'time-diff';
        icon = '🎉';
        title = '잘했어요!';
        message = '꽤 정확해요!';
    } else if (absDiff <= 0.5) {
        diffText = `${diff > 0 ? '+' : ''}${diff.toFixed(2)}초`;
        elements.timeDiff.className = 'time-diff';
        icon = '👍';
        title = '괜찮아요!';
        message = '조금만 더 연습해봐요!';
    } else if (absDiff <= 1) {
        diffText = `${diff > 0 ? '+' : ''}${diff.toFixed(2)}초`;
        elements.timeDiff.className = 'time-diff';
        icon = '😅';
        title = '아쉬워요!';
        message = '다시 도전해보세요!';
    } else {
        diffText = `${diff > 0 ? '+' : ''}${diff.toFixed(2)}초`;
        elements.timeDiff.className = 'time-diff';
        icon = '💪';
        title = '다시 도전!';
        message = diff > 0 ? '너무 오래 기다렸어요!' : '너무 빨랐어요!';
    }

    elements.timeDiff.textContent = diffText;
    elements.resultIcon.textContent = icon;
    elements.resultTitle.textContent = title;
    elements.resultMessage.textContent = `${nickname}님, ${message}`;

    // 점수 저장
    if (firebaseReady) {
        await window.firebaseDB.saveScore(nickname, diff);
        allScores = await window.firebaseDB.getScores();
    }

    await loadRanking(elements.resultRankingList);
    showScreen('result');
}

// 게임 초기화
function initGame() {
    isRunning = false;
    startTime = 0;
    elements.timerBtn.classList.remove('running');
    elements.btnText.textContent = '시작';
    elements.comboDisplay.textContent = '';
    showScreen('game');
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

            const diffDisplay = entry.timeDiff >= 0
                ? `+${entry.timeDiff.toFixed(2)}초`
                : `${entry.timeDiff.toFixed(2)}초`;

            return `
                <li>
                    <div class="rank-info">
                        <span class="rank-number ${rankClass}">${index + 1}</span>
                        <span class="rank-name">${escapeHtml(entry.nickname)}</span>
                    </div>
                    <span class="rank-score">${diffDisplay}</span>
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

// 결과 공유
function shareResult() {
    const diffText = lastTimeDiff >= 0
        ? `+${lastTimeDiff.toFixed(2)}초`
        : `${lastTimeDiff.toFixed(2)}초`;

    const text = `⏱️ 7초 맞추기 결과\n\n` +
        `닉네임: ${nickname}\n` +
        `기록: ${(7 + lastTimeDiff).toFixed(2)}초\n` +
        `오차: ${diffText}\n\n` +
        `나도 도전하기: ${window.location.origin}${window.location.pathname.replace('timer.html', '')}`;

    if (navigator.share) {
        navigator.share({
            title: '7초 맞추기',
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
elements.timerBtn.addEventListener('click', handleTimerClick);

elements.retryBtn.addEventListener('click', () => {
    initGame();
});

elements.shareBtn.addEventListener('click', shareResult);

// 스페이스바 지원
document.addEventListener('keydown', (e) => {
    if (!screens.game.classList.contains('active')) return;

    if (e.code === 'Space') {
        e.preventDefault();
        handleTimerClick();
    }
});

// Firebase 준비 대기
window.addEventListener('firebaseReady', async () => {
    firebaseReady = true;
    allScores = await window.firebaseDB.getScores();
});
