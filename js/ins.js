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

const TYPE_SELECTOR = {
    '일본 커버곡1': '.jap ul',
    '일본 커버곡2': '.ja ul',
    '오리지널': '.kso ul',
    '오리지널 곡': '.kso ul',
    '한국 커버곡': '.kor ul'
};

function renderSongs(songs) {
    songs.forEach(song => {
        const selector = TYPE_SELECTOR[song.song_type];
        if (!selector) return;
        const ul = document.querySelector(selector);
        if (!ul) return;

        const li = document.createElement('li');

        const numText = song.number2
            ? `${song.number1} / ${song.number2}`
            : String(song.number1);

        const p = document.createElement('p');
        p.textContent = `제목 : ${song.song_title} / 번호 : ${numText}`;
        li.appendChild(p);

        if (song.lyrics_key1) {
            const div = document.createElement('div');
            div.style.cssText = 'display: flex; flex-direction: column;';
            const btn1 = document.createElement('button');
            btn1.className = 'lyrics-btn';
            btn1.dataset.number = song.number1;
            btn1.textContent = song.lyrics_label ? `${song.lyrics_label} 가사 보기` : '가사 보기 (ver.1)';
            const btn2 = document.createElement('button');
            btn2.className = 'lyrics-btn';
            btn2.dataset.number = song.lyrics_key1;
            btn2.textContent = song.lyrics_label2 ? `${song.lyrics_label2} 가사 보기` : '가사 보기 (ver.2)';
            div.appendChild(btn1);
            div.appendChild(btn2);
            li.appendChild(div);
        } else {
            const btn = document.createElement('button');
            btn.className = 'lyrics-btn';
            btn.dataset.number = song.number1;
            btn.textContent = '가사 보기';
            li.appendChild(btn);
        }

        if (song.link_url) {
            const a = document.createElement('a');
            a.href = song.link_url;
            a.textContent = song.link_label || '바로가기';
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            li.appendChild(a);
        }
        if (song.link_url2) {
            const a = document.createElement('a');
            a.href = song.link_url2;
            a.textContent = song.link_label2 || '바로가기';
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            li.appendChild(a);
        }

        ul.appendChild(li);
    });
}

function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const results = document.getElementById('results');
    const contents = document.querySelectorAll('p:not(.popup3 p):not(.skq p):not(.open-popup3)');

    contents.forEach((el, idx) => {
        if (!el.id) el.id = 'content-' + idx;
    });

    let currentCategory = 'all';

    document.querySelectorAll('.song-filter button').forEach(btn => {
        btn.addEventListener('click', () => {
            currentCategory = currentCategory === btn.dataset.type ? 'all' : btn.dataset.type;
            document.querySelectorAll('.song-filter button').forEach(b => b.classList.remove('active'));
            const activeBtn = document.querySelector(`.song-filter button[data-type="${currentCategory}"]`);
            if (activeBtn) activeBtn.classList.add('active');
            searchInput.dispatchEvent(new Event('input'));
        });
    });

    function clearHighlight() {
        contents.forEach(el => {
            el.style.backgroundColor = '';
            el.style.color = '';
        });
    }

    searchInput.addEventListener('input', () => {
        const keyword = searchInput.value.trim().toLowerCase().replace(/[\s/]+/g, '');
        if (!keyword || (/^[ㄱ-ㅎ]+$/.test(keyword) && keyword.length < 2)) {
            results.innerHTML = '';
            results.classList.remove('show-border');
            return;
        }

        results.innerHTML = '';
        let hasResults = false;

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
                hasResults = true;
                const li = document.createElement('li');
                let highlightedText = text;

                if (matchIndex >= 0) {
                    let cleanTextIndex = 0;
                    let startPos = -1;
                    let matchedLength = 0;
                    let keywordIndex = 0;

                    const removedTitlePattern = /제목\s*:\s*|번호\s*:\s*/gi;
                    const removedMatches = [];
                    let match;
                    while ((match = removedTitlePattern.exec(text)) !== null) {
                        removedMatches.push({ start: match.index, end: match.index + match[0].length });
                    }

                    for (let i = 0; i < text.length; i++) {
                        const char = text[i];
                        const inRemovedPattern = removedMatches.some(r => i >= r.start && i < r.end);
                        const isSpace = /\s/.test(char);
                        const isIgnoredChar = inRemovedPattern || isSpace;

                        if (!isIgnoredChar) {
                            if (cleanTextIndex === matchIndex) startPos = i;
                            if (cleanTextIndex >= matchIndex && keywordIndex < keyword.length) {
                                matchedLength++;
                                keywordIndex++;
                            }
                            cleanTextIndex++;
                        } else {
                            if (startPos >= 0 && keywordIndex < keyword.length) matchedLength++;
                        }

                        if (startPos >= 0 && keywordIndex >= keyword.length && !isIgnoredChar) break;
                    }

                    if (startPos >= 0 && matchedLength > 0) {
                        const before = text.slice(0, startPos);
                        const matchStr = text.slice(startPos, startPos + matchedLength);
                        const after = text.slice(startPos + matchedLength);
                        highlightedText = `${before}<mark>${matchStr}</mark>${after}`;
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
                    results.classList.remove('show-border');

                    const rect = target.getBoundingClientRect();
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    window.scrollTo({ top: rect.top + scrollTop - 50, behavior: 'smooth' });

                    const isDarkMode = document.body.classList.contains('dark-mode');
                    if (isDarkMode) {
                        target.style.backgroundColor = '#e7dfff';
                        target.style.color = '#000000';
                    } else {
                        target.style.backgroundColor = '#370089';
                        target.style.color = '#ffffff';
                    }

                    setTimeout(() => {
                        target.style.backgroundColor = '';
                        target.style.color = '';
                    }, 5000);
                });
            }
        });

        results.classList.toggle('show-border', hasResults);
    });
}

