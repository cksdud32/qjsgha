const scriptRoot = (() => {
    if (document.currentScript?.src) {
        return new URL("./", document.currentScript.src);
    }

    return new URL("./", location.href);
})();

function ensureFloatingContainer(elementId) {
    let container = document.getElementById(elementId);

    if (container) {
        return container;
    }

    container = document.createElement("div");
    container.id = elementId;

    if (elementId === "link") {
        document.body.prepend(container);
        return container;
    }

    const linkContainer = document.getElementById("link");

    if (linkContainer) {
        linkContainer.insertAdjacentElement("afterend", container);
    } else {
        document.body.prepend(container);
    }

    return container;
}

function rewriteFragmentPaths(container, sourceUrl) {
    const relativeHrefPattern = /^(?![a-z]+:|\/\/|#|javascript:|mailto:|tel:).+/i;

    container.querySelectorAll("a[href]").forEach(anchor => {
        const href = anchor.getAttribute("href");

        if (href && relativeHrefPattern.test(href)) {
            anchor.href = new URL(href, sourceUrl).href;
        }
    });

    container.querySelectorAll("img[src]").forEach(image => {
        const src = image.getAttribute("src");

        if (!src || /^(?:[a-z]+:|\/\/|data:)/i.test(src)) {
            return;
        }

        const baseUrl = src.startsWith("image/") ? scriptRoot : sourceUrl;
        image.src = new URL(src, baseUrl).href;
    });
}

function loadHTML(url, elementId) {
    const container = document.getElementById(elementId);

    if (!container) {
        return;
    }

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status code: ${response.status}`);
            }

            return response.text();
        })
        .then(data => {
            container.innerHTML = data;
            rewriteFragmentPaths(container, url);
        })
        .catch(error => console.error(`${elementId} load failed:`, error));
}

document.addEventListener("DOMContentLoaded", () => {

    loadHTML(new URL("html/list/link.html", scriptRoot), "link");
    loadHTML(new URL("html/list/Shor.html", scriptRoot), "Shor");
    loadHTML(new URL("html/list/footer.html", scriptRoot), "footer");
});
