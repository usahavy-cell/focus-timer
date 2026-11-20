// --- DOM要素 ---
const hoursSelect = document.getElementById('hours');
const minutesSelect = document.getElementById('minutes');
const secondsSelect = document.getElementById('seconds');
const musicSelect = document.getElementById('music');
const startBtn = document.getElementById('start-btn');
const overlay = document.getElementById('overlay');
const focusText = document.getElementById('focus-text');

// --- 状態管理 ---
let isRunning = false;
let timerInterval = null;
let audioPlayer = null;
let wakeLock = null;

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
    startBtn.disabled = getTotalSeconds() === 0;
}

hoursSelect.addEventListener('change', updateStartButton);
minutesSelect.addEventListener('change', updateStartButton);
secondsSelect.addEventListener('change', updateStartButton);
updateStartButton();

// --- メイン処理（タイマー開始） ---
startBtn.addEventListener('click', async () => {
    const totalTime = getTotalSeconds();
    if (totalTime === 0) return;

    const successSound = new Audio("sounds/success.mp3");

    isRunning = true;
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

    // 【重要】ボタンを押した瞬間に、無音で一瞬だけ再生してブラウザの自動再生ロックを解除する
    successSound.volume = 0;
    successSound.play().then(() => {
        successSound.pause();
        successSound.currentTime = 0;
        successSound.volume = 1;
    }).catch(e => console.log("Success unlock error:", e));

    // soundsフォルダから音楽を再生
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
            // 1. 先にBGMと暗転だけを止める（アラートはまだ出さない）
            stopTimerOnly();

            // 2. 成功音を鳴らす
            successSound.play().then(() => {
                // 3. 音が鳴り終わった瞬間にアラートを出す
                successSound.onended = () => {
                    alert("Great job! You stayed focused the entire time.");
                };
            }).catch(e => {
                console.log("Success play error:", e);
                alert("Great job! You stayed focused the entire time.");
            });
            return;
        }

        // ドットを 0 -> 1 -> 2 -> 3 -> 0 と循環させる
        dotCount = (elapsedSeconds % 4);
        focusText.textContent = "STAY FOCUSED" + ".".repeat(dotCount);
    }, 1000);
});

// --- ペナルティ処理 ---
document.addEventListener('visibilitychange', () => {
    if (document.hidden && isRunning) {
        stopTimerOnly();
        setTimeout(() => {
            alert("Session failed. You left the app during focus time.");
        }, 50);
    }
});

// --- 共通停止処理（画面とBGMを止めるだけ） ---
function stopTimerOnly() {
    isRunning = false;
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
