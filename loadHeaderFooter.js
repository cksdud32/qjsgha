const isGitHub = location.hostname.includes("github.io");

let basePath = "";

if (isGitHub) {
    const pathParts = location.pathname.split("/");
    const repoName = pathParts[1];
    basePath = repoName ? `/${repoName}` : "";
}

function loadHTML(url, elementId) {
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! 상태 코드: ${response.status}`);
            }
            return response.text();
        })
        .then(data => {
            const container = document.getElementById(elementId);
            container.innerHTML = data;
            fixImagePaths(container);
        })
        .catch(error => console.error(`${elementId} 불러오기 실패:`, error));
}

function fixImagePaths(container) {
    const images = container.querySelectorAll("img");

    images.forEach(img => {
        const originalSrc = img.getAttribute("src");

        if (originalSrc && originalSrc.startsWith("image/")) {
            img.src = `${basePath}/${originalSrc}`;
        }
    });
}

const pathPrefix = location.pathname.includes('/html/')
    ? '../html/'
    : 'html/';

document.addEventListener('DOMContentLoaded', () => {
    loadHTML(`${pathPrefix}link.html`, 'link');
    loadHTML(`${pathPrefix}Shor.html`, 'Shor');
    loadHTML(`${pathPrefix}footer.html`, 'footer');
});
``
