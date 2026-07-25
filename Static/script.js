const MAX_CHARS = 15000;

// Render's free tier sleeps after ~15min idle; the first request after that
// can take 30+ seconds to wake up, and a Cloudflare gateway timeout during
// that window returns an HTML error page instead of JSON. This retries once
// after a short wait so a cold start doesn't look like a login/signup failure.
async function postJSONWithRetry(url, body, statusEl) {
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await response.json();
            return { response, data };
        } catch (error) {
            if (attempt === 1) {
                throw error;
            }
            if (statusEl) {
                statusEl.textContent = "Server is waking up, retrying…";
                statusEl.hidden = false;
            }
            await new Promise(resolve => setTimeout(resolve, 4000));
        }
    }
}

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
const analyzerShell = document.getElementById("analyzerShell");
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

const forgotPasswordLink = document.getElementById("forgotPasswordLink");
const forgotModalOverlay = document.getElementById("forgotModalOverlay");
const forgotModalCloseBtn = document.getElementById("forgotModalCloseBtn");
const forgotStep1 = document.getElementById("forgotStep1");
const forgotStep2 = document.getElementById("forgotStep2");
const forgotEmail = document.getElementById("forgotEmail");
const forgotEmailDisplay = document.getElementById("forgotEmailDisplay");
const sendOtpBtn = document.getElementById("sendOtpBtn");
const sendOtpSpinner = document.getElementById("sendOtpSpinner");
const forgotError = document.getElementById("forgotError");
const resetOtp = document.getElementById("resetOtp");
const resetNewPassword = document.getElementById("resetNewPassword");
const resetPasswordBtn = document.getElementById("resetPasswordBtn");
const resetPasswordSpinner = document.getElementById("resetPasswordSpinner");
const resetError = document.getElementById("resetError");
const resendOtpLink = document.getElementById("resendOtpLink");

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
    loginNavBtn.classList.toggle("is-logout", loggedIn);
    historyNavBtn.hidden = !loggedIn;
    getStartedBtn.hidden = loggedIn;
    renderHomeView();
}

// Shows either the promo/landing view or the analyzer tool within Home,
// based on homeView — separate from which top-level section is active.
function renderHomeView() {
    heroPromo.hidden = homeView !== "promo";
    analyzerCard.hidden = !(isLoggedIn && homeView === "analyzer");
    analyzerShell.hidden = analyzerCard.hidden;
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

// --- Forgot password (email OTP) ---

forgotPasswordLink.addEventListener("click", event => {
    event.preventDefault();
    closeLoginModal();
    openForgotModal();
});

function openForgotModal() {
    forgotError.hidden = true;
    resetError.hidden = true;
    forgotStep1.hidden = false;
    forgotStep2.hidden = true;
    forgotEmail.value = loginUsername.value || "";
    forgotModalOverlay.hidden = false;
    forgotEmail.focus();
}

function closeForgotModal() {
    forgotModalOverlay.hidden = true;
    forgotEmail.value = "";
    resetOtp.value = "";
    resetNewPassword.value = "";
}

forgotModalCloseBtn.addEventListener("click", closeForgotModal);

forgotModalOverlay.addEventListener("click", event => {
    if (event.target === forgotModalOverlay) {
        closeForgotModal();
    }
});

sendOtpBtn.addEventListener("click", handleSendOtp);
resendOtpLink.addEventListener("click", event => {
    event.preventDefault();
    handleSendOtp();
});

async function handleSendOtp() {
    forgotError.hidden = true;
    const email = forgotEmail.value.trim();

    if (!email) {
        forgotError.textContent = "Please enter your email.";
        forgotError.hidden = false;
        return;
    }

    setButtonLoading(sendOtpBtn, sendOtpSpinner, true);

    try {
        const response = await fetch("/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: email }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            forgotError.textContent = (data && data.detail) || "Something went wrong, please try again.";
            forgotError.hidden = false;
            return;
        }

        forgotEmailDisplay.textContent = email;
        resetError.hidden = true;
        forgotStep1.hidden = true;
        forgotStep2.hidden = false;
        resetOtp.focus();
    } catch (error) {
        console.error(error);
        forgotError.textContent = "Something went wrong, please try again.";
        forgotError.hidden = false;
    } finally {
        setButtonLoading(sendOtpBtn, sendOtpSpinner, false);
    }
}

resetPasswordBtn.addEventListener("click", handleResetPassword);

async function handleResetPassword() {
    resetError.hidden = true;
    const otp = resetOtp.value.trim();
    const newPassword = resetNewPassword.value;

    if (!otp || !newPassword) {
        resetError.textContent = "Please enter the code and a new password.";
        resetError.hidden = false;
        return;
    }

    setButtonLoading(resetPasswordBtn, resetPasswordSpinner, true);

    try {
        const response = await fetch("/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: forgotEmailDisplay.textContent,
                otp,
                new_password: newPassword,
            }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            resetError.textContent = (data && data.detail) || "Something went wrong, please try again.";
            resetError.hidden = false;
            return;
        }

        // Reset succeeded — hand off to the login modal, same pattern as
        // signup, so they log in fresh with the password they just set.
        const resetEmail = forgotEmailDisplay.textContent;
        closeForgotModal();
        loginUsername.value = resetEmail;
        openLoginModal();
    } catch (error) {
        console.error(error);
        resetError.textContent = "Something went wrong, please try again.";
        resetError.hidden = false;
    } finally {
        setButtonLoading(resetPasswordBtn, resetPasswordSpinner, false);
    }
}

