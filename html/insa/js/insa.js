// 비밀번호 해시
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/* 로그인 창에 F12 → Console 이후 복붙
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

sha256('비밀번호');
 */

// 관리자 로그인 함수
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const idInput = document.getElementById('username');
  const pwInput = document.getElementById('password');

  const admins = {
    "cksdud32": "614ec5208959c8ddd7a4267c36dbdaec90820694a94d9c6c50a3c4feebed9dbf",
    "chebyeol": "e64efd1b097ac2594f2d5112c63721da2e0f76f29aad40e7812cfe4ac2990b6f",
    "yeonho_831": "7144f9a06da927210350112d46191f381dd5a511a3367d28b6b7df8d91627e12"
  };

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = idInput.value.trim();
    const pw = pwInput.value;

    if (!id || !pw) {
      alert('아이디와 비밀번호를 입력하세요.');
      return;
    }

    const hashedPw = await sha256(pw);

    if (admins[id] && admins[id] === hashedPw) {
      alert('로그인 성공');
      location.href = 'insb.html';
    } else {
      alert('아이디 또는 비밀번호가 올바르지 않습니다.');

      // 입력값 초기화
      idInput.value = '';
      pwInput.value = '';
      idInput.focus();
    }
  });
});