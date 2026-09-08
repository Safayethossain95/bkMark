<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import AccountModal from "../components/AccountModal.vue";
import LoginPanel from "../components/LoginPanel.vue";
import { useBookmarks } from "../composables/useBookmarks";

const {
  bookmarks,
  bookmarksLoading,
  searchQuery,
  authUser,
  authLoading,
  accountModalOpen,
  themeDropdown,
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
  themes,
  selectedTheme,
  backgroundStyle,
  previewStyle,
  selectTheme,
  addBookmark,
  updateBookmark,
  editBookmark,
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

// Local UI state for Pro Experience
const viewMode = ref("grid"); // 'grid' | 'list'
const selectedFolderFilter = ref("ALL"); // 'ALL' | 'SHARED' | 'RECENT' | specific folder
const sortBy = ref("newest"); // 'newest' | 'name' | 'folder'
const isSidebarOpen = ref(false);
const isAddModalOpen = ref(false);
const editingBookmarkData = ref(null);
const searchInputRef = ref(null);

// Form fields for Add/Edit Modal
const modalFolder = ref("");
const modalName = ref("");
const modalLink = ref("");
const modalFolderInput = ref("");

// Toast Notification State
const toastMessage = ref("");
const toastType = ref("success"); // 'success' | 'info'
let toastTimer = null;

function showToast(msg, type = "success") {
  toastMessage.value = msg;
  toastType.value = type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMessage.value = "";
  }, 2500);
}

// Copy link to clipboard
async function copyLink(link, name) {
  try {
    await navigator.clipboard.writeText(link);
    showToast(`Copied "${name || 'link'}" to clipboard!`);
  } catch (err) {
    showToast("Failed to copy link", "info");
  }
}

// Filtered and Sorted Bookmarks for Revamped View
const displayedBookmarks = computed(() => {
  let list = [...bookmarks.value];

  // 1. Search Query
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    list = list.filter(
      (b) =>
        (b.name || "").toLowerCase().includes(q) ||
        (b.folderName || "").toLowerCase().includes(q) ||
        (b.link || "").toLowerCase().includes(q)
    );
  }

  // 2. Folder / Filter category
  if (selectedFolderFilter.value === "SHARED") {
    list = list.filter((b) => b.shared || b.folderName === "Shared with Me");
  } else if (selectedFolderFilter.value === "RECENT") {
    // top 12 most recent
    list = list.slice(-12).reverse();
  } else if (selectedFolderFilter.value !== "ALL") {
    list = list.filter(
      (b) => (b.folderName || "General") === selectedFolderFilter.value
    );
  }

  // 3. Sorting
  if (sortBy.value === "name") {
    list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  } else if (sortBy.value === "folder") {
    list.sort((a, b) => (a.folderName || "General").localeCompare(b.folderName || "General"));
  } else if (sortBy.value === "newest" && selectedFolderFilter.value !== "RECENT") {
    list = [...list].reverse();
  }

  return list;
});

// Grouping by folder when in folder view
const groupedDisplayBookmarks = computed(() => {
  const groups = {};
  displayedBookmarks.value.forEach((b) => {
    const f = b.folderName && b.folderName.trim() ? b.folderName.trim() : "General";
    if (!groups[f]) groups[f] = [];
    groups[f].push(b);
  });
  return groups;
});

// Counts
const totalCount = computed(() => bookmarks.value.length);
const sharedCount = computed(() => bookmarks.value.filter((b) => b.shared || b.folderName === "Shared with Me").length);

function getFolderCount(folder) {
  return bookmarks.value.filter((b) => (b.folderName || "General") === folder).length;
}

function selectFilter(filter) {
  selectedFolderFilter.value = filter;
  isSidebarOpen.value = false;
}

// Open Quick Add Modal
function openAddModal(folder = "") {
  editingBookmarkData.value = null;
  modalFolder.value = folder || (selectedFolderFilter.value !== "ALL" && selectedFolderFilter.value !== "SHARED" && selectedFolderFilter.value !== "RECENT" ? selectedFolderFilter.value : "General");
  modalName.value = "";
  modalLink.value = "";
  isAddModalOpen.value = true;
}

// Open Edit in Pro Modal
function openEditModal(bookmark) {
  editingBookmarkData.value = bookmark;
  modalFolder.value = bookmark.folderName || "General";
  modalName.value = bookmark.name;
  modalLink.value = bookmark.link;
  isAddModalOpen.value = true;
}

