// --- DOM要素 ---
const hoursSelect = document.getElementById('hours');
const minutesSelect = document.getElementById('minutes');
const secondsSelect = document.getElementById('seconds');
const musicSelect = document.getElementById('music');
const startBtn = document.getElementById('start-btn');
const overlay = document.getElementById('overlay');
const focusText = document.getElementById('focus-text');

// --- 状態管理 ---
let isRunning = false;   // タイマー進行中か（タブ移動ペナルティの判定用）
let isAppLocked = false; // 画面ロック中か（連打や魔の2秒間の誤操作防止用）
let timerInterval = null;
let audioPlayer = null;
let wakeLock = null;
let isAudioUnlocked = false;

// 成功音を裏でスタンバイさせておく
const successSound = new Audio("sounds/success.mp3");
successSound.preload = "auto"; 

// --- 初期設定 ---
for (let i = 0; i <= 23; i++) hoursSelect.add(new Option(i, i));
for (let i = 0; i <= 59; i++) minutesSelect.add(new Option(i, i));
for (let i = 0; i <= 59; i++) secondsSelect.add(new Option(i, i));

hoursSelect.value = 0;
minutesSelect.value = 5;
secondsSelect.value = 0;

function getTotalSeconds() {
    return (parseInt(hoursSelect.value) * 3600) + 
           (parseInt(minutesSelect.value) * 60) + 
            parseInt(secondsSelect.value);
}

function updateStartButton() {
    // 画面がロックされていない時だけ、ボタンの有効/無効を判定する
    if (!isAppLocked) {
        startBtn.disabled = getTotalSeconds() === 0;
    }
}

hoursSelect.addEventListener('change', updateStartButton);
minutesSelect.addEventListener('change', updateStartButton);
secondsSelect.addEventListener('change', updateStartButton);
updateStartButton();

// --- メイン処理（タイマー開始） ---
startBtn.addEventListener('click', async () => {
    if (isAppLocked) return; // アラートを閉じるまでは何度ボタンを押しても無視する

    const totalTime = getTotalSeconds();
    if (totalTime === 0) return;

    // ★ 状態をオンにする
    isAppLocked = true; // ここから完全ロック開始
    isRunning = true;   // ここからペナルティ監視開始
    startBtn.disabled = true;
    
    let elapsedSeconds = 0;
    let dotCount = 0;
    focusText.textContent = "STAY FOCUSED.";

    // スリープ防止
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (err) {
        console.log("Wake Lock error:", err);
    }

    // 音声のロック解除（初回のみ）
    if (!isAudioUnlocked) {
        successSound.load();
        isAudioUnlocked = true;
    }

    // BGM再生
    const selectedMusic = musicSelect.value;
    if (selectedMusic !== "none") {
        audioPlayer = new Audio(`sounds/${selectedMusic}.mp3`);
        audioPlayer.loop = true;
        audioPlayer.play().catch(e => console.log("Audio play error:", e));
    }

    // 画面暗転
    overlay.classList.remove('hidden');

    // 1秒ごとのカウント＆ドットアニメーション
    timerInterval = setInterval(() => {
        elapsedSeconds++;

        // 指定時間に達したらクリア
        if (elapsedSeconds >= totalTime) {
            isRunning = false; // ★集中完了！ここからはタブを移動しても怒られない
            stopTimerOnly();

            successSound.currentTime = 0;
            successSound.play().catch(e => console.log("Success play error:", e));
            
            // 約2秒待ってからアラートを出す
            setTimeout(() => {
                alert("Great job! You stayed focused the entire time.");
                isAppLocked = false; // ★アラートの「OK」を押して、初めてロック解除
                updateStartButton();
            }, 2000); // ※success.mp3の長さに合わせて数字を微調整してください
            
            return;
        }

        dotCount = (elapsedSeconds % 4);
        focusText.textContent = "STAY FOCUSED" + ".".repeat(dotCount);
    }, 1000);
});

// --- ペナルティ処理 ---
document.addEventListener('visibilitychange', () => {
    // 集中期間中（isRunning）にタブを隠したらアウト
    if (document.hidden && isRunning) {
        isRunning = false; 
        stopTimerOnly();
        
        setTimeout(() => {
            alert("Session failed. You left the app during focus time.");
            isAppLocked = false; // ★ペナルティのOKを押してロック解除
            updateStartButton();
        }, 50);
    }
});

// --- 共通停止処理 ---
function stopTimerOnly() {
    clearInterval(timerInterval);
    
    if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        audioPlayer = null;
    }

    if (wakeLock !== null) {
        wakeLock.release().then(() => wakeLock = null).catch(e => console.log(e));
    }

    overlay.classList.add('hidden');
}
