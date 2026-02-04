# 운빨 게임즈 프로젝트 가이드

## 프로젝트 개요
- Firebase Firestore 기반 랭킹 시스템을 갖춘 웹 게임 모음
- GitHub Pages로 배포 (docs 폴더)

## 새 게임 추가 시 지침

### 1. 파일 구조
```
docs/
├── [게임명].html    # 게임 페이지
├── [게임명].js      # 게임 로직
├── style.css        # 공통 스타일 (수정 금지)
└── games.html       # 게임 선택 페이지 (새 게임 카드 추가)
```

### 2. HTML 필수 구조
```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[게임명] | 운빨 게임즈</title>
    <link rel="stylesheet" href="style.css">
    <!-- 게임별 테마 스타일 -->
    <style>
        .theme-[게임명] {
            --primary: #색상코드;
            --primary-dark: #어두운색상;
        }
        /* 추가 스타일... */
    </style>
    <!-- Firebase SDK -->
    <script type="module">
        // Firebase 설정 (기존 게임 참고)
    </script>
</head>
<body class="theme-[게임명]">
    <div class="container">
        <!-- 게임 화면 -->
        <div id="game-screen" class="screen active">
            <div class="game-header">
                <div class="player-info">
                    <a href="games.html" class="back-link">← 게임 선택</a>
                    <span id="player-name">플레이어</span>
                </div>
                <!-- 점수/상태 표시 -->
            </div>
            <div class="game-area">
                <!-- 게임 UI -->
                <div class="leaderboard">
                    <h3>🏆 TOP 10</h3>
                    <ul id="game-ranking-list"></ul>
                </div>
            </div>
        </div>

        <!-- 결과 화면 -->
        <div id="result-screen" class="screen">
            <div class="result-content">
                <div class="result-icon" id="result-icon"></div>
                <h2 id="result-title"></h2>
                <p id="result-message"></p>
                <div class="result-buttons">
                    <button id="retry-btn" class="btn btn-primary">다시 도전</button>
                    <button id="share-btn" class="btn btn-secondary">결과 공유</button>
                    <a href="games.html" class="btn btn-secondary">다른 게임 하기</a>
                </div>
                <div class="leaderboard result-leaderboard">
                    <h3>🏆 TOP 10</h3>
                    <ul id="result-ranking-list"></ul>
                </div>
            </div>
        </div>
    </div>
    <script src="[게임명].js"></script>
</body>
</html>
```

### 3. JavaScript 필수 구현

#### 필수 변수
```javascript
let firebaseReady = false;
let allScores = [];
let nickname = '';
```

#### 필수 함수
```javascript
// 닉네임 체크 (페이지 시작 시)
nickname = localStorage.getItem('luckGameNickname');
if (!nickname) {
    window.location.href = 'index.html';
}

// Firebase 준비 이벤트
window.addEventListener('firebaseReady', async () => {
    firebaseReady = true;
    allScores = await window.firebaseDB.getScores();
    loadRanking(elements.gameRankingList);
});

// 랭킹 로드 함수
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
                <span class="rank-score">${/* 게임별 점수 표시 */}</span>
            </li>
        `;
    }).join('');
}

// XSS 방지 (필수)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
```

### 4. Firebase 설정

#### Firestore 컬렉션 명명
- `[게임명]_scores` (예: `luck_scores`, `2048_scores`)

#### Firestore 규칙 추가
```javascript
match /[게임명]_scores/{nickname} {
    allow read: if true;
    allow create: if
        request.resource.data.nickname is string &&
        request.resource.data.nickname.size() > 0 &&
        request.resource.data.nickname.size() <= 20 &&
        // 게임별 점수 검증 규칙
    allow update: if
        // 더 좋은 기록일 때만 업데이트 허용
    allow delete: if false;
}
```

### 5. 모바일 터치 게임 (스와이프 사용 시)

#### viewport 설정
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
```

#### 스크롤 방지 CSS
```css
html, body {
    overscroll-behavior: none;
}
.game-container {
    touch-action: none;
}
```

#### 터치 이벤트 처리
```javascript
// 버튼/링크 클릭 허용
gameContainer.addEventListener('touchstart', (e) => {
    if (e.target.closest('.game-message') || e.target.closest('button') || e.target.closest('a')) {
        return; // 버튼/링크는 정상 작동
    }
    e.preventDefault();
    // 스와이프 처리...
}, { passive: false });
```

### 6. games.html 게임 카드 추가
```html
<div class="game-card game-[게임명]" onclick="location.href='[게임명].html'">
    <div class="icon">[이모지]</div>
    <h3>[게임 제목]</h3>
    <p>[게임 설명]</p>
</div>
```

#### 게임 카드 스타일
```css
.game-card.game-[게임명] {
    border-color: #테마색상;
}
.game-card.game-[게임명]:hover {
    border-color: #테마색상;
    box-shadow: 0 10px 30px rgba(R, G, B, 0.3);
}
```

### 7. 테마 색상 (기존 게임 참고)
| 게임 | Primary 색상 |
|------|-------------|
| luck | #6366f1 (보라) |
| timer | #10b981 (초록) |
| lotto | #f59e0b (주황) |
| 2048 | #edc22e (노랑) |

### 8. 점수 저장 시점
- **게임 오버 시 1회만 저장** (실시간 저장 금지 - 데이터 절약)
- 기존 기록보다 좋을 때만 업데이트

### 9. 체크리스트
- [ ] 타이틀: `[게임명] | 운빨 게임즈`
- [ ] 뒤로가기 링크: `← 게임 선택`
- [ ] 다른 게임 하기 버튼 (결과 화면)
- [ ] 랭킹 UI (게임 화면 + 결과 화면)
- [ ] Firebase 규칙 추가
- [ ] games.html에 게임 카드 추가
- [ ] 닉네임 없으면 index.html로 리다이렉트
- [ ] XSS 방지 (escapeHtml 함수)
