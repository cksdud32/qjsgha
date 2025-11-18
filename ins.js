// 노래 검색 기능 (띄어쓰기 무시, 초성 연속 검색)
function getInitials(text) {
    const CHO = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
    let result = '';
    for (let char of text) {
        const code = char.charCodeAt(0);
        if (code >= 0xAC00 && code <= 0xD7A3) {
            const uniIndex = code - 0xAC00;
            const choIndex = Math.floor(uniIndex / 588);
            result += CHO[choIndex];
        } else {
            result += char;
        }
    }
    return result;
}

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const results = document.getElementById('results');

    const contents = document.querySelectorAll('p:not(.popup3 p):not(.skq p):not(.open-popup3)');
    contents.forEach((el, idx) => {
        if (!el.id) el.id = 'content-' + idx;
    });

    function clearHighlight() {
        contents.forEach(el => el.style.backgroundColor = '');
    }

    searchInput.addEventListener('input', () => {
        let keyword = searchInput.value.trim().toLowerCase().replace(/\s+/g, ''); // 띄어쓰기 제거
        results.innerHTML = '';
        if (!keyword) return;

        const CHO = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
        const isAllInitials = [...keyword].every(ch => CHO.includes(ch));

        if (isAllInitials && keyword.length === 1) return; // 한 글자 초성 제외

        contents.forEach(el => {
            let text = el.textContent || '';
            let searchableText = text.replace(/제목\s*:\s*/gi,'').replace(/번호\s*:\s*/gi,'').toLowerCase().replace(/\s+/g, ''); // 띄어쓰기 제거
            let textInitials = getInitials(searchableText);

            let matched = false;
            if (isAllInitials) {
                // 초성 연속 비교
                if (textInitials.includes(keyword)) matched = true;
            } else {
                // 글자 + 혼합 검색
                if (searchableText.includes(keyword) || textInitials.includes(keyword)) matched = true;
            }

            if (matched) {
                const li = document.createElement('li');
                li.style.cursor = 'pointer';

                // 하이라이트 표시 (띄어쓰기 유지)
                let highlightedText = text;
                if (!isAllInitials) {
                    const re = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                    highlightedText = highlightedText.replace(re, '<mark>$&</mark>');
                }

                li.innerHTML = highlightedText;
                results.appendChild(li);

                li.addEventListener('click', () => {
                    const target = document.getElementById(el.id);
                    if (!target) return;

                    clearHighlight();

                    searchInput.value = '';
                    results.innerHTML = '';

                    const rect = target.getBoundingClientRect();
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    const targetPos = rect.top + scrollTop;

                    window.scrollTo({ top: targetPos - 50, behavior: 'smooth' });

                    target.style.backgroundColor = '#c6ddffff';
                    setTimeout(() => target.style.backgroundColor = '', 5000);
                });
            }
        });
    });
});
