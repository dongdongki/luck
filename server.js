const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 데이터 파일 경로
const DATA_FILE = path.join(__dirname, 'scores.json');

// 점수 데이터 로드
function loadScores() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('점수 로드 실패:', error);
    }
    return [];
}

// 점수 데이터 저장
function saveScores(scores) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(scores, null, 2));
    } catch (error) {
        console.error('점수 저장 실패:', error);
    }
}

// 미들웨어
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API: 점수 조회 (TOP 10)
app.get('/api/scores', (req, res) => {
    const scores = loadScores();
    // 점수 기준 내림차순 정렬, 상위 10개
    const topScores = scores
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    res.json(topScores);
});

// API: 점수 저장
app.post('/api/scores', (req, res) => {
    const { nickname, score } = req.body;

    // 유효성 검사
    if (!nickname || typeof score !== 'number' || score < 0) {
        return res.status(400).json({ error: '잘못된 요청입니다.' });
    }

    // 닉네임 길이 제한 및 정제
    const cleanNickname = nickname.trim().slice(0, 20);
    if (!cleanNickname) {
        return res.status(400).json({ error: '닉네임이 필요합니다.' });
    }

    const scores = loadScores();

    // 새 점수 추가
    scores.push({
        nickname: cleanNickname,
        score: Math.floor(score),
        timestamp: new Date().toISOString()
    });

    // 상위 100개만 유지 (메모리 관리)
    const trimmedScores = scores
        .sort((a, b) => b.score - a.score)
        .slice(0, 100);

    saveScores(trimmedScores);

    res.json({ success: true, message: '점수가 저장되었습니다.' });
});

// 기본 라우트 (SPA 지원)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 서버 시작
const server = app.listen(PORT, () => {
    console.log('');
    console.log('========================================');
    console.log('  운빨 테스트 서버가 시작되었습니다!');
    console.log('  http://localhost:' + PORT);
    console.log('  Ctrl+C 를 눌러 종료할 수 있습니다.');
    console.log('========================================');
    console.log('');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error('오류: 포트 ' + PORT + '이(가) 이미 사용 중입니다.');
        console.error('다른 프로그램을 종료하거나 다른 포트를 사용하세요.');
    } else {
        console.error('서버 오류:', err);
    }
    process.exit(1);
});
