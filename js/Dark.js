// 다크 모드 적용 함수
function applyDarkMode(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
}

// 다크 모드 토글 (버튼 클릭용)
function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');

    // 사용자 선택 저장
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
}

// 초기 설정 적용
function initDarkMode() {
    const savedMode = localStorage.getItem('darkMode');

    // 1순위: 사용자 설정
    if (savedMode === 'enabled') {
        applyDarkMode(true);
    } else if (savedMode === 'disabled') {
        applyDarkMode(false);
    } 
    // 2순위: 시스템 설정
    else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyDarkMode(prefersDark);
    }
}

// 시스템 다크모드 변경 감지
function watchSystemTheme() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    mediaQuery.addEventListener('change', (e) => {
        const savedMode = localStorage.getItem('darkMode');

        // 사용자가 직접 설정한 경우는 시스템 변화 무시
        if (savedMode) return;

        applyDarkMode(e.matches);
    });
}

// 실행
document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();
    watchSystemTheme();
});