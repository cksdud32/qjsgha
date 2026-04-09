// 다크 모드 전환 함수
function toggleDarkMode() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    
    const isDark = body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    
    // 사용자가 수동으로 변경했다는 것을 세션에 기록 (시스템 추적 일시 중단 용도)
    sessionStorage.setItem('userChangedTheme', 'true');
}

// 1. 초기 로드 시 설정 적용 (새로 접속 시 기기 설정 우선)
document.addEventListener('DOMContentLoaded', () => {
    const isNavigatingWithinSite = sessionStorage.getItem('sessionStarted');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (!isNavigatingWithinSite) {
        // [새로 진입] 무조건 기기 설정 적용
        applyTheme(systemPrefersDark);
        sessionStorage.setItem('sessionStarted', 'true');
    } else {
        // [페이지 이동] 기존 저장된 설정 유지
        const savedMode = localStorage.getItem('darkMode');
        applyTheme(savedMode === 'enabled');
    }
});

// 2. 사이트 이용 중 시스템 설정이 바뀌면 실시간 반영
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // 사용자가 현재 페이지에서 직접 버튼을 눌러 테마를 바꾸지 않았을 때만 실시간 반응
    if (!sessionStorage.getItem('userChangedTheme')) {
        applyTheme(e.matches);
    }
});

// 테마 적용 공통 함수
function applyTheme(isDark) {
    if (isDark) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'enabled');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'disabled');
    }
}