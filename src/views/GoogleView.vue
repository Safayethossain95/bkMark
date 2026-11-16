<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import AccountModal from "../components/AccountModal.vue";
import LoginPanel from "../components/LoginPanel.vue";
import { useBookmarks, applyThemeToDocument, normalizeEmail } from "../composables/useBookmarks";

const {
  bookmarks,
  bookmarksLoading,
  searchQuery,
  authUser,
  userId,
  authLoading,
  accountModalOpen,
  authMode,
  authEmail,
  authPassword,
  authError,
  friends,
  friendsLoading,
  friendRequests,
  requestsLoading,
  friendEmail,
  shareEmail,
  selectedShareBookmarkId,
  accountActionError,
  accountActionSuccess,
  selectedTheme,
  addBookmark,
  updateBookmark,
  deleteBookmark,
  signup,
  login,
  loginWithGoogle,
  logout,
  openAccountModal,
  openShareModalForBookmark,
  closeAccountModal,
  addFriendByEmail,
  removeFriend,
  approveFriendRequest,
  deleteFriendRequest,
  shareBookmarkByEmail,
  initAuth,
  faviconUrl,
  getDomain,
  allFoldersList,
  publicBookmarks,
  publicLoading,
  loadPublicBookmarks,
  publishToPublic,
  deletePublicBookmark,
  savePublicBookmark,
  commentsMap,
  commentsLoadingMap,
  loadComments,
  addComment,
  deleteComment,
  toggleLike,
} = useBookmarks();

// bk Keep Minimal Flat Color Tokens (No Heavy Glows)
const KEEP_COLORS = [
  { name: "Default", bg: "#ffffff", darkBg: "#202124", border: "#dadce0", darkBorder: "#3c4043" },
  { name: "Coral", bg: "#fce8e6", darkBg: "#4a2422", border: "#f28b82", darkBorder: "#683330" },
  { name: "Peach", bg: "#feefe3", darkBg: "#4a3217", border: "#fbbc04", darkBorder: "#684820" },
  { name: "Sand", bg: "#fef7e0", darkBg: "#4a4417", border: "#fff475", darkBorder: "#6b6221" },
  { name: "Mint", bg: "#e6f4ea", darkBg: "#234024", border: "#a8dab5", darkBorder: "#345c36" },
  { name: "Sage", bg: "#e0f2f1", darkBg: "#173b38", border: "#80cbc4", darkBorder: "#235551" },
  { name: "Fog", bg: "#e8f0fe", darkBg: "#1e3048", border: "#aecbfa", darkBorder: "#2d4566" },
  { name: "Storm", bg: "#e1f5fe", darkBg: "#1a3644", border: "#81d4fa", darkBorder: "#274f63" },
  { name: "Dusk", bg: "#f3e8fd", darkBg: "#35224a", border: "#d7aefb", darkBorder: "#4c3269" },
  { name: "Blossom", bg: "#fce4ec", darkBg: "#461d36", border: "#f48fb1", darkBorder: "#632b4d" },
  { name: "Clay", bg: "#efebe9", darkBg: "#372d29", border: "#bcaaa4", darkBorder: "#4f413b" },
  { name: "Chalk", bg: "#f1f3f4", darkBg: "#2d3034", border: "#dadce0", darkBorder: "#44484d" },
];

// UI Layout & Theme State
const isDark = ref(false);
const isMobile = ref(false);
const isSidebarOpen = ref(true);
const isMobileSearchActive = ref(false);
const viewMode = ref("grid"); // 'grid' | 'list'
const selectedFolderFilter = ref("ALL"); // 'ALL' | 'SHARED' | 'RECENT' | specific folder
const searchInputRef = ref(null);
const mobileSearchInputRef = ref(null);
const activeColorPickerCardId = ref(null);
const showGoogleAppsMenu = ref(false);

function checkMobile() {
  if (typeof window !== "undefined") {
    isMobile.value = window.innerWidth < 768;
    if (isMobile.value) {
      isSidebarOpen.value = false;
    } else {
      isSidebarOpen.value = true;
    }
  }
}

function handleResize() {
  if (typeof window !== "undefined") {
    const wasMobile = isMobile.value;
    isMobile.value = window.innerWidth < 768;
    if (wasMobile !== isMobile.value) {
      isSidebarOpen.value = !isMobile.value;
      if (!isMobile.value) {
        isMobileSearchActive.value = false;
      }
    }
  }
}

function selectFolder(folder) {
  selectedFolderFilter.value = folder;
  if (folder === "FEED") {
    loadPublicBookmarks();
  }
  if (isMobile.value) {
    isSidebarOpen.value = false;
  }
}

function openMobileSearch() {
  isMobileSearchActive.value = true;
  nextTick(() => {
    mobileSearchInputRef.value?.focus();
  });
}

function closeMobileSearch() {
  isMobileSearchActive.value = false;
}

function triggerMobileCreate() {
  expandNoteCreator();
  if (creatorCardRef.value) {
    creatorCardRef.value.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// Bookmark Creation Box State
const isCreatingNote = ref(false);
const creatorCardRef = ref(null);
const newLinkInputRef = ref(null);
const newTitle = ref("");
const newLink = ref("");
const newFolder = ref("");
const newColor = ref("#ffffff");
const newPinned = ref(false);
const showCreateColorPicker = ref(false);

// Edit Modal / Inline Edit
const isEditModalOpen = ref(false);
const editingBookmark = ref(null);
const editTitle = ref("");
const editLink = ref("");
const editFolder = ref("");
const editColor = ref("#ffffff");
const editPinned = ref(false);

// Toast Notification
const toastMessage = ref("");
let toastTimer = null;
function showToast(msg) {
  toastMessage.value = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMessage.value = "";
  }, 2400);
}

// Check/toggle dark mode
function syncDocumentDarkMode() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (isDark.value) {
    root.classList.add("dark");
    root.classList.add("theme-dark");
    root.classList.remove("theme-light");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.classList.remove("theme-dark");
    root.classList.add("theme-light");
    root.style.colorScheme = "light";
  }
}

function toggleDarkMode() {
  isDark.value = !isDark.value;
  try {
    localStorage.setItem("googleKeepDark", isDark.value ? "true" : "false");
  } catch (e) {}
  syncDocumentDarkMode();
}

// Copy link helper
async function copyLink(link, name) {
  try {
    await navigator.clipboard.writeText(link);
    showToast(`Copied link to clipboard`);
  } catch (err) {
    showToast("Failed to copy link");
  }
}

// Filtered Bookmarks
const filteredBookmarks = computed(() => {
  let list = [...bookmarks.value];

  // 1. Search Query
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    return list.filter(
      (b) =>
        (b.name || "").toLowerCase().includes(q) ||
        (b.folderName || "").toLowerCase().includes(q) ||
        (b.link || "").toLowerCase().includes(q) ||
        (b.notes || "").toLowerCase().includes(q)
    );
  }

  // 2. Folder Navigation filter
  if (selectedFolderFilter.value === "SHARED") {
    list = list.filter((b) => b.shared || b.folderName === "Shared with Me");
  } else if (selectedFolderFilter.value === "RECENT") {
    list = list.slice(-16).reverse();
  } else if (selectedFolderFilter.value === "FEED") {
    list = [];
  } else if (selectedFolderFilter.value !== "ALL") {
    list = list.filter((b) => (b.folderName || "General") === selectedFolderFilter.value);
  }

  return list;
});

// Pinned & Other Bookmarks separation
const pinnedBookmarks = computed(() => {
  return filteredBookmarks.value.filter((b) => Boolean(b.pinned));
});

const otherBookmarks = computed(() => {
  return filteredBookmarks.value.filter((b) => !b.pinned);
});

// Counts
const totalCount = computed(() => bookmarks.value.length);
const sharedCount = computed(() => bookmarks.value.filter((b) => b.shared || b.folderName === "Shared with Me").length);

function getFolderCount(folder) {
  return bookmarks.value.filter((b) => (b.folderName || "General") === folder).length;
}

// Card Style Generator (Flat minimal, zero shadow)
function getCardStyle(colorHex) {
  const c = KEEP_COLORS.find((item) => (item.bg || "").toLowerCase() === (colorHex || "").toLowerCase());
  if (isDark.value) {
    return {
      backgroundColor: c ? c.darkBg : "#202124",
      borderColor: c && c.name !== "Default" ? c.darkBorder : "#3c4043",
      color: "#f1f3f4",
    };
  }
  return {
    backgroundColor: c ? c.bg : "#ffffff",
    borderColor: c && c.name !== "Default" ? c.border : "#e0e0e0",
    color: "#202124",
  };
}

// Favicon URL
function getSiteIconUrl(link) {
  if (!link) return "";
  const d = getDomain(link);
  if (!d) return "";
  return `https://www.google.com/s2/favicons?domain=${d}&sz=64`;
}

function onFaviconError(event, link) {
  const target = event.target;
  if (target) {
    target.style.display = "none";
  }
}

// Clean URL display
function getLinkDisplayPath(link) {
  if (!link) return "";
  try {
    const raw = link.startsWith("http") ? link : `https://${link}`;
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "");
    const path = url.pathname === "/" ? "" : url.pathname;
    const full = host + path;
    return full.length > 32 ? full.slice(0, 30) + "…" : full;
  } catch (e) {
    return link;
  }
}

// Content category detection
function getLinkTypeBadge(bookmark) {
  const urlStr = (bookmark.link || "").toLowerCase();
  const titleStr = (bookmark.name || "").toLowerCase();
  const folderStr = (bookmark.folderName || "").toLowerCase();

  if (urlStr.includes(".pdf") || titleStr.includes("pdf") || folderStr.includes("book")) {
    return { label: "PDF", icon: "📄" };
  }
  if (urlStr.includes("github.com") || urlStr.includes("gitlab.com")) {
    return { label: "Repo", icon: "💻" };
  }
  if (urlStr.includes("youtube.com") || urlStr.includes("youtu.be") || urlStr.includes("vimeo.com")) {
    return { label: "Video", icon: "▶" };
  }
  if (urlStr.includes("twitter.com") || urlStr.includes("x.com")) {
    return { label: "Social", icon: "𝕏" };
  }
  if (urlStr.includes("medium.com") || urlStr.includes("dev.to") || urlStr.includes("substack.com") || urlStr.includes("blog")) {
    return { label: "Article", icon: "📰" };
  }
  if (urlStr.includes("figma.com") || urlStr.includes("dribbble.com")) {
    return { label: "Design", icon: "🎨" };
  }
  if (urlStr.includes("docs.") || urlStr.includes("/docs")) {
    return { label: "Docs", icon: "📖" };
  }
  return null;
}

// Toggle Pin Status directly on bookmark
async function togglePin(bookmark, event) {
  if (event) event.stopPropagation();
  const nextPinned = !bookmark.pinned;
  try {
    await updateBookmark(bookmark.id, {
      ...bookmark,
      pinned: nextPinned,
    });
    showToast(nextPinned ? "Bookmark pinned" : "Bookmark unpinned");
  } catch (err) {
    showToast("Failed to update pin");
  }
}

// Change card color directly
async function changeCardColor(bookmark, colorHex) {
  activeColorPickerCardId.value = null;
  try {
    await updateBookmark(bookmark.id, {
      ...bookmark,
      color: colorHex,
    });
  } catch (err) {
    showToast("Failed to update note color");
  }
}

// Expand Creation Card
function expandNoteCreator() {
  isCreatingNote.value = true;
  newFolder.value =
    selectedFolderFilter.value !== "ALL" &&
    selectedFolderFilter.value !== "SHARED" &&
    selectedFolderFilter.value !== "RECENT"
      ? selectedFolderFilter.value
      : "General";

  nextTick(() => {
    newLinkInputRef.value?.focus({ preventScroll: true });
  });
}

function closeNoteCreator() {
  if (newTitle.value.trim() || newLink.value.trim()) {
    saveNewNote();
  } else {
    resetNoteCreator();
  }
}

function resetNoteCreator() {
  isCreatingNote.value = false;
  newTitle.value = "";
  newLink.value = "";
  newFolder.value = "";
  newColor.value = "#ffffff";
  newPinned.value = false;
  showCreateColorPicker.value = false;
}

function handleLinkInput() {
  if (!newTitle.value.trim() && newLink.value.trim()) {
    try {
      let raw = newLink.value.trim();
      if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
      const hostname = new URL(raw).hostname.replace(/^www\./, "");
      const brand = hostname.split(".")[0];
      if (brand) {
        newTitle.value = brand.charAt(0).toUpperCase() + brand.slice(1);
      }
    } catch (e) {}
  }
}

async function pasteClipboardUrl() {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      newLink.value = text.trim();
      handleLinkInput();
    }
  } catch (e) {}
}

function handleEditLinkInput() {
  if (!editTitle.value.trim() && editLink.value.trim()) {
    try {
      let raw = editLink.value.trim();
      if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
      const hostname = new URL(raw).hostname.replace(/^www\./, "");
      const brand = hostname.split(".")[0];
      if (brand) {
        editTitle.value = brand.charAt(0).toUpperCase() + brand.slice(1);
      }
    } catch (e) {}
  }
}

// Save New Bookmark
async function saveNewNote() {
  if (!newTitle.value.trim() && !newLink.value.trim()) {
    resetNoteCreator();
    return;
  }

  let formattedLink = newLink.value.trim();
  if (formattedLink && !/^https?:\/\//i.test(formattedLink)) {
    formattedLink = `https://${formattedLink}`;
  }

  const fallbackTitle = formattedLink ? getDomain(formattedLink) : "Untitled Bookmark";

  const payload = {
    name: newTitle.value.trim() || fallbackTitle,
    link: formattedLink || "https://google.com",
    folderName: newFolder.value.trim() || "General",
    color: newColor.value,
    pinned: newPinned.value,
  };

  try {
    await addBookmark(payload);
    showToast(`Saved "${payload.name}"`);
  } catch (err) {
    showToast("Failed to save bookmark");
  }

  resetNoteCreator();
}

// Edit Bookmark Modal
function openEditNote(bookmark) {
  editingBookmark.value = bookmark;
  editTitle.value = bookmark.name || "";
  editLink.value = bookmark.link || "";
  editFolder.value = bookmark.folderName || "General";
  editColor.value = bookmark.color || "#ffffff";
  editPinned.value = Boolean(bookmark.pinned);
  isEditModalOpen.value = true;
}

async function saveEditNote() {
  if (!editingBookmark.value) return;
  let formattedLink = editLink.value.trim();
  if (formattedLink && !/^https?:\/\//i.test(formattedLink)) {
    formattedLink = `https://${formattedLink}`;
  }

  const fallbackTitle = formattedLink ? getDomain(formattedLink) : "Untitled Bookmark";

  const payload = {
    name: editTitle.value.trim() || fallbackTitle,
    link: formattedLink || "https://google.com",
    folderName: editFolder.value.trim() || "General",
    color: editColor.value,
    pinned: editPinned.value,
  };

  try {
    await updateBookmark(editingBookmark.value.id, payload);
    showToast(`Updated "${payload.name}"`);
  } catch (err) {
    showToast("Failed to update bookmark");
  }
  isEditModalOpen.value = false;
  editingBookmark.value = null;
}

// Google search in a new tab
function searchGoogle(query) {
  if (!query || !query.trim()) return;
  const encoded = encodeURIComponent(query.trim());
  window.open(`https://www.google.com/search?q=${encoded}`, "_blank", "noopener,noreferrer");
}

// Handle search on Enter or search trigger
function handleSearchEnter() {
  const query = searchQuery.value.trim();
  if (!query) return;

  if (filteredBookmarks.value && filteredBookmarks.value.length > 0) {
    const firstItem = filteredBookmarks.value[0];
    if (firstItem && firstItem.link) {
      let url = String(firstItem.link).trim();
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
      window.open(url, "_blank", "noopener,noreferrer");
    }
  } else {
    // If no bookmark is found, open a new tab and search Google
    searchGoogle(query);
  }
}

// Open first bookmark on Enter (aliased to handleSearchEnter)
function openFirstBookmark() {
  handleSearchEnter();
}

function onSearchIconClick() {
  if (searchQuery.value.trim()) {
    handleSearchEnter();
  } else {
    searchInputRef.value?.focus();
  }
}

// User Profile Avatar URL Resolver (Fetches Gmail / Google profile picture)
const avatarLoadFailed = ref(false);

