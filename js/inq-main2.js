(function () {
    var timerInterval = null;
    var basePrice = 81400;
    var mobileExpanded = false;

    function pad(n, len) { return String(n).padStart(len, '0'); }

    function formatTime(ms) {
        var min = Math.floor(ms / 60000);
        var sec = Math.floor((ms % 60000) / 1000);
        var msec = ms % 1000;
        return pad(min, 2) + ':' + pad(sec, 2) + '.' + pad(msec, 3);
    }

    function startStopwatch(startTime) {
        var hud = document.getElementById('stopwatchHud');
        var swTime = document.getElementById('swTime');
        if (hud) hud.classList.remove('hidden');
        timerInterval = setInterval(function () {
            if (swTime) swTime.textContent = formatTime(Date.now() - startTime);
        }, 50);
    }

    function updateTotal() {
        var qty = parseInt(document.getElementById('qtyVal').value) || 1;
        var total = basePrice * qty;
        var fmt = total.toLocaleString();

        var el;
        el = document.getElementById('optionTotal'); if (el) el.textContent = fmt + '원';
        el = document.getElementById('totalPrice');  if (el) el.textContent = fmt;
        el = document.getElementById('msTotalPrice'); if (el) el.textContent = fmt;
        el = document.getElementById('msQty'); if (el) el.value = qty;
        el = document.getElementById('msPrice'); if (el) el.textContent = fmt + '원';
    }

    window.changeQty = function (delta) {
        var inp = document.getElementById('qtyVal');
        var qty = Math.max(1, (parseInt(inp.value) || 1) + delta);
        inp.value = qty;
        updateTotal();
    };

    window.buyNow = function () {
        clearInterval(timerInterval);
        try {
            var sess = JSON.parse(sessionStorage.getItem('ticketingPracticeSession') || '{}');
            if (sess.stopwatchStart) sess.stopwatch = Date.now() - sess.stopwatchStart;
            sessionStorage.setItem('ticketingPracticeSession', JSON.stringify(sess));
        } catch (e) {}
        sessionStorage.setItem('ticketingStep', 'inq-main2');
        window.location.href = '../inqb.html';
    };

    window.toggleMobileSticky = function () {
        mobileExpanded = !mobileExpanded;
        var msExpanded    = document.getElementById('msExpanded');
        var msBuynowOnly  = document.getElementById('msBuynowOnly');
        var msToggle      = document.getElementById('msToggle');
        if (msExpanded)   msExpanded.style.display   = mobileExpanded ? 'block' : 'none';
        if (msBuynowOnly) msBuynowOnly.style.display = mobileExpanded ? 'none'  : 'block';
        if (msToggle)     msToggle.textContent        = mobileExpanded ? '∨'    : '∧';
    };

    window.addEventListener('DOMContentLoaded', function () {
        // if (sessionStorage.getItem('ticketingStep') !== 'inq-main1') {
        //     alert('티켓팅 순서에 맞게 사이트 접속 해주세요.');
        //     window.location.href = '../inqa.html';
        //     return;
        // }
        try {
            var sess = JSON.parse(sessionStorage.getItem('ticketingPracticeSession') || '{}');
            var prod = sess.product;

            if (prod) {
                basePrice = prod.price || 81400;
                var name  = prod.title || '티켓팅 연습';

                ['productName', 'optionLabel', 'msName'].forEach(function (id) {
                    var el = document.getElementById(id);
                    if (el) el.textContent = name;
                });

                var fmtPrice = basePrice.toLocaleString() + '원';
                var el;
                el = document.getElementById('priceNow'); if (el) el.textContent = fmtPrice;
                el = document.getElementById('msPrice');  if (el) el.textContent = fmtPrice;

                if (prod.imageUrl) {
                    var detailImg = document.getElementById('detailImg');
                    var thumbImg  = document.getElementById('thumbImg');
                    var imgPh     = document.getElementById('imgPh');
                    if (detailImg) { detailImg.src = prod.imageUrl; detailImg.style.display = 'block'; }
                    if (thumbImg)  { thumbImg.src  = prod.imageUrl; thumbImg.style.display  = 'block'; }
                    if (imgPh)     imgPh.style.display = 'none';
                }
            }

            // 스톱워치 이어서 계속
            if (sess.stopwatchStart) startStopwatch(sess.stopwatchStart);

        } catch (e) {}

        updateTotal();
    });
})();
