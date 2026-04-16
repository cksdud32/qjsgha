const loginForm = document.getElementById('adminLoginForm');
const loginStatus = document.getElementById('loginStatus');

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('adminId')?.value.trim();
    const password = document.getElementById('adminPassword')?.value;

    if (!username || !password) {
      loginStatus.textContent = '아이디와 비밀번호를 모두 입력해주세요.';
      loginStatus.className = 'login-status error';
      return;
    }

    loginStatus.textContent = '로그인 중입니다...';
    loginStatus.className = 'login-status';

    try {
      const response = await fetch('/api/admin-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();

      if (!response.ok) {
        loginStatus.textContent = result.error || '로그인에 실패했습니다.';
        loginStatus.className = 'login-status error';
        return;
      }

      loginStatus.textContent = result.message || '로그인 성공!';
      loginStatus.className = 'login-status success';

      // 1초 후 관리자 패널로 이동
      setTimeout(() => {
        location.href = 'Manager.html';
      }, 1000);
    } catch (error) {
      loginStatus.textContent = '서버에 연결할 수 없습니다. 다시 시도해주세요.';
      loginStatus.className = 'login-status error';
      console.error('admin login fetch error:', error);
    }
  });
}