const userAvatarUrl = computed(() => {
  if (authUser.value?.photoURL) {
    return authUser.value.photoURL;
  }
  const providerPhoto = authUser.value?.providerData?.find((p) => p?.photoURL)?.photoURL;
  if (providerPhoto) {
    return providerPhoto;
  }
  if (authUser.value?.email) {
    return `https://unavatar.io/${encodeURIComponent(authUser.value.email.trim())}?fallback=false`;
  }
  return null;
});

watch(
  () => authUser.value?.email,
  () => {
    avatarLoadFailed.value = false;
  }
);

// ========================
// FEED STATE & HELPERS (Google Keep Style)
// ========================
const feedTab = ref("public"); // 'public' | 'private'
const isCreatingPublicNote = ref(false);
const isPublishingPublic = ref(false);
const publicLink = ref("");
const publicTitle = ref("");
const publicNotes = ref("");
const publicFolder = ref("Community");
const publicColor = ref("#ffffff");
const selectedMyBookmarkToPublish = ref("");
const isComposerBookmarkDropdownOpen = ref(false);
const composerBookmarkSearch = ref("");

const filteredComposerBookmarks = computed(() => {
  const q = (composerBookmarkSearch.value || "").trim().toLowerCase();
  if (!q) return bookmarks.value;
  return bookmarks.value.filter((b) =>
    (b.name || "").toLowerCase().includes(q) ||
    (b.folderName || "").toLowerCase().includes(q) ||
    (b.link || "").toLowerCase().includes(q)
  );
});

const selectedMyBookmarkObj = computed(() => {
  if (!selectedMyBookmarkToPublish.value) return null;
  return bookmarks.value.find((b) => String(b.id) === String(selectedMyBookmarkToPublish.value)) || null;
});

function clearSelectedBookmarkToPublish() {
  selectedMyBookmarkToPublish.value = "";
  publicTitle.value = "";
  publicLink.value = "";
  publicNotes.value = "";
  publicFolder.value = "Community";
  publicColor.value = "#ffffff";
}

function openCreatePostModal(withBookmarkPicker = false) {
  isCreatingPublicNote.value = true;
  isComposerBookmarkDropdownOpen.value = withBookmarkPicker;
  composerBookmarkSearch.value = "";
}

function closeCreatePostModal() {
  isCreatingPublicNote.value = false;
  isComposerBookmarkDropdownOpen.value = false;
  composerBookmarkSearch.value = "";
}

function onPublicUrlInput() {
  if (publicLink.value && !publicTitle.value) {
    try {
      const raw = publicLink.value.startsWith("http") ? publicLink.value : `https://${publicLink.value}`;
      const url = new URL(raw);
      const host = url.hostname.replace(/^www\./, "");
      publicTitle.value = host.charAt(0).toUpperCase() + host.slice(1);
    } catch (e) {}
  }
}

function selectExistingToPublish(bId) {
  selectedMyBookmarkToPublish.value = bId;
  const found = bookmarks.value.find((b) => String(b.id) === String(bId));
  if (found) {
    publicTitle.value = found.name;
    publicLink.value = found.link;
    publicNotes.value = found.notes || "";
    publicFolder.value = found.folderName || "Community";
    publicColor.value = found.color || "#ffffff";
  }
}

async function handlePublishPublic() {
  let linkVal = publicLink.value.trim();
  if (!linkVal) {
    showToast("Please enter a link to share");
    return;
  }
  if (!/^https?:\/\//i.test(linkVal)) {
    linkVal = `https://${linkVal}`;
  }
  const titleVal = publicTitle.value.trim() || getDomain(linkVal) || "Shared Link";

  isPublishingPublic.value = true;
  try {
    await publishToPublic({
      name: titleVal,
      link: linkVal,
      notes: publicNotes.value.trim(),
      folderName: publicFolder.value.trim() || "Community",
      color: publicColor.value || "#ffffff",
    });
    showToast("Published to Public Feed & saved to your Bookmarks!");
    publicTitle.value = "";
    publicLink.value = "";
    publicNotes.value = "";
    publicFolder.value = "Community";
    publicColor.value = "#ffffff";
    clearSelectedBookmarkToPublish();
    closeCreatePostModal();
  } catch (err) {
    showToast("Failed to publish bookmark");
  } finally {
    isPublishingPublic.value = false;
  }
}

async function quickPublishBookmark(bookmark) {
  try {
    await publishToPublic({
      name: bookmark.name,
      link: bookmark.link,
      notes: bookmark.notes || "",
      folderName: bookmark.folderName || "Community",
      color: bookmark.color || "#ffffff",
    });
    showToast(`Published "${bookmark.name}" to Public Feed!`);
  } catch (err) {
    showToast("Failed to publish to public feed");
  }
}

async function handleSavePublic(publicItem) {
  try {
    await savePublicBookmark(publicItem);
    showToast(`Saved "${publicItem.name}" to your bookmarks!`);
  } catch (err) {
    showToast("Failed to save bookmark");
  }
}

async function handleDeletePublic(publicId) {
  if (confirm("Are you sure you want to remove this bookmark from the public feed?")) {
    try {
      await deletePublicBookmark(publicId);
      showToast("Removed from public feed");
    } catch (err) {
      showToast("Failed to delete public bookmark");
    }
  }
}

function formatRelativeTime(dateVal) {
  if (!dateVal) return "";
  try {
    let d;
    if (dateVal.toMillis) {
      d = new Date(dateVal.toMillis());
    } else if (dateVal.seconds) {
      d = new Date(dateVal.seconds * 1000);
    } else if (dateVal instanceof Date) {
      d = dateVal;
    } else {
      d = new Date(dateVal);
    }
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch (e) {
    return "";
  }
}

// Facebook Feed Comments & Interactions State
const openCommentsMap = ref({});
const commentInputs = ref({});

function getAuthorInitial(email) {
  if (!email) return "U";
  const name = email.split("@")[0] || email;
  return name.charAt(0).toUpperCase();
}

function getAuthorDisplayName(email) {
  if (!email) return "Community Member";
  const name = email.split("@")[0] || email;
  return name;
}

function isCommentsOpen(bookmarkId) {
  return Boolean(openCommentsMap.value[bookmarkId]);
}

function toggleComments(bookmarkId) {
  openCommentsMap.value[bookmarkId] = !openCommentsMap.value[bookmarkId];
  if (openCommentsMap.value[bookmarkId] && !commentsMap.value[bookmarkId]) {
    loadComments(bookmarkId);
  }
}

async function submitComment(bookmarkId) {
  const text = (commentInputs.value[bookmarkId] || "").trim();
  if (!text) return;
  try {
    await addComment(bookmarkId, text);
    commentInputs.value[bookmarkId] = "";
    showToast("Comment posted!");
  } catch (err) {
    showToast("Failed to post comment");
  }
}

async function handleDeleteComment(bookmarkId, commentId) {
  if (confirm("Delete this comment?")) {
    try {
      await deleteComment(bookmarkId, commentId);
      showToast("Comment deleted");
    } catch (err) {
      showToast("Failed to delete comment");
    }
  }
}

function ensureHttpUrl(url) {
  if (!url) return "#";
  const trimmed = String(url).trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function openExternalLink(url) {
  if (!url) return;
  const target = ensureHttpUrl(url);
  window.open(target, "_blank", "noopener,noreferrer");
}

function hasUserLiked(item) {
  if (!item) return false;
  const userIdentifier = normalizeEmail(authUser.value?.email) || userId.value || "guest";
  return Boolean(item.likes && Array.isArray(item.likes) && item.likes.includes(userIdentifier));
}

async function handleToggleLike(item) {
  await toggleLike(item, selectedFolderFilter.value === "FEED" && feedTab.value === "public");
}

const filteredPublicBookmarks = computed(() => {
  let list = [...publicBookmarks.value];
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    return list.filter(
      (b) =>
        (b.name || "").toLowerCase().includes(q) ||
        (b.folderName || "").toLowerCase().includes(q) ||
        (b.link || "").toLowerCase().includes(q) ||
        (b.notes || "").toLowerCase().includes(q) ||
        (b.authorEmail || "").toLowerCase().includes(q)
    );
  }
  return list;
});

const friendsSharedBookmarks = computed(() => {
  let list = bookmarks.value.filter(
    (b) => b.shared || b.folderName === "Shared with Me" || b.sharedFrom || b.fromEmail
  );
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    return list.filter(
      (b) =>
        (b.name || "").toLowerCase().includes(q) ||
        (b.folderName || "").toLowerCase().includes(q) ||
        (b.link || "").toLowerCase().includes(q) ||
        (b.notes || "").toLowerCase().includes(q) ||
        (b.sharedFrom || "").toLowerCase().includes(q) ||
        (b.fromEmail || "").toLowerCase().includes(q)
    );
  }
  return list;
});

// Keyboard shortcuts
function handleKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    searchInputRef.value?.focus();
    return;
  }
  if (e.key === "Escape") {
    if (isEditLabelsModalOpen.value) {
      closeEditLabelsModal();
      return;
    }
    if (isCreatingNote.value) {
      closeNoteCreator();
    }
    if (isEditModalOpen.value) {
      isEditModalOpen.value = false;
    }
    showGoogleAppsMenu.value = false;
    activeColorPickerCardId.value = null;
  }
}

// Custom Labels / Folders
const customLabels = ref([]);

