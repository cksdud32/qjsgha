document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const results = document.getElementById('results');

    // 검색 대상: p와 a, popup3, skq 제외
    const contents = document.querySelectorAll('p:not(.popup3 p):not(.skq p):not(.open-popup3)');

    // 고유 ID 부여
    contents.forEach((el, idx) => {
        if (!el.id) el.id = 'content-' + idx;
    });

    function clearHighlight() {
        contents.forEach(el => {
            el.style.backgroundColor = '';
        });
    }

    searchInput.addEventListener('input', () => {
        const keyword = searchInput.value.trim().toLowerCase();
        results.innerHTML = '';

        if (!keyword) return;

        contents.forEach(el => {
            let text = el.textContent || '';

            // "제목 :", "번호 :" 제거 후 검색
            const searchableText = text.replace(/제목\s*:\s*/gi, '').replace(/번호\s*:\s*/gi, '').toLowerCase();

            if (searchableText.includes(keyword)) {
                const li = document.createElement('li');
                li.style.cursor = 'pointer';

                // 검색어 하이라이트는 원래 텍스트에서만 표시
                const highlightedText = text.replace(
                    new RegExp(`(${keyword})`, 'gi'),
                    '<mark>$1</mark>'
                );

                li.innerHTML = highlightedText;

                li.addEventListener('click', () => {
                    const target = document.getElementById(el.id);
                    if (target) {
                        clearHighlight();
                        target.style.backgroundColor = '#fffb91';
                        target.scrollIntoView({ behavior: 'smooth', block: 'center' });

                        setTimeout(() => target.style.backgroundColor = '', 5000);

                        results.innerHTML = '';
                        searchInput.value = '';
                    }
                });

                results.appendChild(li);
            }
        });
    });
});
