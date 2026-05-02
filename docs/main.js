const storageKey = 'myEnglishWords';
let wordList = JSON.parse(localStorage.getItem(storageKey)) || []; // 保存データ読み込み [4]
let currentIndex = 0;

// データ保存関数 [9]
const save = () => localStorage.setItem(storageKey, JSON.stringify(wordList));

// モード切り替え
function switchMode(mode) {
    document.querySelectorAll('.mode').forEach(el => el.style.display = 'none');
    document.getElementById(`${mode}-mode`).style.display = 'block';
    if (mode === 'wordbook') updateTable();
    if (mode === 'test') startTest();
}

// 単語の追加
document.getElementById('addBtn').addEventListener('click', () => {
    const word = document.getElementById('wordInput').value.trim(); // [7]
    const meaning = document.getElementById('meaningInput').value.trim();
    if (!word || !meaning) return alert("両方入力してください");

    // 初期データ構造
    wordList.push({ word, meaning, c1: false, c2: false, c3: false, passed: false });
    save();
    updateTable();
    document.getElementById('wordInput').value = '';
    document.getElementById('meaningInput').value = '';
});

// 単語帳モードの一覧更新 [2, 7]
function updateTable() {
    const tbody = document.getElementById('wordListBody');
    tbody.innerHTML = '';
    wordList.forEach((item, index) => {
        const row = `<tr>
            <td>${item.word}</td>
            <td>${item.meaning}</td>
            <td><input type="checkbox" ${item.c1 ? 'checked' : ''} onclick="toggleCheck(${index}, 'c1')"></td>
            <td><input type="checkbox" ${item.c2 ? 'checked' : ''} onclick="toggleCheck(${index}, 'c2')"></td>
            <td><input type="checkbox" ${item.c3 ? 'checked' : ''} onclick="toggleCheck(${index}, 'c3')"></td>
            <td><input type="checkbox" ${item.passed ? 'checked' : ''} onclick="toggleCheck(${index}, 'passed')"></td>
            <td><button onclick="deleteWord(${index})">削除</button></td>
        </tr>`;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

function toggleCheck(index, key) {
    wordList[index][key] = !wordList[index][key];
    // 合格がついたら他のチェックは外す
    if (key === 'passed' && wordList[index].passed) {
        wordList[index].c1 = wordList[index].c2 = wordList[index].c3 = false;
    }
    save();
    updateTable();
}

function deleteWord(index) {
    if (confirm("削除しますか？")) {
        wordList.splice(index, 1); // [3]
        save();
        updateTable();
    }
}

// --- テストモード用 ---
function startTest() {
    if (wordList.length === 0) return alert("まずは単語を登録してください");
    showQuestion();
}

function showQuestion() {
    const item = wordList[currentIndex];
    const isEn = document.querySelector('input[name="testType"]:checked').value === 'en';
    
    document.getElementById('question-text').innerText = isEn ? item.word : item.meaning;
    document.getElementById('answer-text').innerText = isEn ? item.meaning : item.word;
    
    document.getElementById('answer-area').style.display = 'none';
    document.getElementById('showAnswerBtn').style.display = 'block';
    document.getElementById('fail-options').style.display = 'none';
    document.getElementById('test-progress').innerText = `${currentIndex + 1} / ${wordList.length}`;
}

document.getElementById('showAnswerBtn').addEventListener('click', () => {
    document.getElementById('answer-area').style.display = 'block';
    document.getElementById('showAnswerBtn').style.display = 'none';
});

// テスト判定 [8]
function handleTestResult(isCorrect) {
    if (isCorrect) {
        // 合格処理
        const item = wordList[currentIndex];
        item.passed = true;
        item.c1 = item.c2 = item.c3 = false;
        save();
        nextWord();
    }
}

function showFailOptions() {
    document.getElementById('fail-options').style.display = 'block';
}

function setCheckAndNext(level) {
    const item = wordList[currentIndex];
    item.passed = false;
    item.c1 = (level === 1);
    item.c2 = (level === 2);
    item.c3 = (level === 3);
    save();
    nextWord();
}

function nextWord() {
    currentIndex = (currentIndex + 1) % wordList.length;
    showQuestion();
}

function prevWord() {
    currentIndex = (currentIndex - 1 + wordList.length) % wordList.length;
    showQuestion();
}

// 初期表示
updateTable();
