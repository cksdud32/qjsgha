document.addEventListener("DOMContentLoaded", () => {
    loadNotices();
    setupModalClose();
});

function loadNotices() {
    fetch("index.json")
        .then(response => {
            if (!response.ok) {
                throw new Error("공지 데이터를 불러오지 못했습니다.");
            }
            return response.json();
        })
        .then(data => renderNotices(data))
        .catch(error => console.error("오류:", error));
}

function renderNotices(notices) {
    const importantArea = document.getElementById("important-area");
    const normalArea = document.getElementById("normal-area");

    importantArea.innerHTML = "";
    normalArea.innerHTML = "";

    notices.sort((a, b) => new Date(b.date) - new Date(a.date));

    const important = notices.filter(n => n.important === true);
    const normal = notices.filter(n => !n.important);

    if (important.length > 0) {
        importantArea.innerHTML += "<h3>중요 공지</h3>";
        important.forEach(n => {
            importantArea.appendChild(createNoticeElement(n, true));
        });
    }

    if (normal.length > 0) {
        normalArea.innerHTML += "<h3>일반 공지</h3>";
        normal.forEach(n => {
            normalArea.appendChild(createNoticeElement(n, false));
        });
    }
}

function createNoticeElement(notice, isImportant) {
    const wrapper = document.createElement("div");
    wrapper.className = isImportant ? "notice-item important" : "notice-item";

    const header = document.createElement("div");
    header.className = "notice-header";
    header.innerHTML = `
        <p class="notice-title">${notice.title}</p>
        <span class="notice-date">${notice.date}</span>
    `;

    const content = document.createElement("div");
    content.className = "notice-content";
    content.innerHTML = `<p>${notice.content || ""}</p>`;
    content.style.display = "none";

    header.addEventListener("click", () => {
        if (notice.useModal) {
            openModal(notice);
        } else {
            document.querySelectorAll(".notice-content").forEach(el => {
                if (el !== content) el.style.display = "none";
            });

            content.style.display =
                content.style.display === "none" ? "block" : "none";
        }
    });

    wrapper.appendChild(header);
    wrapper.appendChild(content);

    return wrapper;
}

function openModal(notice) {
    const modal = document.querySelector(".popup-3");
    const overlay = document.querySelector(".popup-overlay");

    if (!modal || !overlay) return;

    const titleEl = modal.querySelector(".popup-title");
    const dateEl = modal.querySelector(".popup-date");
    const contentEl = modal.querySelector(".popup-content");

    if (!titleEl || !dateEl || !contentEl) {
        console.error("모달 내부 구조가 올바르지 않습니다.");
        return;
    }

    titleEl.textContent = notice.title;
    dateEl.textContent = notice.date;
    contentEl.innerHTML = notice.content || "";

    contentEl.innerHTML = (notice.content || "").replace(/\n/g, "<br>");

    modal.classList.add("active");
    overlay.classList.add("active");

    document.body.style.overflow = "hidden";
}

function closeModal() {
    const modal = document.querySelector(".popup-3");
    const overlay = document.querySelector(".popup-overlay");

    modal.classList.remove("active");
    overlay.classList.remove("active");

    document.body.style.overflow = "";
}

function setupModalClose() {
    const overlay = document.querySelector(".popup-overlay");

    if (overlay) {
        overlay.addEventListener("click", closeModal);
    }

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            closeModal();
        }
    });
}
