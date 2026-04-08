// 다크 모드 전환 함수
function toggleDarkMode() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    
    // 로컬 스토리지에 상태 저장
    const isDark = body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
}

// 페이지 로드 시 저장된 설정 불러오기
document.addEventListener('DOMContentLoaded', () => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'enabled') {
        document.body.classList.add('dark-mode');
    }
});