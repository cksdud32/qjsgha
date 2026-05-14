(function () {
    var timerInterval = null;

    function pad(n, len) { return String(n).padStart(len, '0'); }

    function formatTime(ms) {
        var min = Math.floor(ms / 60000);
        var sec = Math.floor((ms % 60000) / 1000);
        var msec = ms % 1000;
        return pad(min, 2) + ':' + pad(sec, 2) + '.' + pad(msec, 3);
    }

    function startStopwatch() {
        var startTime = Date.now();
        try {
            var sess = JSON.parse(sessionStorage.getItem('ticketingPracticeSession') || '{}');
            sess.stopwatchStart = startTime;
            sessionStorage.setItem('ticketingPracticeSession', JSON.stringify(sess));
        } catch (e) {}

        var hud = document.getElementById('stopwatchHud');
        var swTime = document.getElementById('swTime');
        if (hud) hud.classList.remove('hidden');

        timerInterval = setInterval(function () {
            if (swTime) swTime.textContent = formatTime(Date.now() - startTime);
        }, 50);
    }

    window.goToProduct = function () {
        clearInterval(timerInterval);
        try {
            var sess = JSON.parse(sessionStorage.getItem('ticketingPracticeSession') || '{}');
            if (sess.stopwatchStart) {
                sess.stopwatch = Date.now() - sess.stopwatchStart;
            }
            sessionStorage.setItem('ticketingPracticeSession', JSON.stringify(sess));
        } catch (e) {}
        window.location.href = 'inq-main2.html';
    };

    window.addEventListener('DOMContentLoaded', function () {
        try {
            var sess = JSON.parse(sessionStorage.getItem('ticketingPracticeSession') || '{}');
            var prod = sess.product;
            if (prod) {
                var nameEl = document.getElementById('productName');
                var priceEl = document.getElementById('productPrice');
                if (nameEl) nameEl.textContent = prod.title || '티켓팅 연습';
                if (priceEl) priceEl.textContent = (prod.price || 81400).toLocaleString() + '원';
                if (prod.imageUrl) {
                    var imgEl = document.getElementById('productImgEl');
                    var ph = document.querySelector('.card-img-placeholder');
                    if (imgEl) { imgEl.src = prod.imageUrl; imgEl.style.display = 'block'; }
                    if (ph) ph.style.display = 'none';
                }
            }
        } catch (e) {}

        // 3~5초 랜덤 딜레이 후 상품 표시 + 스톱워치 시작
        var delay = Math.floor(Math.random() * 2001) + 3000;
        setTimeout(function () {
            var grid = document.getElementById('productGrid');
            if (grid) grid.style.visibility = 'visible';
            startStopwatch();
        }, delay);
    });
})();
