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

const pathPrefix = iocation.pathname.includes('/html/')?'../html':'html/';

document.addEventListener('DOMContentLoaded', () => {
    loadHTML('${pathPrefix}link.html', 'link');
    loadHTML('${pathPrefix}Shor.html', 'Shor');
    loadHTML('${pathPrefix}footer.html', 'footer');
});
