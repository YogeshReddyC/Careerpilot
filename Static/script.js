const MAX_CHARS = 15000;

// Sidebar navigation — swaps which <section> is visible, no page reload.
const SECTION_INFO = {
    home: {
        title: "Resume Fit Analyzer",
        subtitle: "Paste your resume and a job description — get an instant AI fit analysis.",
    },
    history: {
        title: "Your Previous Analyses",
        subtitle: "Come back anytime to revisit your past resume-fit results.",
    },
    about: {
        title: "About",
        subtitle: "What CareerPilot is and how it works.",
    },
    contact: {
        title: "Contact",
        subtitle: "Questions or feedback? Get in touch.",
    },
};

const navItems = document.querySelectorAll(".nav-item");
const sectionTitle = document.getElementById("sectionTitle");
const sectionSubtitle = document.getElementById("sectionSubtitle");
const topHeader = document.querySelector(".top-header");

let currentSection = "home";

// Within the Home section, logged-in users can be looking at either the
// promo/landing view or the analyzer tool — independent of section nav.
let homeView = "promo";

navItems.forEach(item => {
    item.addEventListener("click", () => {
        // Clicking "Home" always returns to the promo page, even mid-analysis —
        // "Get Started" is the way back into the analyzer tool.
        if (item.dataset.section === "home" && isLoggedIn) {
            homeView = "promo";
            renderHomeView();
        }
        if (item.dataset.section === "history") {
            loadHistory();
        }
        showSection(item.dataset.section);
    });
});

function showSection(sectionName) {
    currentSection = sectionName;

    navItems.forEach(item => {
        item.classList.toggle("active", item.dataset.section === sectionName);
    });

    document.querySelectorAll(".content-section").forEach(section => {
        section.classList.toggle("active", section.id === `section-${sectionName}`);
    });

    const info = SECTION_INFO[sectionName];
    sectionTitle.textContent = info.title;
    sectionSubtitle.textContent = info.subtitle;

    updateHeaderVisibility();
}

// The generic page title is redundant on top of the big hero headline,
// so it's hidden only in that one case (Home, promo view).
function updateHeaderVisibility() {
    topHeader.classList.toggle("hidden", currentSection === "home" && homeView === "promo");
}

// --- Login gate ---
// The server is the real gatekeeper (it rejects /api/mock and, later,
// /analyze without a valid session cookie). This code just keeps the UI
// in sync with that: ask the server "am I logged in?", then show/hide
// the right view accordingly.

const heroPromo = document.getElementById("heroPromo");
const analyzerCard = document.getElementById("analyzerCard");
const loginModalOverlay = document.getElementById("loginModalOverlay");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");
const loginSpinner = document.getElementById("loginSpinner");
const loginError = document.getElementById("loginError");
const loginNavBtn = document.getElementById("loginNavBtn");
const historyNavBtn = document.getElementById("historyNavBtn");
const getStartedBtn = document.getElementById("getStartedBtn");
const heroCtaBtn = document.getElementById("heroCtaBtn");
const switchToSignupLink = document.getElementById("switchToSignupLink");

const signupModalOverlay = document.getElementById("signupModalOverlay");
const signupModalCloseBtn = document.getElementById("signupModalCloseBtn");
const signupName = document.getElementById("signupName");
const signupUsername = document.getElementById("signupUsername");
const signupPassword = document.getElementById("signupPassword");
const signupSubmitBtn = document.getElementById("signupSubmitBtn");
const signupSpinner = document.getElementById("signupSpinner");
const signupError = document.getElementById("signupError");
const switchToLoginLink = document.getElementById("switchToLoginLink");

let isLoggedIn = false;

checkSession();

async function checkSession() {
    const response = await fetch("/api/session-status");
    const data = await response.json();
    setAuthUI(data.logged_in);
}

function setAuthUI(loggedIn, jumpToAnalyzer = false) {
    isLoggedIn = loggedIn;
    homeView = loggedIn && jumpToAnalyzer ? "analyzer" : "promo";
    loginNavBtn.textContent = loggedIn ? "Logout" : "Login";
    historyNavBtn.hidden = !loggedIn;
    getStartedBtn.hidden = loggedIn;
    renderHomeView();
}

