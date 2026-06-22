document.addEventListener('DOMContentLoaded', () => {
    fetch('index.json')
        .then(res => res.json())
        .then(data => renderNotices(data, 5))
        .catch(err => console.error(err));

    const overlay = document.querySelector('.popup-overlay');
    if (overlay) overlay.addEventListener('click', closeNoticeModal);

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeNoticeModal();
            closeLinkPopup();
            closeShorPopup();
        }
    });
});

function openLinkPopup() {
    document.getElementById('link-popup').classList.add('active');
    document.getElementById('link-popup-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeLinkPopup() {
    document.getElementById('link-popup').classList.remove('active');
    document.getElementById('link-popup-overlay').classList.remove('active');
    document.body.style.overflow = '';
}

function openShorPopup() {
    document.getElementById('shor-popup').classList.add('active');
    document.getElementById('shor-popup-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeShorPopup() {
    document.getElementById('shor-popup').classList.remove('active');
    document.getElementById('shor-popup-overlay').classList.remove('active');
    document.body.style.overflow = '';
}