async function handleSignup() {
    signupError.hidden = true;
    setButtonLoading(signupSubmitBtn, signupSpinner, true);

    try {
        const { response, data } = await postJSONWithRetry("/signup", {
            name: signupName.value,
            username: signupUsername.value,
            password: signupPassword.value,
        }, signupError);

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
        const { response } = await postJSONWithRetry("/login", {
            username: loginUsername.value,
            password: loginPassword.value,
        }, loginError);

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
const companyRail = document.getElementById("companyRail");

const postAnalysisActions = document.getElementById("postAnalysisActions");
const postAnalysisError = document.getElementById("postAnalysisError");
const tailorResumeBtn = document.getElementById("tailorResumeBtn");
const tailorResumeSpinner = document.getElementById("tailorResumeSpinner");
const tailorResumeOutput = document.getElementById("tailorResumeOutput");
const tailorResumeText = document.getElementById("tailorResumeText");
const copyTailorResumeBtn = document.getElementById("copyTailorResumeBtn");
const coverLetterBtn = document.getElementById("coverLetterBtn");
const coverLetterSpinner = document.getElementById("coverLetterSpinner");
const coverLetterOutput = document.getElementById("coverLetterOutput");
const coverLetterText = document.getElementById("coverLetterText");
const copyCoverLetterBtn = document.getElementById("copyCoverLetterBtn");
const atsCheckBtn = document.getElementById("atsCheckBtn");
const atsCheckSpinner = document.getElementById("atsCheckSpinner");
const atsCheckOutput = document.getElementById("atsCheckOutput");
const atsIssuesList = document.getElementById("atsIssuesList");
const atsPassedList = document.getElementById("atsPassedList");

const batchModeToggle = document.getElementById("batchModeToggle");
const singleModeToggle = document.getElementById("singleModeToggle");
const batchJdSection = document.getElementById("batchJdSection");
const batchJdList = document.getElementById("batchJdList");
const addJdBtn = document.getElementById("addJdBtn");
const batchResults = document.getElementById("batchResults");
const batchResultsList = document.getElementById("batchResultsList");
const MAX_BATCH_JOBS = 10;
let isBatchMode = false;

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
    if (isBatchMode) {
        await handleBatchAnalyze();
    } else {
        await handleSingleAnalyze();
    }
}

async function handleSingleAnalyze() {
    const resumeFile = resumeFileInput.files[0];
    const jobDescription = jdInput.value.trim();

    hideError();
    resultSection.hidden = true;
    postAnalysisActions.hidden = true;
    companyRail.hidden = false;
    hideOutputPanels();

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
        postAnalysisActions.hidden = false;
        companyRail.hidden = true;

    } catch (error) {
        console.error(error);
        showError("Something went wrong, please try again.");
    } finally {
        setLoading(false);
    }
}

