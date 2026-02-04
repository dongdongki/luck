// 게임 상태
let nickname = '';
let firebaseReady = false;
let selectedNumbers = [];
let winningData = null;
let allScores = [];

// 닉네임 체크
nickname = localStorage.getItem('luckGameNickname');
if (!nickname) {
    window.location.href = 'index.html';
}

// DOM 요소
const screens = {
    game: document.getElementById('game-screen'),
    already: document.getElementById('already-screen'),
    result: document.getElementById('result-screen')
};

const elements = {
    playerName: document.getElementById('player-name'),
    todayDate: document.getElementById('today-date'),
    selectedCount: document.getElementById('selected-count'),
    selectedNumbers: document.getElementById('selected-numbers'),
    numberGrid: document.getElementById('number-grid'),
    drawBtn: document.getElementById('draw-btn'),
    // 결과 화면
    resultIcon: document.getElementById('result-icon'),
    resultTitle: document.getElementById('result-title'),
    winningBalls: document.getElementById('winning-balls'),
    myBalls: document.getElementById('my-balls'),
    rankDisplay: document.getElementById('rank-display'),
    resultMessage: document.getElementById('result-message'),
    shareBtn: document.getElementById('share-btn'),
    resultRankingList: document.getElementById('result-ranking-list'),
    // 이미 플레이한 경우
    countdown: document.getElementById('countdown'),
    alreadyMyNumbers: document.getElementById('already-my-numbers'),
    alreadyRank: document.getElementById('already-rank'),
    alreadyRankingList: document.getElementById('already-ranking-list'),
    // 게임 화면 랭킹
    gameRankingList: document.getElementById('game-ranking-list')
};

// 플레이어 이름 표시
elements.playerName.textContent = nickname;

// 오늘 날짜 표시
function updateDateDisplay() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    elements.todayDate.textContent = now.toLocaleDateString('ko-KR', options);
}
updateDateDisplay();

// 화면 전환
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// 번호판 생성
function createNumberGrid() {
    elements.numberGrid.innerHTML = '';
    for (let i = 1; i <= 45; i++) {
        const btn = document.createElement('button');
        btn.className = 'number-btn';
        btn.textContent = i;
        btn.dataset.number = i;
        btn.addEventListener('click', () => toggleNumber(i, btn));
        elements.numberGrid.appendChild(btn);
    }
}

// 번호 선택/해제
function toggleNumber(num, btn) {
    const index = selectedNumbers.indexOf(num);

    if (index > -1) {
        // 이미 선택된 번호 해제
        selectedNumbers.splice(index, 1);
        btn.classList.remove('selected');
    } else {
        // 새 번호 선택 (6개까지)
        if (selectedNumbers.length < 6) {
            selectedNumbers.push(num);
            btn.classList.add('selected');
        }
    }

    updateSelectedDisplay();
}

// 선택된 번호 표시 업데이트
function updateSelectedDisplay() {
    elements.selectedCount.textContent = `${selectedNumbers.length}/6`;

    // 정렬된 번호로 공 표시
    const sorted = [...selectedNumbers].sort((a, b) => a - b);
    elements.selectedNumbers.innerHTML = sorted.map(num => `
        <div class="selected-ball ${getBallClass(num)}">${num}</div>
    `).join('');

    // 추첨 버튼 활성화
    elements.drawBtn.disabled = selectedNumbers.length !== 6;
}

// 번호에 따른 공 색상 클래스
function getBallClass(num) {
    if (num <= 10) return 'ball-1-10';
    if (num <= 20) return 'ball-11-20';
    if (num <= 30) return 'ball-21-30';
    if (num <= 40) return 'ball-31-40';
    return 'ball-41-45';
}

// 당첨 확인
function checkWinning(myNumbers, winningNumbers, bonusNumber) {
    const mainMatches = myNumbers.filter(num => winningNumbers.includes(num)).length;
    const hasBonus = myNumbers.includes(bonusNumber);

    // 등수 계산
    if (mainMatches === 6) return { rank: 1, matchCount: 6, hasBonus: false };
    if (mainMatches === 5 && hasBonus) return { rank: 2, matchCount: 5, hasBonus: true };
    if (mainMatches === 5) return { rank: 3, matchCount: 5, hasBonus: false };
    if (mainMatches === 4) return { rank: 4, matchCount: 4, hasBonus };
    if (mainMatches === 3) return { rank: 5, matchCount: 3, hasBonus };
    return { rank: 0, matchCount: mainMatches, hasBonus }; // 장외
}

// 추첨 실행
async function doDraw() {
    if (selectedNumbers.length !== 6) return;

    // Firebase가 준비되지 않았으면 대기
    if (!window.firebaseDB) {
        console.log('Firebase 로딩 중...');
        return;
    }

    // winningData가 없으면 가져오기
    if (!winningData) {
        try {
            winningData = await window.firebaseDB.getTodayWinningNumbers();
        } catch (error) {
            console.error('당첨번호 가져오기 실패:', error);
            return;
        }
    }

    const myNumbers = [...selectedNumbers].sort((a, b) => a - b);
    const result = checkWinning(myNumbers, winningData.numbers, winningData.bonus);

    // 결과 저장 (실패해도 결과는 보여줌)
    try {
        await window.firebaseDB.saveScore(nickname, result.rank, myNumbers, result.matchCount);
        allScores = await window.firebaseDB.getTodayScores();
    } catch (error) {
        console.error('점수 저장 실패:', error);
    }

    // 결과 화면 표시
    showResult(myNumbers, result);
}

