const SONG_TYPE_ORDER = { '오리지널': 0, '한국 커버곡': 1, '일본 커버곡1': 2, '일본 커버곡2': 3 };

const CHOSUNG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const CHOSUNG_GROUP1 = new Set(['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ']);

function firstConsonant(text) {
  for (const ch of text) {
    if (/\d/.test(ch)) return 'digit';
    if (/[A-Za-z]/.test(ch)) return 'alpha';
    const code = ch.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) {
      return CHOSUNG[Math.floor((code - 0xAC00) / 28 / 21)];
    }
  }
  return '';
}

function classifyJapaneseCover(trackTitle) {
  const first = firstConsonant(trackTitle);
  if (first === 'digit' || first === 'alpha' || CHOSUNG_GROUP1.has(first)) return '일본 커버곡1';
  return '일본 커버곡2';
}

function determineSongType(trackTitle, natType, isCover) {
  if (!isCover) return '오리지널';
  if (natType === 1) return '한국 커버곡';
  return classifyJapaneseCover(trackTitle);
}

function titleSortKey(title) {
  const ch = (title || '')[0] || '';
  if (/\d/.test(ch)) return '0_' + title;
  if (/[A-Za-z]/.test(ch)) return '1_' + ch.toLowerCase() + '_' + title.toLowerCase();
  const code = ch.charCodeAt(0);
  if (code >= 0xAC00 && code <= 0xD7A3)
    return '2_' + String(Math.floor((code - 0xAC00) / 28 / 21)).padStart(2, '0') + '_' + title;
  return '3_' + title;
}

function sortSongs(songs) {
  return songs.slice().sort((a, b) => {
    const tA = SONG_TYPE_ORDER[a.song_type] ?? 99;
    const tB = SONG_TYPE_ORDER[b.song_type] ?? 99;
    if (tA !== tB) return tA - tB;
    return titleSortKey(a.song_title).localeCompare(titleSortKey(b.song_title), 'ko');
  });
}

export { SONG_TYPE_ORDER, titleSortKey, sortSongs, determineSongType, classifyJapaneseCover };