// Shows either the promo/landing view or the analyzer tool within Home,
// based on homeView — separate from which top-level section is active.
function renderHomeView() {
    heroPromo.hidden = homeView !== "promo";
    analyzerCard.hidden = !(isLoggedIn && homeView === "analyzer");
    updateHeaderVisibility();
}

function openLoginModal() {
    loginError.hidden = true;
    loginModalOverlay.hidden = false;
    loginUsername.focus();
}

function closeLoginModal() {
    loginModalOverlay.hidden = true;
    loginUsername.value = "";
    loginPassword.value = "";
}

modalCloseBtn.addEventListener("click", closeLoginModal);

loginModalOverlay.addEventListener("click", event => {
    if (event.target === loginModalOverlay) {
        closeLoginModal();
    }
});

switchToSignupLink.addEventListener("click", event => {
    event.preventDefault();
    closeLoginModal();
    openSignupModal();
});

loginSubmitBtn.addEventListener("click", handleLogin);

function openSignupModal() {
    signupError.hidden = true;
    signupModalOverlay.hidden = false;
    signupName.focus();
}

function closeSignupModal() {
    signupModalOverlay.hidden = true;
    signupName.value = "";
    signupUsername.value = "";
    signupPassword.value = "";
}

signupModalCloseBtn.addEventListener("click", closeSignupModal);

signupModalOverlay.addEventListener("click", event => {
    if (event.target === signupModalOverlay) {
        closeSignupModal();
    }
});

switchToLoginLink.addEventListener("click", event => {
    event.preventDefault();
    closeSignupModal();
    openLoginModal();
});

signupSubmitBtn.addEventListener("click", handleSignup);

function setButtonLoading(button, spinner, isLoading) {
    button.disabled = isLoading;
    spinner.hidden = !isLoading;
}

async function handleSignup() {
    signupError.hidden = true;
    setButtonLoading(signupSubmitBtn, signupSpinner, true);

    try {
        const response = await fetch("/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: signupName.value,
                username: signupUsername.value,
                password: signupPassword.value,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            signupError.textContent = data.detail || "Signup failed.";
            signupError.hidden = false;
            return;
        }

        // Signup succeeded — hand off to the login modal so they sign in
        // with the credentials they just created (username pre-filled).
        const newUsername = signupUsername.value;
        closeSignupModal();
        loginUsername.value = newUsername;
        openLoginModal();
    } catch (error) {
        console.error(error);
        signupError.textContent = "Something went wrong, please try again.";
        signupError.hidden = false;
    } finally {
        setButtonLoading(signupSubmitBtn, signupSpinner, false);
    }
}

async function handleLogin() {
    loginError.hidden = true;
    setButtonLoading(loginSubmitBtn, loginSpinner, true);

    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: loginUsername.value,
                password: loginPassword.value,
            }),
        });

        if (!response.ok) {
            loginError.textContent = "Invalid username or password.";
            loginError.hidden = false;
            return;
        }

        setAuthUI(true, true);
        closeLoginModal();
    } catch (error) {
        console.error(error);
        loginError.textContent = "Something went wrong, please try again.";
        loginError.hidden = false;
    } finally {
        setButtonLoading(loginSubmitBtn, loginSpinner, false);
    }
}

loginNavBtn.addEventListener("click", async () => {
    if (isLoggedIn) {
        await fetch("/logout", { method: "POST" });
        setAuthUI(false);
        showSection("home");
    } else {
        openLoginModal();
    }
});

// Get Started jumps straight to the analyzer if already logged in,
// otherwise opens signup (new users start here — the navbar "Login"
// button is for people who already have an account).
function handleGetStarted() {
    if (isLoggedIn) {
        homeView = "analyzer";
        renderHomeView();
        showSection("home");
        resumeFileInput.focus();
    } else {
        openSignupModal();
    }
}

getStartedBtn.addEventListener("click", handleGetStarted);
heroCtaBtn.addEventListener("click", handleGetStarted);

const resumeFileInput = document.getElementById("resumeFile");
const fileDrop = document.getElementById("fileDrop");
const fileDropText = document.getElementById("fileDropText");
const jdInput = document.getElementById("jd");
const jdCount = document.getElementById("jdCount");
const analyzeBtn = document.getElementById("analyzeBtn");
const spinner = document.getElementById("spinner");
const errorMessage = document.getElementById("errorMessage");
const resultSection = document.getElementById("result");

