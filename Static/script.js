const MAX_CHARS = 15000;

// Sidebar navigation — swaps which <section> is visible, no page reload.
const SECTION_INFO = {
    home: {
        title: "Resume Fit Analyzer",
        subtitle: "Paste your resume and a job description — get an instant AI fit analysis.",
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
const loginError = document.getElementById("loginError");
const loginNavBtn = document.getElementById("loginNavBtn");
const getStartedBtn = document.getElementById("getStartedBtn");
const heroCtaBtn = document.getElementById("heroCtaBtn");
const switchToSignupLink = document.getElementById("switchToSignupLink");

const signupModalOverlay = document.getElementById("signupModalOverlay");
const signupModalCloseBtn = document.getElementById("signupModalCloseBtn");
const signupName = document.getElementById("signupName");
const signupUsername = document.getElementById("signupUsername");
const signupPassword = document.getElementById("signupPassword");
const signupSubmitBtn = document.getElementById("signupSubmitBtn");
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

async function handleSignup() {
    signupError.hidden = true;

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
}

async function handleLogin() {
    loginError.hidden = true;

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
        resumeInput.focus();
    } else {
        openSignupModal();
    }
}

getStartedBtn.addEventListener("click", handleGetStarted);
heroCtaBtn.addEventListener("click", handleGetStarted);

const resumeInput = document.getElementById("resume");
const jdInput = document.getElementById("jd");
const resumeCount = document.getElementById("resumeCount");
const jdCount = document.getElementById("jdCount");
const analyzeBtn = document.getElementById("analyzeBtn");
const spinner = document.getElementById("spinner");
const errorMessage = document.getElementById("errorMessage");
const resultSection = document.getElementById("result");

updateCharCount(resumeInput, resumeCount);
updateCharCount(jdInput, jdCount);
resumeInput.addEventListener("input", () => updateCharCount(resumeInput, resumeCount));
jdInput.addEventListener("input", () => updateCharCount(jdInput, jdCount));

function updateCharCount(input, counter) {
    const length = input.value.length;
    counter.textContent = `${length.toLocaleString()} / ${MAX_CHARS.toLocaleString()}`;
    counter.classList.toggle("over-limit", length > MAX_CHARS);
}

analyzeBtn.addEventListener("click", handleAnalyze);

async function handleAnalyze() {
    const resume = resumeInput.value.trim();
    const jobDescription = jdInput.value.trim();

    hideError();
    resultSection.hidden = true;

    if (resume === "" || jobDescription === "") {
        showError("Please fill in both the resume and job description.");
        return;
    }

    if (resume.length > MAX_CHARS || jobDescription.length > MAX_CHARS) {
        showError(`Text is too long — please keep each field under ${MAX_CHARS.toLocaleString()} characters.`);
        return;
    }

    setLoading(true);

    try {
        const response = await fetch("/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                resume: resume,
                job_description: jobDescription,
            }),
        });

        if (!response.ok) {
            throw new Error("Request failed");
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
    const container = document.getElementById(elementId);

    if (keywords.length === 0) {
        container.innerHTML = `<span class="chip-empty">None</span>`;
        return;
    }

    container.innerHTML = keywords
        .map(kw => `<span class="chip ${chipClass}">${escapeHtml(kw)}</span>`)
        .join("");
}

function renderListOrText(elementId, value) {
    const container = document.getElementById(elementId);

    if (Array.isArray(value)) {
        const items = value.map(item => `<li>${escapeHtml(item)}</li>`).join("");
        container.innerHTML = `<ul>${items}</ul>`;
    } else {
        container.innerHTML = `<p>${escapeHtml(value || "Nothing to show.")}</p>`;
    }
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