// Submit Add / Edit
async function handleModalSubmit() {
  if (!modalName.value.trim() || !modalLink.value.trim()) {
    showToast("Please enter title and URL", "info");
    return;
  }

  let formattedLink = modalLink.value.trim();
  if (!/^https?:\/\//i.test(formattedLink)) {
    formattedLink = `https://${formattedLink}`;
  }

  const payload = {
    folderName: modalFolder.value.trim() || "General",
    name: modalName.value.trim(),
    link: formattedLink,
  };

  if (editingBookmarkData.value) {
    // update
    await updateBookmark(editingBookmarkData.value.id, payload);
    showToast(`Updated "${payload.name}"`);
  } else {
    // create
    await addBookmark(payload);
    showToast(`Added "${payload.name}" to ${payload.folderName}!`);
  }

  isAddModalOpen.value = false;
}

function openFirstBookmark() {
  if (displayedBookmarks.value && displayedBookmarks.value.length > 0) {
    const firstItem = displayedBookmarks.value[0];
    if (firstItem && firstItem.link) {
      let url = String(firstItem.link).trim();
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
      try {
        const win = window.open(url, "_blank", "noopener,noreferrer");
        if (!win || win.closed || typeof win.closed === "undefined") {
          const a = document.createElement("a");
          a.href = url;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      } catch (err) {
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    }
  }
}

function handleKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    searchInputRef.value?.focus();
    return;
  }
  const isEnter = e.key === "Enter" || e.code === "Enter" || e.code === "NumpadEnter" || e.keyCode === 13;
  if (isEnter) {
    if (accountModalOpen.value || formOpen.value) return;
    const target = e.target;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) {
      return;
    }
    if (filteredBookmarks.value && filteredBookmarks.value.length > 0) {
      const firstItem = filteredBookmarks.value[0];
      if (firstItem && firstItem.link) {
        e.preventDefault();
        let url = String(firstItem.link).trim();
        if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
        try {
          const win = window.open(url, "_blank", "noopener,noreferrer");
          if (!win || win.closed || typeof win.closed === "undefined") {
            const a = document.createElement("a");
            a.href = url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            document.body.appendChild(a);
            a.click();
            a.remove();
          }
        } catch (err) {
          const a = document.createElement("a");
          a.href = url;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      }
    }
  }
}
onMounted(() => {
  initAuth();
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <div
    class="min-h-screen text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-100 relative overflow-x-hidden transition-all duration-700"
    :style="backgroundStyle"
  >
    <!-- Dynamic Ambient Backdrop Glow -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      <div
        class="absolute -top-[20%] left-1/4 h-[600px] w-[600px] rounded-full bg-cyan-500/10 blur-[130px] animate-pulse"
      ></div>
      <div
        class="absolute top-1/2 -right-[10%] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[140px]"
      ></div>
    </div>

    <!-- Toast Notification Float -->
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-4 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0 translate-y-2 scale-95"
    >
      <div
        v-if="toastMessage"
        class="fixed bottom-6 right-6 z-[150] flex items-center gap-3 rounded-2xl border border-cyan-300/30 bg-slate-900/90 px-4 py-3 text-sm text-cyan-100 shadow-2xl shadow-slate-950/80 backdrop-blur-xl"
      >
        <div class="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300 text-xs font-bold">
          ✓
        </div>
        <span class="font-medium">{{ toastMessage }}</span>
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
      <div class="relative flex items-center justify-center">
        <div class="absolute h-16 w-16 rounded-full bg-cyan-400/20 blur-xl animate-pulse"></div>
        <div class="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400"></div>
      </div>
    </div>

    <!-- Authenticated Pro Workspace -->
    <div v-else-if="authUser" class="flex flex-col min-h-screen">
      <!-- Top Navigation Command Bar -->
      <header
        class="sticky top-0 z-40 border-b border-white/10 bg-slate-950/60 backdrop-blur-2xl px-4 sm:px-6 py-3.5 transition-all"
      >
        <div class="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-6">
          <!-- Logo & Brand -->
          <div class="flex items-center gap-3">
            <button
              @click="isSidebarOpen = !isSidebarOpen"
              type="button"
              class="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-cyan-100 hover:bg-white/10"
              aria-label="Toggle sidebar"
            >
            
            </button>
            <div class="flex items-center gap-2.5 cursor-pointer" @click="selectFilter('ALL')">
              <img src="/images/logo.png" class="h-[20px]"/>
              <div class="hidden sm:block">
                <div class="flex items-center gap-1.5">
                  <span class="rounded-md bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-wider text-cyan-200">
                    PRO
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Command Search Box -->
          <div class="relative flex-1 max-w-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-100/50"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l3.817 3.817a1 1 0 01-1.414 1.414l-3.817-3.817A6 6 0 012 8z" clip-rule="evenodd" />
            </svg>
            <input
              ref="searchInputRef"
              data-search-bar="true"
              v-model="searchQuery"
              @keydown.enter.prevent.stop="openFirstBookmark"
              type="text"
              placeholder="Search links, tags, domains... (Ctrl + K)"
              class="w-full rounded-2xl border border-white/15 bg-slate-900/70 py-2 pl-10 pr-20 text-xs sm:text-sm text-white placeholder-cyan-100/40 shadow-inner transition focus:border-cyan-400/50 focus:bg-slate-900/95 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
            />
            <div class="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-[11px] font-mono text-cyan-100/45 pointer-events-none bg-white/5 border border-white/10 rounded-md px-1.5 py-0.5">
              <span>⌘K</span>
            </div>
          </div>

          <!-- Action Controls & Header Tools -->
          <div class="flex items-center gap-2 sm:gap-2.5">
            <!-- Quick Add Bookmark Button -->
            <button
              @click="openAddModal()"
              type="button"
              class="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-blue-500 hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
              </svg>
              <span class="hidden sm:inline">Add Link</span>
            </button>

            <!-- Theme Switcher Menu -->
            <div class="relative">
              <button
                @click="themeDropdown = !themeDropdown"
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-slate-900/70 text-cyan-100 transition hover:bg-slate-800/80"
                title="Change theme"
              >
                <div :style="previewStyle(selectedTheme)" class="h-5 w-5 rounded-full border border-white/30"></div>
              </button>

              <div
                v-show="themeDropdown"
                class="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-cyan-100/20 bg-slate-900/90 p-2.5 text-cyan-50 shadow-2xl shadow-slate-950/80 backdrop-blur-2xl"
              >
                <p class="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-200/60">
                  Theme Palette
                </p>
                <div class="mt-1 space-y-1 max-h-60 overflow-y-auto">
                  <div
                    v-for="theme in themes"
                    :key="theme.name"
                    @click="selectTheme(theme)"
                    class="flex items-center gap-2.5 rounded-xl p-2 cursor-pointer transition"
                    :class="selectedTheme?.name === theme.name ? 'bg-cyan-500/20 border border-cyan-300/30' : 'hover:bg-white/5 border border-transparent'"
                  >
                    <div :style="previewStyle(theme)" class="h-6 w-6 rounded-lg border border-white/20"></div>
                    <span class="text-xs font-medium text-white truncate">{{ theme.name }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- User Account Profile Button -->
            <button
              @click="openAccountModal"
              type="button"
              class="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/30 bg-gradient-to-br from-cyan-400/20 to-blue-500/10 text-cyan-100 font-semibold text-xs shadow-md transition hover:scale-105"
              title="Account & Sharing"
            >
              <span>{{ authUser?.email?.charAt(0).toUpperCase() }}</span>
              <span
                v-if="friendRequests.length > 0"
                class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-400 text-[9px] font-bold text-slate-950 ring-2 ring-slate-900 animate-pulse"
              >
                {{ friendRequests.length }}
              </span>
            </button>
          </div>
        </div>
      </header>

      <!-- Mobile Backdrop Drawer Overlay -->
      <transition
        enter-active-class="transition-opacity duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isSidebarOpen"
          @click="isSidebarOpen = false"
          class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm lg:hidden"
        ></div>
      </transition>

      <!-- Main Layout Body -->
      <div class="max-w-7xl mx-auto w-full flex-1 flex px-4 sm:px-6 py-6 gap-6 relative">
        <!-- Left Workspace Sidebar & Mobile Slide Drawer -->
        <aside
          :class="isSidebarOpen ? 'translate-x-0 shadow-2xl shadow-black/80' : '-translate-x-full lg:translate-x-0'"
          class="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-slate-950/95 border-r border-white/10 p-5 overflow-y-auto transition-transform duration-300 ease-out lg:static lg:inset-auto lg:z-auto lg:w-64 lg:max-w-none lg:bg-transparent lg:border-r-0 lg:p-0 lg:overflow-visible lg:transition-none flex-shrink-0 space-y-6"
        >
          <!-- Mobile Drawer Header -->
          <div class="flex items-center justify-between lg:hidden pb-3 border-b border-white/10">
            <div class="flex items-center gap-2">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 shadow-sm">
                <img src="/images/favicon.png" class="h-4 w-4" alt="logo" />
              </div>
              <span class="font-bold text-sm text-white">Menu & Folders</span>
            </div>
            <button
              @click="isSidebarOpen = false"
              type="button"
              class="h-8 w-8 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-cyan-200 hover:bg-white/10"
              aria-label="Close menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>

          <!-- Quick Filters Card -->
          <div class="rounded-3xl border border-white/10 bg-slate-900/60 p-3.5 backdrop-blur-xl shadow-xl shadow-slate-950/20 space-y-1">
            <p class="px-3 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-200/60">
              Navigation
            </p>

            <button
              @click="selectFilter('ALL')"
              type="button"
              :class="selectedFolderFilter === 'ALL' ? 'bg-cyan-500/20 text-white font-semibold border-cyan-300/30' : 'text-cyan-100/70 hover:bg-white/5 hover:text-white border-transparent'"
              class="w-full flex items-center justify-between gap-2.5 rounded-2xl px-3 py-2 text-xs transition border"
            >
              <div class="flex items-center gap-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-cyan-300" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                <span>All Bookmarks</span>
              </div>
              <span class="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{{ totalCount }}</span>
            </button>

            <button
              @click="selectFilter('SHARED')"
              type="button"
              :class="selectedFolderFilter === 'SHARED' ? 'bg-cyan-500/20 text-white font-semibold border-cyan-300/30' : 'text-cyan-100/70 hover:bg-white/5 hover:text-white border-transparent'"
              class="w-full flex items-center justify-between gap-2.5 rounded-2xl px-3 py-2 text-xs transition border"
            >
              <div class="flex items-center gap-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-cyan-300" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                </svg>
                <span>Shared with Me</span>
              </div>
              <span class="rounded-full bg-cyan-400/20 px-2 py-0.5 text-[10px] text-cyan-200">{{ sharedCount }}</span>
            </button>

            <button
              @click="selectFilter('RECENT')"
              type="button"
              :class="selectedFolderFilter === 'RECENT' ? 'bg-cyan-500/20 text-white font-semibold border-cyan-300/30' : 'text-cyan-100/70 hover:bg-white/5 hover:text-white border-transparent'"
              class="w-full flex items-center justify-between gap-2.5 rounded-2xl px-3 py-2 text-xs transition border"
            >
              <div class="flex items-center gap-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-cyan-300" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
                </svg>
                <span>Recently Added</span>
              </div>
            </button>
          </div>

          <!-- Folders & Collections Card -->
          <div class="rounded-3xl border border-white/10 bg-slate-900/60 p-3.5 backdrop-blur-xl shadow-xl shadow-slate-950/20 space-y-1">
            <div class="flex items-center justify-between px-3 pt-1 pb-1.5">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-cyan-200/60">
                Folders
              </p>
              <button
                @click="openAddModal()"
                type="button"
                class="text-xs text-cyan-300 hover:text-white font-semibold flex items-center gap-1"
                title="Add to new folder"
              >
                <span>+</span>
              </button>
            </div>

            <div class="space-y-1 max-h-60 overflow-y-auto">
              <button
                v-for="folder in allFoldersList"
                :key="folder"
                @click="selectFilter(folder)"
                type="button"
                :class="selectedFolderFilter === folder ? 'bg-cyan-500/20 text-white font-semibold border-cyan-300/30' : 'text-cyan-100/70 hover:bg-white/5 hover:text-white border-transparent'"
                class="w-full flex items-center justify-between gap-2.5 rounded-2xl px-3 py-2 text-xs transition border"
              >
                <div class="flex items-center gap-2 truncate">
                  <span class="h-2 w-2 rounded-full bg-cyan-400"></span>
                  <span class="truncate">{{ folder }}</span>
                </div>
                <span class="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{{ getFolderCount(folder) }}</span>
              </button>
            </div>
          </div>

          <!-- Friends Widget -->
          <div class="rounded-3xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl shadow-xl shadow-slate-950/20">
            <div class="flex items-center justify-between mb-3">
              <p class="text-xs font-semibold text-white">Friends Network</p>
              <button
                @click="openAccountModal"
                type="button"
                class="text-[11px] text-cyan-300 hover:underline"
              >
                Manage
              </button>
            </div>
            <div v-if="friends.length === 0" class="text-xs text-cyan-100/50 py-2">
              No friends connected yet. Connect via email to share bookmarks.
            </div>
            <div v-else class="flex flex-wrap gap-1.5">
              <span
                v-for="friend in friends.slice(0, 4)"
                :key="friend.uid"
                class="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-cyan-100/80"
              >
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                <span class="truncate max-w-[90px]">{{ friend.email.split('@')[0] }}</span>
              </span>
            </div>
          </div>
        </aside>

        <!-- Main Content Area -->
        <main class="flex-1 min-w-0 space-y-5">
          <!-- Filter Header & Control Toolbar -->
          <div class="flex flex-col py-2 px-4 sm:flex-row sm:items-center justify-between gap-3 rounded-3xl border border-white/10 bg-slate-900/60 p-4.5 backdrop-blur-xl shadow-xl shadow-slate-950/20">
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {{ selectedFolderFilter === 'ALL' ? 'All Bookmarks' : selectedFolderFilter === 'SHARED' ? 'Shared with Me' : selectedFolderFilter === 'RECENT' ? 'Recent Links' : selectedFolderFilter }}
                </h1>
                <span class="rounded-full bg-cyan-500/20 border border-cyan-400/30 px-2.5 py-0.5 text-xs font-semibold text-cyan-200">
                  {{ displayedBookmarks.length }}
                </span>
              </div>
              <p class="text-xs text-cyan-100/60 mt-0.5">
                {{ selectedFolderFilter === 'ALL' ? 'Your entire digital library in one place.' : `Organized under ${selectedFolderFilter}` }}
              </p>
            </div>

            <!-- View Toggles & Sort Menu -->
            <div class="flex items-center gap-2 self-start sm:self-auto">
              <!-- Sort Dropdown -->
              <select
                v-model="sortBy"
                class="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-cyan-100 focus:border-cyan-300 focus:outline-none"
              >
                <option value="newest" class="bg-slate-900 text-white">Sort: Newest</option>
                <option value="name" class="bg-slate-900 text-white">Sort: Name (A-Z)</option>
                <option value="folder" class="bg-slate-900 text-white">Sort: Folder</option>
              </select>

              <!-- View Mode (Grid vs List) -->
              <div class="flex rounded-xl bg-white/5 p-1 border border-white/10">
                <button
                  @click="viewMode = 'grid'"
                  type="button"
                  :class="viewMode === 'grid' ? 'bg-cyan-500/25 text-white' : 'text-cyan-100/60 hover:text-white'"
                  class="p-1.5 rounded-lg transition"
                  title="Grid View"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  @click="viewMode = 'list'"
                  type="button"
                  :class="viewMode === 'list' ? 'bg-cyan-500/25 text-white' : 'text-cyan-100/60 hover:text-white'"
                  class="p-1.5 rounded-lg transition"
                  title="List View"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Bookmarks Loading Spinner State -->
          <div
            v-if="bookmarksLoading"
            class="flex flex-col items-center justify-center py-24 rounded-3xl border border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-xl"
          >
            <div class="relative flex items-center justify-center">
              <div class="absolute h-16 w-16 rounded-full bg-cyan-400/20 blur-xl animate-pulse"></div>
              <div class="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400"></div>
            </div>
            <p class="mt-4 text-xs font-medium text-cyan-200/80 animate-pulse tracking-wide">
              Loading your bookmarks...
            </p>
          </div>

          <!-- Empty State (Only when API finished loading and list is empty) -->
          <div
            v-else-if="displayedBookmarks.length === 0"
            class="rounded-3xl border border-white/10 bg-slate-900/60 p-12 text-center backdrop-blur-xl shadow-2xl"
          >
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-500/10 text-cyan-300">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <h3 class="text-base font-semibold text-white">No bookmarks found</h3>
            <p class="mt-1 text-xs text-cyan-100/60 max-w-sm mx-auto">
              {{ searchQuery ? 'No bookmarks match your search keywords.' : 'Add your first bookmark to start building this collection.' }}
            </p>
            <button
              @click="openAddModal()"
              type="button"
              class="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 hover:scale-105 transition"
            >
              + Add Bookmark
            </button>
          </div>

          <!-- VIEW MODE 1: GRID VIEW -->
          <div
            v-else-if="viewMode === 'grid'"
            class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            <article
              v-for="bookmark in displayedBookmarks"
              :key="bookmark.id"
              class="group relative flex flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl shadow-lg shadow-slate-950/20 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/40 hover:shadow-cyan-500/10 hover:shadow-2xl"
            >
              <div>
                <!-- Card Header -->
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      :src="faviconUrl(bookmark.link)"
                      alt="favicon"
                      class="h-7 w-7 rounded-lg ring-1 ring-white/20 flex-shrink-0 bg-slate-800 p-1"
                      loading="lazy"
                      decoding="async"
                      width="28"
                      height="28"
                    />
                    <div class="min-w-0 flex-1">
                      <a
                        :href="bookmark.link"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="block truncate text-sm font-semibold text-white group-hover:text-cyan-200 transition"
                      >
                        {{ bookmark.name }}
                      </a>
                      <p class="truncate text-xs text-cyan-100/60 mt-0.5">
                        {{ getDomain(bookmark.link) }}
                      </p>
                    </div>
                  </div>

                  <!-- Folder Tag -->
                  <span class="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-cyan-200 font-medium flex-shrink-0">
                    {{ bookmark.folderName || "General" }}
                  </span>
                </div>
              </div>

              <!-- Card Action Footer -->
              <div class="mt-5 flex items-center justify-between border-t border-white/5 pt-3.5">
                <a
                  :href="bookmark.link"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 text-xs font-medium text-cyan-300 hover:text-white transition"
                >
                  <span>Visit</span>
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                  </svg>
                </a>

                <div class="flex items-center gap-1">
                  <!-- Copy Link Button -->
                  <button
                    @click="copyLink(bookmark.link, bookmark.name)"
                    type="button"
                    class="h-7 w-7 rounded-lg border border-white/10 bg-white/5 text-cyan-100/70 hover:text-white hover:bg-cyan-500/20 flex items-center justify-center transition"
                    title="Copy Link"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                    </svg>
                  </button>

                  <!-- Share Bookmark -->
                  <button
                    @click="openShareModalForBookmark(bookmark)"
                    type="button"
                    class="h-7 w-7 rounded-lg border border-white/10 bg-white/5 text-cyan-100/70 hover:text-white hover:bg-cyan-500/20 flex items-center justify-center transition"
                    title="Share with Friend"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                    </svg>
                  </button>

                  <!-- Edit -->
                  <button
                    @click="openEditModal(bookmark)"
                    type="button"
                    class="h-7 w-7 rounded-lg border border-white/10 bg-white/5 text-cyan-100/70 hover:text-white hover:bg-cyan-500/20 flex items-center justify-center transition"
                    title="Edit"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                      <path d="M2 15a1 1 0 011-1h3v2H3a1 1 0 01-1-1z" />
                    </svg>
                  </button>

                  <!-- Delete -->
                  <button
                    @click="deleteBookmark(bookmark.id)"
                    type="button"
                    class="h-7 w-7 rounded-lg border border-red-400/20 bg-red-500/10 text-red-200/70 hover:text-red-200 hover:bg-red-500/25 flex items-center justify-center transition"
                    title="Delete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </article>
          </div>

          <!-- VIEW MODE 2: COMPACT LIST VIEW -->
          <div
            v-else
            class="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl shadow-slate-950/30"
          >
            <div class="divide-y divide-white/5">
              <div
                v-for="bookmark in displayedBookmarks"
                :key="bookmark.id"
                class="group flex items-center justify-between p-4 transition hover:bg-cyan-500/10 gap-3"
              >
                <div class="flex items-center gap-3.5 min-w-0 flex-1">
                  <img
                    :src="faviconUrl(bookmark.link)"
                    alt="favicon"
                    class="h-6 w-6 rounded-md ring-1 ring-white/20 flex-shrink-0 bg-slate-800 p-0.5"
                    loading="lazy"
                    decoding="async"
                    width="24"
                    height="24"
                  />
                  <div class="min-w-0 flex-1">
                    <a
                      :href="bookmark.link"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-sm font-semibold text-white hover:text-cyan-200 truncate block"
                    >
                      {{ bookmark.name }}
                    </a>
                    <p class="text-xs text-cyan-100/60 truncate">
                      {{ getDomain(bookmark.link) }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-3 flex-shrink-0">
                  <span class="hidden sm:inline-block rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[10px] text-cyan-200">
                    {{ bookmark.folderName || "General" }}
                  </span>

                  <div class="flex items-center gap-1">
                    <button
                      @click="copyLink(bookmark.link, bookmark.name)"
                      type="button"
                      class="h-8 w-8 rounded-xl border border-white/10 bg-white/5 text-cyan-100/70 hover:text-white hover:bg-cyan-500/20 flex items-center justify-center transition"
                      title="Copy Link"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                      </svg>
                    </button>

                    <button
                      @click="openShareModalForBookmark(bookmark)"
                      type="button"
                      class="h-8 w-8 rounded-xl border border-white/10 bg-white/5 text-cyan-100/70 hover:text-white hover:bg-cyan-500/20 flex items-center justify-center transition"
                      title="Share"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                      </svg>
                    </button>

                    <button
                      @click="openEditModal(bookmark)"
                      type="button"
                      class="h-8 w-8 rounded-xl border border-white/10 bg-white/5 text-cyan-100/70 hover:text-white hover:bg-cyan-500/20 flex items-center justify-center transition"
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                        <path d="M2 15a1 1 0 011-1h3v2H3a1 1 0 01-1-1z" />
                      </svg>
                    </button>

                    <button
                      @click="deleteBookmark(bookmark.id)"
                      type="button"
                      class="h-8 w-8 rounded-xl border border-red-400/20 bg-red-500/10 text-red-200/70 hover:text-red-200 hover:bg-red-500/25 flex items-center justify-center transition"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <!-- Quick Add / Edit Modal Drawer -->
      <transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="isAddModalOpen"
          class="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md"
          @click.self="isAddModalOpen = false"
        >
          <div
            class="w-full max-w-lg rounded-3xl border border-cyan-300/30 bg-slate-900/95 p-6 text-white shadow-2xl shadow-slate-950/90 backdrop-blur-2xl"
          >
            <div class="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 class="text-base font-bold text-white flex items-center gap-2">
                <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
                  ✦
                </span>
                <span>{{ editingBookmarkData ? 'Edit Bookmark' : 'Add New Bookmark' }}</span>
              </h3>
              <button
                @click="isAddModalOpen = false"
                type="button"
                class="rounded-xl border border-white/10 bg-white/5 p-1.5 text-cyan-100/60 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>

            <form @submit.prevent="handleModalSubmit" class="mt-5 space-y-4">
              <!-- URL Input -->
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-cyan-200/80 mb-1.5">
                  Destination URL
                </label>
                <input
                  v-model="modalLink"
                  type="text"
                  placeholder="https://example.com"
                  required
                  class="w-full rounded-2xl border border-white/15 bg-white/10 py-3 px-4 text-sm text-white placeholder-cyan-100/40 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                />
              </div>

              <!-- Title Input -->
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-cyan-200/80 mb-1.5">
                  Bookmark Title
                </label>
                <input
                  v-model="modalName"
                  type="text"
                  placeholder="e.g. Stripe Developer Docs"
                  required
                  class="w-full rounded-2xl border border-white/15 bg-white/10 py-3 px-4 text-sm text-white placeholder-cyan-100/40 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                />
              </div>

              <!-- Folder Input / Suggestions -->
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-cyan-200/80 mb-1.5">
                  Folder / Collection
                </label>
                <input
                  v-model="modalFolder"
                  type="text"
                  placeholder="General"
                  class="w-full rounded-2xl border border-white/15 bg-white/10 py-3 px-4 text-sm text-white placeholder-cyan-100/40 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                />
                <!-- Quick Folder Chips -->
                <div v-if="allFoldersList.length > 0" class="mt-2 flex flex-wrap gap-1.5">
                  <button
                    v-for="folder in allFoldersList"
                    :key="folder"
                    @click="modalFolder = folder"
                    type="button"
                    class="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-cyan-100/70 hover:bg-cyan-500/20 hover:text-white"
                  >
                    {{ folder }}
                  </button>
                </div>
              </div>

              <!-- Actions -->
              <div class="mt-6 flex items-center justify-end gap-3 pt-2">
                <button
                  @click="isAddModalOpen = false"
                  type="button"
                  class="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-medium text-cyan-100/80 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 transition"
                >
                  {{ editingBookmarkData ? 'Save Changes' : 'Save Bookmark' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </transition>
    </div>

    <!-- Unauthenticated View (Login Panel) -->
    <div v-else class="min-h-screen flex items-center justify-center p-4">
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
</template>