const ALLOWED_RESUME_EXTENSIONS = [".pdf", ".docx"];

updateCharCount(jdInput, jdCount);
jdInput.addEventListener("input", () => updateCharCount(jdInput, jdCount));

function updateCharCount(input, counter) {
    const length = input.value.length;
    counter.textContent = `${length.toLocaleString()} / ${MAX_CHARS.toLocaleString()}`;
    counter.classList.toggle("over-limit", length > MAX_CHARS);
}

resumeFileInput.addEventListener("change", () => {
    const file = resumeFileInput.files[0];
    fileDropText.textContent = file ? file.name : "Choose a PDF or DOCX file, or drag it here";
    fileDrop.classList.toggle("has-file", Boolean(file));
});

["dragover", "dragleave", "drop"].forEach(eventName => {
    fileDrop.addEventListener(eventName, event => event.preventDefault());
});

fileDrop.addEventListener("dragover", () => fileDrop.classList.add("drag-active"));
fileDrop.addEventListener("dragleave", () => fileDrop.classList.remove("drag-active"));

fileDrop.addEventListener("drop", event => {
    fileDrop.classList.remove("drag-active");
    const file = event.dataTransfer.files[0];
    if (file) {
        resumeFileInput.files = event.dataTransfer.files;
        resumeFileInput.dispatchEvent(new Event("change"));
    }
});

function hasAllowedExtension(filename) {
    const lower = filename.toLowerCase();
    return ALLOWED_RESUME_EXTENSIONS.some(ext => lower.endsWith(ext));
}

analyzeBtn.addEventListener("click", handleAnalyze);

async function handleAnalyze() {
    const resumeFile = resumeFileInput.files[0];
    const jobDescription = jdInput.value.trim();

    hideError();
    resultSection.hidden = true;

    if (!resumeFile || jobDescription === "") {
        showError("Please upload your resume and fill in the job description.");
        return;
    }

    if (!hasAllowedExtension(resumeFile.name)) {
        showError("Please upload a PDF or DOCX file.");
        return;
    }

    if (jobDescription.length > MAX_CHARS) {
        showError(`Job description is too long — please keep it under ${MAX_CHARS.toLocaleString()} characters.`);
        return;
    }

    setLoading(true);

    try {
        const formData = new FormData();
        formData.append("resume_file", resumeFile);
        formData.append("job_description", jobDescription);

        const response = await fetch("/analyze", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            showError((errorData && errorData.detail) || "Something went wrong, please try again.");
            return;
        }

        const data = await response.json();
        renderResult(data);

    } catch (error) {
        console.error(error);
        showError("Something went wrong, please try again.");
    } finally {
        setLoading(false);
    }
}

function setLoading(isLoading) {
    analyzeBtn.disabled = isLoading;
    spinner.hidden = !isLoading;
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
}

function hideError() {
    errorMessage.hidden = true;
    errorMessage.textContent = "";
}

function renderResult(data) {
    document.getElementById("resultFit").textContent = data.fit || "No assessment returned.";
    renderListOrText("resultStrengths", data.strengths);
    renderListOrText("resultGaps", data.gaps);
    renderListOrText("resultSuggestions", data.suggestions);
    renderScore(data.score, data.matched_keywords, data.missing_keywords);
    resultSection.hidden = false;
}

function renderScore(score, matchedKeywords, missingKeywords) {
    const matched = matchedKeywords || [];
    const missing = missingKeywords || [];
    const safeScore = Number.isFinite(score) ? score : 0;

    document.getElementById("scoreValue").textContent = safeScore;
    document.getElementById("matchedCount").textContent = matched.length;
    document.getElementById("totalKeywordCount").textContent = matched.length + missing.length;

    // Ring is a conic-gradient — filled proportionally to the score, color
    // shifts from warning to success as the score climbs.
    const ringColor = safeScore >= 70 ? "var(--success)" : safeScore >= 40 ? "var(--warning)" : "var(--danger)";
    const ring = document.getElementById("scoreRing");
    ring.style.background = `conic-gradient(${ringColor} ${safeScore * 3.6}deg, var(--border) 0deg)`;

    renderKeywordChips("matchedKeywords", matched, "chip-matched");
    renderKeywordChips("missingKeywords", missing, "chip-missing");
}

