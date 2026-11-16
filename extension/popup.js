// Firebase Configuration
const FIREBASE_API_KEY = "AIzaSyAb5c6kmpAM5x5Bbsz_z7Y4vq_AY6QlC7w";
const FIREBASE_PROJECT_ID = "trackbookmark-956";
const WEB_APP_URL = "https://bk-mark.vercel.app/";

// Google Keep Color Palette
const KEEP_COLORS = [
  { name: "Default", bg: "#ffffff", darkBg: "#202124", border: "#dadce0" },
  { name: "Coral", bg: "#fce8e6", darkBg: "#4a2422", border: "#f28b82" },
  { name: "Peach", bg: "#feefe3", darkBg: "#4a3217", border: "#fbbc04" },
  { name: "Sand", bg: "#fef7e0", darkBg: "#4a4417", border: "#fff475" },
  { name: "Mint", bg: "#e6f4ea", darkBg: "#234024", border: "#a8dab5" },
  { name: "Sage", bg: "#e0f2f1", darkBg: "#173b38", border: "#80cbc4" },
  { name: "Fog", bg: "#e8f0fe", darkBg: "#1e3048", border: "#aecbfa" },
  { name: "Storm", bg: "#e1f5fe", darkBg: "#1a3644", border: "#81d4fa" },
  { name: "Dusk", bg: "#f3e8fd", darkBg: "#35224a", border: "#d7aefb" },
  { name: "Blossom", bg: "#fce4ec", darkBg: "#461d36", border: "#f48fb1" },
  { name: "Clay", bg: "#efebe9", darkBg: "#372d29", border: "#bcaaa4" },
  { name: "Chalk", bg: "#f1f3f4", darkBg: "#2d3034", border: "#dadce0" },
];

// State
let currentTab = null;
let currentUser = null;
let selectedColor = "#ffffff";
let isDarkTheme = false;

// DOM Elements
const loadingView = document.getElementById("loadingView");
const loginView = document.getElementById("loginView");
const addBookmarkView = document.getElementById("addBookmarkView");
const successView = document.getElementById("successView");

const userBadge = document.getElementById("userBadge");
const userInitial = document.getElementById("userInitial");
const logoutBtn = document.getElementById("logoutBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");

const googleSignInBtn = document.getElementById("googleSignInBtn");
const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");
const authAlert = document.getElementById("authAlert");
const openInWebAppDirectBtn = document.getElementById("openInWebAppDirectBtn");

const bookmarkForm = document.getElementById("bookmarkForm");
const siteFavicon = document.getElementById("siteFavicon");
const siteDomain = document.getElementById("siteDomain");
const bookmarkTitle = document.getElementById("bookmarkTitle");
const bookmarkUrl = document.getElementById("bookmarkUrl");
const bookmarkFolder = document.getElementById("bookmarkFolder");
const folderChips = document.getElementById("folderChips");
const colorPalette = document.getElementById("colorPalette");
const bookmarkNotes = document.getElementById("bookmarkNotes");
const bookmarkPinned = document.getElementById("bookmarkPinned");
const saveBookmarkBtn = document.getElementById("saveBookmarkBtn");
const openWebWithParamsBtn = document.getElementById("openWebWithParamsBtn");

const toast = document.getElementById("toast");
const toastMsg = document.getElementById("toastMsg");

// Helper: Show View
function showView(view) {
  [loadingView, loginView, addBookmarkView, successView].forEach((v) => {
    if (v) v.classList.add("hidden");
  });
  if (view) view.classList.remove("hidden");
}

// Helper: Toast Message
let toastTimer = null;
function showToast(msg) {
  if (!toast || !toastMsg) return;
  toastMsg.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 2400);
}

// Helper: Extract domain
function getDomain(urlStr) {
  try {
    return new URL(urlStr).hostname.replace(/^www\./, "");
  } catch (e) {
    return urlStr || "";
  }
}

