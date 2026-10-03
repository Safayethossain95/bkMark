<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import AccountModal from "../components/AccountModal.vue";
import LoginPanel from "../components/LoginPanel.vue";
import { useBookmarks, applyThemeToDocument } from "../composables/useBookmarks";

const {
  bookmarks,
  bookmarksLoading,
  searchQuery,
  authUser,
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
} = useBookmarks();

// Google Keep Themes & Colors
const KEEP_COLORS = [
  { name: "Default", bg: "#ffffff", darkBg: "#202124", border: "#e0e0e0", darkBorder: "#5f6368" },
  { name: "Coral", bg: "#f28b82", darkBg: "#5c2b29", border: "#f28b82", darkBorder: "#783b38" },
  { name: "Peach", bg: "#fbbc04", darkBg: "#614a19", border: "#fbbc04", darkBorder: "#806223" },
  { name: "Sand", bg: "#fff475", darkBg: "#635d19", border: "#fff475", darkBorder: "#7e7620" },
  { name: "Mint", bg: "#ccff90", darkBg: "#345920", border: "#ccff90", darkBorder: "#46722d" },
  { name: "Sage", bg: "#a7ffeb", darkBg: "#16504b", border: "#a7ffeb", darkBorder: "#1f6a63" },
  { name: "Fog", bg: "#cbf0f8", darkBg: "#2d555e", border: "#cbf0f8", darkBorder: "#3b6c77" },
  { name: "Storm", bg: "#aecbfa", darkBg: "#1e3a5f", border: "#aecbfa", darkBorder: "#2a4e7f" },
  { name: "Dusk", bg: "#d7aefb", darkBg: "#42275e", border: "#d7aefb", darkBorder: "#58367d" },
  { name: "Blossom", bg: "#fdcfe8", darkBg: "#5b2245", border: "#fdcfe8", darkBorder: "#79305d" },
  { name: "Clay", bg: "#e6c9a8", darkBg: "#442f19", border: "#e6c9a8", darkBorder: "#5f4225" },
  { name: "Chalk", bg: "#e8eaed", darkBg: "#3c4043", border: "#dadce0", darkBorder: "#525355" },
];

// UI Layout & Theme State
const isDark = ref(false);
const isMobile = ref(false);
const isSidebarOpen = ref(true);
const isSidebarHovered = ref(false);
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
    showToast(`Copied "${name || 'link'}" to clipboard`);
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
    list = list.filter(
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

// Colors helper
function getCardStyle(colorHex) {
  const c = KEEP_COLORS.find((item) => item.bg.toLowerCase() === (colorHex || "").toLowerCase());
  if (isDark.value) {
    return {
      backgroundColor: c ? c.darkBg : "#202124",
      borderColor: c && c.name !== "Default" ? c.darkBorder : "#5f6368",
      color: "#f1f3f4",
    };
  }
  return {
    backgroundColor: c ? c.bg : "#ffffff",
    borderColor: c && c.name !== "Default" ? c.border : "#e2e8f0",
    color: "#0f172a",
  };
}

// High-resolution site icon helper
function getSiteIconUrl(link) {
  if (!link) return "";
  const d = getDomain(link);
  if (!d) return "";
  return `https://www.google.com/s2/favicons?domain=${d}&sz=128`;
}

// Fallback if 128px fails
function onFaviconError(event, link) {
  const target = event.target;
  const d = getDomain(link);
  if (target && !target.dataset.triedFallback && d) {
    target.dataset.triedFallback = "true";
    target.src = `https://www.google.com/s2/favicons?domain=${d}&sz=64`;
  }
}

// Clean URL path display (e.g. allbanglaboi.com/category/books...)
function getLinkDisplayPath(link) {
  if (!link) return "";
  try {
    const raw = link.startsWith("http") ? link : `https://${link}`;
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "");
    const path = url.pathname === "/" ? "" : url.pathname;
    const full = host + path;
    return full.length > 30 ? full.slice(0, 28) + "..." : full;
  } catch (e) {
    return link;
  }
}

// Detect link content type metadata badge
function getLinkTypeBadge(bookmark) {
  const urlStr = (bookmark.link || "").toLowerCase();
  const titleStr = (bookmark.name || "").toLowerCase();
  const folderStr = (bookmark.folderName || "").toLowerCase();

  if (urlStr.includes(".pdf") || titleStr.includes("pdf") || folderStr.includes("book")) {
    return { label: "PDF / Book", icon: "📚", type: "pdf" };
  }
  if (urlStr.includes("github.com") || urlStr.includes("gitlab.com")) {
    return { label: "Repository", icon: "💻", type: "code" };
  }
  if (urlStr.includes("youtube.com") || urlStr.includes("youtu.be") || urlStr.includes("vimeo.com")) {
    return { label: "Video", icon: "▶", type: "video" };
  }
  if (urlStr.includes("twitter.com") || urlStr.includes("x.com")) {
    return { label: "Social", icon: "𝕏", type: "social" };
  }
  if (urlStr.includes("medium.com") || urlStr.includes("dev.to") || urlStr.includes("substack.com") || urlStr.includes("blog")) {
    return { label: "Article", icon: "📰", type: "article" };
  }
  if (urlStr.includes("figma.com") || urlStr.includes("dribbble.com")) {
    return { label: "Design", icon: "🎨", type: "design" };
  }
  if (urlStr.includes("docs.") || urlStr.includes("/docs")) {
    return { label: "Docs", icon: "📖", type: "docs" };
  }
  return { label: "Website", icon: "🌐", type: "web" };
}