function loadCustomLabels() {
  try {
    const key = `bkmark_custom_labels_${authUser.value?.uid || "guest"}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        customLabels.value = parsed.filter(Boolean);
      }
    }
  } catch (e) {}
}

function saveCustomLabels() {
  try {
    const key = `bkmark_custom_labels_${authUser.value?.uid || "guest"}`;
    localStorage.setItem(key, JSON.stringify(customLabels.value));
  } catch (e) {}
}

const availableFolders = computed(() => {
  const set = new Set();
  bookmarks.value.forEach((b) => {
    const f = (b.folderName || "").trim();
    if (f && f !== "General") set.add(f);
  });
  customLabels.value.forEach((f) => {
    const trimmed = (f || "").trim();
    if (trimmed && trimmed !== "General") set.add(trimmed);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
});

// Edit Labels Modal
const isEditLabelsModalOpen = ref(false);
const newLabelInput = ref("");
const newLabelInputRef = ref(null);
const newLabelError = ref("");
const editingLabelOriginal = ref(null);
const editingLabelText = ref("");
const editingLabelInputRef = ref(null);
const labelTargetContext = ref(null);

function promptCreateFolder(context = null) {
  labelTargetContext.value = context;
  newLabelInput.value = "";
  newLabelError.value = "";
  editingLabelOriginal.value = null;
  isEditLabelsModalOpen.value = true;
  nextTick(() => {
    newLabelInputRef.value?.focus();
  });
}

function closeEditLabelsModal() {
  isEditLabelsModalOpen.value = false;
  newLabelInput.value = "";
  newLabelError.value = "";
  cancelRenameLabel();
}

function createNewLabel() {
  const name = newLabelInput.value.trim();
  if (!name) return;

  if (name.toLowerCase() === "general") {
    newLabelError.value = "'General' is a default label";
    return;
  }

  const exists = availableFolders.value.some(
    (f) => f.toLowerCase() === name.toLowerCase()
  );
  if (exists) {
    newLabelError.value = `Label "${name}" already exists`;
    return;
  }

  customLabels.value.push(name);
  saveCustomLabels();
  showToast(`Created label "${name}"`);

  if (labelTargetContext.value === "create") {
    newFolder.value = name;
  } else if (labelTargetContext.value === "edit") {
    editFolder.value = name;
  }

  newLabelInput.value = "";
  newLabelError.value = "";
}

function startRenameLabel(folder) {
  editingLabelOriginal.value = folder;
  editingLabelText.value = folder;
  nextTick(() => {
    editingLabelInputRef.value?.focus();
  });
}

function cancelRenameLabel() {
  editingLabelOriginal.value = null;
  editingLabelText.value = "";
}

async function saveRenameLabel(oldName) {
  const newName = editingLabelText.value.trim();
  if (!newName || newName === oldName) {
    cancelRenameLabel();
    return;
  }

  if (newName.toLowerCase() === "general") {
    showToast("'General' is a default label");
    return;
  }

  const exists = availableFolders.value.some(
    (f) => f.toLowerCase() === newName.toLowerCase() && f !== oldName
  );
  if (exists) {
    showToast(`Label "${newName}" already exists`);
    return;
  }

  const idx = customLabels.value.findIndex((f) => f === oldName);
  if (idx !== -1) {
    customLabels.value[idx] = newName;
  } else {
    customLabels.value.push(newName);
  }
  saveCustomLabels();

  const affected = bookmarks.value.filter((b) => (b.folderName || "General") === oldName);
  for (const b of affected) {
    try {
      await updateBookmark(b.id, { ...b, folderName: newName });
    } catch (e) {}
  }

  if (selectedFolderFilter.value === oldName) {
    selectedFolderFilter.value = newName;
  }
  if (newFolder.value === oldName) {
    newFolder.value = newName;
  }
  if (editFolder.value === oldName) {
    editFolder.value = newName;
  }

  cancelRenameLabel();
  showToast(`Renamed to "${newName}"`);
}

async function deleteFolderLabel(folder) {
  customLabels.value = customLabels.value.filter((f) => f !== folder);
  saveCustomLabels();

  const affected = bookmarks.value.filter((b) => (b.folderName || "General") === folder);
  for (const b of affected) {
    try {
      await updateBookmark(b.id, { ...b, folderName: "General" });
    } catch (e) {}
  }

  if (selectedFolderFilter.value === folder) {
    selectedFolderFilter.value = "ALL";
  }
  if (newFolder.value === folder) {
    newFolder.value = "General";
  }
  if (editFolder.value === folder) {
    editFolder.value = "General";
  }

  if (editingLabelOriginal.value === folder) {
    cancelRenameLabel();
  }

  showToast(`Deleted label "${folder}"`);
}

watch(isDark, () => {
  syncDocumentDarkMode();
});

watch(authUser, async (user) => {
  loadCustomLabels();
  if (user && typeof window !== "undefined" && window.location.search.includes("ext_auth=1")) {
    try {
      const idToken = await user.getIdToken();
      window.postMessage(
        {
          type: "BKMARK_EXTENSION_AUTH_EVENT",
          user: {
            userId: user.uid,
            email: user.email,
            idToken,
            refreshToken: user.refreshToken,
            expiresAt: Date.now() + 3600 * 1000,
          },
        },
        "*"
      );
    } catch (e) {}
  }
});

onMounted(() => {
  checkMobile();
  window.addEventListener("resize", handleResize);
  initAuth();
  loadCustomLabels();
  try {
    const savedDark = localStorage.getItem("googleKeepDark");
    if (savedDark === "true") {
      isDark.value = true;
    } else {
      isDark.value = false;
    }
  } catch (e) {}
  syncDocumentDarkMode();
  window.addEventListener("keydown", handleKeydown);

  // Handle URL query parameters from extension or external links (e.g. ?add_url=... or ?url=...)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const incomingUrl = urlParams.get("add_url") || urlParams.get("url");
    const incomingTitle = urlParams.get("add_title") || urlParams.get("title");
    const incomingFolder = urlParams.get("add_folder") || urlParams.get("folder");
    if (incomingUrl) {
      newLink.value = incomingUrl;
      if (incomingTitle) newTitle.value = incomingTitle;
      if (incomingFolder) newFolder.value = incomingFolder;
      expandNoteCreator();
      showToast("Adding bookmark from extension...");
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    if (authUser.value && window.location.search.includes("ext_auth=1")) {
      authUser.value.getIdToken().then((idToken) => {
        window.postMessage(
          {
            type: "BKMARK_EXTENSION_AUTH_EVENT",
            user: {
              userId: authUser.value.uid,
              email: authUser.value.email,
              idToken,
              refreshToken: authUser.value.refreshToken,
              expiresAt: Date.now() + 3600 * 1000,
            },
          },
          "*"
        );
      }).catch(() => {});
    }
  } catch (e) {}
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
  window.removeEventListener("keydown", handleKeydown);
  if (selectedTheme?.value) {
    applyThemeToDocument(selectedTheme.value);
  }
});
</script>

<template>
  <div
    :class="[
      isDark ? 'dark bg-[#202124] text-[#e8eaed]' : 'bg-[#fcfcfd] text-[#202124]',
      'min-h-screen font-google flex flex-col transition-colors duration-150 selection:bg-[#feefc0] selection:text-[#202124]'
    ]"
  >
    <!-- Toast Notification Float -->
    <transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="toastMessage"
        class="fixed bottom-6 left-6 z-[200] flex items-center gap-2 rounded-lg bg-[#323232] text-white px-3.5 py-2.5 text-xs font-medium border border-white/10"
      >
        <span class="text-amber-400 text-xs">●</span>
        <span>{{ toastMessage }}</span>
      </div>
    </transition>

    <!-- Account & Sharing Modal -->
    <AccountModal
      :open="accountModalOpen"
      :authUser="authUser"
      :bookmarks="bookmarks"
      :friends="friends"
      :friendsLoading="friendsLoading"
      :friendRequests="friendRequests"
      :requestsLoading="requestsLoading"
      :friendEmail="friendEmail"
      :shareEmail="shareEmail"
      :selectedBookmarkId="selectedShareBookmarkId"
      :actionError="accountActionError"
      :actionSuccess="accountActionSuccess"
      :isDark="isDark"
      @close="closeAccountModal"
      @logout="logout"
      @update:friendEmail="(val) => (friendEmail = val)"
      @update:shareEmail="(val) => (shareEmail = val)"
      @update:selectedBookmarkId="(val) => (selectedShareBookmarkId = val)"
      @add-friend="addFriendByEmail"
      @remove-friend="removeFriend"
      @approve-request="approveFriendRequest"
      @delete-request="deleteFriendRequest"
      @share-bookmark="shareBookmarkByEmail"
    />

    <!-- Initial Loading State -->
    <div
      v-if="authLoading"
      class="fixed inset-0 flex flex-col items-center justify-center z-50 pointer-events-none"
    >
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-500"></div>
    </div>

    <!-- Authenticated bk Keep Workspace -->
    <div v-else-if="authUser" class="flex-1 flex flex-col">
      <!-- Minimal Flat Header -->
      <header
        :class="isDark ? 'border-[#3c4043] bg-[#202124]' : 'border-[#e0e0e0] bg-white'"
        class="sticky top-0 z-40 border-b px-3 sm:px-4 py-2 flex items-center justify-between gap-2 sm:gap-4 transition-colors select-none"
      >
        <!-- Mobile Search Mode Active Bar -->
        <div v-if="isMobileSearchActive" class="flex items-center gap-2 w-full">
          <button
            @click="closeMobileSearch"
            type="button"
            :class="isDark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'"
            class="h-9 w-9 rounded-lg flex items-center justify-center transition flex-shrink-0 cursor-pointer"
            title="Back"
          >
            <svg class="h-5 w-5 fill-current" viewBox="0 0 24 24">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>

          <input
            ref="mobileSearchInputRef"
            v-model="searchQuery"
            @keydown.enter.prevent="handleSearchEnter"
            type="text"
            placeholder="Search bookmarks"
            :class="isDark ? 'text-[#e8eaed] placeholder-[#9aa0a6]' : 'text-[#202124] placeholder-[#5f6368]'"
            class="flex-1 bg-transparent border-0 outline-none px-2 text-sm"
          />

          <!-- Quick Google search button on mobile if no bookmarks found -->
          <button
            v-if="searchQuery.trim() && filteredBookmarks.length === 0"
            @click="searchGoogle(searchQuery)"
            type="button"
            :class="isDark ? 'text-amber-300 hover:bg-white/10' : 'text-amber-700 hover:bg-amber-100'"
            class="h-8 px-2 rounded-lg flex items-center gap-1 transition flex-shrink-0 cursor-pointer text-xs font-medium"
            title="Search Google"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
          </button>

          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            type="button"
            :class="isDark ? 'text-[#9aa0a6] hover:bg-[#3c4043]' : 'text-[#5f6368] hover:bg-gray-200'"
            class="h-8 w-8 rounded-lg flex items-center justify-center transition flex-shrink-0 cursor-pointer"
            title="Clear search"
          >
            <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <!-- Normal Header View -->
        <template v-else>
          <!-- Left: Hamburger + bk Keep Logo -->
          <div class="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              @click="isSidebarOpen = !isSidebarOpen"
              type="button"
              :class="isDark ? 'hover:bg-[#303134] text-[#9aa0a6]' : 'hover:bg-gray-100 text-[#5f6368]'"
              class="h-9 w-9 rounded-lg flex items-center justify-center transition cursor-pointer"
              title="Main menu"
            >
              <svg class="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
              </svg>
            </button>

            <!-- Brand Identifier with Keep Icon + Name -->
            <div
              @click="selectedFolderFilter = 'ALL'"
              class="flex items-center gap-2 cursor-pointer select-none"
              title="bkMark Keep"
            >
              <div class="w-7 h-7 rounded-lg bg-amber-400/20 flex items-center justify-center text-amber-500">
                <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6A5.006 5.006 0 0 1 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z"/>
                </svg>
              </div>
              <span class="text-base font-semibold tracking-tight" :class="isDark ? 'text-gray-100' : 'text-gray-800'">
                bk<span class="text-amber-500 font-bold">Keep</span>
              </span>
            </div>
          </div>

          <!-- Center: Minimal Search Input -->
          <div class="hidden sm:flex flex-1 max-w-[640px] mx-2 sm:mx-6">
            <div
              :class="[
                isDark
                  ? 'bg-[#303134] border-[#3c4043] focus-within:border-amber-400/50'
                  : 'bg-[#f1f3f4] border-transparent focus-within:bg-white focus-within:border-[#dadce0]',
                'w-full relative flex items-center rounded-xl h-10 transition-colors px-3 border'
              ]"
            >
              <button
                @click="onSearchIconClick"
                type="button"
                :class="isDark ? 'text-[#9aa0a6]' : 'text-[#5f6368]'"
                class="p-1 rounded cursor-pointer"
                :title="searchQuery.trim() ? (filteredBookmarks.length > 0 ? 'Open bookmark' : 'Search Google') : 'Search'"
              >
                <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
              </button>

              <input
                ref="searchInputRef"
                v-model="searchQuery"
                @keydown.enter.prevent="handleSearchEnter"
                type="text"
                placeholder="Search bookmarks"
                :class="isDark ? 'text-[#e8eaed] placeholder-[#9aa0a6]' : 'text-[#202124] placeholder-[#5f6368]'"
                class="w-full bg-transparent border-0 outline-none px-2.5 text-sm"
              />

              <!-- Search Google pill when no bookmarks found -->
              <button
                v-if="searchQuery.trim() && filteredBookmarks.length === 0"
                @click="searchGoogle(searchQuery)"
                type="button"
                :class="isDark ? 'bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border-amber-400/30' : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-200'"
                class="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium cursor-pointer transition flex-shrink-0 border mr-1"
                title="No bookmark found. Press Enter or click to search Google"
              >
                <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span class="hidden md:inline text-[11px] font-normal">Search Google ↵</span>
              </button>

              <span
                v-if="!searchQuery"
                :class="isDark ? 'text-gray-500' : 'text-gray-400'"
                class="hidden md:inline-block text-[10px] font-mono px-1 rounded font-medium"
              >
                Ctrl+K
              </span>

              <button
                v-if="searchQuery"
                @click="searchQuery = ''"
                type="button"
                :class="isDark ? 'text-[#9aa0a6] hover:bg-[#3c4043]' : 'text-[#5f6368] hover:bg-gray-200'"
                class="p-1 rounded transition cursor-pointer"
                title="Clear search"
              >
                <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Right: Action Icons & Avatar -->
          <div class="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            <!-- Mobile Search Icon -->
            <button
              @click="openMobileSearch"
              type="button"
              :class="isDark ? 'hover:bg-[#303134] text-[#9aa0a6]' : 'hover:bg-gray-100 text-[#5f6368]'"
              class="sm:hidden h-8 w-8 rounded-lg flex items-center justify-center transition cursor-pointer"
              title="Search"
            >
              <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
            </button>

            <!-- Refresh Button -->
            <button
              @click="bookmarksLoading = true; initAuth(); showToast('Refreshed')"
              type="button"
              :class="isDark ? 'hover:bg-[#303134] text-[#9aa0a6]' : 'hover:bg-gray-100 text-[#5f6368]'"
              class="hidden md:flex h-9 w-9 rounded-lg items-center justify-center transition cursor-pointer"
              title="Refresh"
            >
              <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
            </button>

            <!-- Grid / List View Toggle -->
            <button
              @click="viewMode = viewMode === 'grid' ? 'list' : 'grid'"
              type="button"
              :class="isDark ? 'hover:bg-[#303134] text-[#9aa0a6]' : 'hover:bg-gray-100 text-[#5f6368]'"
              class="h-8 w-8 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center transition cursor-pointer"
              :title="viewMode === 'grid' ? 'List view' : 'Grid view'"
            >
              <svg v-if="viewMode === 'grid'" class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M4 11h5V5H4v6zm0 7h5v-6H4v6zm6 0h5v-6h-5v6zm6 0h5v-6h-5v6zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z"/>
              </svg>
              <svg v-else class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
              </svg>
            </button>

            <!-- Dark / Light Mode Toggle -->
            <button
              @click="toggleDarkMode"
              type="button"
              :class="isDark ? 'hover:bg-[#303134] text-[#9aa0a6]' : 'hover:bg-gray-100 text-[#5f6368]'"
              class="h-8 w-8 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center transition cursor-pointer"
              :title="isDark ? 'Switch to Light theme' : 'Switch to Dark theme'"
            >
              <svg v-if="!isDark" class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-3.03 0-5.5-2.47-5.5-5.5 0-1.82.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
              </svg>
              <svg v-else class="h-4 w-4 fill-current text-amber-300" viewBox="0 0 24 24">
                <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
              </svg>
            </button>

            <!-- Profile Avatar -->
            <button
              @click="openAccountModal"
              type="button"
              class="relative h-8 w-8 rounded-full border border-amber-500/40 hover:border-amber-500 flex items-center justify-center bg-amber-500 text-slate-950 font-bold text-xs transition cursor-pointer select-none"
              title="bk Keep Account & Sync"
            >
              <img
                v-if="userAvatarUrl && !avatarLoadFailed"
                :src="userAvatarUrl"
                alt="Profile photo"
                class="w-full h-full object-cover rounded-full"
                referrerpolicy="no-referrer"
                @error="avatarLoadFailed = true"
              />
              <span v-else>{{ authUser?.email?.charAt(0).toUpperCase() || 'G' }}</span>

              <span
                v-if="friendRequests.length > 0"
                class="absolute -top-1 -right-1 min-w-3.5 h-3.5 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center z-10 ring-2 ring-white dark:ring-[#202124]"
              >
                {{ friendRequests.length }}
              </span>
            </button>

            <!-- Logout Button -->
            <button
              @click="logout"
              type="button"
              :class="isDark ? 'hover:bg-[#303134] text-[#9aa0a6] hover:text-red-400' : 'hover:bg-gray-100 text-[#5f6368] hover:text-red-600'"
              class="h-8 w-8 sm:h-9 sm:w-9 rounded-lg flex items-center justify-center transition cursor-pointer"
              title="Sign out of bk Keep"
              aria-label="Sign out"
            >
              <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
            </button>
          </div>
        </template>
      </header>

      <!-- Main Workspace: Sidebar + Notes Canvas -->
      <div class="flex-1 flex overflow-hidden relative">
        <!-- Mobile Drawer Backdrop Overlay -->
        <div
          v-if="isSidebarOpen && isMobile"
          @click="isSidebarOpen = false"
          class="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-150"
        ></div>

        <!-- Left Navigation Drawer (Flat, Minimal) -->
        <aside
          :class="[
            isMobile
              ? [
                  'fixed inset-y-0 left-0 z-50 w-64 border-r transition-transform duration-200 ease-in-out',
                  isSidebarOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
                ]
              : [
                  isSidebarOpen ? 'w-60' : 'w-16 hidden sm:block',
                  'flex-shrink-0 transition-all duration-200 z-30'
                ],
            isDark ? 'bg-[#202124] border-[#3c4043]' : 'bg-white border-[#e0e0e0]',
            'py-3 pr-2 select-none overflow-y-auto'
          ]"
        >
          <!-- Mobile Drawer Header -->
          <div
            v-if="isMobile"
            class="flex items-center justify-between px-4 pb-3 mb-2 border-b"
            :class="isDark ? 'border-white/10' : 'border-slate-200'"
          >
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold" :class="isDark ? 'text-white' : 'text-slate-900'">bk<span class="text-amber-500">Keep</span></span>
            </div>
            <button
              @click="isSidebarOpen = false"
              type="button"
              :class="isDark ? 'hover:bg-[#303134] text-[#9aa0a6]' : 'hover:bg-gray-100 text-[#5f6368]'"
              class="h-7 w-7 rounded-lg flex items-center justify-center transition cursor-pointer"
              title="Close menu"
            >
              <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          <div class="space-y-0.5">
            <!-- Bookmarks (All) -->
            <button
              @click="selectFolder('ALL')"
              type="button"
              :class="[
                selectedFolderFilter === 'ALL'
                  ? isDark
                    ? 'bg-[#41331c] text-[#feefc0] font-semibold'
                    : 'bg-[#feefc0] text-[#202124] font-semibold'
                  : isDark
                    ? 'text-[#e8eaed] hover:bg-[#303134]'
                    : 'text-[#202124] hover:bg-[#f1f3f4]',
                'w-full flex items-center gap-5 rounded-r-full py-2.5 px-4 text-xs sm:text-sm transition text-left cursor-pointer'
              ]"
            >
              <svg class="h-5 w-5 flex-shrink-0 fill-current" viewBox="0 0 24 24">
                <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6A5.006 5.006 0 0 1 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z"/>
              </svg>
              <span v-if="isSidebarOpen || isMobile" class="truncate flex-1">Bookmarks</span>
              <span v-if="(isSidebarOpen || isMobile) && totalCount > 0" class="text-xs opacity-75 font-normal">
                {{ totalCount }}
              </span>
            </button>

            <!-- Recent -->
            <button
              @click="selectFolder('RECENT')"
              type="button"
              :class="[
                selectedFolderFilter === 'RECENT'
                  ? isDark
                    ? 'bg-[#41331c] text-[#feefc0] font-semibold'
                    : 'bg-[#feefc0] text-[#202124] font-semibold'
                  : isDark
                    ? 'text-[#e8eaed] hover:bg-[#303134]'
                    : 'text-[#202124] hover:bg-[#f1f3f4]',
                'w-full flex items-center gap-5 rounded-r-full py-2.5 px-4 text-xs sm:text-sm transition text-left cursor-pointer'
              ]"
            >
              <svg class="h-5 w-5 flex-shrink-0 fill-current" viewBox="0 0 24 24">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
              </svg>
              <span v-if="isSidebarOpen || isMobile" class="truncate">Recent</span>
            </button>

            <!-- Shared with Me -->
            <button
              @click="selectFolder('SHARED')"
              type="button"
              :class="[
                selectedFolderFilter === 'SHARED'
                  ? isDark
                    ? 'bg-[#41331c] text-[#feefc0] font-semibold'
                    : 'bg-[#feefc0] text-[#202124] font-semibold'
                  : isDark
                    ? 'text-[#e8eaed] hover:bg-[#303134]'
                    : 'text-[#202124] hover:bg-[#f1f3f4]',
                'w-full flex items-center gap-5 rounded-r-full py-2.5 px-4 text-xs sm:text-sm transition text-left cursor-pointer'
              ]"
            >
              <svg class="h-5 w-5 flex-shrink-0 fill-current" viewBox="0 0 24 24">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
              <span v-if="isSidebarOpen || isMobile" class="truncate flex-1">Shared</span>
              <span v-if="(isSidebarOpen || isMobile) && sharedCount > 0" class="text-xs opacity-75 font-normal">
                {{ sharedCount }}
              </span>
            </button>

            <!-- Feed -->
            <button
              @click="selectFolder('FEED')"
              type="button"
              :class="[
                selectedFolderFilter === 'FEED'
                  ? isDark
                    ? 'bg-[#41331c] text-[#feefc0] font-semibold'
                    : 'bg-[#feefc0] text-[#202124] font-semibold'
                  : isDark
                    ? 'text-[#e8eaed] hover:bg-[#303134]'
                    : 'text-[#202124] hover:bg-[#f1f3f4]',
                'w-full flex items-center gap-5 rounded-r-full py-2.5 px-4 text-xs sm:text-sm transition text-left cursor-pointer'
              ]"
            >
              <svg class="h-5 w-5 flex-shrink-0 fill-current" viewBox="0 0 24 24">
                <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zm-8-3h8v-2h-8v2zm0-4h8V7h-8v2zm-6-2h4v6H6z"/>
              </svg>
              <span v-if="isSidebarOpen || isMobile" class="truncate flex-1">Feed</span>
              <span v-if="(isSidebarOpen || isMobile) && publicBookmarks.length > 0" class="text-xs opacity-75 font-normal">
                {{ publicBookmarks.length }}
              </span>
            </button>
          </div>

          <!-- Separator -->
          <hr :class="isDark ? 'border-[#3c4043]' : 'border-[#e0e0e0]'" class="my-3" />

          <!-- LABELS SECTION -->
          <div v-if="isSidebarOpen || isMobile" class="px-4 py-1 flex items-center justify-between">
            <span :class="isDark ? 'text-[#9aa0a6]' : 'text-[#5f6368]'" class="text-[10px] font-semibold uppercase tracking-wider">
              Labels
            </span>
            <button
              @click="promptCreateFolder"
              type="button"
              class="text-xs text-amber-500 hover:text-amber-600 font-semibold cursor-pointer"
              title="Create label"
            >
              + New
            </button>
          </div>

          <!-- Folder Label List Items -->
          <div class="space-y-0.5">
            <button
              v-for="folder in availableFolders"
              :key="folder"
              @click="selectFolder(folder)"
              type="button"
              :class="[
                selectedFolderFilter === folder
                  ? isDark
                    ? 'bg-[#41331c] text-[#feefc0] font-semibold'
                    : 'bg-[#feefc0] text-[#202124] font-semibold'
                  : isDark
                    ? 'text-[#e8eaed] hover:bg-[#303134]'
                    : 'text-[#202124] hover:bg-[#f1f3f4]',
                'w-full flex items-center gap-5 rounded-r-full py-2 px-4 text-xs sm:text-sm transition text-left cursor-pointer'
              ]"
              :title="folder"
            >
              <svg class="h-4 w-4 flex-shrink-0 fill-current opacity-70" viewBox="0 0 24 24">
                <path d="M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16zM16 17H5V7h11l3.55 5L16 17z"/>
              </svg>
              <span v-if="isSidebarOpen || isMobile" class="truncate flex-1">{{ folder }}</span>
              <span v-if="isSidebarOpen || isMobile" class="text-xs opacity-60">
                {{ getFolderCount(folder) }}
              </span>
            </button>

            <!-- Edit Labels Button -->
            <button
              @click="promptCreateFolder(); if (isMobile) isSidebarOpen = false;"
              type="button"
              :class="isDark ? 'text-[#e8eaed] hover:bg-[#303134]' : 'text-[#202124] hover:bg-[#f1f3f4]'"
              class="w-full flex items-center gap-5 rounded-r-full py-2 px-4 text-xs sm:text-sm transition text-left cursor-pointer"
            >
              <svg class="h-4 w-4 flex-shrink-0 fill-current opacity-70" viewBox="0 0 24 24">
                <path d="M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83 3.75 3.75 1.84-1.84zM3 17.25V21h3.75L17.81 9.93l-3.75-3.75L3 17.25z"/>
              </svg>
              <span v-if="isSidebarOpen || isMobile" class="truncate">Edit labels</span>
            </button>
          </div>
        </aside>

        <!-- Main Notes Stream Canvas -->
        <main class="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 py-5 sm:py-6 pb-28 space-y-6">
          <!-- ============================================== -->
          <!-- FEED VIEW (Google Keep Style Public & Private) -->
          <!-- ============================================== -->
          <div v-if="selectedFolderFilter === 'FEED'" class="space-y-6">
            <!-- Feed Tabs Header (Google Keep Segmented Pill Style) -->
            <div class="max-w-3xl mx-auto flex items-center justify-center">
              <!-- Keep Style Segmented Switch -->
              <div
                :class="isDark ? 'bg-[#202124] border-[#3c4043]' : 'bg-white border-[#dadce0]'"
                class="inline-flex p-1 rounded-xl border shadow-none"
              >
                <!-- Public Tab -->
                <button
                  @click="feedTab = 'public'"
                  type="button"
                  :class="[
                    feedTab === 'public'
                      ? isDark
                        ? 'bg-[#41331c] text-[#feefc0] font-semibold'
                        : 'bg-[#feefc0] text-[#202124] font-semibold'
                      : isDark
                        ? 'text-[#9aa0a6] hover:text-[#e8eaed] hover:bg-[#303134]'
                        : 'text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4]',
                    'flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-xs sm:text-sm font-medium transition cursor-pointer'
                  ]"
                >
                  <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                  <span>Public</span>
                  <span
                    :class="feedTab === 'public'
                      ? (isDark ? 'bg-amber-400/20 text-[#feefc0]' : 'bg-black/10 text-[#202124]')
                      : (isDark ? 'bg-white/10 text-gray-300' : 'bg-black/5 text-gray-700')"
                    class="px-2 py-0.5 rounded-full text-[10px] font-medium"
                  >
                    {{ filteredPublicBookmarks.length }}
                  </span>
                </button>

                <!-- Private Tab -->
                <button
                  @click="feedTab = 'private'"
                  type="button"
                  :class="[
                    feedTab === 'private'
                      ? isDark
                        ? 'bg-[#41331c] text-[#feefc0] font-semibold'
                        : 'bg-[#feefc0] text-[#202124] font-semibold'
                      : isDark
                        ? 'text-[#9aa0a6] hover:text-[#e8eaed] hover:bg-[#303134]'
                        : 'text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4]',
                    'flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-xs sm:text-sm font-medium transition cursor-pointer'
                  ]"
                >
                  <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                  </svg>
                  <span>Private</span>
                  <span
                    :class="feedTab === 'private'
                      ? (isDark ? 'bg-amber-400/20 text-[#feefc0]' : 'bg-black/10 text-[#202124]')
                      : (isDark ? 'bg-white/10 text-gray-300' : 'bg-black/5 text-gray-700')"
                    class="px-2 py-0.5 rounded-full text-[10px] font-medium"
                  >
                    {{ friendsSharedBookmarks.length }}
                  </span>
                </button>
              </div>
            </div>

            <!-- ============================================== -->
            <!-- FACEBOOK STYLE FEED VIEW (Public & Private)    -->
            <!-- ============================================== -->
            <div class="max-w-[620px] mx-auto space-y-4">
              <!-- Facebook Style "Create Post" Composer Card -->
              <div
                :class="isDark ? 'bg-[#242526] border-[#3a3b3c]' : 'bg-white border-[#dadce0]'"
                class="rounded-xl border p-3.5 shadow-xs space-y-3"
              >
                <!-- Top row: Avatar + Input button -->
                <div class="flex items-center gap-2.5">
                  <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-white font-bold flex items-center justify-center flex-shrink-0 text-sm shadow-xs overflow-hidden">
                    <img
                      v-if="userAvatarUrl && !avatarLoadFailed"
                      :src="userAvatarUrl"
                      alt="Profile photo"
                      class="w-full h-full object-cover rounded-full"
                      referrerpolicy="no-referrer"
                      @error="avatarLoadFailed = true"
                    />
                    <span v-else>{{ getAuthorInitial(authUser?.email) }}</span>
                  </div>

                  <button
                    @click="openCreatePostModal(false)"
                    type="button"
                    :class="isDark ? 'bg-[#3a3b3c] hover:bg-[#4e4f50] text-gray-300' : 'bg-[#f0f2f5] hover:bg-[#e4e6e9] text-gray-500'"
                    class="flex-1 text-left px-4 py-2.5 rounded-full text-xs sm:text-sm font-normal transition cursor-pointer"
                  >
                    Share a bookmark or link to the {{ feedTab }} feed...
                  </button>
                </div>

                <!-- Quick actions row -->
                <div :class="isDark ? 'border-[#3a3b3c]' : 'border-gray-200'" class="flex items-center justify-around pt-2 border-t">
                  <button
                    @click="openCreatePostModal(false)"
                    type="button"
                    :class="isDark ? 'hover:bg-[#3a3b3c] text-gray-300' : 'hover:bg-gray-100 text-gray-600'"
                    class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
                  >
                    <svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
                    </svg>
                    <span>Paste Link</span>
                  </button>

                  <button
                    v-if="bookmarks.length > 0"
                    @click="openCreatePostModal(true)"
                    type="button"
                    :class="isDark ? 'hover:bg-[#3a3b3c] text-gray-300' : 'hover:bg-gray-100 text-gray-600'"
                    class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
                  >
                    <svg class="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                    </svg>
                    <span>From My Saved</span>
                  </button>

                  <button
                    @click="openCreatePostModal(false)"
                    type="button"
                    :class="isDark ? 'hover:bg-[#3a3b3c] text-gray-300' : 'hover:bg-gray-100 text-gray-600'"
                    class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
                  >
                    <svg class="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/>
                    </svg>
                    <span>Topic</span>
                  </button>
                </div>
              </div>

              <!-- Expandable Post Composer Modal / Box -->
              <Teleport to="body">
                <transition name="modal-bounce" :duration="{ enter: 380, leave: 200 }">
                  <div
                    v-if="isCreatingPublicNote"
                    class="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen min-h-screen z-[999] flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm m-0 overflow-y-auto"
                    @click.self="closeCreatePostModal"
                  >
                    <div
                      :class="isDark ? 'bg-[#242526] border-[#3a3b3c] text-gray-100' : 'bg-white border-[#dadce0] text-gray-900'"
                      class="modal-card-animate w-full max-w-lg rounded-2xl border shadow-xl overflow-hidden space-y-4 my-auto"
                    >
                    <!-- Modal Header -->
                    <div :class="isDark ? 'border-[#3a3b3c]' : 'border-gray-200'" class="p-4 border-b flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="text-base font-bold">Create Post</span>
                      </div>
                      <button
                        @click="closeCreatePostModal"
                        type="button"
                        :class="isDark ? 'bg-[#3a3b3c] hover:bg-[#4e4f50] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'"
                        class="w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <div class="p-4 pt-0 space-y-3 max-h-[75vh] overflow-y-auto">
                      <!-- User Header -->
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-white font-bold flex items-center justify-center flex-shrink-0 text-sm overflow-hidden">
                          <img
                            v-if="userAvatarUrl && !avatarLoadFailed"
                            :src="userAvatarUrl"
                            alt="Profile photo"
                            class="w-full h-full object-cover rounded-full"
                            referrerpolicy="no-referrer"
                            @error="avatarLoadFailed = true"
                          />
                          <span v-else>{{ getAuthorInitial(authUser?.email) }}</span>
                        </div>
                        <div>
                          <div class="text-sm font-semibold">
                            {{ authUser?.email || "Anonymous" }}
                          </div>
                          <div
                            :class="isDark ? 'bg-[#3a3b3c] text-gray-300' : 'bg-gray-100 text-gray-700'"
                            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                          >
                            <svg class="w-3 h-3 fill-current" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                            </svg>
                            <span>{{ feedTab === 'public' ? 'Public Feed' : 'Friends Feed' }}</span>
                          </div>
                        </div>
                      </div>

                      <!-- Searchable Quick Pick Dropdown -->
                      <div v-if="bookmarks.length > 0" class="pt-1 relative">
                        <div
                          @click="isComposerBookmarkDropdownOpen = !isComposerBookmarkDropdownOpen"
                          :class="isDark ? 'bg-[#2a2b2e] border-[#3c4043] text-gray-200 hover:border-[#4e4f50]' : 'bg-[#f8f9fa] border-gray-200 text-gray-700 hover:border-gray-300'"
                          class="w-full text-xs px-3 py-2.5 rounded-xl border flex items-center justify-between transition cursor-pointer select-none"
                        >
                          <div class="flex items-center gap-2.5 min-w-0 flex-1">
                            <div
                              v-if="selectedMyBookmarkObj"
                              class="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 bg-white shadow-2xs border border-gray-200/50 overflow-hidden"
                            >
                              <img
                                :src="getSiteIconUrl(selectedMyBookmarkObj.link)"
                                alt="icon"
                                class="w-3.5 h-3.5 object-contain"
                                @error="onFaviconError($event, selectedMyBookmarkObj.link)"
                              />
                            </div>
                            <svg v-else class="w-4 h-4 text-amber-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                            </svg>
                            <span class="truncate font-medium text-xs sm:text-sm">
                              {{ selectedMyBookmarkObj ? selectedMyBookmarkObj.name : '-- Or choose from your saved bookmarks --' }}
                            </span>
                            <span
                              v-if="selectedMyBookmarkObj && selectedMyBookmarkObj.folderName"
                              class="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] bg-black/5 dark:bg-white/10 font-mono text-gray-600 dark:text-gray-300"
                            >
                              #{{ selectedMyBookmarkObj.folderName }}
                            </span>
                          </div>

                          <div class="flex items-center gap-1.5 flex-shrink-0 pl-2">
                            <button
                              v-if="selectedMyBookmarkObj"
                              @click.stop="clearSelectedBookmarkToPublish"
                              type="button"
                              class="w-5 h-5 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition text-xs"
                              title="Clear selection"
                            >
                              ✕
                            </button>
                            <svg
                              :class="isComposerBookmarkDropdownOpen ? 'rotate-180 text-blue-500' : 'text-gray-400'"
                              class="w-4 h-4 transition-transform duration-150"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M7 10l5 5 5-5z"/>
                            </svg>
                          </div>
                        </div>

                        <!-- Searchable Dropdown Floating Panel -->
                        <div
                          v-if="isComposerBookmarkDropdownOpen"
                          :class="isDark ? 'bg-[#242526] border-[#3c4043] text-gray-200 shadow-2xl' : 'bg-white border-gray-200 text-gray-800 shadow-xl'"
                          class="absolute top-full left-0 right-0 mt-1.5 z-40 rounded-xl border p-2 space-y-2 max-h-64 flex flex-col overflow-hidden"
                        >
                          <!-- Search Bar of my own bookmarks -->
                          <div
                            :class="isDark ? 'bg-[#3a3b3c] border-[#4e4f50]' : 'bg-gray-100 border-gray-200'"
                            class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border flex-shrink-0"
                          >
                            <svg class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                            </svg>
                            <input
                              v-model="composerBookmarkSearch"
                              type="text"
                              placeholder="Search my bookmarks..."
                              :class="isDark ? 'text-gray-100 placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'"
                              class="w-full bg-transparent text-xs focus:outline-none"
                              autofocus
                            />
                            <button
                              v-if="composerBookmarkSearch"
                              @click="composerBookmarkSearch = ''"
                              type="button"
                              class="text-[11px] text-gray-400 hover:text-gray-200 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>

                          <!-- Scrollable Bookmarks List -->
                          <div class="overflow-y-auto space-y-0.5 flex-1 pr-0.5 max-h-48">
                            <button
                              v-if="selectedMyBookmarkObj"
                              @click="clearSelectedBookmarkToPublish(); isComposerBookmarkDropdownOpen = false;"
                              type="button"
                              :class="isDark ? 'hover:bg-[#3a3b3c] text-gray-400' : 'hover:bg-gray-100 text-gray-500'"
                              class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-2"
                            >
                              <span>✕</span>
                              <span>Clear selection (enter custom link below)</span>
                            </button>

                            <div
                              v-if="filteredComposerBookmarks.length === 0"
                              class="py-4 text-center text-xs text-gray-400"
                            >
                              No saved bookmarks match "{{ composerBookmarkSearch }}"
                            </div>

                            <button
                              v-for="b in filteredComposerBookmarks"
                              :key="b.id"
                              @click="selectExistingToPublish(b.id); isComposerBookmarkDropdownOpen = false;"
                              :class="[
                                String(selectedMyBookmarkToPublish) === String(b.id)
                                  ? (isDark ? 'bg-amber-400/20 text-amber-300 font-semibold' : 'bg-amber-50 text-amber-900 font-semibold')
                                  : (isDark ? 'hover:bg-[#3a3b3c] text-gray-200' : 'hover:bg-gray-100 text-gray-800'),
                                'w-full text-left px-2.5 py-2 rounded-lg text-xs transition cursor-pointer flex items-center justify-between gap-2.5'
                              ]"
                            >
                              <div class="flex items-center gap-2 min-w-0 flex-1">
                                <div class="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 bg-white overflow-hidden shadow-2xs">
                                  <img
                                    :src="getSiteIconUrl(b.link)"
                                    alt="icon"
                                    class="w-3.5 h-3.5 object-contain"
                                    @error="onFaviconError($event, b.link)"
                                  />
                                </div>
                                <div class="min-w-0 flex-1">
                                  <p class="truncate font-medium">{{ b.name }}</p>
                                  <p class="truncate text-[10px] text-gray-400 font-mono">{{ getDomain(b.link) }}</p>
                                </div>
                              </div>
                              <span
                                :class="isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-200/70 text-gray-600'"
                                class="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium"
                              >
                                {{ b.folderName || 'General' }}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <!-- Textarea (Post caption / thoughts about the link - with dedicated background color) -->
                      <textarea
                        v-model="publicNotes"
                        rows="3"
                        placeholder="Say something about this link..."
                        :class="isDark
                          ? 'bg-[#2a2b2e] border-[#3c4043] text-gray-100 placeholder-gray-500 focus:border-amber-400/60 focus:bg-[#323336]'
                          : 'bg-[#f8f9fa] border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:bg-white'"
                        class="w-full p-3 rounded-xl border text-sm resize-none outline-none leading-relaxed transition-colors shadow-2xs"
                      ></textarea>

                      <!-- URL Input -->
                      <div
                        :class="isDark ? 'bg-[#3a3b3c]/60 border-[#4e4f50]' : 'bg-gray-50 border-gray-200'"
                        class="flex items-center gap-2.5 px-3 py-2 rounded-xl border"
                      >
                        <svg class="w-4 h-4 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
                        </svg>
                        <input
                          v-model="publicLink"
                          @input="onPublicUrlInput"
                          type="url"
                          placeholder="Paste web link here (https://...)"
                          :class="isDark ? 'text-gray-100 placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'"
                          class="w-full bg-transparent text-xs sm:text-sm focus:outline-none"
                        />
                      </div>

                      <!-- Title & Tag row -->
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          v-model="publicTitle"
                          type="text"
                          placeholder="Link Title (e.g. GitHub)"
                          :class="isDark ? 'bg-[#3a3b3c]/60 border-[#4e4f50] text-gray-100 placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'"
                          class="text-xs px-3 py-2 rounded-xl border outline-none font-medium"
                        />
                        <input
                          v-model="publicFolder"
                          type="text"
                          placeholder="Topic Tag (e.g. Technology)"
                          :class="isDark ? 'bg-[#3a3b3c]/60 border-[#4e4f50] text-gray-100 placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'"
                          class="text-xs px-3 py-2 rounded-xl border outline-none font-medium"
                        />
                      </div>

                      <!-- Rich Link Preview inside Composer if URL is set -->
                      <div
                        v-if="publicLink"
                        :class="isDark ? 'bg-[#2a2b2d] border-[#3e4043]' : 'bg-[#faf9f6] border-[#e8e7e3]'"
                        class="rounded-xl border p-3 flex items-center gap-3"
                      >
                        <div class="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-xs border overflow-hidden">
                          <img
                            :src="getSiteIconUrl(publicLink)"
                            alt="icon"
                            class="w-5 h-5 object-contain"
                            @error="onFaviconError($event, publicLink)"
                          />
                        </div>
                        <div class="min-w-0 flex-1">
                          <div class="text-[10px] font-bold uppercase tracking-wider text-gray-500 truncate">
                            {{ getDomain(publicLink) }}
                          </div>
                          <div class="text-xs font-semibold truncate text-gray-900 dark:text-gray-100">
                            {{ publicTitle || getDomain(publicLink) }}
                          </div>
                          <div class="text-[11px] text-gray-500 truncate font-mono">
                            {{ publicLink }}
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Post Button -->
                    <div :class="isDark ? 'border-[#3a3b3c]' : 'border-gray-200'" class="p-4 border-t flex items-center justify-end gap-2">
                      <button
                        @click="closeCreatePostModal"
                        type="button"
                        :class="isDark ? 'hover:bg-[#3a3b3c] text-gray-300' : 'hover:bg-gray-100 text-gray-600'"
                        class="px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        @click="handlePublishPublic"
                        :disabled="isPublishingPublic || !publicLink.trim()"
                        type="button"
                        class="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold px-6 py-2 rounded-xl text-xs sm:text-sm transition cursor-pointer shadow-xs"
                      >
                        {{ isPublishingPublic ? 'Posting...' : 'Post' }}
                      </button>
                    </div>
                  </div>
                </div>
              </transition>
              </Teleport>

              <!-- FEED POSTS (Public or Private depending on tab) -->
              <!-- If Public tab -->
              <template v-if="feedTab === 'public'">
                <div v-if="filteredPublicBookmarks.length > 0" class="space-y-4">
                  <article
                    v-for="item in filteredPublicBookmarks"
                    :key="item.id"
                    :class="isDark ? 'bg-[#242526] border-[#3a3b3c]' : 'bg-white border-[#dadce0]'"
                    class="rounded-xl border shadow-xs overflow-hidden transition-all"
                  >
                    <!-- Post Header -->
                    <div class="p-3.5 pb-2 flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold flex items-center justify-center flex-shrink-0 text-sm shadow-xs">
                          {{ getAuthorInitial(item.authorEmail) }}
                        </div>

                        <div>
                          <div class="flex items-center gap-1.5">
                            <span :class="isDark ? 'text-gray-100' : 'text-gray-900'" class="text-sm font-semibold">
                              {{ item.authorEmail || "Community User" }}
                            </span>
                          </div>

                          <div :class="isDark ? 'text-gray-400' : 'text-gray-500'" class="flex items-center gap-1.5 text-[11px]">
                            <span>{{ formatRelativeTime(item.createdAt) || 'Recent' }}</span>
                            <span>•</span>
                            <span class="inline-flex items-center gap-1">
                              <svg class="w-3 h-3 fill-current opacity-70" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                              </svg>
                              Public
                            </span>
                            <span v-if="item.folderName && item.folderName !== 'General'" class="ml-1 px-1.5 py-0.2 rounded text-[10px] font-medium" :class="isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-600'">
                              #{{ item.folderName }}
                            </span>
                          </div>
                        </div>
                      </div>

                      <!-- Delete Button if author -->
                      <button
                        v-if="(authUser?.uid && item.authorUid === authUser.uid) || (authUser?.email && item.authorEmail === authUser.email)"
                        @click="handleDeletePublic(item.id)"
                        type="button"
                        :class="isDark ? 'text-gray-400 hover:text-red-400 hover:bg-white/5' : 'text-gray-400 hover:text-red-600 hover:bg-gray-100'"
                        class="p-1.5 rounded-full transition cursor-pointer"
                        title="Delete post"
                      >
                        <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                      </button>
                    </div>

                    <!-- Post Caption / Thoughts about the link -->
                    <div v-if="item.notes" class="px-3.5 pt-1 pb-2.5">
                      <p :class="isDark ? 'text-gray-200' : 'text-gray-800'" class="text-[13px] sm:text-[14px] leading-relaxed break-words">
                        {{ item.notes }}
                      </p>
                    </div>

                    <!-- Facebook Style Link Preview Card -->
                    <div class="px-3.5 pb-3">
                      <a
                        :href="ensureHttpUrl(item.link)"
                        target="_blank"
                        rel="noopener noreferrer"
                        :class="isDark ? 'bg-[#2a2b2d] hover:bg-[#333437] border-[#3e4043]' : 'bg-[#faf9f6] hover:bg-[#f4f3ee] border-[#e8e7e3]'"
                        class="block rounded-xl border overflow-hidden transition group cursor-pointer"
                      >
                        <div class="p-3 flex items-start gap-3">
                          <div
                            :class="isDark ? 'bg-black/20' : 'bg-white'"
                            class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-xs border border-black/5 dark:border-white/5 overflow-hidden mt-0.5"
                          >
                            <img
                              :src="getSiteIconUrl(item.link)"
                              alt="icon"
                              class="w-5 h-5 object-contain"
                              loading="lazy"
                              @error="onFaviconError($event, item.link)"
                            />
                          </div>

                          <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              <span>{{ getDomain(item.link) }}</span>
                              <svg class="w-3 h-3 opacity-60" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z" clip-rule="evenodd" />
                              </svg>
                            </div>

                            <h4 :class="isDark ? 'text-gray-100 group-hover:text-blue-400' : 'text-gray-900 group-hover:text-blue-600'" class="text-sm font-semibold leading-snug line-clamp-2 mt-0.5 transition-colors">
                              {{ item.name }}
                            </h4>

                            <p class="text-[11px] text-gray-400 dark:text-gray-500 font-mono truncate mt-0.5">
                              {{ item.link }}
                            </p>
                          </div>
                        </div>
                      </a>
                    </div>

                    <!-- Stats Row -->
                    <div
                      v-if="(item.likes && item.likes.length > 0) || (commentsMap[item.id] && commentsMap[item.id].length > 0)"
                      :class="isDark ? 'text-gray-400' : 'text-gray-500'"
                      class="px-3.5 pb-2 flex items-center justify-between text-[11px]"
                    >
                      <div v-if="item.likes && item.likes.length > 0" class="flex items-center gap-1">
                        <span class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[9px]">👍</span>
                        <span>{{ item.likes.length }}</span>
                      </div>
                      <div v-else></div>

                      <button
                        v-if="commentsMap[item.id] && commentsMap[item.id].length > 0"
                        @click="toggleComments(item.id)"
                        type="button"
                        class="hover:underline cursor-pointer"
                      >
                        {{ commentsMap[item.id].length }} {{ commentsMap[item.id].length === 1 ? 'comment' : 'comments' }}
                      </button>
                    </div>

                    <!-- Facebook Action Bar -->
                    <div :class="isDark ? 'border-[#3a3b3c]' : 'border-gray-200'" class="border-t mx-3.5 py-1 flex items-center justify-between">
                      <!-- Like Button -->
                      <button
                        @click="handleToggleLike(item)"
                        type="button"
                        :class="hasUserLiked(item)
                          ? 'text-blue-600 dark:text-blue-400 font-semibold'
                          : (isDark ? 'text-gray-300 hover:bg-[#3a3b3c]' : 'text-gray-600 hover:bg-gray-100')"
                        class="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
                      >
                        <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
                        </svg>
                        <span>Like</span>
                      </button>

                      <!-- Comment Button -->
                      <button
                        @click="toggleComments(item.id)"
                        type="button"
                        :class="isCommentsOpen(item.id)
                          ? 'text-blue-600 dark:text-blue-400 font-semibold'
                          : (isDark ? 'text-gray-300 hover:bg-[#3a3b3c]' : 'text-gray-600 hover:bg-gray-100')"
                        class="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
                      >
                        <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                        </svg>
                        <span>Comment</span>
                      </button>

                      <!-- Save to bookmarks Button -->
                      <button
                        @click="handleSavePublic(item)"
                        type="button"
                        :class="isDark ? 'text-gray-300 hover:bg-[#3a3b3c]' : 'text-gray-600 hover:bg-gray-100'"
                        class="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
                      >
                        <svg class="w-4 h-4 fill-current" viewBox="0 0 20 20">
                          <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                        </svg>
                        <span>Save</span>
                      </button>

                      <!-- Copy Link Button -->
                      <button
                        @click="copyLink(item.link, item.name)"
                        type="button"
                        :class="isDark ? 'text-gray-400 hover:bg-[#3a3b3c]' : 'text-gray-500 hover:bg-gray-100'"
                        class="p-1.5 rounded-lg transition cursor-pointer"
                        title="Copy link"
                      >
                        <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                      </button>
                    </div>

                    <!-- COMMENTS SECTION -->
                    <div
                      v-if="isCommentsOpen(item.id)"
                      :class="isDark ? 'border-[#3a3b3c] bg-[#1c1e21]' : 'border-gray-200 bg-gray-50/50'"
                      class="border-t p-3.5 space-y-3"
                    >
                      <!-- List of comments -->
                      <div v-if="commentsMap[item.id] && commentsMap[item.id].length > 0" class="space-y-2.5">
                        <div
                          v-for="comment in commentsMap[item.id]"
                          :key="comment.id"
                          class="flex items-start gap-2.5 group"
                        >
                          <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-500 to-gray-400 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs shadow-xs">
                            {{ getAuthorInitial(comment.authorEmail) }}
                          </div>

                          <div class="flex-1 min-w-0">
                            <div
                              :class="isDark ? 'bg-[#3a3b3c]' : 'bg-[#f0f2f5]'"
                              class="rounded-2xl px-3 py-2 inline-block max-w-[95%] space-y-0.5 shadow-xs"
                            >
                              <div class="flex items-center justify-between gap-3">
                                <span :class="isDark ? 'text-gray-200' : 'text-gray-900'" class="text-xs font-semibold">
                                  {{ comment.authorEmail || "Anonymous" }}
                                </span>
                                <button
                                  v-if="(authUser?.uid && comment.authorUid === authUser.uid) || (authUser?.email && comment.authorEmail === authUser.email)"
                                  @click="handleDeleteComment(item.id, comment.id)"
                                  type="button"
                                  class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition cursor-pointer text-[10px]"
                                  title="Delete comment"
                                >
                                  ✕
                                </button>
                              </div>
                              <p :class="isDark ? 'text-gray-200' : 'text-gray-800'" class="text-xs leading-relaxed break-words">
                                {{ comment.text }}
                              </p>
                            </div>
                            <div :class="isDark ? 'text-gray-400' : 'text-gray-500'" class="text-[10px] pl-2 pt-0.5">
                              {{ formatRelativeTime(comment.createdAt) || 'Just now' }}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div v-else-if="commentsLoadingMap[item.id]" class="text-xs text-gray-400 text-center py-2">
                        Loading comments...
                      </div>

                      <div v-else class="text-xs text-gray-400 text-center py-1">
                        No comments yet. Write a comment about this link!
                      </div>

                      <!-- Add comment input box -->
                      <form @submit.prevent="submitComment(item.id)" class="flex items-center gap-2 pt-1">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs shadow-xs">
                          {{ getAuthorInitial(authUser?.email) }}
                        </div>

                        <div
                          :class="isDark ? 'bg-[#3a3b3c] border-[#4e4f50]' : 'bg-[#f0f2f5] border-gray-200'"
                          class="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-full border transition"
                        >
                          <input
                            v-model="commentInputs[item.id]"
                            type="text"
                            placeholder="Write a comment about this link..."
                            :class="isDark ? 'text-gray-100 placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'"
                            class="w-full bg-transparent text-xs focus:outline-none"
                          />
                          <button
                            type="submit"
                            :disabled="!commentInputs[item.id]?.trim()"
                            :class="commentInputs[item.id]?.trim() ? 'text-blue-500 hover:text-blue-600 cursor-pointer' : 'text-gray-400 opacity-40'"
                            class="transition flex-shrink-0 p-1"
                          >
                            <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                            </svg>
                          </button>
                        </div>
                      </form>
                    </div>
                  </article>
                </div>

                <!-- Empty state for Public Feed -->
                <div
                  v-else
                  :class="isDark ? 'bg-[#242526] border-[#3a3b3c]' : 'bg-white border-[#dadce0]'"
                  class="rounded-xl border p-12 text-center shadow-xs"
                >
                  <div class="h-16 w-16 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-3">
                    <svg class="w-8 h-8 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                  </div>
                  <h3 :class="isDark ? 'text-gray-200' : 'text-gray-900'" class="text-sm font-semibold">
                    {{ searchQuery.trim() ? `No public links match "${searchQuery.trim()}"` : 'No posts in the Public Feed yet' }}
                  </h3>
                  <p :class="isDark ? 'text-gray-400' : 'text-gray-500'" class="text-xs mt-1 max-w-sm mx-auto">
                    {{ searchQuery.trim() ? 'Try another keyword or be the first to share this link.' : 'Be the first to share a link with the community using the box above.' }}
                  </p>
                  <button
                    @click="openCreatePostModal(false)"
                    type="button"
                    class="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition cursor-pointer shadow-xs"
                  >
                    + Share a Link
                  </button>
                </div>
              </template>

              <!-- If Private tab -->
              <template v-else>
                <div v-if="friendsSharedBookmarks.length > 0" class="space-y-4">
                  <article
                    v-for="bookmark in friendsSharedBookmarks"
                    :key="bookmark.id"
                    :class="isDark ? 'bg-[#242526] border-[#3a3b3c]' : 'bg-white border-[#dadce0]'"
                    class="rounded-xl border shadow-xs overflow-hidden transition-all"
                  >
                    <!-- Post Header -->
                    <div class="p-3.5 pb-2 flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-bold flex items-center justify-center flex-shrink-0 text-sm shadow-xs">
                          {{ getAuthorInitial(bookmark.sharedFrom || bookmark.fromEmail) }}
                        </div>

                        <div>
                          <div class="flex items-center gap-1.5">
                            <span :class="isDark ? 'text-gray-100' : 'text-gray-900'" class="text-sm font-semibold">
                              {{ bookmark.sharedFrom || bookmark.fromEmail || "Friend" }}
                            </span>
                            <span :class="isDark ? 'text-gray-400' : 'text-gray-500'" class="text-xs font-normal">shared a link with you</span>
                          </div>

                          <div :class="isDark ? 'text-gray-400' : 'text-gray-500'" class="flex items-center gap-1.5 text-[11px]">
                            <span>{{ formatRelativeTime(bookmark.updatedAt || bookmark.createdAt) || 'Recent' }}</span>
                            <span>•</span>
                            <span class="inline-flex items-center gap-1 text-purple-500">
                              <svg class="w-3 h-3 fill-current opacity-80" viewBox="0 0 24 24">
                                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                              </svg>
                              Private
                            </span>
                          </div>
                        </div>
                      </div>

                      <!-- Delete from shared list -->
                      <button
                        @click="deleteBookmark(bookmark.id)"
                        type="button"
                        :class="isDark ? 'text-gray-400 hover:text-red-400 hover:bg-white/5' : 'text-gray-400 hover:text-red-600 hover:bg-gray-100'"
                        class="p-1.5 rounded-full transition cursor-pointer"
                        title="Delete from shared"
                      >
                        <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                      </button>
                    </div>

                    <!-- Post Caption / Note from friend -->
                    <div v-if="bookmark.notes" class="px-3.5 pt-1 pb-2.5">
                      <p :class="isDark ? 'text-gray-200' : 'text-gray-800'" class="text-[13px] sm:text-[14px] leading-relaxed break-words">
                        {{ bookmark.notes }}
                      </p>
                    </div>

                    <!-- Facebook Style Link Preview Card -->
                    <div class="px-3.5 pb-3">
                      <a
                        :href="ensureHttpUrl(bookmark.link)"
                        target="_blank"
                        rel="noopener noreferrer"
                        :class="isDark ? 'bg-[#2a2b2d] hover:bg-[#333437] border-[#3e4043]' : 'bg-[#faf9f6] hover:bg-[#f4f3ee] border-[#e8e7e3]'"
                        class="block rounded-xl border overflow-hidden transition group cursor-pointer"
                      >
                        <div class="p-3 flex items-start gap-3">
                          <div
                            :class="isDark ? 'bg-black/20' : 'bg-white'"
                            class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-xs border border-black/5 dark:border-white/5 overflow-hidden mt-0.5"
                          >
                            <img
                              :src="getSiteIconUrl(bookmark.link)"
                              alt="icon"
                              class="w-5 h-5 object-contain"
                              loading="lazy"
                              @error="onFaviconError($event, bookmark.link)"
                            />
                          </div>

                          <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              <span>{{ getDomain(bookmark.link) }}</span>
                              <svg class="w-3 h-3 opacity-60" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z" clip-rule="evenodd" />
                              </svg>
                            </div>

                            <h4 :class="isDark ? 'text-gray-100 group-hover:text-blue-400' : 'text-gray-900 group-hover:text-blue-600'" class="text-sm font-semibold leading-snug line-clamp-2 mt-0.5 transition-colors">
                              {{ bookmark.name }}
                            </h4>

                            <p class="text-[11px] text-gray-400 dark:text-gray-500 font-mono truncate mt-0.5">
                              {{ bookmark.link }}
                            </p>
                          </div>
                        </div>
                      </a>
                    </div>

                    <!-- Stats Row -->
                    <div
                      v-if="(bookmark.likes && bookmark.likes.length > 0) || (commentsMap[bookmark.id] && commentsMap[bookmark.id].length > 0)"
                      :class="isDark ? 'text-gray-400' : 'text-gray-500'"
                      class="px-3.5 pb-2 flex items-center justify-between text-[11px]"
                    >
                      <div v-if="bookmark.likes && bookmark.likes.length > 0" class="flex items-center gap-1">
                        <span class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[9px]">👍</span>
                        <span>{{ bookmark.likes.length }}</span>
                      </div>
                      <div v-else></div>

                      <button
                        v-if="commentsMap[bookmark.id] && commentsMap[bookmark.id].length > 0"
                        @click="toggleComments(bookmark.id)"
                        type="button"
                        class="hover:underline cursor-pointer"
                      >
                        {{ commentsMap[bookmark.id].length }} {{ commentsMap[bookmark.id].length === 1 ? 'comment' : 'comments' }}
                      </button>
                    </div>

                    <!-- Facebook Action Bar -->
                    <div :class="isDark ? 'border-[#3a3b3c]' : 'border-gray-200'" class="border-t mx-3.5 py-1 flex items-center justify-between">
                      <button
                        @click="handleToggleLike(bookmark)"
                        type="button"
                        :class="hasUserLiked(bookmark)
                          ? 'text-blue-600 dark:text-blue-400 font-semibold'
                          : (isDark ? 'text-gray-300 hover:bg-[#3a3b3c]' : 'text-gray-600 hover:bg-gray-100')"
                        class="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
                      >
                        <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
                        </svg>
                        <span>Like</span>
                      </button>

                      <button
                        @click="toggleComments(bookmark.id)"
                        type="button"
                        :class="isCommentsOpen(bookmark.id)
                          ? 'text-blue-600 dark:text-blue-400 font-semibold'
                          : (isDark ? 'text-gray-300 hover:bg-[#3a3b3c]' : 'text-gray-600 hover:bg-gray-100')"
                        class="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
                      >
                        <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                        </svg>
                        <span>Comment</span>
                      </button>

                      <a
                        :href="ensureHttpUrl(bookmark.link)"
                        target="_blank"
                        rel="noopener noreferrer"
                        :class="isDark ? 'text-gray-300 hover:bg-[#3a3b3c]' : 'text-gray-600 hover:bg-gray-100'"
                        class="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition"
                      >
                        <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                        </svg>
                        <span>Open</span>
                      </a>

                      <button
                        @click="copyLink(bookmark.link, bookmark.name)"
                        type="button"
                        :class="isDark ? 'text-gray-400 hover:bg-[#3a3b3c]' : 'text-gray-500 hover:bg-gray-100'"
                        class="p-1.5 rounded-lg transition cursor-pointer"
                        title="Copy link"
                      >
                        <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                      </button>
                    </div>

                    <!-- COMMENTS SECTION -->
                    <div
                      v-if="isCommentsOpen(bookmark.id)"
                      :class="isDark ? 'border-[#3a3b3c] bg-[#1c1e21]' : 'border-gray-200 bg-gray-50/50'"
                      class="border-t p-3.5 space-y-3"
                    >
                      <div v-if="commentsMap[bookmark.id] && commentsMap[bookmark.id].length > 0" class="space-y-2.5">
                        <div
                          v-for="comment in commentsMap[bookmark.id]"
                          :key="comment.id"
                          class="flex items-start gap-2.5 group"
                        >
                          <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-500 to-gray-400 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs shadow-xs">
                            {{ getAuthorInitial(comment.authorEmail) }}
                          </div>

                          <div class="flex-1 min-w-0">
                            <div
                              :class="isDark ? 'bg-[#3a3b3c]' : 'bg-[#f0f2f5]'"
                              class="rounded-2xl px-3 py-2 inline-block max-w-[95%] space-y-0.5 shadow-xs"
                            >
                              <div class="flex items-center justify-between gap-3">
                                <span :class="isDark ? 'text-gray-200' : 'text-gray-900'" class="text-xs font-semibold">
                                  {{ comment.authorEmail || "Anonymous" }}
                                </span>
                                <button
                                  v-if="(authUser?.uid && comment.authorUid === authUser.uid) || (authUser?.email && comment.authorEmail === authUser.email)"
                                  @click="handleDeleteComment(bookmark.id, comment.id)"
                                  type="button"
                                  class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition cursor-pointer text-[10px]"
                                  title="Delete comment"
                                >
                                  ✕
                                </button>
                              </div>
                              <p :class="isDark ? 'text-gray-200' : 'text-gray-800'" class="text-xs leading-relaxed break-words">
                                {{ comment.text }}
                              </p>
                            </div>
                            <div :class="isDark ? 'text-gray-400' : 'text-gray-500'" class="text-[10px] pl-2 pt-0.5">
                              {{ formatRelativeTime(comment.createdAt) || 'Just now' }}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div v-else-if="commentsLoadingMap[bookmark.id]" class="text-xs text-gray-400 text-center py-2">
                        Loading comments...
                      </div>

                      <div v-else class="text-xs text-gray-400 text-center py-1">
                        No comments yet. Write a comment about this link!
                      </div>

                      <!-- Add comment input box -->
                      <form @submit.prevent="submitComment(bookmark.id)" class="flex items-center gap-2 pt-1">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs shadow-xs">
                          {{ getAuthorInitial(authUser?.email) }}
                        </div>

                        <div
                          :class="isDark ? 'bg-[#3a3b3c] border-[#4e4f50]' : 'bg-[#f0f2f5] border-gray-200'"
                          class="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-full border transition"
                        >
                          <input
                            v-model="commentInputs[bookmark.id]"
                            type="text"
                            placeholder="Write a comment about this link..."
                            :class="isDark ? 'text-gray-100 placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'"
                            class="w-full bg-transparent text-xs focus:outline-none"
                          />
                          <button
                            type="submit"
                            :disabled="!commentInputs[bookmark.id]?.trim()"
                            :class="commentInputs[bookmark.id]?.trim() ? 'text-blue-500 hover:text-blue-600 cursor-pointer' : 'text-gray-400 opacity-40'"
                            class="transition flex-shrink-0 p-1"
                          >
                            <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                            </svg>
                          </button>
                        </div>
                      </form>
                    </div>
                  </article>
                </div>

                <!-- Empty state for Private Feed -->
                <div
                  v-else
                  :class="isDark ? 'bg-[#242526] border-[#3a3b3c]' : 'bg-white border-[#dadce0]'"
                  class="rounded-xl border p-12 text-center shadow-xs"
                >
                  <div class="h-16 w-16 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center mx-auto mb-3">
                    <svg class="w-8 h-8 fill-current" viewBox="0 0 24 24">
                      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                    </svg>
                  </div>
                  <h3 :class="isDark ? 'text-gray-200' : 'text-gray-900'" class="text-sm font-semibold">
                    {{ searchQuery.trim() ? `No shared links match "${searchQuery.trim()}"` : 'No private bookmarks from friends yet' }}
                  </h3>
                  <p :class="isDark ? 'text-gray-400' : 'text-gray-500'" class="text-xs mt-1 max-w-sm mx-auto">
                    {{ searchQuery.trim() ? 'Try another search keyword.' : 'Bookmarks your friends share with your email will appear here in your feed.' }}
                  </p>
                  <button
                    @click="openAccountModal"
                    type="button"
                    class="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition cursor-pointer shadow-xs"
                  >
                    Share or Connect Friends
                  </button>
                </div>
              </template>
            </div>
          </div>

          <!-- ============================================== -->
          <!-- REGULAR BOOKMARKS VIEW (Pinned & Others)      -->
          <!-- ============================================== -->
          <template v-else>
          <!-- Floating Bookmark Creation Card (Flat, Zero Shadow) -->
          <div class="max-w-[580px] mx-auto w-full">
            <div
              ref="creatorCardRef"
              :style="isCreatingNote ? getCardStyle(newColor) : {}"
              :class="[
                isCreatingNote
                  ? 'p-4 border-[#dadce0] dark:border-[#3c4043]'
                  : [
                      isDark
                        ? 'bg-[#202124] border-[#3c4043] text-gray-300 hover:border-[#5f6368]'
                        : 'bg-white border-[#e0e0e0] text-slate-700 hover:border-[#dadce0]',
                      'px-4 py-2.5'
                    ],
                'rounded-xl border transition-colors shadow-none'
              ]"
            >
              <!-- COLLAPSED TRIGGER VIEW -->
              <div
                v-if="!isCreatingNote"
                @click="expandNoteCreator"
                class="cursor-pointer flex items-center justify-between group gap-2"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <div
                    :class="isDark ? 'bg-white/10 text-amber-400' : 'bg-amber-50 text-amber-600'"
                    class="p-1.5 rounded-lg flex items-center justify-center flex-shrink-0"
                  >
                    <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                    </svg>
                  </div>
                  <span :class="isDark ? 'text-gray-400' : 'text-slate-500'" class="text-xs sm:text-sm font-normal truncate">
                    Save a bookmark or paste link...
                  </span>
                </div>

                <div class="flex items-center gap-1 sm:gap-2 flex-shrink-0" @click.stop>
                  <button
                    @click="expandNoteCreator()"
                    type="button"
                    :class="isDark ? 'bg-[#303134] text-gray-200 hover:bg-[#3c4043]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
                    class="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer"
                    title="Add bookmark"
                  >
                    <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                    </svg>
                    <span>Add</span>
                  </button>
                </div>
              </div>

              <!-- EXPANDED FORM VIEW -->
              <div
                v-else
                class="space-y-3"
              >
                <!-- URL Input -->
                <div
                  :class="isDark ? 'bg-black/20 border-white/10' : 'bg-slate-50 border-slate-200'"
                  class="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all"
                >
                  <div
                    class="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 overflow-hidden"
                    :class="isDark ? 'bg-white/10' : 'bg-white'"
                  >
                    <img
                      v-if="newLink.trim()"
                      :src="faviconUrl(newLink)"
                      alt="favicon"
                      class="w-3.5 h-3.5 object-contain"
                      @error="$event.target.style.display='none'"
                    />
                    <svg v-else :class="isDark ? 'text-gray-400' : 'text-slate-400'" class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
                    </svg>
                  </div>

                  <input
                    ref="newLinkInputRef"
                    v-model="newLink"
                    @input="handleLinkInput"
                    @keydown.enter.prevent="saveNewNote"
                    type="text"
                    placeholder="URL (e.g. https://...)"
                    :class="isDark ? 'text-gray-100 placeholder-gray-500' : 'text-slate-900 placeholder-slate-400'"
                    class="w-full bg-transparent border-0 outline-none text-xs sm:text-sm font-mono"
                  />

                  <button
                    v-if="!newLink"
                    @click="pasteClipboardUrl"
                    type="button"
                    :class="isDark ? 'text-gray-400 hover:text-gray-200' : 'text-slate-500 hover:text-slate-800'"
                    class="px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition flex-shrink-0 cursor-pointer"
                    title="Paste from clipboard"
                  >
                    Paste
                  </button>
                  <button
                    v-else
                    @click="newLink = ''"
                    type="button"
                    :class="isDark ? 'text-gray-400 hover:text-gray-200' : 'text-slate-400 hover:text-slate-700'"
                    class="p-0.5 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <!-- Title Input -->
                <div
                  :class="isDark ? 'bg-black/20 border-white/10' : 'bg-slate-50 border-slate-200'"
                  class="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all"
                >
                  <input
                    v-model="newTitle"
                    @keydown.enter.prevent="saveNewNote"
                    type="text"
                    placeholder="Title"
                    :class="isDark ? 'text-gray-100 placeholder-gray-500' : 'text-slate-900 placeholder-slate-400'"
                    class="w-full bg-transparent border-0 outline-none text-xs sm:text-sm font-medium"
                  />
                  <span
                    v-if="newLink.trim() && getDomain(newLink)"
                    :class="isDark ? 'text-gray-400' : 'text-slate-500'"
                    class="text-[11px] font-mono truncate max-w-[120px] flex-shrink-0"
                  >
                    {{ getDomain(newLink) }}
                  </span>
                </div>

                <!-- Controls row -->
                <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div class="flex items-center gap-2">
                    <!-- Folder selection -->
                    <select
                      v-model="newFolder"
                      :class="isDark ? 'bg-[#202124] text-gray-200 border-white/10' : 'bg-white text-slate-800 border-slate-300'"
                      class="outline-none cursor-pointer text-xs rounded-lg px-2 py-1 border"
                    >
                      <option value="General">General</option>
                      <option v-for="folder in availableFolders" :key="folder" :value="folder">
                        {{ folder }}
                      </option>
                    </select>

                    <button
                      @click="promptCreateFolder('create')"
                      type="button"
                      :class="isDark ? 'text-gray-400 hover:text-gray-200' : 'text-slate-500 hover:text-slate-800'"
                      class="text-xs transition cursor-pointer"
                    >
                      + Label
                    </button>
                  </div>

                  <!-- Color swatches -->
                  <div class="flex items-center gap-1 ml-auto">
                    <button
                      v-for="c in KEEP_COLORS.slice(0, 6)"
                      :key="c.name"
                      @click="newColor = c.bg"
                      :style="{ backgroundColor: isDark ? c.darkBg : c.bg }"
                      :title="c.name"
                      :class="newColor.toLowerCase() === c.bg.toLowerCase() ? 'ring-2 ring-amber-500' : ''"
                      class="h-4 w-4 rounded-full border border-gray-300 dark:border-gray-600 cursor-pointer"
                    ></button>
                  </div>
                </div>

                <!-- Creation Actions -->
                <div :class="isDark ? 'border-white/10' : 'border-slate-200'" class="flex items-center justify-end gap-2 pt-2 border-t">
                  <button
                    @click="resetNoteCreator"
                    type="button"
                    :class="isDark ? 'text-gray-400 hover:text-gray-200' : 'text-slate-600 hover:text-slate-900'"
                    class="px-3 py-1 text-xs font-medium rounded transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    @click="saveNewNote"
                    type="button"
                    :disabled="!newLink.trim() && !newTitle.trim()"
                    :class="(!newLink.trim() && !newTitle.trim())
                      ? (isDark ? 'bg-white/10 text-gray-500 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed')
                      : 'bg-amber-400 hover:bg-amber-500 text-slate-950 font-semibold cursor-pointer'"
                    class="px-3.5 py-1 text-xs rounded-lg transition"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Section: PINNED Bookmarks -->
          <section v-if="pinnedBookmarks.length > 0">
            <div class="max-w-7xl mx-auto mb-2 px-1 flex items-center gap-1.5">
              <span class="text-amber-500 text-[11px]">📌</span>
              <h2 :class="isDark ? 'text-[#9aa0a6]' : 'text-[#5f6368]'" class="text-[10px] font-bold uppercase tracking-wider">
                Pinned
              </h2>
            </div>

            <!-- Cards Grid for Pinned (Flat Minimal, No Shadows) -->
            <div
              :class="viewMode === 'grid'
                ? 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 space-y-3 max-w-7xl mx-auto'
                : 'max-w-3xl mx-auto space-y-3'"
            >
              <article
                v-for="bookmark in pinnedBookmarks"
                :key="bookmark.id"
                :style="getCardStyle(bookmark.color)"
                @click="openEditNote(bookmark)"
                class="group break-inside-avoid relative rounded-xl border p-3.5 transition-colors flex flex-col justify-between cursor-pointer overflow-hidden mb-3 shadow-none hover:border-[#9aa0a6] dark:hover:border-[#5f6368]"
              >
                <div>
                  <!-- Header: Site Favicon + Domain + Pin Button -->
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <div class="flex items-center gap-2 min-w-0">
                      <!-- Site Favicon -->
                      <div
                        class="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 overflow-hidden"
                        :class="isDark ? 'bg-white/10' : 'bg-black/5'"
                      >
                        <img
                          :src="getSiteIconUrl(bookmark.link)"
                          alt="icon"
                          class="w-4 h-4 object-contain"
                          loading="lazy"
                          @error="onFaviconError($event, bookmark.link)"
                        />
                      </div>

                      <!-- Domain -->
                      <span
                        :class="isDark ? 'text-gray-300' : 'text-slate-700'"
                        class="text-xs font-medium truncate"
                      >
                        {{ getDomain(bookmark.link) }}
                      </span>

                      <!-- Category Badge if detected -->
                      <span
                        v-if="getLinkTypeBadge(bookmark)"
                        :class="isDark ? 'bg-white/10 text-gray-300' : 'bg-black/5 text-gray-600'"
                        class="text-[10px] px-1.5 py-0.2 rounded font-medium"
                      >
                        {{ getLinkTypeBadge(bookmark).label }}
                      </span>
                    </div>

                    <!-- Pin Button -->
                    <button
                      @click.stop="togglePin(bookmark, $event)"
                      type="button"
                      :class="bookmark.pinned
                        ? 'text-amber-500'
                        : (isDark ? 'text-gray-500 hover:text-gray-300' : 'text-slate-400 hover:text-slate-700')"
                      class="p-1 rounded transition flex-shrink-0 cursor-pointer"
                      :title="bookmark.pinned ? 'Unpin' : 'Pin'"
                    >
                      <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                        <path d="M16 9V4l1 0c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1l1 0v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/>
                      </svg>
                    </button>
                  </div>

                  <!-- Bookmark Title -->
                  <h3
                    :class="isDark ? 'text-gray-100' : 'text-slate-900'"
                    class="text-sm font-semibold leading-snug break-words mb-1.5"
                  >
                    {{ bookmark.name }}
                  </h3>

                  <!-- Optional Notes Display -->
                  <p
                    v-if="bookmark.notes"
                    :class="isDark ? 'text-gray-300' : 'text-slate-600'"
                    class="text-xs leading-relaxed mb-2 line-clamp-2"
                  >
                    {{ bookmark.notes.replace(/\[[ xX]\]\s*/g, '') }}
                  </p>

                  <!-- Direct URL Link Row (Click to open, copy button) -->
                  <div class="flex items-center justify-between gap-1.5 my-1.5">
                    <a
                      :href="bookmark.link"
                      target="_blank"
                      rel="noopener noreferrer"
                      @click.stop
                      :class="isDark ? 'text-amber-400/90 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'"
                      class="text-[11px] font-mono truncate hover:underline flex items-center gap-1"
                      :title="bookmark.link"
                    >
                      <span>{{ getLinkDisplayPath(bookmark.link) }}</span>
                      <svg class="w-3 h-3 flex-shrink-0 opacity-70" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z" clip-rule="evenodd" />
                      </svg>
                    </a>

                    <!-- Folder label tag chip -->
                    <button
                      @click.stop="selectedFolderFilter = bookmark.folderName || 'General'"
                      type="button"
                      :class="isDark ? 'bg-white/10 text-gray-300' : 'bg-black/5 text-gray-700'"
                      class="text-[10px] px-1.5 py-0.5 rounded font-medium truncate max-w-[90px] cursor-pointer"
                      title="Filter by label"
                    >
                      #{{ bookmark.folderName || "General" }}
                    </button>
                  </div>
                </div>

                <!-- Bottom Minimal Action Bar -->
                <div
                  :class="isDark ? 'border-white/10' : 'border-black/10'"
                  class="pt-1.5 mt-2 border-t flex items-center justify-between opacity-80 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150"
                >
                  <div class="w-full flex items-center justify-between">
                    <!-- Color Palette Action -->
                    <div class="relative">
                      <button
                        @click.stop="activeColorPickerCardId = activeColorPickerCardId === bookmark.id ? null : bookmark.id"
                        type="button"
                        :class="isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'"
                        class="p-1.5 rounded transition cursor-pointer"
                        title="Background color"
                      >
                        <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.22 19.59 10.57 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/>
                        </svg>
                      </button>

                      <!-- Popover Swatches -->
                      <div
                        v-if="activeColorPickerCardId === bookmark.id"
                        @click.stop
                        :class="isDark ? 'bg-[#303134] border-[#5f6368]' : 'bg-white border-[#dadce0]'"
                        class="absolute left-0 bottom-8 p-1.5 rounded-xl border z-50 flex flex-wrap gap-1 w-32 shadow-none"
                      >
                        <button
                          v-for="c in KEEP_COLORS"
                          :key="c.name"
                          @click="changeCardColor(bookmark, c.bg)"
                          :style="{ backgroundColor: isDark ? c.darkBg : c.bg }"
                          class="h-4 w-4 rounded-full border border-gray-300 dark:border-gray-600 hover:scale-110 transition cursor-pointer"
                          :title="c.name"
                        ></button>
                      </div>
                    </div>

                    <!-- Copy Link Action -->
                    <button
                      @click.stop="copyLink(bookmark.link, bookmark.name)"
                      type="button"
                      :class="isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'"
                      class="p-1.5 rounded transition cursor-pointer"
                      title="Copy link"
                    >
                      <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                      </svg>
                    </button>

                    <!-- Share Action -->
                    <button
                      @click.stop="openShareModalForBookmark(bookmark)"
                      type="button"
                      :class="isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'"
                      class="p-1.5 rounded transition cursor-pointer"
                      title="Share with friends"
                    >
                      <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                      </svg>
                    </button>

                    <!-- Publish to Public Feed Action -->
                    <button
                      @click.stop="quickPublishBookmark(bookmark)"
                      type="button"
                      :class="isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'"
                      class="p-1.5 rounded transition cursor-pointer"
                      title="Publish to Public Feed"
                    >
                      <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                      </svg>
                    </button>

                    <!-- Edit Action -->
                    <button
                      @click.stop="openEditNote(bookmark)"
                      type="button"
                      :class="isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'"
                      class="p-1.5 rounded transition cursor-pointer"
                      title="Edit bookmark"
                    >
                      <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M3 17.25V21h3.75L17.81 9.93l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83 3.75 3.75 1.84-1.84z"/>
                      </svg>
                    </button>

                    <!-- Delete Action -->
                    <button
                      @click.stop="deleteBookmark(bookmark.id)"
                      type="button"
                      class="p-1.5 rounded hover:bg-red-500/10 text-red-500 transition cursor-pointer"
                      title="Delete bookmark"
                    >
                      <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <!-- Section: OTHERS / All Bookmarks (Flat Minimal) -->
          <section>
            <div v-if="pinnedBookmarks.length > 0" class="max-w-7xl mx-auto mb-2 px-1">
              <h2 :class="isDark ? 'text-[#9aa0a6]' : 'text-[#5f6368]'" class="text-[10px] font-bold uppercase tracking-wider">
                Others
              </h2>
            </div>

            <!-- Empty State -->
            <div
              v-if="otherBookmarks.length === 0 && pinnedBookmarks.length === 0"
              class="flex flex-col items-center justify-center py-16 text-center px-4"
            >
              <div class="h-16 w-16 rounded-full bg-amber-400/10 flex items-center justify-center mb-3">
                <span class="text-2xl">{{ searchQuery.trim() ? '🔍' : '💡' }}</span>
              </div>
              <h3 :class="isDark ? 'text-gray-300' : 'text-slate-800'" class="text-sm font-medium">
                {{ searchQuery.trim() ? `No bookmarks match "${searchQuery.trim()}"` : 'Bookmarks you add appear here' }}
              </h3>
              <p :class="isDark ? 'text-gray-400' : 'text-slate-600'" class="text-xs mt-1 max-w-sm">
                {{ searchQuery.trim() ? 'No saved bookmarks found. You can search for this directly on Google.' : 'Use the box above to save your first bookmark.' }}
              </p>

              <!-- Quick action to search Google -->
              <button
                v-if="searchQuery.trim()"
                @click="searchGoogle(searchQuery)"
                type="button"
                :class="isDark
                  ? 'bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border-amber-400/30'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'"
                class="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border transition cursor-pointer"
              >
                <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Search Google for "{{ searchQuery.trim() }}"</span>
                <svg class="w-3.5 h-3.5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </button>
              <span v-if="searchQuery.trim()" :class="isDark ? 'text-gray-500' : 'text-gray-400'" class="text-[11px] mt-2">
                Press <kbd class="px-1.5 py-0.5 rounded text-[10px] font-mono border" :class="isDark ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-300'">Enter</kbd> to open in Google
              </span>
            </div>

            <!-- Cards Grid for Other Bookmarks (Flat Minimal, No Shadows) -->
            <div
              v-else
              :class="viewMode === 'grid'
                ? 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 space-y-3 max-w-7xl mx-auto'
                : 'max-w-3xl mx-auto space-y-3'"
            >
              <article
                v-for="bookmark in otherBookmarks"
                :key="bookmark.id"
                :style="getCardStyle(bookmark.color)"
                @click="openEditNote(bookmark)"
                class="group break-inside-avoid relative rounded-xl border p-3.5 transition-colors flex flex-col justify-between cursor-pointer overflow-hidden mb-3 shadow-none hover:border-[#9aa0a6] dark:hover:border-[#5f6368]"
              >
                <div>
                  <!-- Header: Site Favicon + Domain + Pin Button -->
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <div class="flex items-center gap-2 min-w-0">
                      <!-- Site Favicon -->
                      <div
                        class="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 overflow-hidden"
                        :class="isDark ? 'bg-white/10' : 'bg-black/5'"
                      >
                        <img
                          :src="getSiteIconUrl(bookmark.link)"
                          alt="icon"
                          class="w-4 h-4 object-contain"
                          loading="lazy"
                          @error="onFaviconError($event, bookmark.link)"
                        />
                      </div>

                      <!-- Domain -->
                      <span
                        :class="isDark ? 'text-gray-300' : 'text-slate-700'"
                        class="text-xs font-medium truncate"
                      >
                        {{ getDomain(bookmark.link) }}
                      </span>

                      <!-- Category Badge if detected -->
                      <span
                        v-if="getLinkTypeBadge(bookmark)"
                        :class="isDark ? 'bg-white/10 text-gray-300' : 'bg-black/5 text-gray-600'"
                        class="text-[10px] px-1.5 py-0.2 rounded font-medium"
                      >
                        {{ getLinkTypeBadge(bookmark).label }}
                      </span>
                    </div>

                    <!-- Pin Button -->
                    <button
                      @click.stop="togglePin(bookmark, $event)"
                      type="button"
                      :class="bookmark.pinned
                        ? 'text-amber-500'
                        : (isDark ? 'text-gray-500 hover:text-gray-300' : 'text-slate-400 hover:text-slate-700')"
                      class="p-1 rounded transition flex-shrink-0 cursor-pointer"
                      :title="bookmark.pinned ? 'Unpin' : 'Pin'"
                    >
                      <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                        <path d="M16 9V4l1 0c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1l1 0v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/>
                      </svg>
                    </button>
                  </div>

                  <!-- Bookmark Title -->
                  <h3
                    :class="isDark ? 'text-gray-100' : 'text-slate-900'"
                    class="text-sm font-semibold leading-snug break-words mb-1.5"
                  >
                    {{ bookmark.name }}
                  </h3>

                  <!-- Optional Notes Display -->
                  <p
                    v-if="bookmark.notes"
                    :class="isDark ? 'text-gray-300' : 'text-slate-600'"
                    class="text-xs leading-relaxed mb-2 line-clamp-2"
                  >
                    {{ bookmark.notes.replace(/\[[ xX]\]\s*/g, '') }}
                  </p>

                  <!-- Direct URL Link Row (Click to open, copy button) -->
                  <div class="flex items-center justify-between gap-1.5 my-1.5">
                    <a
                      :href="bookmark.link"
                      target="_blank"
                      rel="noopener noreferrer"
                      @click.stop
                      :class="isDark ? 'text-amber-400/90 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'"
                      class="text-[11px] font-mono truncate hover:underline flex items-center gap-1"
                      :title="bookmark.link"
                    >
                      <span>{{ getLinkDisplayPath(bookmark.link) }}</span>
                      <svg class="w-3 h-3 flex-shrink-0 opacity-70" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z" clip-rule="evenodd" />
                      </svg>
                    </a>

                    <!-- Folder label tag chip -->
                    <button
                      @click.stop="selectedFolderFilter = bookmark.folderName || 'General'"
                      type="button"
                      :class="isDark ? 'bg-white/10 text-gray-300' : 'bg-black/5 text-gray-700'"
                      class="text-[10px] px-1.5 py-0.5 rounded font-medium truncate max-w-[90px] cursor-pointer"
                      title="Filter by label"
                    >
                      #{{ bookmark.folderName || "General" }}
                    </button>
                  </div>
                </div>

                <!-- Bottom Minimal Action Bar -->
                <div
                  :class="isDark ? 'border-white/10' : 'border-black/10'"
                  class="pt-1.5 mt-2 border-t flex items-center justify-between opacity-80 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150"
                >
                  <div class="w-full flex items-center justify-between">
                    <!-- Color Palette Action -->
                    <div class="relative">
                      <button
                        @click.stop="activeColorPickerCardId = activeColorPickerCardId === bookmark.id ? null : bookmark.id"
                        type="button"
                        :class="isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'"
                        class="p-1.5 rounded transition cursor-pointer"
                        title="Background color"
                      >
                        <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.22 19.59 10.57 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/>
                        </svg>
                      </button>

                      <!-- Popover Swatches -->
                      <div
                        v-if="activeColorPickerCardId === bookmark.id"
                        @click.stop
                        :class="isDark ? 'bg-[#303134] border-[#5f6368]' : 'bg-white border-[#dadce0]'"
                        class="absolute left-0 bottom-8 p-1.5 rounded-xl border z-50 flex flex-wrap gap-1 w-32 shadow-none"
                      >
                        <button
                          v-for="c in KEEP_COLORS"
                          :key="c.name"
                          @click="changeCardColor(bookmark, c.bg)"
                          :style="{ backgroundColor: isDark ? c.darkBg : c.bg }"
                          class="h-4 w-4 rounded-full border border-gray-300 dark:border-gray-600 hover:scale-110 transition cursor-pointer"
                          :title="c.name"
                        ></button>
                      </div>
                    </div>

                    <!-- Copy Link Action -->
                    <button
                      @click.stop="copyLink(bookmark.link, bookmark.name)"
                      type="button"
                      :class="isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'"
                      class="p-1.5 rounded transition cursor-pointer"
                      title="Copy link"
                    >
                      <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                      </svg>
                    </button>

                    <!-- Share Action -->
                    <button
                      @click.stop="openShareModalForBookmark(bookmark)"
                      type="button"
                      :class="isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'"
                      class="p-1.5 rounded transition cursor-pointer"
                      title="Share with friends"
                    >
                      <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                      </svg>
                    </button>

                    <!-- Publish to Public Feed Action -->
                    <button
                      @click.stop="quickPublishBookmark(bookmark)"
                      type="button"
                      :class="isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'"
                      class="p-1.5 rounded transition cursor-pointer"
                      title="Publish to Public Feed"
                    >
                      <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                      </svg>
                    </button>

                    <!-- Edit Action -->
                    <button
                      @click.stop="openEditNote(bookmark)"
                      type="button"
                      :class="isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'"
                      class="p-1.5 rounded transition cursor-pointer"
                      title="Edit bookmark"
                    >
                      <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M3 17.25V21h3.75L17.81 9.93l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83 3.75 3.75 1.84-1.84z"/>
                      </svg>
                    </button>

                    <!-- Delete Action -->
                    <button
                      @click.stop="deleteBookmark(bookmark.id)"
                      type="button"
                      class="p-1.5 rounded hover:bg-red-500/10 text-red-500 transition cursor-pointer"
                      title="Delete bookmark"
                    >
                      <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </section>
          </template>

          <!-- Mobile Floating Action Button -->
          <button
            v-if="isMobile && !isCreatingNote"
            @click="triggerMobileCreate"
            type="button"
            class="fixed bottom-14 right-4 z-40 h-12 w-12 rounded-xl bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-950 flex items-center justify-center transition cursor-pointer border border-amber-500/30"
            title="Add bookmark"
            aria-label="Add bookmark"
          >
            <svg class="h-6 w-6 fill-current" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </button>
        </main>
      </div>

      <!-- Edit Bookmark Modal Drawer -->
      <Teleport to="body">
        <transition name="modal-bounce" :duration="{ enter: 380, leave: 200 }">
          <div
            v-if="isEditModalOpen"
            class="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen min-h-screen z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 m-0 overflow-y-auto"
            @click.self="isEditModalOpen = false"
          >
            <div
              :style="getCardStyle(editColor)"
              class="modal-card-animate w-full max-w-lg rounded-xl border p-4 sm:p-5 transition-colors space-y-3.5 max-h-[90vh] overflow-y-auto shadow-xl my-auto"
            >
            <!-- Modal Header -->
            <div :class="isDark ? 'border-white/10' : 'border-slate-200'" class="flex items-center justify-between gap-3 border-b pb-2.5">
              <span class="text-sm font-semibold">Edit Bookmark</span>

              <button
                @click="editPinned = !editPinned"
                type="button"
                :class="editPinned
                  ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                  : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-slate-500 hover:text-slate-800')"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition cursor-pointer"
              >
                <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M16 9V4l1 0c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1l1 0v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/>
                </svg>
                <span>{{ editPinned ? 'Pinned' : 'Pin' }}</span>
              </button>
            </div>

            <!-- Destination URL -->
            <div>
              <label :class="isDark ? 'text-gray-400' : 'text-slate-600'" class="block text-xs mb-1">Destination URL</label>
              <div
                :class="isDark ? 'bg-black/20 border-white/10' : 'bg-slate-50 border-slate-200'"
                class="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all"
              >
                <input
                  v-model="editLink"
                  @input="handleEditLinkInput"
                  type="text"
                  placeholder="https://..."
                  :class="isDark ? 'text-gray-100 placeholder-gray-500' : 'text-slate-900 placeholder-slate-400'"
                  class="w-full bg-transparent border-0 outline-none text-xs sm:text-sm font-mono"
                />
              </div>
            </div>

            <!-- Title -->
            <div>
              <label :class="isDark ? 'text-gray-400' : 'text-slate-600'" class="block text-xs mb-1">Title</label>
              <div
                :class="isDark ? 'bg-black/20 border-white/10' : 'bg-slate-50 border-slate-200'"
                class="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all"
              >
                <input
                  v-model="editTitle"
                  type="text"
                  placeholder="Title"
                  :class="isDark ? 'text-gray-100 placeholder-gray-500' : 'text-slate-900 placeholder-slate-400 font-medium'"
                  class="w-full bg-transparent border-0 outline-none text-xs sm:text-sm"
                />
              </div>
            </div>

            <!-- Folder & Color row -->
            <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div class="flex items-center gap-2">
                <label :class="isDark ? 'text-gray-400' : 'text-slate-600'" class="text-xs">Folder:</label>
                <select
                  v-model="editFolder"
                  :class="isDark ? 'bg-[#202124] text-white border-white/10' : 'bg-slate-50 text-slate-900 border-slate-300'"
                  class="text-xs rounded-lg px-2 py-1 border outline-none cursor-pointer"
                >
                  <option value="General">General</option>
                  <option v-for="folder in availableFolders" :key="folder" :value="folder">
                    {{ folder }}
                  </option>
                </select>
                <button
                  @click="promptCreateFolder('edit')"
                  type="button"
                  :class="isDark ? 'text-gray-400 hover:text-gray-200' : 'text-slate-500 hover:text-slate-800'"
                  class="text-xs transition cursor-pointer"
                >
                  + New
                </button>
              </div>

              <!-- Swatches -->
              <div class="flex items-center gap-1 ml-auto">
                <button
                  v-for="c in KEEP_COLORS.slice(0, 6)"
                  :key="c.name"
                  @click="editColor = c.bg"
                  :style="{ backgroundColor: isDark ? c.darkBg : c.bg }"
                  :title="c.name"
                  :class="editColor.toLowerCase() === c.bg.toLowerCase() ? 'ring-2 ring-amber-500' : ''"
                  class="h-4 w-4 rounded-full border border-gray-300 dark:border-gray-600 transition cursor-pointer"
                ></button>
              </div>
            </div>

            <!-- Action buttons -->
            <div :class="isDark ? 'border-white/10' : 'border-slate-200'" class="flex items-center justify-between gap-2 pt-2.5 border-t">
              <button
                v-if="editingBookmark"
                @click="quickPublishBookmark(editingBookmark); isEditModalOpen = false;"
                type="button"
                :class="isDark ? 'hover:bg-white/10 text-amber-300' : 'hover:bg-amber-50 text-amber-700'"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
                title="Publish this bookmark to the Public Feed"
              >
                <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
                <span>Publish to Public Feed</span>
              </button>
              <div v-else></div>

              <div class="flex items-center gap-2">
                <button
                  @click="isEditModalOpen = false"
                  type="button"
                  class="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  @click="saveEditNote"
                  type="button"
                  class="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-semibold text-xs transition cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>
      </Teleport>

      <!-- Edit Labels Modal -->
      <Teleport to="body">
        <transition name="modal-bounce" :duration="{ enter: 380, leave: 200 }">
          <div
            v-if="isEditLabelsModalOpen"
            class="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen min-h-screen z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 m-0 overflow-y-auto"
            @click.self="closeEditLabelsModal"
          >
            <div
              :class="isDark ? 'bg-[#202124] border-[#3c4043] text-white' : 'bg-white border-slate-200 text-slate-900'"
              class="modal-card-animate w-full max-w-sm rounded-xl border p-4 space-y-3.5 max-h-[85vh] overflow-y-auto shadow-xl my-auto"
            >
            <!-- Header -->
            <div class="flex items-center justify-between pb-1">
              <h3 class="text-sm font-semibold">Edit labels</h3>
              <button
                @click="closeEditLabelsModal"
                type="button"
                :class="isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-500'"
                class="p-1 rounded transition cursor-pointer"
                title="Close"
              >
                <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            <!-- Create Label Row -->
            <div>
              <div
                :class="isDark
                  ? 'border-white/10 focus-within:border-amber-400 bg-black/20'
                  : 'border-slate-300 focus-within:border-amber-500 bg-slate-50 focus-within:bg-white'"
                class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all"
              >
                <input
                  ref="newLabelInputRef"
                  v-model="newLabelInput"
                  @keydown.enter.prevent="createNewLabel"
                  @input="newLabelError = ''"
                  type="text"
                  placeholder="Create new label"
                  maxlength="30"
                  :class="isDark ? 'text-white placeholder-gray-500' : 'text-slate-900 placeholder-slate-400'"
                  class="w-full bg-transparent border-0 outline-none text-xs"
                />

                <button
                  @click="createNewLabel"
                  type="button"
                  :disabled="!newLabelInput.trim()"
                  :class="newLabelInput.trim() ? 'text-amber-500 cursor-pointer' : 'text-gray-400/40 cursor-not-allowed'"
                  class="p-1 rounded transition flex-shrink-0"
                  title="Create label"
                >
                  <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                  </svg>
                </button>
              </div>
              <p v-if="newLabelError" class="text-xs text-rose-500 mt-1 pl-1">
                {{ newLabelError }}
              </p>
            </div>

            <!-- Labels List -->
            <div class="max-h-56 overflow-y-auto space-y-0.5 pr-1">
              <div
                v-if="availableFolders.length === 0"
                :class="isDark ? 'text-gray-500' : 'text-slate-400'"
                class="text-xs text-center py-4"
              >
                No custom labels yet.
              </div>

              <div
                v-for="folder in availableFolders"
                :key="folder"
                :class="isDark ? 'hover:bg-white/5' : 'hover:bg-slate-100'"
                class="group flex items-center justify-between gap-2 px-2 py-1 rounded transition"
              >
                <template v-if="editingLabelOriginal !== folder">
                  <div class="flex items-center gap-2 min-w-0 flex-1">
                    <button
                      @click="deleteFolderLabel(folder)"
                      type="button"
                      class="p-1 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition cursor-pointer flex-shrink-0"
                      title="Delete label"
                    >
                      <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    </button>

                    <span
                      @click="startRenameLabel(folder)"
                      class="text-xs truncate cursor-pointer font-normal select-none"
                      :title="folder"
                    >
                      {{ folder }}
                    </span>
                  </div>

                  <div class="flex items-center gap-1 flex-shrink-0">
                    <span
                      :class="isDark ? 'text-gray-400' : 'text-slate-500'"
                      class="text-[10px]"
                    >
                      {{ getFolderCount(folder) }}
                    </span>

                    <button
                      @click="startRenameLabel(folder)"
                      type="button"
                      :class="isDark ? 'text-gray-400 hover:text-white' : 'text-slate-400 hover:text-slate-800'"
                      class="p-1 rounded transition opacity-60 group-hover:opacity-100 cursor-pointer"
                      title="Rename label"
                    >
                      <svg class="w-3 h-3 fill-current" viewBox="0 0 24 24">
                        <path d="M3 17.25V21h3.75L17.81 9.93l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83 3.75 3.75 1.84-1.84z"/>
                      </svg>
                    </button>
                  </div>
                </template>

                <template v-else>
                  <div class="flex items-center gap-2 flex-1 min-w-0">
                    <input
                      ref="editingLabelInputRef"
                      v-model="editingLabelText"
                      @keydown.enter.prevent="saveRenameLabel(folder)"
                      @keydown.esc="cancelRenameLabel"
                      type="text"
                      maxlength="30"
                      :class="isDark ? 'bg-black/30 border-amber-400 text-white' : 'bg-white border-amber-500 text-slate-900'"
                      class="w-full text-xs px-2 py-0.5 rounded border outline-none font-medium"
                      autofocus
                    />
                  </div>

                  <div class="flex items-center gap-1 flex-shrink-0">
                    <button
                      @click="saveRenameLabel(folder)"
                      type="button"
                      class="p-1 rounded text-emerald-500 hover:bg-emerald-500/10 transition cursor-pointer"
                      title="Save"
                    >
                      ✓
                    </button>
                    <button
                      @click="cancelRenameLabel"
                      type="button"
                      :class="isDark ? 'text-gray-400' : 'text-slate-400'"
                      class="p-1 rounded cursor-pointer"
                      title="Cancel"
                    >
                      ✕
                    </button>
                  </div>
                </template>
              </div>
            </div>

            <!-- Footer -->
            <div :class="isDark ? 'border-white/10' : 'border-slate-200'" class="flex items-center justify-end pt-2.5 border-t">
              <button
                @click="closeEditLabelsModal"
                type="button"
                :class="isDark ? 'hover:bg-white/10 text-gray-200' : 'hover:bg-slate-100 text-slate-800'"
                class="px-3 py-1 text-xs font-semibold rounded transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </transition>
      </Teleport>
    </div>

    <!-- Unauthenticated View -->
    <div v-else class="flex-1 flex flex-col items-center justify-center p-4 py-8 min-h-[90vh] relative select-none">
      <!-- Dark/Light theme toggle on top right -->
      <div class="absolute top-4 right-4">
        <button
          @click="toggleDarkMode"
          type="button"
          :class="isDark ? 'hover:bg-[#303134] text-[#9aa0a6]' : 'hover:bg-gray-100 text-[#5f6368]'"
          class="h-10 w-10 rounded-full flex items-center justify-center transition-colors cursor-pointer border border-transparent hover:border-[#dadce0] dark:hover:border-[#3c4043]"
          :title="isDark ? 'Switch to Light theme' : 'Switch to Dark theme'"
        >
          <svg v-if="!isDark" class="h-4 w-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>
          </svg>
          <svg v-else class="h-4 w-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z"/>
          </svg>
        </button>
      </div>

      <LoginPanel
        :authMode="authMode"
        :authEmail="authEmail"
        :authPassword="authPassword"
        :authError="authError"
        :isDark="isDark"
        @update:authMode="(val) => (authMode = val)"
        @update:authEmail="(val) => (authEmail = val)"
        @update:authPassword="(val) => (authPassword = val)"
        @login="login"
        @signup="signup"
        @google-login="loginWithGoogle"
      />

      <!-- Google Minimalist Footer -->
      <footer class="mt-6 text-xs text-[#5f6368] dark:text-[#9aa0a6] flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        <span>bk Keep • bookmarks</span>
        <span>•</span>
        <a href="https://support.google.com/keep" target="_blank" rel="noopener" class="hover:underline hover:text-[#202124] dark:hover:text-[#e8eaed]">Help</a>
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener" class="hover:underline hover:text-[#202124] dark:hover:text-[#e8eaed]">Privacy</a>
        <a href="https://policies.google.com/terms" target="_blank" rel="noopener" class="hover:underline hover:text-[#202124] dark:hover:text-[#e8eaed]">Terms</a>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.font-google {
  font-family: 'Roboto', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
</style>