// Helper: Favicon URL
function getFaviconUrl(urlStr) {
  const d = getDomain(urlStr);
  return d ? `https://www.google.com/s2/favicons?domain=${d}&sz=64` : "";
}

// Theme handling
function applyTheme(isDark) {
  isDarkTheme = isDark;
  if (isDark) {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }
  renderColorPalette();
}

themeToggleBtn.addEventListener("click", () => {
  const next = !isDarkTheme;
  applyTheme(next);
  chrome.storage.local.set({ bkmark_theme: next ? "dark" : "light" });
});

// Render Color Palette
function renderColorPalette() {
  if (!colorPalette) return;
  colorPalette.innerHTML = "";

  KEEP_COLORS.forEach((colorItem) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "color-dot";
    dot.title = colorItem.name;
    const bg = isDarkTheme ? colorItem.darkBg : colorItem.bg;
    dot.style.backgroundColor = bg;
    dot.style.borderColor = colorItem.border;

    if (selectedColor.toLowerCase() === colorItem.bg.toLowerCase()) {
      dot.classList.add("selected");
    }

    dot.addEventListener("click", () => {
      selectedColor = colorItem.bg;
      document.querySelectorAll(".color-dot").forEach((d) => d.classList.remove("selected"));
      dot.classList.add("selected");
    });

    colorPalette.appendChild(dot);
  });
}

// Render Folder Chips
function initFolderChips() {
  if (!folderChips) return;
  folderChips.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const folderVal = chip.getAttribute("data-folder");
      bookmarkFolder.value = folderVal;
      updateActiveChip(folderVal);
    });
  });

  bookmarkFolder.addEventListener("input", () => {
    updateActiveChip(bookmarkFolder.value);
  });
}

function updateActiveChip(val) {
  const trimmed = (val || "").trim().toLowerCase();
  folderChips.querySelectorAll(".chip").forEach((chip) => {
    const target = chip.getAttribute("data-folder").toLowerCase();
    if (target === trimmed) {
      chip.classList.add("active");
    } else {
      chip.classList.remove("active");
    }
  });
}

// Setup User Session
function setUser(user) {
  currentUser = user;
  if (user && user.email) {
    userBadge.classList.remove("hidden");
    userInitial.textContent = user.email.charAt(0).toUpperCase();
  } else {
    userBadge.classList.add("hidden");
  }
}

// Check & Refresh Auth Token if needed
async function getValidToken() {
  if (!currentUser || !currentUser.idToken) return null;
  const now = Date.now();
  if (currentUser.expiresAt && now < currentUser.expiresAt - 60000) {
    return currentUser.idToken;
  }

  // Token expired, refresh
  if (currentUser.refreshToken) {
    try {
      const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=refresh_token&refresh_token=${currentUser.refreshToken}`,
      });
      const data = await res.json();
      if (res.ok && data.id_token) {
        currentUser.idToken = data.id_token;
        currentUser.refreshToken = data.refresh_token || currentUser.refreshToken;
        currentUser.expiresAt = Date.now() + parseInt(data.expires_in || "3600", 10) * 1000;
        await chrome.storage.local.set({ bkmark_user: currentUser });
        return currentUser.idToken;
      }
    } catch (e) {
      console.warn("Failed to refresh token:", e);
    }
  }

  return currentUser.idToken;
}

// Sign in with Firebase REST API
async function signIn(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        password,
        returnSecureToken: true,
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    const errCode = data?.error?.message || "Sign in failed";
    if (errCode.includes("INVALID_LOGIN_CREDENTIALS") || errCode.includes("EMAIL_NOT_FOUND") || errCode.includes("INVALID_PASSWORD")) {
      throw new Error("Invalid email or password.");
    }
    throw new Error(errCode);
  }

  const userObj = {
    userId: data.localId,
    email: data.email,
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    expiresAt: Date.now() + parseInt(data.expiresIn || "3600", 10) * 1000,
  };

  await chrome.storage.local.set({ bkmark_user: userObj });
  setUser(userObj);
  return userObj;
}

// Sign Out
logoutBtn.addEventListener("click", async () => {
  await chrome.storage.local.remove("bkmark_user");
  setUser(null);
  showView(loginView);
  showToast("Signed out");
});

// Save Bookmark to Firestore REST API
async function saveBookmark(payload) {
  const token = await getValidToken();
  if (!token || !currentUser?.userId) {
    throw new Error("Not signed in. Please sign in to save.");
  }

  const fields = {
    userId: { stringValue: currentUser.userId },
    name: { stringValue: payload.name },
    link: { stringValue: payload.link },
    folderName: { stringValue: payload.folderName || "General" },
    color: { stringValue: payload.color || "#ffffff" },
    pinned: { booleanValue: Boolean(payload.pinned) },
    createdAt: { timestampValue: new Date().toISOString() },
  };

  if (payload.notes) {
    fields.notes = { stringValue: payload.notes };
  }

  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/bookmarks`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fields }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to save bookmark");
  }

  return data;
}

