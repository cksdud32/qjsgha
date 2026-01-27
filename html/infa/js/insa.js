// 비밀번호 해시
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// 관리자 로그인 함수
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('username').value;
    const pw = document.getElementById('password').value;

    const hashedPw = await sha256(pw);

    const adminId = 'cksdud32';
    const adminPwHash = '614ec5208959c8ddd7a4267c36dbdaec90820694a94d9c6c50a3c4feebed9dbf';

    if (id === adminId && hashedPw === adminPwHash) {
      alert('로그인 성공');
      location.href = 'infb.html';
    } else {
      alert('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  });
});