// 결과 화면 표시
function showResult(myNumbers, result) {
    // 당첨 번호 표시
    elements.winningBalls.innerHTML = winningData.numbers.map(num => `
        <div class="winning-ball ${getBallClass(num)}">${num}</div>
    `).join('') + `
        <span class="bonus-separator">+</span>
        <div class="bonus-wrapper">
            <div class="winning-ball ${getBallClass(winningData.bonus)}">${winningData.bonus}</div>
            <span class="bonus-label">보너스</span>
        </div>
    `;

    // 내 번호 표시 (일치하는 번호 강조)
    elements.myBalls.innerHTML = myNumbers.map(num => {
        const isMatch = winningData.numbers.includes(num);
        const isBonusMatch = num === winningData.bonus;
        const matchClass = (isMatch || isBonusMatch) ? 'match-ball' : '';
        return `<div class="winning-ball ${getBallClass(num)} ${matchClass}">${num}</div>`;
    }).join('');

    // 등수 표시
    const rankInfo = getRankInfo(result.rank, result.hasBonus);
    elements.resultIcon.textContent = rankInfo.icon;
    elements.resultTitle.textContent = rankInfo.title;
    elements.rankDisplay.textContent = rankInfo.display;
    elements.rankDisplay.className = `rank-display ${rankInfo.class}`;
    elements.resultMessage.textContent = `${nickname}님, ${rankInfo.message}`;

    loadRanking(elements.resultRankingList);
    showScreen('result');
}

// 등수 정보
function getRankInfo(rank, hasBonus) {
    switch (rank) {
        case 1:
            return {
                icon: '🏆',
                title: '대박!!!',
                display: '1등',
                class: 'rank-1',
                message: '6개 번호 모두 일치! 축하합니다!'
            };
        case 2:
            return {
                icon: '🥈',
                title: '대단해요!',
                display: '2등',
                class: 'rank-2',
                message: '5개 + 보너스 번호 일치!'
            };
        case 3:
            return {
                icon: '🥉',
                title: '잘했어요!',
                display: '3등',
                class: 'rank-3',
                message: '5개 번호 일치!'
            };
        case 4:
            return {
                icon: '🎉',
                title: '괜찮아요!',
                display: '4등',
                class: 'rank-4',
                message: '4개 번호 일치!'
            };
        case 5:
            return {
                icon: '👍',
                title: '아쉬워요!',
                display: '5등',
                class: 'rank-5',
                message: '3개 번호 일치!'
            };
        default:
            return {
                icon: '💔',
                title: '다음 기회에...',
                display: '장외',
                class: 'rank-none',
                message: '내일 다시 도전하세요!'
            };
    }
}

// 이미 플레이한 화면 표시
function showAlreadyPlayed(playedData) {
    // 내 번호 표시
    elements.alreadyMyNumbers.innerHTML = playedData.myNumbers.map(num => `
        <div class="winning-ball ${getBallClass(num)}">${num}</div>
    `).join('');

    // 등수 표시
    const rankInfo = getRankInfo(playedData.rank, false);
    elements.alreadyRank.textContent = rankInfo.display;
    elements.alreadyRank.className = `rank-display ${rankInfo.class}`;

    // 카운트다운 시작
    updateCountdown();
    setInterval(updateCountdown, 1000);

    loadRanking(elements.alreadyRankingList);
    showScreen('already');
}

// 자정까지 카운트다운
function updateCountdown() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const diff = tomorrow - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    elements.countdown.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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

            const rankDisplay = entry.rank === 0 ? '장외' : `${entry.rank}등`;

            return `
                <li>
                    <div class="rank-info">
                        <span class="rank-number ${rankClass}">${index + 1}</span>
                        <span class="rank-name">${escapeHtml(entry.nickname)}</span>
                    </div>
                    <span class="rank-score">${rankDisplay}</span>
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
    const myNumbers = [...selectedNumbers].sort((a, b) => a - b);
    const result = checkWinning(myNumbers, winningData.numbers, winningData.bonus);
    const rankDisplay = result.rank === 0 ? '장외' : `${result.rank}등`;

    const text = `🎱 오늘의 로또 결과\n\n` +
        `닉네임: ${nickname}\n` +
        `내 번호: ${myNumbers.join(', ')}\n` +
        `결과: ${rankDisplay}\n\n` +
        `나도 도전하기: ${window.location.origin}${window.location.pathname.replace('lotto.html', '')}`;

    if (navigator.share) {
        navigator.share({
            title: '오늘의 로또',
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
elements.drawBtn.addEventListener('click', async () => {
    elements.drawBtn.disabled = true;
    elements.drawBtn.textContent = '추첨 중...';
    try {
        await doDraw();
    } catch (error) {
        console.error('추첨 에러:', error);
        alert('추첨 중 오류가 발생했습니다. 다시 시도해주세요.');
        elements.drawBtn.disabled = false;
        elements.drawBtn.textContent = '추첨하기';
    }
});
elements.shareBtn.addEventListener('click', shareResult);

// 번호판 생성
createNumberGrid();

// Firebase 준비 대기
window.addEventListener('firebaseReady', async () => {
    firebaseReady = true;
    console.log('Firebase 준비 완료');

    // 오늘 당첨번호 가져오기
    try {
        winningData = await window.firebaseDB.getTodayWinningNumbers();
        console.log('오늘 당첨번호:', winningData);
        allScores = await window.firebaseDB.getTodayScores();
        // 게임 화면에도 랭킹 표시
        await loadRanking(elements.gameRankingList);
    } catch (error) {
        console.error('초기화 에러:', error);
    }

    // 이미 오늘 플레이했는지 확인
    const playedData = await window.firebaseDB.checkTodayPlayed(nickname);
    if (playedData) {
        showAlreadyPlayed(playedData);
    }
});