// Fallback: Open Web App with pre-filled parameters
function openInWebApp(title, url, folder) {
  const params = new URLSearchParams();
  if (url) params.set("add_url", url);
  if (title) params.set("add_title", title);
  if (folder) params.set("add_folder", folder);

  const fullUrl = `${WEB_APP_URL}?${params.toString()}`;
  chrome.tabs.create({ url: fullUrl });
}

// Populate Active Tab Information
async function loadActiveTabInfo() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs.length > 0) {
      currentTab = tabs[0];
      const url = currentTab.url || "";
      const title = currentTab.title || "";
      const domain = getDomain(url);
      const favicon = currentTab.favIconUrl || getFaviconUrl(url);

      bookmarkTitle.value = title;
      bookmarkUrl.value = url;
      siteDomain.textContent = domain || "Web Page";
      if (favicon) {
        siteFavicon.src = favicon;
        siteFavicon.style.display = "block";
      } else {
        siteFavicon.style.display = "none";
      }
    }
  } catch (err) {
    console.error("Error reading tab:", err);
  }
}

// Initial Boot
async function init() {
  showView(loadingView);

  // Load Saved Theme
  const storedTheme = await chrome.storage.local.get("bkmark_theme");
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(storedTheme.bkmark_theme ? storedTheme.bkmark_theme === "dark" : prefersDark);

  initFolderChips();
  renderColorPalette();
  await loadActiveTabInfo();

  // Load User Session
  const stored = await chrome.storage.local.get("bkmark_user");
  if (stored && stored.bkmark_user && stored.bkmark_user.userId) {
    setUser(stored.bkmark_user);
    showView(addBookmarkView);
  } else {
    setUser(null);
    showView(loginView);
  }
}

// Google Sign-In Button Click
googleSignInBtn.addEventListener("click", async () => {
  const btnText = googleSignInBtn.querySelector(".btn-text");
  const spinner = googleSignInBtn.querySelector(".spinner-small");
  btnText.textContent = "Connecting...";
  spinner.classList.remove("hidden");
  googleSignInBtn.disabled = true;
  authAlert.classList.add("hidden");

  try {
    // 1. Check if user already has an active tab on bkMark with credentials
    let existingUser = null;
    try {
      const tabs = await chrome.tabs.query({ url: ["https://bk-mark.vercel.app/*", "http://localhost:5173/*"] });
      if (tabs && tabs.length > 0) {
        for (const tab of tabs) {
          try {
            const resp = await chrome.tabs.sendMessage(tab.id, { type: "CHECK_PAGE_AUTH" });
            if (resp && resp.user && resp.user.userId) {
              existingUser = resp.user;
              break;
            }
          } catch (e) {}
        }
      }
    } catch (e) {}

    if (existingUser) {
      await chrome.storage.local.set({ bkmark_user: existingUser });
      setUser(existingUser);
      showToast(`Signed in as ${existingUser.email}`);
      showView(addBookmarkView);
      return;
    }

    // 2. Open centered floating popup window for Google Sign-In
    const width = 480;
    const height = 640;
    const left = Math.round((screen.width - width) / 2);
    const top = Math.round((screen.height - height) / 2);

    await chrome.windows.create({
      url: `${WEB_APP_URL}?ext_auth=1`,
      type: "popup",
      width,
      height,
      left,
      top,
      focused: true,
    });

    showToast("Complete Google Sign-In in the floating window");
  } catch (err) {
    authAlert.textContent = err.message || "Failed to start Google sign in.";
    authAlert.classList.remove("hidden");
  } finally {
    btnText.textContent = "Continue with Google";
    spinner.classList.add("hidden");
    googleSignInBtn.disabled = false;
  }
});