function getBadgeClass(badge) {
  if (isDark.value) {
    switch (badge.type) {
      case "pdf":
        return "bg-rose-500/15 text-rose-300 border border-rose-500/30";
      case "code":
        return "bg-purple-500/15 text-purple-300 border border-purple-500/30";
      case "video":
        return "bg-red-500/15 text-red-300 border border-red-500/30";
      case "social":
        return "bg-sky-500/15 text-sky-300 border border-sky-500/30";
      case "article":
        return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30";
      case "design":
        return "bg-amber-500/15 text-amber-300 border border-amber-500/30";
      case "docs":
        return "bg-blue-500/15 text-blue-300 border border-blue-500/30";
      default:
        return "bg-white/10 text-gray-300 border border-white/10";
    }
  } else {
    switch (badge.type) {
      case "pdf":
        return "bg-rose-50 text-rose-700 border border-rose-200";
      case "code":
        return "bg-purple-50 text-purple-700 border border-purple-200";
      case "video":
        return "bg-red-50 text-red-700 border border-red-200";
      case "social":
        return "bg-sky-50 text-sky-700 border border-sky-200";
      case "article":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "design":
        return "bg-amber-50 text-amber-700 border border-amber-200";
      case "docs":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      default:
        return "bg-slate-100 text-slate-700 border border-slate-200";
    }
  }
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
    showToast(nextPinned ? "Bookmark pinned to top" : "Bookmark unpinned");
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

// Expand Creation Card with smooth height morph
function expandNoteCreator() {
  const el = creatorCardRef.value;
  const startH = el ? el.offsetHeight : 0;

  isCreatingNote.value = true;
  newFolder.value =
    selectedFolderFilter.value !== "ALL" &&
    selectedFolderFilter.value !== "SHARED" &&
    selectedFolderFilter.value !== "RECENT"
      ? selectedFolderFilter.value
      : "General";

  nextTick(() => {
    if (el && startH) {
      const targetH = el.scrollHeight;
      el.style.height = `${startH}px`;
      el.style.overflow = "hidden";
      void el.offsetHeight; // force reflow
      el.style.transition = "height 320ms cubic-bezier(0.16, 1, 0.3, 1)";
      el.style.height = `${targetH}px`;

      const onEnd = (e) => {
        if (!e || (e.target === el && e.propertyName === "height")) {
          el.removeEventListener("transitionend", onEnd);
          el.style.height = "";
          el.style.overflow = "";
          el.style.transition = "";
        }
      };
      el.addEventListener("transitionend", onEnd);
      setTimeout(onEnd, 360);
    }
    newLinkInputRef.value?.focus({ preventScroll: true });
  });
}

// Cancel Creation Card
function closeNoteCreator() {
  if (newTitle.value.trim() || newLink.value.trim()) {
    saveNewNote();
  } else {
    resetNoteCreator();
  }
}

// Reset Creation Card with seamless glide back to collapsed height (ZERO jump)
function resetNoteCreator() {
  const el = creatorCardRef.value;
  const startH = el ? el.offsetHeight : 0;

  isCreatingNote.value = false;
  newTitle.value = "";
  newLink.value = "";
  newFolder.value = "";
  newColor.value = "#ffffff";
  newPinned.value = false;
  showCreateColorPicker.value = false;

  nextTick(() => {
    if (el && startH) {
      const targetH = el.scrollHeight;
      el.style.height = `${startH}px`;
      el.style.overflow = "hidden";
      void el.offsetHeight; // force reflow
      el.style.transition = "height 260ms cubic-bezier(0.16, 1, 0.3, 1)";
      el.style.height = `${targetH}px`;

      const onEnd = (e) => {
        if (!e || (e.target === el && e.propertyName === "height")) {
          el.removeEventListener("transitionend", onEnd);
          el.style.height = "";
          el.style.overflow = "";
          el.style.transition = "";
        }
      };
      el.addEventListener("transitionend", onEnd);
      setTimeout(onEnd, 300);
    }
  });
}

// Auto derive title from URL when user enters link
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
    showToast(`Saved bookmark "${payload.name}"`);
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

// Open first bookmark from search on Enter
function openFirstBookmark() {
  if (filteredBookmarks.value && filteredBookmarks.value.length > 0) {
    const firstItem = filteredBookmarks.value[0];
    if (firstItem && firstItem.link) {
      let url = String(firstItem.link).trim();
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }
}

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

// Custom Labels / Folders Persistence
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

// All available folders/labels (merges bookmarks' folders + custom created labels)
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

// Edit Labels Modal State & Methods
const isEditLabelsModalOpen = ref(false);
const newLabelInput = ref("");
const newLabelInputRef = ref(null);
const newLabelError = ref("");
const editingLabelOriginal = ref(null);
const editingLabelText = ref("");
const editingLabelInputRef = ref(null);
const labelTargetContext = ref(null); // 'create' | 'edit' | null

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

  // Update in custom labels
  const idx = customLabels.value.findIndex((f) => f === oldName);
  if (idx !== -1) {
    customLabels.value[idx] = newName;
  } else {
    customLabels.value.push(newName);
  }
  saveCustomLabels();

  // Update all bookmarks that had old folder name
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
  // Remove from custom labels
  customLabels.value = customLabels.value.filter((f) => f !== folder);
  saveCustomLabels();

  // Reassign affected bookmarks to "General"
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

watch(authUser, () => {
  loadCustomLabels();
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
      isDark ? 'dark bg-[#202124] text-[#e8eaed]' : 'bg-white text-[#202124]',
      'min-h-screen font-roboto flex flex-col transition-colors duration-200 selection:bg-[#feefc0] selection:text-[#202124]'
    ]"
  >
    <!-- Toast Notification Float -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-3"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="toastMessage"
        class="fixed bottom-6 left-6 z-[200] flex items-center gap-2.5 rounded-lg bg-[#323232] text-white px-4 py-3 text-sm shadow-xl"
      >
        <span class="text-amber-400">●</span>
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
      <div class="h-10 w-10 animate-spin rounded-full border-4 border-amber-400/30 border-t-amber-500"></div>
    </div>

    <!-- Authenticated Google Keep Workspace -->
    <div v-else-if="authUser" class="flex-1 flex flex-col">
      <!-- Google Keep App Bar Header -->
      <header
        :class="isDark ? 'border-[#5f6368] bg-[#202124]' : 'border-[#dadce0] bg-white'"
        class="sticky top-0 z-40 border-b px-2.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 transition-colors"
      >
        <!-- Mobile Search Mode Active Bar -->
        <div v-if="isMobileSearchActive" class="flex items-center gap-2 w-full">
          <button
            @click="closeMobileSearch"
            type="button"
            :class="isDark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'"
            class="h-10 w-10 rounded-full flex items-center justify-center transition flex-shrink-0 cursor-pointer"
            title="Back"
          >
            <svg class="h-5 w-5 fill-current" viewBox="0 0 24 24">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>

          <input
            ref="mobileSearchInputRef"
            v-model="searchQuery"
            @keydown.enter.prevent="openFirstBookmark"
            type="text"
            placeholder="Search bookmarks"
            :class="isDark ? 'text-[#e8eaed] placeholder-[#9aa0a6]' : 'text-[#202124] placeholder-[#5f6368]'"
            class="flex-1 bg-transparent border-0 outline-none px-2 text-base"
          />

          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            type="button"
            :class="isDark ? 'text-[#9aa0a6] hover:bg-[#3c4043]' : 'text-[#5f6368] hover:bg-gray-200'"
            class="h-9 w-9 rounded-full flex items-center justify-center transition flex-shrink-0 cursor-pointer"
            title="Clear search"
          >
            <svg class="h-5 w-5 fill-current" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <!-- Normal Header View -->
        <template v-else>
          <!-- Left: Hamburger + Google Keep Logo -->
          <div class="flex items-center gap-1.5 sm:gap-4 flex-shrink-0">
            <button
              @click="isSidebarOpen = !isSidebarOpen"
              type="button"
              :class="isDark ? 'hover:bg-[#303134] text-[#9aa0a6]' : 'hover:bg-gray-100 text-[#5f6368]'"
              class="h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center transition cursor-pointer"
              title="Main menu"
            >
              <svg class="h-6 w-6 fill-current" viewBox="0 0 24 24">
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
              </svg>
            </button>

            <div
              @click="selectedFolderFilter = 'ALL'"
              class="flex items-center gap-2 cursor-pointer select-none transition-transform hover:opacity-90 active:scale-95"
              title="BkMark Bookmarks"
            >
              <img
                src="/images/logo.png"
                alt="bkMark"
                class="h-6 sm:h-7 w-auto object-contain"
              />
            </div>
          </div>

          <!-- Center: Google Keep Signature Search Capsule (Visible on tablet & desktop) -->
          <div class="hidden sm:flex flex-1 max-w-[720px] mx-2 sm:mx-6">
            <div
              :class="[
                isDark
                  ? 'bg-[#525355]/30 focus-within:bg-[#303134] focus-within:shadow-[0_1px_3px_0_rgba(0,0,0,0.4),0_4px_8px_3px_rgba(0,0,0,0.3)]'
                  : 'bg-[#f1f3f4] focus-within:bg-white focus-within:shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]',
                'w-full relative flex items-center rounded-lg h-11 sm:h-12 transition-all duration-200 px-3'
              ]"
            >
              <button
                @click="searchInputRef?.focus()"
                type="button"
                :class="isDark ? 'text-[#9aa0a6]' : 'text-[#5f6368]'"
                class="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              >
                <svg class="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
              </button>

              <input
                ref="searchInputRef"
                v-model="searchQuery"
                @keydown.enter.prevent="openFirstBookmark"
                type="text"
                placeholder="Search"
                :class="isDark ? 'text-[#e8eaed] placeholder-[#9aa0a6]' : 'text-[#202124] placeholder-[#5f6368]'"
                class="w-full bg-transparent border-0 outline-none px-3 text-base"
              />

              <button
                v-if="searchQuery"
                @click="searchQuery = ''"
                type="button"
                :class="isDark ? 'text-[#9aa0a6] hover:bg-[#3c4043]' : 'text-[#5f6368] hover:bg-gray-200'"
                class="p-2 rounded-full transition cursor-pointer"
                title="Clear search"
              >
                <svg class="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Right: Action Icons & Avatar -->
          <div class="flex items-center gap-0.5 sm:gap-2 flex-shrink-0">
            <!-- Mobile Search Icon (only visible on mobile) -->
            <button
              @click="openMobileSearch"
              type="button"
              :class="isDark ? 'hover:bg-[#303134] text-[#9aa0a6]' : 'hover:bg-gray-100 text-[#5f6368]'"
              class="sm:hidden h-9 w-9 rounded-full flex items-center justify-center transition cursor-pointer"
              title="Search"
            >
              <svg class="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
            </button>

            <!-- Refresh Button (desktop & tablet) -->
            <button
              @click="bookmarksLoading = true; initAuth(); showToast('Bookmarks refreshed')"
              type="button"
              :class="isDark ? 'hover:bg-[#303134] text-[#9aa0a6]' : 'hover:bg-gray-100 text-[#5f6368]'"
              class="hidden md:flex h-10 w-10 rounded-full items-center justify-center transition cursor-pointer"
              title="Refresh"
            >
              <svg class="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
            </button>

            <!-- Grid / List View Toggle -->
            <button
              @click="viewMode = viewMode === 'grid' ? 'list' : 'grid'"
              type="button"
              :class="isDark ? 'hover:bg-[#303134] text-[#9aa0a6]' : 'hover:bg-gray-100 text-[#5f6368]'"
              class="h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center transition cursor-pointer"
              :title="viewMode === 'grid' ? 'List view' : 'Grid view'"
            >
              <!-- Grid Icon -->
              <svg v-if="viewMode === 'grid'" class="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M4 11h5V5H4v6zm0 7h5v-6H4v6zm6 0h5v-6h-5v6zm6 0h5v-6h-5v6zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z"/>
              </svg>
              <!-- List Icon -->
              <svg v-else class="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
              </svg>
            </button>

            <!-- Dark / Light Mode Toggle -->
            <button
              @click="toggleDarkMode"
              type="button"
              :class="isDark ? 'hover:bg-[#303134] text-[#9aa0a6]' : 'hover:bg-gray-100 text-[#5f6368]'"
              class="h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center transition cursor-pointer"
              :title="isDark ? 'Switch to Light theme' : 'Switch to Dark theme'"
            >
              <svg v-if="!isDark" class="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-3.03 0-5.5-2.47-5.5-5.5 0-1.82.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
              </svg>
              <svg v-else class="h-5 w-5 fill-current text-amber-300" viewBox="0 0 24 24">
                <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
              </svg>
            </button>

            <!-- Google Apps 9-dots Launcher Dropdown (hidden on small mobile) -->
            <div class="relative hidden sm:block">
              <button
                @click="showGoogleAppsMenu = !showGoogleAppsMenu"
                type="button"
                :class="isDark ? 'hover:bg-[#303134] text-[#9aa0a6]' : 'hover:bg-gray-100 text-[#5f6368]'"
                class="h-10 w-10 rounded-full flex items-center justify-center transition cursor-pointer"
                title="Google apps"
              >
                <svg class="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM6 4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 12c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </button>

              <div
                v-if="showGoogleAppsMenu"
                @click.outside="showGoogleAppsMenu = false"
                :class="isDark ? 'bg-[#303134] border-[#5f6368] text-white shadow-2xl' : 'bg-white border-[#dadce0] text-gray-800 shadow-xl'"
                class="absolute right-0 top-12 w-64 rounded-2xl border p-3 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 px-2 py-1">Quick Links</p>
                <div class="grid grid-cols-3 gap-2 mt-1">
                  <a href="https://google.com" target="_blank" class="flex flex-col items-center p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-center">
                    <span class="text-xl">🔍</span>
                    <span class="text-[11px] mt-1 font-medium">Search</span>
                  </a>
                  <a href="https://mail.google.com" target="_blank" class="flex flex-col items-center p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-center">
                    <span class="text-xl">✉️</span>
                    <span class="text-[11px] mt-1 font-medium">Gmail</span>
                  </a>
                  <a href="https://drive.google.com" target="_blank" class="flex flex-col items-center p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-center">
                    <span class="text-xl">📁</span>
                    <span class="text-[11px] mt-1 font-medium">Drive</span>
                  </a>
                  <a href="https://calendar.google.com" target="_blank" class="flex flex-col items-center p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-center">
                    <span class="text-xl">📅</span>
                    <span class="text-[11px] mt-1 font-medium">Calendar</span>
                  </a>
                  <a href="https://keep.google.com" target="_blank" class="flex flex-col items-center p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-center">
                    <span class="text-xl">💡</span>
                    <span class="text-[11px] mt-1 font-medium">Keep</span>
                  </a>
                  <a href="https://github.com" target="_blank" class="flex flex-col items-center p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-center">
                    <span class="text-xl">🐙</span>
                    <span class="text-[11px] mt-1 font-medium">GitHub</span>
                  </a>
                </div>
              </div>
            </div>

            <!-- Google User Profile Avatar -->
            <button
              @click="openAccountModal"
              type="button"
              class="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full ring-2 ring-amber-400/40 hover:ring-amber-500 overflow-visible flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 text-white font-medium text-xs sm:text-sm transition cursor-pointer"
              title="Google Account & Sync"
            >
              <span>{{ authUser?.email?.charAt(0).toUpperCase() || 'G' }}</span>
              <span
                v-if="friendRequests.length > 0"
                :class="isDark ? 'ring-[#202124]' : 'ring-white'"
                class="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 shadow-sm z-10"
              >
                {{ friendRequests.length }}
              </span>
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
          class="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40 md:hidden transition-opacity duration-200"
        ></div>

        <!-- Left Google Keep Drawer Sidebar -->
        <aside
          :class="[
            isMobile
              ? [
                  'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-2xl transition-transform duration-300 ease-in-out',
                  isSidebarOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
                ]
              : [
                  isSidebarOpen ? 'w-64' : 'w-16 hidden sm:block',
                  'flex-shrink-0 transition-all duration-300 z-30'
                ],
            isDark ? 'bg-[#202124]' : 'bg-white',
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
              <img src="/images/logo.png" alt="bkMark" class="h-6 w-auto object-contain" />
            </div>
            <button
              @click="isSidebarOpen = false"
              type="button"
              :class="isDark ? 'hover:bg-[#303134] text-[#9aa0a6]' : 'hover:bg-gray-100 text-[#5f6368]'"
              class="h-8 w-8 rounded-full flex items-center justify-center transition cursor-pointer"
              title="Close menu"
            >
              <svg class="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          <div class="space-y-0.5">
            <!-- Notes (All Bookmarks) -->
            <button
              @click="selectFolder('ALL')"
              type="button"
              :class="[
                selectedFolderFilter === 'ALL'
                  ? isDark
                    ? 'bg-[#41331c] text-[#feefc0] font-medium'
                    : 'bg-[#feefc0] text-[#202124] font-medium'
                  : isDark
                    ? 'text-[#e8eaed] hover:bg-[#303134]'
                    : 'text-[#202124] hover:bg-[#f1f3f4]',
                'w-full flex items-center gap-6 rounded-r-full py-3 px-5 text-sm transition text-left cursor-pointer'
              ]"
            >
              <!-- Lightbulb icon -->
              <svg class="h-6 w-6 flex-shrink-0 fill-current" viewBox="0 0 24 24">
                <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6A5.006 5.006 0 0 1 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z"/>
              </svg>
              <span v-if="isSidebarOpen || isMobile" class="truncate flex-1">Bookmarks</span>
              <span v-if="(isSidebarOpen || isMobile) && totalCount > 0" class="text-xs opacity-75 font-normal">
                {{ totalCount }}
              </span>
            </button>

            <!-- Reminders / Recent -->
            <button
              @click="selectFolder('RECENT')"
              type="button"
              :class="[
                selectedFolderFilter === 'RECENT'
                  ? isDark
                    ? 'bg-[#41331c] text-[#feefc0] font-medium'
                    : 'bg-[#feefc0] text-[#202124] font-medium'
                  : isDark
                    ? 'text-[#e8eaed] hover:bg-[#303134]'
                    : 'text-[#202124] hover:bg-[#f1f3f4]',
                'w-full flex items-center gap-6 rounded-r-full py-3 px-5 text-sm transition text-left cursor-pointer'
              ]"
            >
              <!-- Bell icon -->
              <svg class="h-6 w-6 flex-shrink-0 fill-current" viewBox="0 0 24 24">
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
                    ? 'bg-[#41331c] text-[#feefc0] font-medium'
                    : 'bg-[#feefc0] text-[#202124] font-medium'
                  : isDark
                    ? 'text-[#e8eaed] hover:bg-[#303134]'
                    : 'text-[#202124] hover:bg-[#f1f3f4]',
                'w-full flex items-center gap-6 rounded-r-full py-3 px-5 text-sm transition text-left cursor-pointer'
              ]"
            >
              <!-- Users icon -->
              <svg class="h-6 w-6 flex-shrink-0 fill-current" viewBox="0 0 24 24">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
              <span v-if="isSidebarOpen || isMobile" class="truncate flex-1">Shared</span>
              <span v-if="(isSidebarOpen || isMobile) && sharedCount > 0" class="text-xs opacity-75 font-normal">
                {{ sharedCount }}
              </span>
            </button>
          </div>

          <!-- Separator -->
          <hr :class="isDark ? 'border-[#5f6368]' : 'border-[#e0e0e0]'" class="my-3" />

          <!-- LABELS SECTION -->
          <div v-if="isSidebarOpen || isMobile" class="px-5 py-1 flex items-center justify-between">
            <span :class="isDark ? 'text-[#9aa0a6]' : 'text-[#5f6368]'" class="text-[11px] font-semibold uppercase tracking-wider">
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
                    ? 'bg-[#41331c] text-[#feefc0] font-medium'
                    : 'bg-[#feefc0] text-[#202124] font-medium'
                  : isDark
                    ? 'text-[#e8eaed] hover:bg-[#303134]'
                    : 'text-[#202124] hover:bg-[#f1f3f4]',
                'w-full flex items-center gap-6 rounded-r-full py-2.5 px-5 text-sm transition text-left cursor-pointer'
              ]"
              :title="folder"
            >
              <!-- Google Keep Label Icon -->
              <svg class="h-5 w-5 flex-shrink-0 fill-current opacity-70" viewBox="0 0 24 24">
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
              class="w-full flex items-center gap-6 rounded-r-full py-2.5 px-5 text-sm transition text-left cursor-pointer"
            >
              <svg class="h-5 w-5 flex-shrink-0 fill-current opacity-70" viewBox="0 0 24 24">
                <path d="M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83 3.75 3.75 1.84-1.84zM3 17.25V21h3.75L17.81 9.93l-3.75-3.75L3 17.25z"/>
              </svg>
              <span v-if="isSidebarOpen || isMobile" class="truncate">Edit labels</span>
            </button>
          </div>
        </aside>

      <!-- Main Notes Stream Canvas -->
      <main class="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 py-4 sm:py-6 pb-32 sm:pb-24 space-y-6 sm:space-y-8">
        <!-- Floating Bookmark Creation Card -->
        <div class="max-w-[620px] mx-auto w-full">
          <div
            ref="creatorCardRef"
            :style="isCreatingNote ? getCardStyle(newColor) : {}"
            :class="[
              isCreatingNote
                ? 'p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.05)] dark:shadow-[0_6px_30px_rgba(0,0,0,0.45)]'
                : [
                    isDark
                      ? 'bg-[#202124] border-[#5f6368] text-gray-300 hover:border-[#80868b] hover:bg-[#25272a]'
                      : 'bg-white border-slate-200/90 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50',
                    'px-3.5 sm:px-4 py-2.5 sm:py-3 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-md'
                  ],
              'rounded-2xl border transition-colors duration-200'
            ]"
          >
            <!-- COLLAPSED TRIGGER VIEW -->
            <div
              v-if="!isCreatingNote"
              @click="expandNoteCreator"
              class="cursor-pointer flex items-center justify-between group gap-2"
            >
              <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div
                  :class="isDark ? 'bg-amber-400/10 text-amber-400' : 'bg-amber-50 text-amber-600'"
                  class="p-1.5 sm:p-2 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 flex-shrink-0"
                >
                  <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                  </svg>
                </div>
                <span :class="isDark ? 'text-gray-400' : 'text-slate-500'" class="text-xs sm:text-sm font-medium truncate">Save a bookmark or paste link...</span>
              </div>

              <div class="flex items-center gap-1.5 sm:gap-2 flex-shrink-0" @click.stop>
                <button
                  @click="expandNoteCreator()"
                  type="button"
                  :class="isDark ? 'bg-[#303134] text-gray-200 hover:bg-[#3c4043]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
                  class="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer"
                  title="Add new bookmark"
                >
                  <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                  </svg>
                  <span class="hidden xs:inline sm:inline">Add Bookmark</span>
                  <span class="inline xs:hidden sm:hidden">Add</span>
                </button>
              </div>
            </div>

            <!-- EXPANDED FORM VIEW -->
            <div
              v-else
              class="space-y-3.5 sm:space-y-4"
            >
              <!-- Card Header: Badge + Pin Button -->
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                  <span
                    :class="isDark ? 'bg-amber-400/15 text-amber-300 border-amber-400/30' : 'bg-amber-50 text-amber-700 border-amber-200'"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold"
                  >
                    <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                    </svg>
                    <span>New Bookmark</span>
                  </span>
                </div>

                <!-- Pin Toggle Button -->
                <button
                  @click="newPinned = !newPinned"
                  type="button"
                  :class="newPinned
                    ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                    : (isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent' : 'text-slate-500 hover:text-slate-800 hover:bg-black/5 border border-transparent')"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer"
                  :title="newPinned ? 'Pinned to top' : 'Pin bookmark to top'"
                >
                  <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M16 9V4l1 0c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1l1 0v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/>
                  </svg>
                  <span>{{ newPinned ? 'Pinned' : 'Pin' }}</span>
                </button>
              </div>

              <!-- URL Input Field with live favicon & paste shortcut -->
              <div
                :class="isDark
                  ? 'bg-black/25 border-white/10 focus-within:border-amber-400/60 focus-within:ring-2 focus-within:ring-amber-400/20'
                  : 'bg-slate-50/80 border-slate-200 focus-within:border-amber-500/60 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:bg-white'"
                class="flex items-center gap-2.5 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border transition-all"
              >
                <!-- Favicon / Globe preview -->
                <div
                  class="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                  :class="isDark ? 'bg-white/10' : 'bg-white ring-1 ring-slate-200/80 shadow-2xs'"
                >
                  <img
                    v-if="newLink.trim()"
                    :src="faviconUrl(newLink)"
                    alt="favicon"
                    class="w-4 h-4 object-contain"
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
                  placeholder="Destination URL (e.g. https://...)"
                  :class="isDark ? 'text-gray-100 placeholder-gray-500' : 'text-slate-900 placeholder-slate-400 font-medium'"
                  class="w-full bg-transparent border-0 outline-none text-base sm:text-sm font-mono"
                />

                <!-- Quick Paste Clipboard button if link is empty -->
                <button
                  v-if="!newLink"
                  @click="pasteClipboardUrl"
                  type="button"
                  :class="isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-white/10' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'"
                  class="px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition flex-shrink-0 cursor-pointer"
                  title="Paste from clipboard"
                >
                  <svg class="w-3 h-3 fill-current" viewBox="0 0 24 24">
                    <path d="M19 2h-4.18C14.4.84 13.3 0 12 0c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 18H5V4h2v3h10V4h2v16z"/>
                  </svg>
                  <span>Paste</span>
                </button>

                <!-- Clear button if link has content -->
                <button
                  v-else
                  @click="newLink = ''"
                  type="button"
                  :class="isDark ? 'text-gray-400 hover:text-gray-200' : 'text-slate-400 hover:text-slate-700'"
                  class="p-1 rounded-full text-xs transition flex-shrink-0 cursor-pointer"
                  title="Clear URL"
                >
                  ✕
                </button>
              </div>

              <!-- Title Input Field with auto-detected domain hint -->
              <div
                :class="isDark
                  ? 'bg-black/25 border-white/10 focus-within:border-amber-400/60 focus-within:ring-2 focus-within:ring-amber-400/20'
                  : 'bg-slate-50/80 border-slate-200 focus-within:border-amber-500/60 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:bg-white'"
                class="flex items-center gap-2.5 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border transition-all"
              >
                <svg :class="isDark ? 'text-gray-400' : 'text-slate-400'" class="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 24 24">
                  <path d="M5 4v3h5.5v12h3V7H19V4z"/>
                </svg>
                <input
                  v-model="newTitle"
                  @keydown.enter.prevent="saveNewNote"
                  type="text"
                  placeholder="Title (e.g. Documentation, Dashboard...)"
                  :class="isDark ? 'text-gray-100 placeholder-gray-500' : 'text-slate-900 placeholder-slate-400 font-semibold'"
                  class="w-full bg-transparent border-0 outline-none text-base sm:text-sm"
                />
                <span
                  v-if="newLink.trim() && getDomain(newLink)"
                  :class="isDark ? 'bg-white/10 text-gray-300' : 'bg-slate-200/80 text-slate-700'"
                  class="text-[11px] font-medium px-2 py-0.5 rounded-md truncate max-w-[100px] sm:max-w-[130px] flex-shrink-0"
                >
                  {{ getDomain(newLink) }}
                </span>
              </div>

              <!-- Folder / Label Selector + Color Picker Row -->
              <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
                <!-- Folder / Label selector -->
                <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <div
                    :class="isDark ? 'bg-black/20 border-white/10 text-gray-300' : 'bg-slate-50 border-slate-200 text-slate-700'"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium"
                  >
                    <svg class="h-3.5 w-3.5 opacity-60 fill-current" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                    <span class="opacity-70 text-[11px]">Folder:</span>
                    <select
                      v-model="newFolder"
                      :class="isDark ? 'bg-[#202124] text-gray-100' : 'bg-white text-slate-900 font-semibold'"
                      class="outline-none cursor-pointer pr-1 text-xs rounded"
                    >
                      <option value="General">General</option>
                      <option v-for="folder in availableFolders" :key="folder" :value="folder">
                        {{ folder }}
                      </option>
                    </select>
                  </div>

                  <button
                    @click="promptCreateFolder('create')"
                    type="button"
                    :class="isDark ? 'hover:bg-white/10 text-gray-400 hover:text-gray-200' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'"
                    class="p-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
                    title="Create new label / folder"
                  >
                    + New Label
                  </button>
                </div>

                <!-- Color picker button & popover -->
                <div class="relative flex items-center gap-1 ml-auto">
                  <button
                    @click="showCreateColorPicker = !showCreateColorPicker"
                    type="button"
                    :class="isDark ? 'hover:bg-white/10 text-gray-300 border-white/10' : 'hover:bg-slate-100 text-slate-700 border-slate-200'"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer"
                    title="Card background color"
                  >
                    <span
                      :style="{ backgroundColor: isDark ? (KEEP_COLORS.find(c => c.bg.toLowerCase() === newColor.toLowerCase())?.darkBg || newColor) : newColor }"
                      class="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/20 shadow-2xs inline-block"
                    ></span>
                    <span class="text-[11px]">Color</span>
                  </button>

                  <!-- Color Palette Popover -->
                  <div
                    v-if="showCreateColorPicker"
                    :class="isDark ? 'bg-[#303134] border-[#5f6368]' : 'bg-white border-[#dadce0]'"
                    class="absolute right-0 bottom-10 p-2.5 rounded-2xl border shadow-xl z-50 flex flex-wrap gap-1.5 w-44 sm:w-48"
                  >
                    <button
                      v-for="c in KEEP_COLORS"
                      :key="c.name"
                      @click="newColor = c.bg; showCreateColorPicker = false"
                      :style="{ backgroundColor: isDark ? c.darkBg : c.bg }"
                      :title="c.name"
                      :class="newColor.toLowerCase() === c.bg.toLowerCase() ? 'ring-2 ring-amber-500 scale-110' : 'hover:scale-105'"
                      class="h-6 w-6 rounded-full border border-gray-300 dark:border-gray-600 transition cursor-pointer"
                    ></button>
                  </div>
                </div>
              </div>

              <!-- Creation Bottom Action Toolbar -->
              <div :class="isDark ? 'border-white/10' : 'border-slate-200/80'" class="flex items-center justify-between pt-3 border-t">
                <div class="text-[11px] hidden sm:block" :class="isDark ? 'text-gray-400' : 'text-slate-500'">
                  Press <kbd class="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono text-[10px]">Enter</kbd> to save
                </div>

                <div class="flex items-center gap-2 ml-auto">
                  <button
                    @click="resetNoteCreator"
                    type="button"
                    :class="isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'"
                    class="px-3.5 py-2 text-xs font-semibold rounded-lg transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    @click="saveNewNote"
                    type="button"
                    :disabled="!newLink.trim() && !newTitle.trim()"
                    :class="(!newLink.trim() && !newTitle.trim())
                      ? (isDark ? 'bg-white/10 text-gray-500 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed')
                      : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm hover:shadow active:scale-95 font-bold cursor-pointer'"
                    class="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 text-xs rounded-xl transition"
                  >
                    <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                    <span>Save Bookmark</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Section: PINNED Bookmarks (Image 2 style) -->
        <section v-if="pinnedBookmarks.length > 0">
          <div class="max-w-7xl mx-auto mb-2 px-1">
            <h2 :class="isDark ? 'text-[#9aa0a6]' : 'text-[#5f6368]'" class="text-[11px] font-semibold uppercase tracking-wider">
              Pinned
            </h2>
          </div>

          <!-- Cards Grid for Pinned -->
          <div
            :class="viewMode === 'grid'
              ? 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 sm:gap-4 space-y-3 sm:space-y-4 max-w-7xl mx-auto'
              : 'max-w-2xl mx-auto space-y-3 sm:space-y-4'"
          >
            <article
              v-for="bookmark in pinnedBookmarks"
              :key="bookmark.id"
              :style="getCardStyle(bookmark.color)"
              @click="openEditNote(bookmark)"
              class="group break-inside-avoid relative rounded-2xl border p-3.5 sm:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-xl hover:-translate-y-0.5 sm:hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between cursor-pointer overflow-hidden mb-3 sm:mb-4"
            >
              <div>
                <!-- Top Brand Header: Prominent Site Icon + Domain + Pin Button -->
                <div class="flex items-center justify-between gap-3 mb-2.5 sm:mb-3">
                  <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <!-- Prominent Site Icon Avatar -->
                    <div
                      class="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden shadow-xs ring-1 ring-black/5 dark:ring-white/10 transition-transform group-hover:scale-105"
                      :class="isDark ? 'bg-white/10' : 'bg-white shadow-2xs'"
                    >
                      <img
                        :src="getSiteIconUrl(bookmark.link)"
                        alt="Site Icon"
                        class="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                        loading="lazy"
                        @error="onFaviconError($event, bookmark.link)"
                      />
                    </div>

                    <!-- Domain & Link Type Metadata -->
                    <div class="min-w-0 flex flex-col">
                      <div class="flex items-center gap-1.5">
                        <span
                          :class="isDark ? 'text-gray-200' : 'text-slate-800'"
                          class="text-xs font-bold tracking-tight truncate max-w-[110px] sm:max-w-[150px]"
                        >
                          {{ getDomain(bookmark.link) }}
                        </span>
                        <!-- SSL Security badge for https -->
                        <svg
                          v-if="(bookmark.link || '').startsWith('https')"
                          class="w-2.5 h-2.5 text-emerald-500 flex-shrink-0"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          title="Secure HTTPS connection"
                        >
                          <path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd" />
                        </svg>
                      </div>

                      <!-- Link Type Metadata Pill -->
                      <div class="flex items-center gap-1.5 mt-0.5">
                        <span
                          :class="getBadgeClass(getLinkTypeBadge(bookmark))"
                          class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                        >
                          <span>{{ getLinkTypeBadge(bookmark).icon }}</span>
                          <span>{{ getLinkTypeBadge(bookmark).label }}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Pin Button -->
                  <button
                    @click.stop="togglePin(bookmark, $event)"
                    type="button"
                    :class="bookmark.pinned
                      ? 'text-amber-500 bg-amber-500/15 ring-1 ring-amber-500/30'
                      : (isDark ? 'text-gray-400 hover:text-amber-400 hover:bg-white/10' : 'text-slate-400 hover:text-amber-600 hover:bg-slate-100')"
                    class="p-2 sm:p-1.5 rounded-full transition flex-shrink-0 cursor-pointer"
                    :title="bookmark.pinned ? 'Unpin bookmark' : 'Pin bookmark to top'"
                  >
                    <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M16 9V4l1 0c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1l1 0v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/>
                    </svg>
                  </button>
                </div>

                <!-- Bookmark Title Row: Name on Left + Folder Button on Right -->
                <div class="flex items-center justify-between gap-2 mb-2 sm:mb-2.5">
                  <h3
                    :class="isDark ? 'text-gray-100' : 'text-slate-900'"
                    class="text-sm sm:text-base font-bold tracking-tight leading-snug break-words min-w-0 flex-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors"
                  >
                    {{ bookmark.name }}
                  </h3>

                  <div class="flex items-center gap-1.5 flex-shrink-0">
                    <!-- Label Tag Chip / Folder Button -->
                    <button
                      @click.stop="selectedFolderFilter = bookmark.folderName || 'General'"
                      type="button"
                      :class="isDark
                        ? 'bg-white/[0.06] hover:bg-white/[0.12] border-white/10 text-slate-300 hover:text-white'
                        : 'bg-slate-100 hover:bg-slate-200/90 border-slate-200/80 text-slate-700 hover:text-slate-950'"
                      class="inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-medium transition-all group/tag cursor-pointer max-w-[100px] sm:max-w-[130px]"
                      title="Filter by folder"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-2.5 w-2.5 sm:h-3 sm:w-3 opacity-50 group-hover/tag:opacity-80 transition-opacity flex-shrink-0"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                      </svg>
                      <span class="truncate font-semibold">{{ bookmark.folderName || "General" }}</span>
                    </button>

                    <!-- Shared Badge if present -->
                    <span
                      v-if="bookmark.shared"
                      :class="isDark ? 'bg-cyan-500/15 border-cyan-400/30 text-cyan-300' : 'bg-blue-50 border-blue-200 text-blue-700'"
                      class="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
                      title="Shared bookmark"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 opacity-80" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                      </svg>
                    </span>
                  </div>
                </div>

                <!-- Legacy Notes display if any (clean text preview) -->
                <p
                  v-if="bookmark.notes"
                  :class="isDark ? 'text-gray-300' : 'text-slate-600'"
                  class="text-xs leading-relaxed mb-2 sm:mb-3 line-clamp-2"
                >
                  {{ bookmark.notes.replace(/\[[ xX]\]\s*/g, '') }}
                </p>

                <!-- Rich Link Metadata Preview Banner (Openable link) -->
                <a
                  :href="bookmark.link"
                  target="_blank"
                  rel="noopener noreferrer"
                  @click.stop
                  :class="isDark
                    ? 'bg-black/20 hover:bg-black/35 border-white/10 hover:border-amber-400/40 text-gray-200'
                    : 'bg-slate-50/90 hover:bg-slate-100/90 border-slate-200/90 hover:border-amber-500/40 text-slate-800'"
                  class="group/link flex items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs transition-all duration-200 mb-2 hover:shadow-xs"
                  :title="'Open ' + bookmark.link"
                >
                  <div class="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <svg
                      class="w-3.5 h-3.5 opacity-50 flex-shrink-0 fill-current"
                      viewBox="0 0 24 24"
                    >
                      <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
                    </svg>
                    <span class="truncate font-mono text-[11px] opacity-80 font-medium">
                      {{ getLinkDisplayPath(bookmark.link) }}
                    </span>
                  </div>

                  <span
                    :class="isDark ? 'bg-white/10 group-hover/link:bg-amber-400/20 group-hover/link:text-amber-300' : 'bg-white group-hover/link:bg-amber-50 group-hover/link:text-amber-700 shadow-2xs'"
                    class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition-all flex-shrink-0"
                  >
                    <span>Open</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-3 w-3 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path fill-rule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z" clip-rule="evenodd" />
                    </svg>
                  </span>
                </a>
              </div>

              <!-- Card Bottom: Action Toolbar -->
              <div :class="isDark ? 'border-white/10' : 'border-slate-200/80'" class="pt-2 mt-1 border-t flex items-center justify-between">
                <div :class="isDark ? 'text-gray-400' : 'text-slate-600'" class="w-full flex items-center justify-between">
                  <div class="relative">
                    <button
                      @click.stop="activeColorPickerCardId = activeColorPickerCardId === bookmark.id ? null : bookmark.id"
                      type="button"
                      :class="isDark ? 'hover:bg-white/15' : 'hover:bg-black/10'"
                      class="p-2 sm:p-1.5 rounded-full transition cursor-pointer"
                      title="Color palette"
                    >
                      <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.22 19.59 10.57 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/>
                      </svg>
                    </button>
                    <!-- Palette Popover -->
                    <div
                      v-if="activeColorPickerCardId === bookmark.id"
                      @click.stop
                      :class="isDark ? 'bg-[#303134] border-[#5f6368]' : 'bg-white border-[#dadce0]'"
                      class="absolute left-0 bottom-9 sm:bottom-8 p-2 rounded-2xl border shadow-xl z-50 flex flex-wrap gap-1 w-36"
                    >
                      <button
                        v-for="c in KEEP_COLORS"
                        :key="c.name"
                        @click="changeCardColor(bookmark, c.bg)"
                        :style="{ backgroundColor: isDark ? c.darkBg : c.bg }"
                        class="h-5 w-5 rounded-full border border-gray-300 dark:border-gray-600 hover:scale-110 transition cursor-pointer"
                      ></button>
                    </div>
                  </div>

                  <button
                    @click.stop="copyLink(bookmark.link, bookmark.name)"
                    type="button"
                    :class="isDark ? 'hover:bg-white/15' : 'hover:bg-black/10'"
                    class="p-2 sm:p-1.5 rounded-full transition cursor-pointer"
                    title="Copy link"
                  >
                    <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                    </svg>
                  </button>

                  <button
                    @click.stop="openShareModalForBookmark(bookmark)"
                    type="button"
                    :class="isDark ? 'hover:bg-white/15' : 'hover:bg-black/10'"
                    class="p-2 sm:p-1.5 rounded-full transition cursor-pointer"
                    title="Share with friend"
                  >
                    <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                    </svg>
                  </button>

                  <button
                    @click.stop="openEditNote(bookmark)"
                    type="button"
                    :class="isDark ? 'hover:bg-white/15' : 'hover:bg-black/10'"
                    class="p-2 sm:p-1.5 rounded-full transition cursor-pointer"
                    title="Edit"
                  >
                    <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M3 17.25V21h3.75L17.81 9.93l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83 3.75 3.75 1.84-1.84z"/>
                    </svg>
                  </button>

                  <button
                    @click.stop="deleteBookmark(bookmark.id)"
                    type="button"
                    class="p-2 sm:p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-950 text-red-500 transition cursor-pointer"
                    title="Delete"
                  >
                    <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </article>
          </div>
        </section>

        <!-- Section: OTHERS / All Bookmarks (Image 2 style) -->
        <section>
          <div v-if="pinnedBookmarks.length > 0" class="max-w-7xl mx-auto mb-2 px-1">
            <h2 :class="isDark ? 'text-[#9aa0a6]' : 'text-slate-700'" class="text-[11px] font-bold uppercase tracking-wider">
              Others
            </h2>
          </div>

          <!-- Empty State -->
          <div
            v-if="otherBookmarks.length === 0 && pinnedBookmarks.length === 0"
            class="flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4"
          >
            <div class="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-amber-400/10 flex items-center justify-center mb-4">
              <span class="text-3xl sm:text-4xl">💡</span>
            </div>
            <h3 :class="isDark ? 'text-gray-300' : 'text-slate-800'" class="text-base sm:text-lg font-medium">
              {{ searchQuery ? 'No bookmarks match your search' : 'Bookmarks you add appear here' }}
            </h3>
            <p :class="isDark ? 'text-gray-400' : 'text-slate-600'" class="text-xs sm:text-sm mt-1 max-w-sm">
              {{ searchQuery ? 'Try searching for another keyword or folder name.' : 'Click "Save a bookmark..." above or tap the + button to add bookmarks.' }}
            </p>
          </div>

          <!-- Cards Grid for Other Bookmarks -->
          <div
            v-else
            :class="viewMode === 'grid'
              ? 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 sm:gap-4 space-y-3 sm:space-y-4 max-w-7xl mx-auto'
              : 'max-w-2xl mx-auto space-y-3 sm:space-y-4'"
          >
            <article
              v-for="bookmark in otherBookmarks"
              :key="bookmark.id"
              :style="getCardStyle(bookmark.color)"
              @click="openEditNote(bookmark)"
              class="group break-inside-avoid relative rounded-2xl border p-3.5 sm:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-xl hover:-translate-y-0.5 sm:hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between cursor-pointer overflow-hidden mb-3 sm:mb-4"
            >
              <div>
                <!-- Top Brand Header: Prominent Site Icon + Domain + Pin Button -->
                <div class="flex items-center justify-between gap-3 mb-2.5 sm:mb-3">
                  <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <!-- Prominent Site Icon Avatar -->
                    <div
                      class="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden shadow-xs ring-1 ring-black/5 dark:ring-white/10 transition-transform group-hover:scale-105"
                      :class="isDark ? 'bg-white/10' : 'bg-white shadow-2xs'"
                    >
                      <img
                        :src="getSiteIconUrl(bookmark.link)"
                        alt="Site Icon"
                        class="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                        loading="lazy"
                        @error="onFaviconError($event, bookmark.link)"
                      />
                    </div>

                    <!-- Domain & Link Type Metadata -->
                    <div class="min-w-0 flex flex-col">
                      <div class="flex items-center gap-1.5">
                        <span
                          :class="isDark ? 'text-gray-200' : 'text-slate-800'"
                          class="text-xs font-bold tracking-tight truncate max-w-[110px] sm:max-w-[150px]"
                        >
                          {{ getDomain(bookmark.link) }}
                        </span>
                        <!-- SSL Security badge for https -->
                        <svg
                          v-if="(bookmark.link || '').startsWith('https')"
                          class="w-2.5 h-2.5 text-emerald-500 flex-shrink-0"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          title="Secure HTTPS connection"
                        >
                          <path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd" />
                        </svg>
                      </div>

                      <!-- Link Type Metadata Pill -->
                      <div class="flex items-center gap-1.5 mt-0.5">
                        <span
                          :class="getBadgeClass(getLinkTypeBadge(bookmark))"
                          class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                        >
                          <span>{{ getLinkTypeBadge(bookmark).icon }}</span>
                          <span>{{ getLinkTypeBadge(bookmark).label }}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Pin Button -->
                  <button
                    @click.stop="togglePin(bookmark, $event)"
                    type="button"
                    :class="bookmark.pinned
                      ? 'text-amber-500 bg-amber-500/15 ring-1 ring-amber-500/30'
                      : (isDark ? 'text-gray-400 hover:text-amber-400 hover:bg-white/10' : 'text-slate-400 hover:text-amber-600 hover:bg-slate-100')"
                    class="p-2 sm:p-1.5 rounded-full transition flex-shrink-0 cursor-pointer"
                    :title="bookmark.pinned ? 'Unpin bookmark' : 'Pin bookmark to top'"
                  >
                    <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M16 9V4l1 0c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1l1 0v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/>
                    </svg>
                  </button>
                </div>

                <!-- Bookmark Title Row: Name on Left + Folder Button on Right -->
                <div class="flex items-center justify-between gap-2 mb-2 sm:mb-2.5">
                  <h3
                    :class="isDark ? 'text-gray-100' : 'text-slate-900'"
                    class="text-sm sm:text-base font-bold tracking-tight leading-snug break-words min-w-0 flex-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors"
                  >
                    {{ bookmark.name }}
                  </h3>

                  <div class="flex items-center gap-1.5 flex-shrink-0">
                    <!-- Label Tag Chip / Folder Button -->
                    <button
                      @click.stop="selectedFolderFilter = bookmark.folderName || 'General'"
                      type="button"
                      :class="isDark
                        ? 'bg-white/[0.06] hover:bg-white/[0.12] border-white/10 text-slate-300 hover:text-white'
                        : 'bg-slate-100 hover:bg-slate-200/90 border-slate-200/80 text-slate-700 hover:text-slate-950'"
                      class="inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-medium transition-all group/tag cursor-pointer max-w-[100px] sm:max-w-[130px]"
                      title="Filter by folder"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-2.5 w-2.5 sm:h-3 sm:w-3 opacity-50 group-hover/tag:opacity-80 transition-opacity flex-shrink-0"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                      </svg>
                      <span class="truncate font-semibold">{{ bookmark.folderName || "General" }}</span>
                    </button>

                    <!-- Shared Badge if present -->
                    <span
                      v-if="bookmark.shared"
                      :class="isDark ? 'bg-cyan-500/15 border-cyan-400/30 text-cyan-300' : 'bg-blue-50 border-blue-200 text-blue-700'"
                      class="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
                      title="Shared bookmark"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 opacity-80" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                      </svg>
                    </span>
                  </div>
                </div>

                <!-- Legacy Notes display if any (clean text preview) -->
                <p
                  v-if="bookmark.notes"
                  :class="isDark ? 'text-gray-300' : 'text-slate-600'"
                  class="text-xs leading-relaxed mb-2 sm:mb-3 line-clamp-2"
                >
                  {{ bookmark.notes.replace(/\[[ xX]\]\s*/g, '') }}
                </p>

                <!-- Rich Link Metadata Preview Banner (Openable link) -->
                <a
                  :href="bookmark.link"
                  target="_blank"
                  rel="noopener noreferrer"
                  @click.stop
                  :class="isDark
                    ? 'bg-black/20 hover:bg-black/35 border-white/10 hover:border-amber-400/40 text-gray-200'
                    : 'bg-slate-50/90 hover:bg-slate-100/90 border-slate-200/90 hover:border-amber-500/40 text-slate-800'"
                  class="group/link flex items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs transition-all duration-200 mb-2 hover:shadow-xs"
                  :title="'Open ' + bookmark.link"
                >
                  <div class="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <svg
                      class="w-3.5 h-3.5 opacity-50 flex-shrink-0 fill-current"
                      viewBox="0 0 24 24"
                    >
                      <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
                    </svg>
                    <span class="truncate font-mono text-[11px] opacity-80 font-medium">
                      {{ getLinkDisplayPath(bookmark.link) }}
                    </span>
                  </div>

                  <span
                    :class="isDark ? 'bg-white/10 group-hover/link:bg-amber-400/20 group-hover/link:text-amber-300' : 'bg-white group-hover/link:bg-amber-50 group-hover/link:text-amber-700 shadow-2xs'"
                    class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition-all flex-shrink-0"
                  >
                    <span>Open</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-3 w-3 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path fill-rule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z" clip-rule="evenodd" />
                    </svg>
                  </span>
                </a>
              </div>

              <!-- Card Bottom: Action Toolbar -->
              <div :class="isDark ? 'border-white/10' : 'border-slate-200/80'" class="pt-2 mt-1 border-t flex items-center justify-between">
                <div :class="isDark ? 'text-gray-400' : 'text-slate-600'" class="w-full flex items-center justify-between">
                  <div class="relative">
                    <button
                      @click.stop="activeColorPickerCardId = activeColorPickerCardId === bookmark.id ? null : bookmark.id"
                      type="button"
                      :class="isDark ? 'hover:bg-white/15' : 'hover:bg-black/10'"
                      class="p-2 sm:p-1.5 rounded-full transition cursor-pointer"
                      title="Color palette"
                    >
                      <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.22 19.59 10.57 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/>
                      </svg>
                    </button>
                    <!-- Palette Popover -->
                    <div
                      v-if="activeColorPickerCardId === bookmark.id"
                      @click.stop
                      :class="isDark ? 'bg-[#303134] border-[#5f6368]' : 'bg-white border-[#dadce0]'"
                      class="absolute left-0 bottom-9 sm:bottom-8 p-2 rounded-2xl border shadow-xl z-50 flex flex-wrap gap-1 w-36"
                    >
                      <button
                        v-for="c in KEEP_COLORS"
                        :key="c.name"
                        @click="changeCardColor(bookmark, c.bg)"
                        :style="{ backgroundColor: isDark ? c.darkBg : c.bg }"
                        class="h-5 w-5 rounded-full border border-gray-300 dark:border-gray-600 hover:scale-110 transition cursor-pointer"
                      ></button>
                    </div>
                  </div>

                  <button
                    @click.stop="copyLink(bookmark.link, bookmark.name)"
                    type="button"
                    :class="isDark ? 'hover:bg-white/15' : 'hover:bg-black/10'"
                    class="p-2 sm:p-1.5 rounded-full transition cursor-pointer"
                    title="Copy link"
                  >
                    <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                    </svg>
                  </button>

                  <button
                    @click.stop="openShareModalForBookmark(bookmark)"
                    type="button"
                    :class="isDark ? 'hover:bg-white/15' : 'hover:bg-black/10'"
                    class="p-2 sm:p-1.5 rounded-full transition cursor-pointer"
                    title="Share with friend"
                  >
                    <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                    </svg>
                  </button>

                  <button
                    @click.stop="openEditNote(bookmark)"
                    type="button"
                    :class="isDark ? 'hover:bg-white/15' : 'hover:bg-black/10'"
                    class="p-2 sm:p-1.5 rounded-full transition cursor-pointer"
                    title="Edit"
                  >
                    <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M3 17.25V21h3.75L17.81 9.93l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83 3.75 3.75 1.84-1.84z"/>
                    </svg>
                  </button>

                  <button
                    @click.stop="deleteBookmark(bookmark.id)"
                    type="button"
                    class="p-2 sm:p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-950 text-red-500 transition cursor-pointer"
                    title="Delete"
                  >
                    <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </article>
          </div>
        </section>

        <!-- Mobile Floating Action Button (Google Keep FAB style) -->
        <button
          v-if="isMobile && !isCreatingNote"
          @click="triggerMobileCreate"
          type="button"
          class="fixed bottom-16 right-4 z-40 h-14 w-14 rounded-2xl bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-950 shadow-2xl flex items-center justify-center transition-all duration-200 cursor-pointer ring-4 ring-amber-400/20"
          title="Add bookmark"
          aria-label="Add bookmark"
        >
          <svg class="h-7 w-7 fill-current" viewBox="0 0 24 24">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </button>
      </main>
    </div>

    <!-- Edit Bookmark Modal Drawer -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isEditModalOpen"
        class="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4"
        @click.self="isEditModalOpen = false"
      >
        <div
          :style="getCardStyle(editColor)"
          class="w-full max-w-lg rounded-2xl sm:rounded-3xl border p-4 sm:p-6 shadow-2xl transition-all space-y-3.5 sm:space-y-4 max-h-[90vh] overflow-y-auto"
        >
          <!-- Modal Header: Title + Pin -->
          <div :class="isDark ? 'border-white/10' : 'border-slate-200/80'" class="flex items-center justify-between gap-3 border-b pb-3">
            <div class="flex items-center gap-2">
              <span
                :class="isDark ? 'bg-amber-400/15 text-amber-300 border-amber-400/30' : 'bg-amber-50 text-amber-700 border-amber-200'"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold"
              >
                <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M3 17.25V21h3.75L17.81 9.93l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83 3.75 3.75 1.84-1.84z"/>
                </svg>
                <span>Edit Bookmark</span>
              </span>
            </div>

            <button
              @click="editPinned = !editPinned"
              type="button"
              :class="editPinned
                ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                : (isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent' : 'text-slate-500 hover:text-slate-800 hover:bg-black/5 border border-transparent')"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer"
            >
              <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M16 9V4l1 0c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1l1 0v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/>
              </svg>
              <span>{{ editPinned ? 'Pinned' : 'Pin' }}</span>
            </button>
          </div>

          <!-- Edit Destination URL -->
          <div>
            <label :class="isDark ? 'text-gray-400' : 'text-slate-700 font-semibold'" class="block text-xs mb-1.5">Destination URL</label>
            <div
              :class="isDark
                ? 'bg-black/25 border-white/10 focus-within:border-amber-400/60 focus-within:ring-2 focus-within:ring-amber-400/20'
                : 'bg-slate-50/80 border-slate-200 focus-within:border-amber-500/60 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:bg-white'"
              class="flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all"
            >
              <div
                class="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden"
                :class="isDark ? 'bg-white/10' : 'bg-white ring-1 ring-slate-200/80 shadow-2xs'"
              >
                <img
                  v-if="editLink.trim()"
                  :src="faviconUrl(editLink)"
                  alt="favicon"
                  class="w-3.5 h-3.5 object-contain"
                  @error="$event.target.style.display='none'"
                />
                <svg v-else :class="isDark ? 'text-gray-400' : 'text-slate-400'" class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
                </svg>
              </div>

              <input
                v-model="editLink"
                @input="handleEditLinkInput"
                type="text"
                placeholder="https://..."
                :class="isDark ? 'text-gray-100 placeholder-gray-500' : 'text-slate-900 placeholder-slate-400 font-medium'"
                class="w-full bg-transparent border-0 outline-none text-base sm:text-sm font-mono"
              />

              <span
                v-if="editLink.trim() && getDomain(editLink)"
                :class="isDark ? 'bg-white/10 text-gray-300' : 'bg-slate-200/80 text-slate-700'"
                class="text-[11px] font-medium px-2 py-0.5 rounded-md truncate max-w-[100px] sm:max-w-[120px] flex-shrink-0"
              >
                {{ getDomain(editLink) }}
              </span>
            </div>
          </div>

          <!-- Edit Title -->
          <div>
            <label :class="isDark ? 'text-gray-400' : 'text-slate-700 font-semibold'" class="block text-xs mb-1.5">Bookmark Title</label>
            <div
              :class="isDark
                ? 'bg-black/25 border-white/10 focus-within:border-amber-400/60 focus-within:ring-2 focus-within:ring-amber-400/20'
                : 'bg-slate-50/80 border-slate-200 focus-within:border-amber-500/60 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:bg-white'"
              class="flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all"
            >
              <input
                v-model="editTitle"
                type="text"
                placeholder="Title"
                :class="isDark ? 'text-gray-100 placeholder-gray-500' : 'text-slate-900 placeholder-slate-400 font-semibold'"
                class="w-full bg-transparent border-0 outline-none text-base sm:text-sm"
              />
            </div>
          </div>

          <!-- Folder / Label & Color swatches -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div class="flex items-center gap-2 flex-wrap">
              <label :class="isDark ? 'text-gray-400' : 'text-slate-700 font-semibold'" class="text-xs">Folder:</label>
              <select
                v-model="editFolder"
                :class="isDark ? 'bg-[#202124] text-white border-white/10' : 'bg-slate-50 text-slate-900 border-slate-300 font-medium'"
                class="text-xs rounded-xl px-3 py-1.5 border outline-none cursor-pointer"
              >
                <option value="General">General</option>
                <option v-for="folder in availableFolders" :key="folder" :value="folder">
                  {{ folder }}
                </option>
              </select>
              <button
                @click="promptCreateFolder('edit')"
                type="button"
                :class="isDark ? 'hover:bg-white/10 text-gray-400 hover:text-gray-200' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'"
                class="px-2 py-1 rounded-lg text-xs font-medium transition cursor-pointer"
                title="Create new label"
              >
                + New
              </button>
            </div>

            <!-- Edit Color options -->
            <div class="flex items-center gap-1.5 ml-auto">
              <button
                v-for="c in KEEP_COLORS.slice(0, 7)"
                :key="c.name"
                @click="editColor = c.bg"
                :style="{ backgroundColor: isDark ? c.darkBg : c.bg }"
                :title="c.name"
                :class="editColor.toLowerCase() === c.bg.toLowerCase() ? 'ring-2 ring-amber-500 scale-110' : 'hover:scale-105'"
                class="h-6 w-6 rounded-full border border-gray-300 dark:border-gray-600 transition cursor-pointer"
              ></button>
            </div>
          </div>

          <!-- Action buttons -->
          <div :class="isDark ? 'border-white/10' : 'border-slate-200/80'" class="flex items-center justify-end gap-2 pt-3 border-t">
            <button
              @click="isEditModalOpen = false"
              type="button"
              class="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              @click="saveEditNote"
              type="button"
              class="px-5 sm:px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Edit Labels Modal (Google Keep style) -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isEditLabelsModalOpen"
        class="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4"
        @click.self="closeEditLabelsModal"
      >
        <div
          :class="isDark ? 'bg-[#202124] border-[#5f6368] text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'"
          class="w-full max-w-sm rounded-2xl sm:rounded-3xl border p-4 sm:p-5 shadow-2xl transition-all space-y-4 max-h-[88vh] overflow-y-auto"
        >
          <!-- Modal Header -->
          <div class="flex items-center justify-between pb-1">
            <h3 class="text-base font-semibold tracking-tight">Edit labels</h3>
            <button
              @click="closeEditLabelsModal"
              type="button"
              :class="isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-slate-100 text-slate-500'"
              class="p-1.5 rounded-full transition cursor-pointer"
              title="Close"
            >
              <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          <!-- Create New Label Row (Keep style) -->
          <div>
            <div
              :class="isDark
                ? 'border-white/10 focus-within:border-amber-400/60 bg-black/25'
                : 'border-slate-300 focus-within:border-amber-500 bg-slate-50 focus-within:bg-white'"
              class="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all"
            >
              <!-- Plus or Clear icon -->
              <button
                v-if="newLabelInput"
                @click="newLabelInput = ''; newLabelError = ''"
                type="button"
                :class="isDark ? 'text-gray-400 hover:text-gray-200' : 'text-slate-400 hover:text-slate-700'"
                class="p-0.5 rounded cursor-pointer flex-shrink-0"
                title="Clear"
              >
                <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
              <svg v-else :class="isDark ? 'text-gray-400' : 'text-slate-400'" class="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 24 24">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>

              <!-- New Label Input -->
              <input
                ref="newLabelInputRef"
                v-model="newLabelInput"
                @keydown.enter.prevent="createNewLabel"
                @input="newLabelError = ''"
                type="text"
                placeholder="Create new label"
                maxlength="30"
                :class="isDark ? 'text-white placeholder-gray-500' : 'text-slate-900 placeholder-slate-400 font-medium'"
                class="w-full bg-transparent border-0 outline-none text-sm"
              />

              <!-- Submit checkmark button -->
              <button
                @click="createNewLabel"
                type="button"
                :disabled="!newLabelInput.trim()"
                :class="newLabelInput.trim()
                  ? 'text-amber-500 hover:bg-amber-500/10 cursor-pointer'
                  : 'text-gray-400/40 cursor-not-allowed'"
                class="p-1 rounded-lg transition flex-shrink-0"
                title="Create label"
              >
                <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                </svg>
              </button>
            </div>
            <p v-if="newLabelError" class="text-xs text-rose-500 mt-1 pl-1">
              {{ newLabelError }}
            </p>
          </div>

          <!-- Existing Labels List (Scrollable) -->
          <div class="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            <div
              v-if="availableFolders.length === 0"
              :class="isDark ? 'text-gray-500' : 'text-slate-400'"
              class="text-xs text-center py-6"
            >
              No custom labels yet. Type above to add your first folder!
            </div>

            <div
              v-for="folder in availableFolders"
              :key="folder"
              :class="isDark ? 'hover:bg-white/5' : 'hover:bg-slate-100'"
              class="group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl transition"
            >
              <!-- Normal display mode -->
              <template v-if="editingLabelOriginal !== folder">
                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                  <!-- Delete button (visible on hover) -->
                  <button
                    @click="deleteFolderLabel(folder)"
                    type="button"
                    class="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/60 text-slate-400 hover:text-red-500 transition cursor-pointer flex-shrink-0"
                    title="Delete label"
                  >
                    <svg class="w-4 h-4 fill-current opacity-70 group-hover:opacity-100" viewBox="0 0 24 24">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  </button>

                  <span
                    @click="startRenameLabel(folder)"
                    class="text-sm truncate cursor-pointer font-medium select-none"
                    :title="folder"
                  >
                    {{ folder }}
                  </span>
                </div>

                <div class="flex items-center gap-1.5 flex-shrink-0">
                  <span
                    :class="isDark ? 'bg-white/10 text-gray-400' : 'bg-slate-200/80 text-slate-600'"
                    class="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  >
                    {{ getFolderCount(folder) }}
                  </span>

                  <!-- Pencil Rename Button -->
                  <button
                    @click="startRenameLabel(folder)"
                    type="button"
                    :class="isDark ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-800'"
                    class="p-1 rounded-lg transition opacity-60 group-hover:opacity-100 cursor-pointer"
                    title="Rename label"
                  >
                    <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M3 17.25V21h3.75L17.81 9.93l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83 3.75 3.75 1.84-1.84z"/>
                    </svg>
                  </button>
                </div>
              </template>

              <!-- Inline Rename Mode -->
              <template v-else>
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <button
                    @click="deleteFolderLabel(folder)"
                    type="button"
                    class="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/60 text-slate-400 hover:text-red-500 transition cursor-pointer flex-shrink-0"
                    title="Delete label"
                  >
                    <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  </button>

                  <input
                    ref="editingLabelInputRef"
                    v-model="editingLabelText"
                    @keydown.enter.prevent="saveRenameLabel(folder)"
                    @keydown.esc="cancelRenameLabel"
                    type="text"
                    maxlength="30"
                    :class="isDark ? 'bg-black/30 border-amber-400/60 text-white' : 'bg-white border-amber-500 text-slate-900'"
                    class="w-full text-xs px-2 py-1 rounded-lg border outline-none font-medium"
                    autofocus
                  />
                </div>

                <div class="flex items-center gap-1 flex-shrink-0">
                  <button
                    @click="saveRenameLabel(folder)"
                    type="button"
                    class="p-1 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition cursor-pointer"
                    title="Save rename"
                  >
                    <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                    </svg>
                  </button>
                  <button
                    @click="cancelRenameLabel"
                    type="button"
                    :class="isDark ? 'text-gray-400 hover:text-gray-200' : 'text-slate-400 hover:text-slate-700'"
                    class="p-1 rounded-lg transition cursor-pointer"
                    title="Cancel"
                  >
                    <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                </div>
              </template>
            </div>
          </div>

          <!-- Modal Footer: Done Button -->
          <div :class="isDark ? 'border-white/10' : 'border-slate-200'" class="flex items-center justify-end pt-3 border-t">
            <button
              @click="closeEditLabelsModal"
              type="button"
              :class="isDark ? 'hover:bg-white/10 text-gray-200' : 'hover:bg-slate-100 text-slate-800'"
              class="px-4 py-2 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </transition>
    </div>

    <!-- Unauthenticated View (Google Keep Styled Sign-in) -->
    <div v-else class="flex-1 flex items-center justify-center p-4 min-h-[85vh]">
      <div
        :class="isDark ? 'bg-[#303134] border-[#5f6368]' : 'bg-white border-[#dadce0]'"
        class="w-full max-w-md rounded-2xl border p-8 shadow-2xl space-y-6"
      >
        <div class="flex flex-col items-center text-center">
          <div class="h-14 w-14 rounded-full bg-amber-400/20 flex items-center justify-center mb-3">
            <svg class="h-8 w-8" viewBox="0 0 48 48">
              <path fill="#FFBB00" d="M24,4C14.06,4,6,12.06,6,22c0,6.07,3.03,11.44,7.67,14.68C14.49,37.26,15,38.16,15,39.12V40c0,1.1,0.9,2,2,2h14 c1.1,0,2-0.9,2-2v-0.88c0-0.96,0.51-1.86,1.33-2.44C38.97,33.44,42,28.07,42,22C42,12.06,33.94,4,24,4z"/>
              <path fill="#E65100" d="M19,41h10v2c0,0.55-0.45,1-1,1h-8c-0.55,0-1-0.45-1-1V41z"/>
              <path fill="#FFE082" d="M24,7c7.72,0,14,6.28,14,14c0,4.72-2.35,8.89-5.96,11.4C30.82,33.25,30,34.61,30,36.05V37h-3v-7 c0-0.55-0.45-1-1-1s-1,0.45-1,1v7h-2v-7c0-0.55-0.45-1-1-1s-1,0.45-1,1v7h-3v-0.95c0-1.44-0.82-2.8-2.04-3.65 C12.35,29.89,10,25.72,10,21C10,13.28,16.28,7,24,7z"/>
            </svg>
          </div>
          <h2 class="text-2xl font-medium tracking-tight text-[#202124] dark:text-[#e8eaed]">Sign in to Keep</h2>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Sync your bookmarks and labels seamlessly</p>
        </div>

        <LoginPanel
          :authMode="authMode"
          :authEmail="authEmail"
          :authPassword="authPassword"
          :authError="authError"
          @update:authMode="(val) => (authMode = val)"
          @update:authEmail="(val) => (authEmail = val)"
          @update:authPassword="(val) => (authPassword = val)"
          @login="login"
          @signup="signup"
          @google-login="loginWithGoogle"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.font-roboto {
  font-family: 'Roboto', 'Outfit', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>
