function getInitials(text) {
    const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
    let result = '';
    for (const char of text) {
        const code = char.charCodeAt(0);
        result += (code >= 0xAC00 && code <= 0xD7A3)
            ? CHO[Math.floor((code - 0xAC00) / 588)]
            : char;
    }
    return result;
}

const TYPE_SELECTOR = {
    '일본 커버곡1': '.jap ul',
    '일본 커버곡2': '.ja ul',
    '오리지널':    '.kso ul',
    '오리지널 곡': '.kso ul',
    '한국 커버곡': '.kor ul'
};

function renderSongs(songs) {
    songs.forEach(song => {
        const ul = document.querySelector(TYPE_SELECTOR[song.song_type]);
        if (!ul) return;

        const li = document.createElement('li');
        const numText = song.number2 ? `${song.number1} / ${song.number2}` : String(song.number1);

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

        for (const [urlKey, labelKey] of [['link_url', 'link_label'], ['link_url2', 'link_label2']]) {
            if (!song[urlKey]) continue;
            const a = document.createElement('a');
            a.href = song[urlKey];
            a.textContent = song[labelKey] || '바로가기';
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            li.appendChild(a);
        }

        ul.appendChild(li);
    });
}

function highlightMatch(text, matchIndex, keyword) {
    const removedPattern = /제목\s*:\s*|번호\s*:\s*/gi;
    const removed = [];
    let m;
    while ((m = removedPattern.exec(text)) !== null) {
        removed.push({ start: m.index, end: m.index + m[0].length });
    }

    let cleanIdx = 0, startPos = -1, matchedLen = 0, kwIdx = 0;

    for (let i = 0; i < text.length; i++) {
        const isIgnored = /\s/.test(text[i]) || removed.some(r => i >= r.start && i < r.end);

        if (!isIgnored) {
            if (cleanIdx === matchIndex) startPos = i;
            if (cleanIdx >= matchIndex && kwIdx < keyword.length) { matchedLen++; kwIdx++; }
            cleanIdx++;
        } else if (startPos >= 0 && kwIdx < keyword.length) {
            matchedLen++;
        }

        if (startPos >= 0 && kwIdx >= keyword.length && !isIgnored) break;
    }

    if (startPos < 0 || matchedLen <= 0) return text;
    return text.slice(0, startPos) + '<mark>' + text.slice(startPos, startPos + matchedLen) + '</mark>' + text.slice(startPos + matchedLen);
}

function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const results = document.getElementById('results');
    const contents = document.querySelectorAll('p:not(.popup3 p):not(.skq p):not(.open-popup3)');

    contents.forEach((el, idx) => { if (!el.id) el.id = 'content-' + idx; });

    let currentCategory = 'all';

    document.querySelectorAll('.song-filter button').forEach(btn => {
        btn.addEventListener('click', () => {
            currentCategory = currentCategory === btn.dataset.type ? 'all' : btn.dataset.type;
            document.querySelectorAll('.song-filter button').forEach(b => b.classList.remove('active'));
            document.querySelector(`.song-filter button[data-type="${currentCategory}"]`)?.classList.add('active');
            searchInput.dispatchEvent(new Event('input'));
        });
    });

    function clearHighlight() {
        contents.forEach(el => { el.style.backgroundColor = ''; el.style.color = ''; });
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

            let matchIndex = -1;
            for (let i = 0; i <= cleanText.length - keyword.length; i++) {
                const matched = [...keyword].every((kChar, j) => kChar === cleanText[i + j] || kChar === initials[i + j]);
                if (matched) { matchIndex = i; break; }
            }

            if (matchIndex < 0) return;

            hasResults = true;
            const li = document.createElement('li');
            li.innerHTML = highlightMatch(text, matchIndex, keyword);
            results.appendChild(li);

            li.addEventListener('click', () => {
                const target = document.getElementById(el.id);
                if (!target) return;

                clearHighlight();
                searchInput.value = '';
                results.innerHTML = '';
                results.classList.remove('show-border');

                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                window.scrollTo({ top: target.getBoundingClientRect().top + scrollTop - 50, behavior: 'smooth' });

                const isDarkMode = document.body.classList.contains('dark-mode');
                target.style.backgroundColor = isDarkMode ? '#e7dfff' : '#370089';
                target.style.color = isDarkMode ? '#000000' : '#ffffff';
                setTimeout(() => { target.style.backgroundColor = ''; target.style.color = ''; }, 5000);
            });
        });

        results.classList.toggle('show-border', hasResults);
    });
}

function updateSongCount(songs) {
    const jp = songs.filter(s => s.song_type === '일본 커버곡1' || s.song_type === '일본 커버곡2').length;
    const origin = songs.filter(s => s.song_type === '오리지널' || s.song_type === '오리지널 곡').length;
    const kr = songs.filter(s => s.song_type === '한국 커버곡').length;
    const el = document.getElementById('song-count-info');
    if (el) el.textContent = `현재 곡 수:${jp + origin + kr}곡(일본 커버곡: ${jp}곡, 오리지널 곡: ${origin}곡, 한국 커버 곡 ${kr}곡)`;
}

function scrollToNum() {
    const targetNum = new URLSearchParams(window.location.search).get('num');
    if (!targetNum) return;

    const btn = document.querySelector(`.lyrics-btn[data-number="${targetNum}"]`);
    const target = btn?.closest('li')?.querySelector('p');
    if (!target) return;

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    window.scrollTo({ top: target.getBoundingClientRect().top + scrollTop - 80, behavior: 'smooth' });

    const isDarkMode = document.body.classList.contains('dark-mode');
    target.style.backgroundColor = isDarkMode ? '#e7dfff' : '#370089';
    target.style.color = isDarkMode ? '#000000' : '#ffffff';
    setTimeout(() => { target.style.backgroundColor = ''; target.style.color = ''; }, 5000);
}

let lyricsData = {};

function initLyricsButtons() {
    document.querySelectorAll('.lyrics-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const content = lyricsData[btn.dataset.number] || '가사가 등록되지 않았습니다.';
            document.getElementById('modalTitle').innerText = btn.closest('li').querySelector('p').innerText;
            document.getElementById('modalLyrics').innerText = content;
            document.getElementById('lyricsModal').style.display = 'block';
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const songsRes = await fetch('/api/get-inf?section=karaoke');
        if (!songsRes.ok) throw new Error(`곡 데이터 로드 실패 (${songsRes.status})`);
        const songs = await songsRes.json();

        renderSongs(songs);
        updateSongCount(songs);
        initSearch();
        initLyricsButtons();
        scrollToNum();

        fetch('lyrics.json')
            .then(r => r.json())
            .then(data => { lyricsData = data; })
            .catch(() => {});
    } catch (e) {
        console.error(e);
        document.querySelectorAll('.jap ul, .ja ul, .kso ul, .kor ul').forEach(ul => {
            const li = document.createElement('li');
            li.textContent = '곡 목록을 불러오지 못했습니다. 잠시 후 새로고침 해주세요.';
            li.style.color = 'tomato';
            ul.appendChild(li);
        });
    }

    document.getElementById('closeBtn').addEventListener('click', () => {
        document.getElementById('lyricsModal').style.display = 'none';
    });
});
