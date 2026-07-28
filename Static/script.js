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
    insights: {
        title: "Your Insights",
        subtitle: "Trends and patterns across everything you've analyzed.",
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
        if (item.dataset.section === "insights") {
            loadInsights();
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
const insightsNavBtn = document.getElementById("insightsNavBtn");
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
    insightsNavBtn.hidden = !loggedIn;
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
const jdUrlInput = document.getElementById("jdUrlInput");
const importJdBtn = document.getElementById("importJdBtn");
const importJdSpinner = document.getElementById("importJdSpinner");
const importJdError = document.getElementById("importJdError");
const analyzeBtn = document.getElementById("analyzeBtn");
const spinner = document.getElementById("spinner");
const errorMessage = document.getElementById("errorMessage");
const resultSection = document.getElementById("result");
const scoreBreakdown = document.getElementById("scoreBreakdown");
const scoreBreakdownList = document.getElementById("scoreBreakdownList");
const companyRail = document.getElementById("companyRail");

const postAnalysisActions = document.getElementById("postAnalysisActions");
const postAnalysisError = document.getElementById("postAnalysisError");
const tailorResumeBtn = document.getElementById("tailorResumeBtn");
const tailorResumeSpinner = document.getElementById("tailorResumeSpinner");
const tailorResumeOutput = document.getElementById("tailorResumeOutput");
const tailorResumePreview = document.getElementById("tailorResumePreview");
const downloadTailorResumeBtn = document.getElementById("downloadTailorResumeBtn");
const downloadTailorResumeSpinner = document.getElementById("downloadTailorResumeSpinner");
let currentTailoredResumeText = "";
const browseTemplatesBtn = document.getElementById("browseTemplatesBtn");
const browseTemplatesSpinner = document.getElementById("browseTemplatesSpinner");
const templateGalleryModal = document.getElementById("templateGalleryModal");
const templateGalleryGrid = document.getElementById("templateGalleryGrid");
const templateGalleryError = document.getElementById("templateGalleryError");
const closeTemplateGalleryBtn = document.getElementById("closeTemplateGalleryBtn");
let currentStructuredResume = null;
const coverLetterBtn = document.getElementById("coverLetterBtn");
const coverLetterSpinner = document.getElementById("coverLetterSpinner");
const coverLetterOutput = document.getElementById("coverLetterOutput");
const coverLetterText = document.getElementById("coverLetterText");
const copyCoverLetterBtn = document.getElementById("copyCoverLetterBtn");
const atsCheckBtn = document.getElementById("atsCheckBtn");
const atsCheckSpinner = document.getElementById("atsCheckSpinner");
const atsCheckOutput = document.getElementById("atsCheckOutput");
const atsCheckBody = document.getElementById("atsCheckBody");
const atsIssuesList = document.getElementById("atsIssuesList");
const atsPassedList = document.getElementById("atsPassedList");

const ALLOWED_RESUME_EXTENSIONS = [".pdf", ".docx"];

updateCharCount(jdInput, jdCount);
jdInput.addEventListener("input", () => updateCharCount(jdInput, jdCount));

function updateCharCount(input, counter) {
    const length = input.value.length;
    counter.textContent = `${length.toLocaleString()} / ${MAX_CHARS.toLocaleString()}`;
    counter.classList.toggle("over-limit", length > MAX_CHARS);
}

importJdBtn.addEventListener("click", handleImportJd);

async function handleImportJd() {
    const url = jdUrlInput.value.trim();
    importJdError.hidden = true;

    if (!url) {
        importJdError.textContent = "Enter a job posting URL first.";
        importJdError.hidden = false;
        return;
    }

    setButtonLoading(importJdBtn, importJdSpinner, true);

    try {
        const response = await fetch("/api/import-jd", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            importJdError.textContent = (data && data.detail) || "Something went wrong, please try again.";
            importJdError.hidden = false;
            return;
        }

        jdInput.value = data.job_description;
        updateCharCount(jdInput, jdCount);
        jdUrlInput.value = "";
    } catch (error) {
        console.error(error);
        importJdError.textContent = "Something went wrong, please try again.";
        importJdError.hidden = false;
    } finally {
        setButtonLoading(importJdBtn, importJdSpinner, false);
    }
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

analyzeBtn.addEventListener("click", handleSingleAnalyze);

async function handleSingleAnalyze() {
    const resumeFile = resumeFileInput.files[0];
    const jobDescription = jdInput.value.trim();

    hideError();
    resultSection.hidden = true;
    scoreBreakdown.hidden = true;
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

// --- Post-analysis actions: tailored resume, cover letter, ATS check ---
// Each reuses the same resume file + job description already in the form.

tailorResumeBtn.addEventListener("click", handleTailorResume);
downloadTailorResumeBtn.addEventListener("click", handleDownloadTailoredResumePdf);
browseTemplatesBtn.addEventListener("click", handleBrowseTemplates);
closeTemplateGalleryBtn.addEventListener("click", () => { templateGalleryModal.hidden = true; });
templateGalleryModal.addEventListener("click", event => {
    if (event.target === templateGalleryModal) templateGalleryModal.hidden = true;
});
coverLetterBtn.addEventListener("click", handleCoverLetter);
atsCheckBtn.addEventListener("click", handleAtsCheck);
copyCoverLetterBtn.addEventListener("click", () => copyToClipboard(coverLetterText.textContent, copyCoverLetterBtn));

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

// Wires a "^" button to collapse/expand the content beside it, and
// returns a function to force it back open (used when fresh content
// is generated after the user had previously collapsed it).
function setupCollapseToggle(buttonId, contentEl) {
    const button = document.getElementById(buttonId);
    button.addEventListener("click", () => {
        const collapsing = !contentEl.hidden;
        contentEl.hidden = collapsing;
        button.classList.toggle("is-collapsed", collapsing);
        button.setAttribute("aria-expanded", String(!collapsing));
    });
    return () => {
        contentEl.hidden = false;
        button.classList.remove("is-collapsed");
        button.setAttribute("aria-expanded", "true");
    };
}

const expandTailorResumePreview = setupCollapseToggle("collapseTailorResumeBtn", tailorResumePreview);
const expandCoverLetterText = setupCollapseToggle("collapseCoverLetterBtn", coverLetterText);
const expandAtsCheckBody = setupCollapseToggle("collapseAtsCheckBtn", atsCheckBody);

// Wires a "x" button to fully hide the panel and clear its content —
// unlike collapse, this is a hard reset: nothing is saved here, so
// getting it back just means clicking the generate button again.
function setupDeleteButton(buttonId, panelEl, onDelete) {
    document.getElementById(buttonId).addEventListener("click", () => {
        panelEl.hidden = true;
        onDelete();
    });
}

setupDeleteButton("deleteTailorResumeBtn", tailorResumeOutput, () => {
    currentTailoredResumeText = "";
    currentStructuredResume = null;
    tailorResumePreview.innerHTML = "";
});
setupDeleteButton("deleteCoverLetterBtn", coverLetterOutput, () => {
    coverLetterText.textContent = "";
});
setupDeleteButton("deleteAtsCheckBtn", atsCheckOutput, () => {
    atsIssuesList.innerHTML = "";
    atsPassedList.innerHTML = "";
});

function hideOutputPanels() {
    tailorResumeOutput.hidden = true;
    coverLetterOutput.hidden = true;
    atsCheckOutput.hidden = true;
    postAnalysisError.hidden = true;
    templateGalleryModal.hidden = true;
    currentStructuredResume = null;
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// Unlike escapeHtml (fine for text nodes), embedding a full rendered
// template into a srcdoc="..." attribute needs quotes escaped too — a
// template's own double-quoted HTML attributes would otherwise prematurely
// close the srcdoc value and corrupt the markup.
function escapeForAttribute(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

// Turns the plain "ALL CAPS headers / '- ' bullets" text Gemini returns
// into a readable preview — headings, bullet lists, and paragraphs.
function formatTailoredResumeHtml(text) {
    let html = "";
    let inList = false;
    for (const rawLine of text.split("\n")) {
        const line = rawLine.trim();
        if (!line) {
            if (inList) { html += "</ul>"; inList = false; }
            continue;
        }
        if (line.startsWith("- ") || line.startsWith("-")) {
            if (!inList) { html += "<ul>"; inList = true; }
            html += `<li>${escapeHtml(line.replace(/^-\s*/, ""))}</li>`;
        } else if (line === line.toUpperCase() && line.length <= 40) {
            if (inList) { html += "</ul>"; inList = false; }
            html += `<h4>${escapeHtml(line)}</h4>`;
        } else {
            if (inList) { html += "</ul>"; inList = false; }
            html += `<p>${escapeHtml(line)}</p>`;
        }
    }
    if (inList) html += "</ul>";
    return html;
}

// Cycles the button's label through progress phrases while a slow AI call
// is in flight, instead of leaving it stuck on the original button text.
function startStatusCycle(labelEl, phrases) {
    const originalText = labelEl.textContent;
    let i = 0;
    labelEl.textContent = phrases[0];
    const interval = setInterval(() => {
        i = (i + 1) % phrases.length;
        labelEl.textContent = phrases[i];
    }, 1400);
    return (restoreText) => {
        clearInterval(interval);
        labelEl.textContent = restoreText !== undefined ? restoreText : originalText;
    };
}

async function handleTailorResume() {
    const resumeFile = resumeFileInput.files[0];
    const jobDescription = jdInput.value.trim();
    if (!resumeFile || !jobDescription) return;

    postAnalysisError.hidden = true;
    setButtonLoading(tailorResumeBtn, tailorResumeSpinner, true);
    const stopStatusCycle = startStatusCycle(
        tailorResumeBtn.querySelector(".btn-label"),
        ["Tailoring your resume…", "Please wait…", "Almost done…"]
    );

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
        currentTailoredResumeText = data.tailored_resume;
        tailorResumePreview.innerHTML = formatTailoredResumeHtml(currentTailoredResumeText);
        tailorResumeOutput.hidden = false;
        expandTailorResumePreview();
    } catch (error) {
        console.error(error);
        showPostAnalysisError("Something went wrong, please try again.");
    } finally {
        setButtonLoading(tailorResumeBtn, tailorResumeSpinner, false);
        stopStatusCycle("Tailor My Resume");
    }
}

async function handleDownloadTailoredResumePdf() {
    if (!currentTailoredResumeText) return;

    postAnalysisError.hidden = true;
    setButtonLoading(downloadTailorResumeBtn, downloadTailorResumeSpinner, true);

    try {
        const formData = new FormData();
        formData.append("tailored_resume", currentTailoredResumeText);

        const response = await fetch("/tailor-resume/pdf", { method: "POST", body: formData });
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            showPostAnalysisError((errorData && errorData.detail) || "Something went wrong, please try again.");
            return;
        }

        const blob = await response.blob();
        downloadBlob(blob, "tailored_resume.pdf");
    } catch (error) {
        console.error(error);
        showPostAnalysisError("Something went wrong, please try again.");
    } finally {
        setButtonLoading(downloadTailorResumeBtn, downloadTailorResumeSpinner, false);
    }
}

// Fetches the tailored resume as structured data (name/contact/summary/
// sections) rather than plain text, so it can be dropped into any of the
// downloadable template designs. Separate Gemini call from the plain-text
// "Tailor My Resume" flow above — this only runs when the user actually
// opens the template gallery.
async function handleBrowseTemplates() {
    const resumeFile = resumeFileInput.files[0];
    const jobDescription = jdInput.value.trim();
    if (!resumeFile || !jobDescription) return;

    postAnalysisError.hidden = true;
    setButtonLoading(browseTemplatesBtn, browseTemplatesSpinner, true);

    try {
        const formData = new FormData();
        formData.append("resume_file", resumeFile);
        formData.append("job_description", jobDescription);

        const [structuredResponse, templatesResponse] = await Promise.all([
            fetch("/tailor-resume/structured", { method: "POST", body: formData }),
            fetch("/resume-templates"),
        ]);

        if (!structuredResponse.ok) {
            const errorData = await structuredResponse.json().catch(() => null);
            showPostAnalysisError((errorData && errorData.detail) || "Something went wrong, please try again.");
            return;
        }
        if (!templatesResponse.ok) {
            showPostAnalysisError("Couldn't load templates, please try again.");
            return;
        }

        currentStructuredResume = await structuredResponse.json();
        const templates = await templatesResponse.json();
        await renderTemplateGallery(templates);
        templateGalleryError.hidden = true;
        templateGalleryModal.hidden = false;
    } catch (error) {
        console.error(error);
        showPostAnalysisError("Something went wrong, please try again.");
    } finally {
        setButtonLoading(browseTemplatesBtn, browseTemplatesSpinner, false);
    }
}

// Renders every template with the user's actual data as a live, scaled-down
// preview (like a real page thumbnail) rather than a plain name/tag card, so
// templates can be visually compared side by side before picking one.
async function renderTemplateGallery(templates) {
    templateGalleryGrid.innerHTML = "";

    const renderedHtmlByTemplateId = {};
    await Promise.all(
        templates.map(async template => {
            try {
                const response = await fetch(`/resume-templates/${template.id}/render`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(currentStructuredResume),
                });
                renderedHtmlByTemplateId[template.id] = response.ok ? await response.text() : null;
            } catch (error) {
                console.error(error);
                renderedHtmlByTemplateId[template.id] = null;
            }
        })
    );

    for (const template of templates) {
        const html = renderedHtmlByTemplateId[template.id];

        const card = document.createElement("div");
        card.className = "template-card";
        card.innerHTML = `
            <div class="template-preview-frame">
                ${html
                    ? `<iframe class="template-preview-iframe" srcdoc="${escapeForAttribute(html)}" tabindex="-1" title="${escapeHtml(template.name)} preview"></iframe>`
                    : `<div class="template-preview-error">Preview unavailable</div>`
                }
                <div class="template-preview-overlay">
                    <button type="button" class="use-template-btn">Use Template</button>
                </div>
            </div>
            <div class="template-card-footer">
                <span class="template-card-name">${escapeHtml(template.name)}</span>
                <div class="template-card-tags">
                    ${template.tags.map(tag => `<span class="template-tag">${escapeHtml(tag)}</span>`).join("")}
                </div>
            </div>
        `;
        card.querySelector(".use-template-btn").addEventListener("click", () => handleSelectTemplate(template.id, html));
        templateGalleryGrid.appendChild(card);
    }
}

function handleSelectTemplate(templateId, html) {
    if (!html) {
        templateGalleryError.textContent = "Couldn't render that template, please try again.";
        templateGalleryError.hidden = false;
        return;
    }
    templateGalleryError.hidden = true;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    // Revoke on a delay rather than immediately — the new tab needs
    // time to actually load the blob URL before it's freed.
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    templateGalleryModal.hidden = true;
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
        expandCoverLetterText();
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
        expandAtsCheckBody();
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
    renderScoreBreakdown(data.category_breakdown);
}

function renderScoreBreakdown(breakdown) {
    if (!breakdown || breakdown.length === 0) {
        scoreBreakdown.hidden = true;
        return;
    }

    scoreBreakdownList.innerHTML = breakdown.map(item => {
        const barColor = item.score >= 70 ? "var(--success)" : item.score >= 40 ? "var(--warning)" : "var(--danger)";
        return `
            <div class="score-breakdown-item">
                <div class="score-breakdown-item-header">
                    <span>${escapeHtml(item.category)}</span>
                    <span class="score-breakdown-pct">${item.matched}/${item.total}</span>
                </div>
                <div class="score-breakdown-bar">
                    <div class="score-breakdown-bar-fill" style="width: ${item.score}%; background: ${barColor};"></div>
                </div>
            </div>
        `;
    }).join("");

    scoreBreakdown.hidden = false;
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

// --- Insights ---
// Same underlying data as History, but aggregated across every past
// analysis instead of shown one at a time — score trend over time plus
// the keywords that keep showing up as missing, which is a much stronger
// "you should actually fix this" signal than any single analysis gives.

const trendsCard = document.getElementById("trendsCard");
const insightsEmpty = document.getElementById("insightsEmpty");
const trendAverageScore = document.getElementById("trendAverageScore");
const scoreTrendChartCanvas = document.getElementById("scoreTrendChart");
const trendMissingWrap = document.getElementById("trendMissingWrap");
const trendMissingList = document.getElementById("trendMissingList");
let scoreTrendChartInstance = null;

async function loadInsights() {
    if (!isLoggedIn) return;

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
        insightsEmpty.hidden = false;
        return;
    }

    trendsCard.hidden = false;
    insightsEmpty.hidden = true;
    trendAverageScore.textContent = `${trends.average_score}%`;
    renderScoreTrendChart(trends.score_trend || []);

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

function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function renderScoreTrendChart(points) {
    if (scoreTrendChartInstance) {
        scoreTrendChartInstance.destroy();
        scoreTrendChartInstance = null;
    }
    if (points.length === 0) return;

    const labels = points.map(point =>
        new Date(point.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    );
    const scores = points.map(point => point.score);

    scoreTrendChartInstance = new Chart(scoreTrendChartCanvas, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Match score",
                data: scores,
                borderColor: cssVar("--accent"),
                backgroundColor: cssVar("--accent-soft"),
                fill: true,
                tension: 0.3,
                pointRadius: 3,
                pointBackgroundColor: cssVar("--accent"),
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    ticks: { callback: value => `${value}%`, color: cssVar("--text-secondary") },
                    grid: { color: cssVar("--border") },
                },
                x: {
                    ticks: { color: cssVar("--text-secondary") },
                    grid: { display: false },
                },
            },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: context => `${context.parsed.y}%` } },
            },
        },
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

    historyList.querySelectorAll(".history-item-toggle").forEach(toggle => {
        toggle.addEventListener("click", () => {
            const body = toggle.closest(".history-item").querySelector(".history-item-body");
            body.hidden = !body.hidden;
            toggle.classList.toggle("expanded", !body.hidden);
        });
    });

    historyList.querySelectorAll(".btn-delete-history").forEach(button => {
        button.addEventListener("click", () => handleDeleteHistoryItem(button));
    });
}

async function handleDeleteHistoryItem(button) {
    const analysisId = button.dataset.id;
    if (!window.confirm("Delete this analysis? This can't be undone.")) return;

    button.disabled = true;
    try {
        const response = await fetch(`/api/history/${analysisId}`, { method: "DELETE" });
        if (!response.ok) return;
        button.closest(".history-item").remove();
        if (!historyList.querySelector(".history-item")) {
            historyEmpty.hidden = false;
        }
    } catch (error) {
        console.error(error);
    } finally {
        button.disabled = false;
    }
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
            <div class="history-item-header">
                <button type="button" class="history-item-toggle">
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
                <button type="button" class="btn-delete btn-delete-history" data-id="${item.id}" aria-label="Delete this analysis">&times;</button>
            </div>
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
