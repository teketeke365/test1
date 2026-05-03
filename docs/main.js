const storageKey = 'myEnglishWords';
let wordList = JSON.parse(localStorage.getItem(storageKey)) || []; // 保存データ読み込み [4]
let currentIndex = 0;

// ★追加: Google Drive API設定 [3, 6]
const CLIENT_ID = '962099018527-fsgsffkhc6hat1mmpjhiieousu2lf5u5.apps.googleusercontent.com'; // メモしたIDを入れる
const SCOPES = 'https://www.googleapis.com/auth/drive.file'; // [11, 13]
let tokenClient;
let accessToken = null;

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


// --- 2. Google Drive 認証・同期ロジック (ソース [5-7] に基づく) ---

// 初期化: ライブラリ読み込み完了時に実行
function initDriveAuth() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
            if (response.error !== undefined) throw response;
            accessToken = response.access_token;
            document.getElementById('sync-status').innerText = 'ログイン済';
            document.getElementById('saveDriveBtn').disabled = false;
            document.getElementById('loadDriveBtn').disabled = false;
        },
    });
}

// ログインボタンの動作 (ソース [2] の通り、ユーザーの操作が必須)
function handleAuthClick() {
    tokenClient.requestAccessToken({ prompt: 'consent' });
}

// データ変換: JSON配列 ↔ CSV文字列 (ソース [8] のアップロード手法を応用)
function convertToCSV(data) {
    if (data.length === 0) return "";
    const headers = "word,meaning,c1,c2,c3,passed";
    const rows = data.map(o => `${o.word},${o.meaning},${o.c1},${o.c2},${o.c3},${o.passed}`);
    return [headers, ...rows].join("\n");
}

function parseCSV(csvText) {
    const lines = csvText.trim().split("\n");
    if (lines.length <= 1) return [];
    return lines.slice(1).map(line => {
        const [word, meaning, c1, c2, c3, passed] = line.split(",");
        return { 
            word, meaning, 
            c1: c1 === "true", c2: c2 === "true", c3: c3 === "true", 
            passed: passed === "true" 
        };
    });
}

// // Drive保存 (ソース [8, 9] のmultipartアップロード)
// async function saveToDrive() {
//     const csvContent = convertToCSV(wordList);
//     const metadata = { name: 'wordlist.csv', mimeType: 'text/csv' };
//     const form = new FormData();
//     form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
//     form.append('file', new Blob([csvContent], { type: 'text/csv' }));

//     const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
//         method: 'POST',
//         headers: { 'Authorization': `Bearer ${accessToken}` },
//         body: form
//     });
//     if (res.ok) alert("DriveにCSVを保存しました！");
// }

// Drive読み込み (ソース [10, 11] のGETリクエスト)
// async function loadFromDrive() {
//     const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='wordlist.csv'&fields=files(id)`, {
//         headers: { 'Authorization': `Bearer ${accessToken}` }
//     });
//     const searchData = await searchRes.json();
//     if (searchData.files.length > 0) {
//         const fileId = searchData.files.id;
//         const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
//             headers: { 'Authorization': `Bearer ${accessToken}` }
//         });
//         const csvText = await fileRes.text();
//         wordList = parseCSV(csvText);
//         saveToLocal();
//         updateTable();
//         alert("同期が完了しました！");
//     }
// }

// async function saveToDrive() {
//     if (!accessToken) return alert("先にログインしてください");

//     try {
//         const csvContent = convertToCSV(wordList);
        
//         // 1. 同名ファイルの検索 (idをリクエストに含める)
//         const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='wordlist.csv'&fields=files(id)`, {
//             headers: { 'Authorization': `Bearer ${accessToken}` }
//         });
//         const searchData = await searchRes.json();

//         // 【デバッグ用】検索結果をコンソールに表示して確認
//         console.log("Googleからの検索応答:", searchData);

//         // let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=media';
//         if (searchData.files && searchData.files.length > 0) {
//             const fileId = searchData.files[0].id;
//             url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
//             method = 'PATCH';
//         } else {
//             // 新規作成
//             const metadata = { name: 'wordlist.csv' };
//             const form = new FormData();
//             form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
//             form.append('file', new Blob([csvContent], { type: 'text/csv' }));

//             const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
//                 method: 'POST',
//                 headers: { 'Authorization': `Bearer ${accessToken}` },
//                 body: form
//             });

//             if (res.ok) {
//                 alert("Driveに新規保存しました！");
//             }
//             return;
//         }





//         let method = 'POST';

//         // 2. 既存ファイルの特定 (配列の0番目を確実に指定)
//         if (searchData.files && searchData.files.length > 0) {
//             // ★ここが最重要：  を使って配列の最初の要素のidを取得します
//             // const fileId = searchData.files.id; 
//             const fileId = searchData.files[0].id;
            
//             if (fileId) {
//                 console.log("既存ファイル(ID:" + fileId + ")を上書きします");
//                 url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
//                 method = 'PATCH';
//             }
//         }

//         // 3. 送信処理
//         const res = await fetch(url, {
//             method: method,
//             headers: {
//                 'Authorization': `Bearer ${accessToken}`,
//                 'Content-Type': 'text/csv'
//             },
//             body: csvContent
//         });

//         if (res.ok) {
//             alert("Google Driveに同期・保存しました！");
//         } else {
//             const errorText = await res.text();
//             console.error("保存失敗の理由:", errorText);
//             throw new Error("保存に失敗しました");
//         }
//     } catch (error) {
//         console.error("保存エラー:", error);
//         alert("保存エラー: " + error.message);
//     }
// }


