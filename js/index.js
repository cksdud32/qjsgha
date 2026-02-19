document.addEventListener("DOMContentLoaded", () => {
    loadNotices();
    setupModalClose();
});

function loadNotices() {
    fetch("index.json")
        .then(res => res.json())
        .then(data => renderNotices(data))
        .catch(err => console.error(err));
}

function renderNotices(notices) {
    const importantArea = document.getElementById("important-area");
    const normalArea = document.getElementById("normal-area");

    importantArea.innerHTML = "";
    normalArea.innerHTML = "";

    // 최신순 정렬
    notices.sort((a, b) => new Date(b.date) - new Date(a.date));

    const important = notices.filter(n => n.important === true);
    const normal = notices.filter(n => !n.important);

    // 중요 공지 (전체 표시)
    if (important.length > 0) {
        importantArea.innerHTML += "<h3>중요 공지</h3>";
        important.forEach(n => {
            importantArea.appendChild(createNoticeElement(n, true));
        });
    }

    // 일반 공지 (최신 5개만)
    if (normal.length > 0) {
        normalArea.innerHTML += "<h3>일반 공지</h3>";
        const latestFive = normal.slice(0, 5);
        latestFive.forEach(n => {
            normalArea.appendChild(createNoticeElement(n, false));
        });

        // 전체 공지 보기 버튼
        const btn = document.createElement("button");
        btn.textContent = "전체 공지 보기";
        btn.className = "notice-more-btn";
        btn.addEventListener("click", () => {
            window.location.href = "/html/inw.html";
        });
        normalArea.appendChild(btn);
    }
}

// URL을 <a> 링크로 변환
function linkify(text) {
    if (!text) return "";
    const urlRegex = /(https?:\/\/[^\s<]+)/g; // < 포함하지 않도록 수정
    return text.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
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
    // 줄바꿈 먼저 <br>로 변환 후 linkify 적용
    content.innerHTML = `<p>${linkify((notice.content || "").replace(/\n/g, "<br>"))}</p>`;
    content.style.display = "none";

    header.addEventListener("click", () => {
        if (notice.useModal) {
            openModal(notice);
        } else {
            document.querySelectorAll(".notice-content").forEach(el => {
                if (el !== content) el.style.display = "none";
            });
            content.style.display = content.style.display === "none" ? "block" : "none";
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

    // 줄바꿈 먼저 적용 후 링크 변환
    contentEl.innerHTML = linkify((notice.content || "").replace(/\n/g, "<br>"));

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
