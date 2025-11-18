function getInitials(text) {
    const CHO = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
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

    let currentCategory = 'all';

    document.querySelectorAll('.song-filter button').forEach(btn => {
        btn.addEventListener('click', () => {
            currentCategory = btn.dataset.type;
            document.querySelectorAll('.song-filter button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            searchInput.dispatchEvent(new Event('input'));
        });
    });

    function clearHighlight() {
        contents.forEach(el => el.style.backgroundColor = '');
    }

    searchInput.addEventListener('input', () => {
        const keyword = searchInput.value.trim().toLowerCase().replace(/\s+/g, '');
        results.innerHTML = '';

        if (!keyword) {
            results.classList.remove('show-border');
            return;
        }
        results.classList.add('show-border');

        const keywordIsAllCho = /^[ㄱ-ㅎ]+$/.test(keyword);
        if (keywordIsAllCho && keyword.length < 2) return;

        contents.forEach(el => {
            const text = el.textContent || '';
            const cleanText = text.replace(/제목\s*:\s*/gi, '').replace(/번호\s*:\s*/gi, '').replace(/\s+/g, '').toLowerCase();
            const initials = getInitials(cleanText);

            let type = 'all';
            const parentDiv = el.closest('.jap, .ja, .kso, .kor');
            if (parentDiv) {
                if (parentDiv.classList.contains('jap') || parentDiv.classList.contains('ja')) type = 'jp';
                else if (parentDiv.classList.contains('kso')) type = 'origin';
                else if (parentDiv.classList.contains('kor')) type = 'kr';
            }
            if (currentCategory !== 'all' && currentCategory !== type) return;

            let matched = false;
            let matchIndex = -1;
            for (let i = 0; i <= cleanText.length - keyword.length; i++) {
                let matchFlag = true;
                for (let j = 0; j < keyword.length; j++) {
                    const kChar = keyword[j];
                    const tChar = cleanText[i + j];
                    const tInitial = initials[i + j];
                    if (!(kChar === tChar || kChar === tInitial)) {
                        matchFlag = false;
                        break;
                    }
                }
                if (matchFlag) {
                    matched = true;
                    matchIndex = i;
                    break;
                }
            }

            if (matched) {
                const li = document.createElement('li');
                li.style.cursor = 'pointer';

                let highlightedText = text;

                if (matchIndex >= 0) {
                    let cleanTextIndex = 0;
                    let startPos = -1;
                    let matchedLength = 0;
                    let keywordIndex = 0;

                    for (let i = 0; i < text.length; i++) {
                        const char = text[i];
                        
                        const isIgnoredChar = (/\s/.test(char) || /[:/제목번호]/.test(char));
                        
                        if (!isIgnoredChar) {
                            if (cleanTextIndex === matchIndex) {
                                startPos = i;
                            }
                            
                            if (cleanTextIndex >= matchIndex && keywordIndex < keyword.length) {
                                matchedLength++;
                                keywordIndex++;
                            }
                            cleanTextIndex++;
                        } 
                        else {
                            if (startPos >= 0 && keywordIndex < keyword.length) {
                                matchedLength++;
                            }
                        }
                        
                        if (startPos >= 0 && keywordIndex >= keyword.length) {
                            if (!isIgnoredChar) {
                                break;
                            }
                        }
                    }

                    if (startPos >= 0 && matchedLength > 0) {
                        const before = text.slice(0, startPos);
                        const match = text.slice(startPos, startPos + matchedLength);
                        const after = text.slice(startPos + matchedLength);
                        highlightedText = `${before}<mark>${match}</mark>${after}`;
                    } else {
                        const keywordRegex = new RegExp(keyword.split('').map(ch => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi');
                        highlightedText = text.replace(keywordRegex, '<mark>$&</mark>');
                    }
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

                    window.scrollTo({
                        top: targetPos - 50,
                        behavior: 'smooth'
                    });

                    target.style.backgroundColor = '#c6ddffff';
                    setTimeout(() => target.style.backgroundColor = '', 5000);
                });
            }
        });
    });
});