// Listen for storage changes across popup, background, and content scripts
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.bkmark_user) {
    const newUser = changes.bkmark_user.newValue;
    if (newUser && newUser.userId) {
      setUser(newUser);
      showToast(`Signed in as ${newUser.email}`);
      showView(addBookmarkView);
    } else {
      setUser(null);
      showView(loginView);
    }
  }
});

// Direct runtime message listener
chrome.runtime.onMessage.addListener((message) => {
  if (message && message.type === "EXT_AUTH_SUCCESS" && message.user) {
    setUser(message.user);
    showToast(`Signed in as ${message.user.email}`);
    showView(addBookmarkView);
  }
});

// Login Form Submit
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authAlert.classList.add("hidden");
  const emailVal = loginEmail.value.trim();
  const passVal = loginPassword.value;

  if (!emailVal || !passVal) return;

  const btnText = loginSubmitBtn.querySelector(".btn-text");
  const spinner = loginSubmitBtn.querySelector(".spinner-small");

  btnText.textContent = "Signing In...";
  spinner.classList.remove("hidden");
  loginSubmitBtn.disabled = true;

  try {
    await signIn(emailVal, passVal);
    showToast("Signed in successfully!");
    showView(addBookmarkView);
  } catch (err) {
    authAlert.textContent = err.message || "Failed to sign in.";
    authAlert.classList.remove("hidden");
  } finally {
    btnText.textContent = "Sign In";
    spinner.classList.add("hidden");
    loginSubmitBtn.disabled = false;
  }
});

// Bookmark Form Submit
bookmarkForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = bookmarkTitle.value.trim();
  const url = bookmarkUrl.value.trim();
  const folder = bookmarkFolder.value.trim() || "General";
  const notes = bookmarkNotes.value.trim();
  const pinned = bookmarkPinned.checked;

  if (!title || !url) {
    showToast("Please provide both title and URL");
    return;
  }

  const btnText = saveBookmarkBtn.querySelector(".btn-text");
  const spinner = saveBookmarkBtn.querySelector(".spinner-small");
  btnText.textContent = "Saving...";
  spinner.classList.remove("hidden");
  saveBookmarkBtn.disabled = true;

  try {
    await saveBookmark({
      name: title,
      link: url,
      folderName: folder,
      color: selectedColor,
      pinned,
      notes,
    });

    showView(successView);
  } catch (err) {
    console.error("Save error:", err);
    showToast(err.message || "Failed to save bookmark");
  } finally {
    btnText.textContent = "Add to bkMark";
    spinner.classList.add("hidden");
    saveBookmarkBtn.disabled = false;
  }
});

// Direct Web App buttons
openInWebAppDirectBtn.addEventListener("click", () => {
  const title = currentTab?.title || "";
  const url = currentTab?.url || "";
  openInWebApp(title, url, "General");
  window.close();
});

openWebWithParamsBtn.addEventListener("click", () => {
  const title = bookmarkTitle.value.trim() || currentTab?.title || "";
  const url = bookmarkUrl.value.trim() || currentTab?.url || "";
  const folder = bookmarkFolder.value.trim() || "General";
  openInWebApp(title, url, folder);
  window.close();
});

// Run Init
document.addEventListener("DOMContentLoaded", init);
