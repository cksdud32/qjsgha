// 노래 검색 기능
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const results = document.getElementById('results');

    const contents = document.querySelectorAll('p:not(.popup3 p):not(.skq p):not(.open-popup3)');

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

            const searchableText = text.replace(/제목\s*:\s*/gi, '').replace(/번호\s*:\s*/gi, '').toLowerCase();

            if (searchableText.includes(keyword)) {
                const li = document.createElement('li');
                li.style.cursor = 'pointer';

                const highlightedText = text.replace(
                    new RegExp(`(${keyword})`, 'gi'),
                    '<mark>$1</mark>'
                );

                li.innerHTML = highlightedText;

               li.addEventListener('click', () => {
    const target = document.getElementById(el.id);
    if (!target) return;

    clearHighlight();

    searchInput.value = '';
    results.innerHTML = '';

    const rect = target.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const targetPos = rect.top + scrollTop;

    window.scrollTo({
        top: targetPos - 50,
        behavior: 'smooth'
    });

    target.style.backgroundColor = '#c6ddffff';
    setTimeout(() => target.style.backgroundColor = '', 5000);
});




                results.appendChild(li);
            }
        });
    });
});