// --- Batch mode: same resume against multiple job descriptions ---

batchModeToggle.addEventListener("click", () => setBatchMode(true));
singleModeToggle.addEventListener("click", () => setBatchMode(false));

function setBatchMode(enabled) {
    isBatchMode = enabled;
    jdInput.hidden = enabled;
    jdCount.hidden = enabled;
    batchModeToggle.hidden = enabled;
    batchJdSection.hidden = !enabled;

    hideError();
    resultSection.hidden = true;
    postAnalysisActions.hidden = true;
    companyRail.hidden = false;
    hideOutputPanels();
    batchResults.hidden = true;
}

addJdBtn.addEventListener("click", () => {
    const currentCount = batchJdList.querySelectorAll(".batch-jd-item").length;
    if (currentCount >= MAX_BATCH_JOBS) return;

    const item = document.createElement("div");
    item.className = "batch-jd-item";
    item.innerHTML = `
        <textarea class="batch-jd-textarea" rows="6" placeholder="Paste job description #${currentCount + 1}..."></textarea>
        <button type="button" class="btn-remove-jd" aria-label="Remove this job description">&times;</button>
    `;
    batchJdList.appendChild(item);
    updateRemoveJdButtonsVisibility();
});

batchJdList.addEventListener("click", event => {
    if (event.target.classList.contains("btn-remove-jd")) {
        event.target.closest(".batch-jd-item").remove();
        updateRemoveJdButtonsVisibility();
    }
});

function updateRemoveJdButtonsVisibility() {
    const items = batchJdList.querySelectorAll(".batch-jd-item");
    items.forEach(item => {
        item.querySelector(".btn-remove-jd").hidden = items.length <= 1;
    });
}

async function handleBatchAnalyze() {
    const resumeFile = resumeFileInput.files[0];
    const jobDescriptions = Array.from(batchJdList.querySelectorAll(".batch-jd-textarea"))
        .map(textarea => textarea.value.trim())
        .filter(Boolean);

    hideError();
    batchResults.hidden = true;
    companyRail.hidden = false;

    if (!resumeFile) {
        showError("Please upload your resume.");
        return;
    }
    if (!hasAllowedExtension(resumeFile.name)) {
        showError("Please upload a PDF or DOCX file.");
        return;
    }
    if (jobDescriptions.length === 0) {
        showError("Please paste at least one job description.");
        return;
    }
    if (jobDescriptions.some(jd => jd.length > MAX_CHARS)) {
        showError(`Each job description must be under ${MAX_CHARS.toLocaleString()} characters.`);
        return;
    }

    setLoading(true);

    try {
        const formData = new FormData();
        formData.append("resume_file", resumeFile);
        formData.append("job_descriptions", JSON.stringify(jobDescriptions));

        const response = await fetch("/analyze-batch", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            showError((errorData && errorData.detail) || "Something went wrong, please try again.");
            return;
        }

        const data = await response.json();
        renderBatchResults(data.results);

    } catch (error) {
        console.error(error);
        showError("Something went wrong, please try again.");
    } finally {
        setLoading(false);
    }
}

function renderBatchResults(results) {
    batchResultsList.innerHTML = results.map(batchResultItemHtml).join("");
    batchResults.hidden = false;
    companyRail.hidden = true;

    batchResultsList.querySelectorAll(".batch-result-header").forEach(header => {
        header.addEventListener("click", () => {
            const body = header.nextElementSibling;
            body.hidden = !body.hidden;
            header.classList.toggle("expanded", !body.hidden);
        });
    });
}

