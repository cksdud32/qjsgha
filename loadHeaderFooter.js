function loadHTML(url, elementId) {
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! 상태 코드: ${response.status}`);
            }
            return response.text();
        })
        .then(data => {
            document.getElementById(elementId).innerHTML = data;
        })
        .catch(error => console.error(`${elementId} 불러오기 실패:`, error));
}

document.addEventListener('DOMContentLoaded', () => {
    loadHTML('link.html', 'link');
    loadHTML('Shor.html', 'Shor');
    loadHTML('footer.html', 'footer');
});