function updateSongCount(songs) {
    const jp = songs.filter(s => s.song_type === '일본 커버곡1' || s.song_type === '일본 커버곡2').length;
    const origin = songs.filter(s => s.song_type === '오리지널' || s.song_type === '오리지널 곡').length;
    const kr = songs.filter(s => s.song_type === '한국 커버곡').length;
    const total = jp + origin + kr;

    const el = document.getElementById('song-count-info');
    if (el) el.textContent = `현재 곡 수:${total}곡(일본 커버곡: ${jp}곡, 오리지널 곡: ${origin}곡, 한국 커버 곡 ${kr}곡)`;
}

function scrollToNum() {
    const params = new URLSearchParams(window.location.search);
    const targetNum = params.get('num');
    if (!targetNum) return;

    const btn = document.querySelector(`.lyrics-btn[data-number="${targetNum}"]`);
    if (!btn) return;

    const target = btn.closest('li').querySelector('p');
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    window.scrollTo({ top: rect.top + scrollTop - 80, behavior: 'smooth' });

    const isDarkMode = document.body.classList.contains('dark-mode');
    if (isDarkMode) {
        target.style.backgroundColor = '#e7dfff';
        target.style.color = '#000000';
    } else {
        target.style.backgroundColor = '#370089';
        target.style.color = '#ffffff';
    }
    setTimeout(() => {
        target.style.backgroundColor = '';
        target.style.color = '';
    }, 5000);
}

let lyricsData = {};

function initLyricsButtons() {
    document.querySelectorAll('.lyrics-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const num = btn.dataset.number;
            const content = lyricsData[num] || '가사가 등록되지 않았습니다.';
            const titleText = btn.closest('li').querySelector('p').innerText;
            document.getElementById('modalTitle').innerText = titleText;
            document.getElementById('modalLyrics').innerText = content;
            document.getElementById('lyricsModal').style.display = 'block';
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const [lyricsRes, songsRes] = await Promise.all([
        fetch('lyrics.json'),
        fetch('/api/get-inf?section=karaoke')
    ]);

    lyricsData = await lyricsRes.json();
    const songs = await songsRes.json();

    renderSongs(songs);
    updateSongCount(songs);
    initSearch();
    initLyricsButtons();
    scrollToNum();

    document.getElementById('closeBtn').addEventListener('click', () => {
        document.getElementById('lyricsModal').style.display = 'none';
    });
});
