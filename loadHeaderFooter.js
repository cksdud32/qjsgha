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

            // HTML 삽입 후 이미지 경로 보정 실행
            fixImagePaths(elementId);
        })
        .catch(error => console.error(`${elementId} 불러오기 실패:`, error));
}

// 현재 repository 이름 자동 감지
const repoName = location.pathname.split('/')[1];
const basePath = repoName ? `/${repoName}` : '';

// 이미지 경로 자동 보정 함수
function fixImagePaths(elementId) {
    const container = document.getElementById(elementId);
    const images = container.querySelectorAll("img");

    images.forEach(img => {
        const src = img.getAttribute("src");

        // image 폴더로 시작하는 경우만 보정
        if (src && src.startsWith("image/")) {
            img.src = `${basePath}/${src}`;
        }
    });
}

const pathPrefix = location.pathname.includes('/html/') ? '../html/' : 'html/';

document.addEventListener('DOMContentLoaded', () => {
  loadHTML(`${pathPrefix}link.html`, 'link');
  loadHTML(`${pathPrefix}Shor.html`, 'Shor');
  loadHTML(`${pathPrefix}footer.html`, 'footer');
});