function renderKeywordChips(elementId, keywords, chipClass) {
    document.getElementById(elementId).innerHTML = keywordChipsHtml(keywords, chipClass);
}

function keywordChipsHtml(keywords, chipClass) {
    if (!keywords || keywords.length === 0) {
        return `<span class="chip-empty">None</span>`;
    }
    return keywords
        .map(kw => `<span class="chip ${chipClass}">${escapeHtml(kw)}</span>`)
        .join("");
}

function renderListOrText(elementId, value) {
    document.getElementById(elementId).innerHTML = listOrTextHtml(value);
}

function listOrTextHtml(value) {
    if (Array.isArray(value)) {
        return `<ul>${value.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
    }
    return `<p>${escapeHtml(value || "Nothing to show.")}</p>`;
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// --- History ---
// Logged-in users can revisit past analyses. The server is the real gate
// (require_login on /api/history); this just fetches and renders.

const historyList = document.getElementById("historyList");
const historyEmpty = document.getElementById("historyEmpty");

async function loadHistory() {
    if (!isLoggedIn) return;

    historyList.innerHTML = "";
    historyEmpty.hidden = true;

    try {
        const response = await fetch("/api/history");
        if (!response.ok) return;
        const items = await response.json();
        renderHistory(items);
    } catch (error) {
        console.error(error);
    }
}

function renderHistory(items) {
    if (!items || items.length === 0) {
        historyEmpty.hidden = false;
        historyList.innerHTML = "";
        return;
    }

    historyEmpty.hidden = true;
    historyList.innerHTML = items.map(historyItemHtml).join("");

    historyList.querySelectorAll(".history-item-header").forEach(header => {
        header.addEventListener("click", () => {
            const body = header.nextElementSibling;
            body.hidden = !body.hidden;
            header.classList.toggle("expanded", !body.hidden);
        });
    });
}

function historyItemHtml(item) {
    const date = new Date(`${item.created_at}Z`).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });
    const fitClass = (item.fit || "").toLowerCase();
    const jdSnippet = item.job_description.length > 140
        ? `${item.job_description.slice(0, 140)}…`
        : item.job_description;

    return `
        <div class="history-item">
            <button type="button" class="history-item-header">
                <div class="history-item-summary">
                    <span class="history-score-badge fit-${escapeHtml(fitClass)}">${item.score}%</span>
                    <div class="history-item-meta">
                        <div class="history-item-title">${escapeHtml(item.resume_filename)}</div>
                        <div class="history-item-sub">${escapeHtml(date)} &middot; ${escapeHtml(item.fit)} fit</div>
                        <div class="history-item-jd">${escapeHtml(jdSnippet)}</div>
                    </div>
                </div>
                <span class="history-chevron">&#8964;</span>
            </button>
            <div class="history-item-body" hidden>
                <div class="result-card result-matched">
                    <div class="result-icon">&#10003;</div>
                    <div class="result-body">
                        <h3>Matched Keywords</h3>
                        <div class="keyword-chips">${keywordChipsHtml(item.matched_keywords, "chip-matched")}</div>
                    </div>
                </div>
                <div class="result-card result-missing">
                    <div class="result-icon">!</div>
                    <div class="result-body">
                        <h3>Missing Keywords</h3>
                        <div class="keyword-chips">${keywordChipsHtml(item.missing_keywords, "chip-missing")}</div>
                    </div>
                </div>
                <div class="result-card result-strengths">
                    <div class="result-icon">&#10003;</div>
                    <div class="result-body">
                        <h3>Strengths</h3>
                        ${listOrTextHtml(item.strengths)}
                    </div>
                </div>
                <div class="result-card result-gaps">
                    <div class="result-icon">!</div>
                    <div class="result-body">
                        <h3>Gaps</h3>
                        ${listOrTextHtml(item.gaps)}
                    </div>
                </div>
                <div class="result-card result-suggestions">
                    <div class="result-icon">&#8594;</div>
                    <div class="result-body">
                        <h3>Suggestions</h3>
                        ${listOrTextHtml(item.suggestions)}
                    </div>
                </div>
            </div>
        </div>
    `;
}