async function saveToDrive() {
    if (!accessToken) return alert("先にログインしてください");

    try {
        const csvContent = convertToCSV(wordList);

        const searchRes = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='wordlist.csv'&fields=files(id)`,
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        const searchData = await searchRes.json();

        console.log("検索結果:", searchData);

        // ★ここで定義
        let url;
        let method;

        if (searchData.files && searchData.files.length > 0) {
            // 上書き
            const fileId = searchData.files[0].id;
            url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
            method = 'PATCH';

            console.log("上書き:", fileId);

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'text/csv'
                },
                body: csvContent
            });

            if (!res.ok) throw new Error("上書き失敗");

            alert("上書き保存しました！");
        } else {
            // 新規作成（multipart）
            const metadata = { name: 'wordlist.csv' };
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', new Blob([csvContent], { type: 'text/csv' }));

            const res = await fetch(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
                {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                    body: form
                }
            );

            if (!res.ok) throw new Error("新規保存失敗");

            alert("新規保存しました！");
        }

    } catch (error) {
        console.error("保存エラー:", error);
        alert("保存エラー: " + error.message);
    }
}


/// --- データの読み込み (必ず配列の0番目を指定) ---
async function loadFromDrive() {
    if (!accessToken) return alert("先にログインしてください");

    try {
        // 1. ファイルを検索
        const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='wordlist.csv'&fields=files(id,name)`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const searchData = await searchRes.json();

        // 2. 検索結果を確認
        if (searchData.files && searchData.files.length > 0) {
            // ★修正ポイント：searchData.files.id と記述します
            // const fileId = searchData.files.id; 
            const fileId = searchData.files[0].id;
            console.log("読み込むファイルID:", fileId);

            // 3. ファイルの内容をダウンロード
            const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!fileRes.ok) throw new Error("ダウンロード失敗");

            const csvText = await fileRes.text();
            
            // 4. CSVをパースして反映
            const loadedData = parseCSV(csvText);
            if (loadedData) {
                wordList = loadedData;
                save(); // LocalStorageへ反映 [1]
                updateTable(); // 画面を更新 [2]
                alert("Google Driveから読み込みました！");
            }
        } else {
            alert("Drive上に 'wordlist.csv' が見つかりませんでした。");
        }
    } catch (error) {
        console.error("読み込みエラー:", error);
        alert("エラーが発生しました。コンソールを確認してください。");
    }
}


// --- 3. 単語帳本体のロジック (ソース [12-15] に基づく) ---

const saveToLocal = () => localStorage.setItem(storageKey, JSON.stringify(wordList));

function updateTable() {
    const tbody = document.getElementById('wordListBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    wordList.forEach((item, index) => {
        // const row = `<tr>
        //     <td>${item.word}</td><td>${item.meaning}</td>
        //     <td><input type="checkbox" ${item.c1 ? 'checked' : ''} onclick="toggleCheck(${index}, 'c1')"></td>
        //     <td><input type="checkbox" ${item.c2 ? 'checked' : ''} onclick="toggleCheck(${index}, 'c2')"></td>
        //     <td><input type="checkbox" ${item.c3 ? 'checked' : ''} onclick="toggleCheck(${index}, 'c3')"></td>
        //     <td><input type="checkbox" ${item.passed ? 'checked' : ''} onclick="toggleCheck(${index}, 'passed')"></td>
        //     // <td><button onclick="deleteWord(${index})">削除</button></td>
        //     <td><button class="delete-btn" onclick="deleteWord(${index})">×</button></td>
        // </tr>`;
            const row = `<tr>
            <td>${item.word}</td>
            <td>${item.meaning}</td>
            <td class="check-col"><input type="checkbox" ${item.c1 ? 'checked' : ''} onclick="toggleCheck(${index}, 'c1')"></td>
            <td class="check-col"><input type="checkbox" ${item.c2 ? 'checked' : ''} onclick="toggleCheck(${index}, 'c2')"></td>
            <td class="check-col"><input type="checkbox" ${item.c3 ? 'checked' : ''} onclick="toggleCheck(${index}, 'c3')"></td>
            <td class="check-col"><input type="checkbox" ${item.passed ? 'checked' : ''} onclick="toggleCheck(${index}, 'passed')"></td>
            <td class="delete-col">
                <button class="delete-btn" onclick="deleteWord(${index})">×</button>
            </td>
        </tr>`;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

// モード切り替え
function switchMode(mode) {
    document.querySelectorAll('.mode').forEach(el => el.style.display = 'none');
    document.getElementById(`${mode}-mode`).style.display = 'block';
    if (mode === 'wordbook') updateTable();
}

// --- 4. 起動時の処理 (ソース [16, 17] のwindow.onload / defer対応) ---
window.onload = () => {
    initDriveAuth(); // Google認証の準備
    updateTable();   // 初回一覧表示
};


// // 単語帳モードの一覧更新 [2, 7]
// function updateTable() {
//     const tbody = document.getElementById('wordListBody');
//     tbody.innerHTML = '';
//     wordList.forEach((item, index) => {
//         const row = `<tr>
//             <td>${item.word}</td>
//             <td>${item.meaning}</td>
//             <td><input type="checkbox" ${item.c1 ? 'checked' : ''} onclick="toggleCheck(${index}, 'c1')"></td>
//             <td><input type="checkbox" ${item.c2 ? 'checked' : ''} onclick="toggleCheck(${index}, 'c2')"></td>
//             <td><input type="checkbox" ${item.c3 ? 'checked' : ''} onclick="toggleCheck(${index}, 'c3')"></td>
//             <td><input type="checkbox" ${item.passed ? 'checked' : ''} onclick="toggleCheck(${index}, 'passed')"></td>
//             <td><button onclick="deleteWord(${index})">削除</button></td>
//         </tr>`;
//         tbody.insertAdjacentHTML('beforeend', row);
//     });
// }

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


