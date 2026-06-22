document.addEventListener('DOMContentLoaded', () => {
    fetch('../index.json')
        .then(res => {
            if (!res.ok) throw new Error('공지 데이터를 불러오지 못했습니다.');
            return res.json();
        })
        .then(data => renderNotices(data))
        .catch(error => console.error('오류:', error));

    const overlay = document.querySelector('.popup-overlay');
    if (overlay) overlay.addEventListener('click', closeNoticeModal);

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeNoticeModal();
    });
});
