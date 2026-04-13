async function loadMessages() {
  try {
    const response = await fetch('/api/get-messages');
    const messages = await response.json();

    const listDiv = document.getElementById('message-list');
    listDiv.innerHTML = ''; // 로딩 문구 제거

    if (messages.length === 0) {
      listDiv.innerHTML = '<p>아직 남겨진 메시지가 없어요. 🍒</p>';
      return;
    }

    messages.forEach(msg => {
      const item = document.createElement('div');
      item.className = 'message-item'; // CSS로 꾸미기용
      item.innerHTML = `
        <strong>${msg.name}</strong> 
        <small>${new Date(msg.created_at).toLocaleString()}</small>
        <p>${msg.content}</p>
        <hr>
      `;
      listDiv.appendChild(item);
    });
  } catch (error) {
    console.error('불러오기 실패:', error);
  }
}

// 페이지가 열리면 바로 실행
loadMessages();