function batchResultItemHtml(item, index) {
    const fitClass = (item.fit || "").toLowerCase();
    return `
        <div class="batch-result-item">
            <button type="button" class="batch-result-header">
                <span class="batch-result-rank">#${index + 1}</span>
                <span class="history-score-badge fit-${escapeHtml(fitClass)}">${item.score}%</span>
                <span class="batch-result-jd-preview">${escapeHtml(item.job_description_preview)}&hellip;</span>
                <span class="history-chevron">&#8964;</span>
            </button>
            <div class="batch-result-body" hidden>
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

// --- Post-analysis actions: tailored resume, cover letter, ATS check ---
// Each reuses the same resume file + job description already in the form.

tailorResumeBtn.addEventListener("click", handleTailorResume);
coverLetterBtn.addEventListener("click", handleCoverLetter);
atsCheckBtn.addEventListener("click", handleAtsCheck);
copyTailorResumeBtn.addEventListener("click", () => copyToClipboard(tailorResumeText.textContent, copyTailorResumeBtn));
copyCoverLetterBtn.addEventListener("click", () => copyToClipboard(coverLetterText.textContent, copyCoverLetterBtn));

function hideOutputPanels() {
    tailorResumeOutput.hidden = true;
    coverLetterOutput.hidden = true;
    atsCheckOutput.hidden = true;
    postAnalysisError.hidden = true;
}

async function handleTailorResume() {
    const resumeFile = resumeFileInput.files[0];
    const jobDescription = jdInput.value.trim();
    if (!resumeFile || !jobDescription) return;

    postAnalysisError.hidden = true;
    setButtonLoading(tailorResumeBtn, tailorResumeSpinner, true);

    try {
        const formData = new FormData();
        formData.append("resume_file", resumeFile);
        formData.append("job_description", jobDescription);

        const response = await fetch("/tailor-resume", { method: "POST", body: formData });
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            showPostAnalysisError((errorData && errorData.detail) || "Something went wrong, please try again.");
            return;
        }

        const data = await response.json();
        tailorResumeText.textContent = data.tailored_resume;
        tailorResumeOutput.hidden = false;
    } catch (error) {
        console.error(error);
        showPostAnalysisError("Something went wrong, please try again.");
    } finally {
        setButtonLoading(tailorResumeBtn, tailorResumeSpinner, false);
    }
}

async function handleCoverLetter() {
    const resumeFile = resumeFileInput.files[0];
    const jobDescription = jdInput.value.trim();
    if (!resumeFile || !jobDescription) return;

    postAnalysisError.hidden = true;
    setButtonLoading(coverLetterBtn, coverLetterSpinner, true);

    try {
        const formData = new FormData();
        formData.append("resume_file", resumeFile);
        formData.append("job_description", jobDescription);

        const response = await fetch("/generate-cover-letter", { method: "POST", body: formData });
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            showPostAnalysisError((errorData && errorData.detail) || "Something went wrong, please try again.");
            return;
        }

        const data = await response.json();
        coverLetterText.textContent = data.cover_letter;
        coverLetterOutput.hidden = false;
    } catch (error) {
        console.error(error);
        showPostAnalysisError("Something went wrong, please try again.");
    } finally {
        setButtonLoading(coverLetterBtn, coverLetterSpinner, false);
    }
}

async function handleAtsCheck() {
    const resumeFile = resumeFileInput.files[0];
    if (!resumeFile) return;

    postAnalysisError.hidden = true;
    setButtonLoading(atsCheckBtn, atsCheckSpinner, true);

    try {
        const formData = new FormData();
        formData.append("resume_file", resumeFile);

        const response = await fetch("/check-ats", { method: "POST", body: formData });
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            showPostAnalysisError((errorData && errorData.detail) || "Something went wrong, please try again.");
            return;
        }

        const data = await response.json();
        atsIssuesList.innerHTML = ulItemsHtml(data.issues, "No issues found.");
        atsPassedList.innerHTML = ulItemsHtml(data.passed, "Nothing to show.");
        atsCheckOutput.hidden = false;
    } catch (error) {
        console.error(error);
        showPostAnalysisError("Something went wrong, please try again.");
    } finally {
        setButtonLoading(atsCheckBtn, atsCheckSpinner, false);
    }
}

function ulItemsHtml(items, emptyText) {
    if (!items || items.length === 0) {
        return `<li class="chip-empty">${escapeHtml(emptyText)}</li>`;
    }
    return items.map(item => `<li>${escapeHtml(item)}</li>`).join("");
}

function showPostAnalysisError(message) {
    postAnalysisError.textContent = message;
    postAnalysisError.hidden = false;
}

function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const original = button.textContent;
        button.textContent = "Copied!";
        setTimeout(() => { button.textContent = original; }, 1500);
    });
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
    // Missing keywords carry a placement tip: {keyword, tip}. Matched
    // keywords (and older history rows saved before tips existed) are
    // plain strings — handle both.
    return keywords
        .map(kw => {
            const isTipped = kw && typeof kw === "object";
            const text = isTipped ? kw.keyword : kw;
            const tip = isTipped ? kw.tip : "";
            const titleAttr = tip ? ` title="${escapeHtml(tip)}"` : "";
            return `<span class="chip ${chipClass}"${titleAttr}>${escapeHtml(text)}</span>`;
        })
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
const trendsCard = document.getElementById("trendsCard");
const trendAverageScore = document.getElementById("trendAverageScore");
const trendSparkline = document.getElementById("trendSparkline");
const trendMissingWrap = document.getElementById("trendMissingWrap");
const trendMissingList = document.getElementById("trendMissingList");

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

    try {
        const trendsResponse = await fetch("/api/history/trends");
        if (!trendsResponse.ok) return;
        const trends = await trendsResponse.json();
        renderTrends(trends);
    } catch (error) {
        console.error(error);
    }
}

function renderTrends(trends) {
    if (!trends || trends.average_score === null || trends.average_score === undefined) {
        trendsCard.hidden = true;
        return;
    }

    trendsCard.hidden = false;
    trendAverageScore.textContent = `${trends.average_score}%`;
    renderSparkline(trends.score_trend || []);

    const topMissing = trends.top_missing_keywords || [];
    if (topMissing.length === 0) {
        trendMissingWrap.hidden = true;
    } else {
        trendMissingWrap.hidden = false;
        const maxCount = Math.max(...topMissing.map(entry => entry.count));
        trendMissingList.innerHTML = topMissing
            .map(entry => `
                <div class="trend-missing-row">
                    <span class="trend-missing-label">${escapeHtml(entry.keyword)}</span>
                    <div class="trend-missing-bar-track">
                        <div class="trend-missing-bar" style="width:${(entry.count / maxCount) * 100}%"></div>
                    </div>
                    <span class="trend-missing-count">${entry.count}</span>
                </div>
            `)
            .join("");
    }
}

function renderSparkline(points) {
    const svgNs = "http://www.w3.org/2000/svg";
    trendSparkline.innerHTML = "";

    if (points.length === 0) return;

    const width = 320;
    const height = 64;
    const padding = 6;
    const scores = points.map(point => point.score);
    const minScore = Math.min(...scores, 0);
    const maxScore = Math.max(...scores, 100);
    const range = maxScore - minScore || 1;

    const xFor = index => points.length === 1
        ? width / 2
        : padding + (index / (points.length - 1)) * (width - padding * 2);
    const yFor = score => height - padding - ((score - minScore) / range) * (height - padding * 2);

    const coords = points.map((point, index) => [xFor(index), yFor(point.score)]);

    const path = document.createElementNS(svgNs, "polyline");
    path.setAttribute("points", coords.map(([x, y]) => `${x},${y}`).join(" "));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "var(--accent)");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    trendSparkline.appendChild(path);

    points.forEach((point, index) => {
        const [x, y] = coords[index];
        const circle = document.createElementNS(svgNs, "circle");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r", "3");
        circle.setAttribute("fill", "var(--accent)");

        const title = document.createElementNS(svgNs, "title");
        const date = new Date(point.date).toLocaleDateString(undefined, { dateStyle: "medium" });
        title.textContent = `${date}: ${point.score}%`;
        circle.appendChild(title);

        trendSparkline.appendChild(circle);
    });
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
    const date = new Date(item.created_at).toLocaleString(undefined, {
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
