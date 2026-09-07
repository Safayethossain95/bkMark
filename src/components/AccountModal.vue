<script setup>
import { computed, ref, watch } from "vue";

const props = defineProps({
  open: Boolean,
  authUser: Object,
  bookmarks: {
    type: Array,
    default: () => [],
  },
  friends: {
    type: Array,
    default: () => [],
  },
  friendsLoading: Boolean,
  friendRequests: {
    type: Array,
    default: () => [],
  },
  requestsLoading: Boolean,
  friendEmail: String,
  shareEmail: String,
  selectedBookmarkId: [String, Number, null],
  actionError: String,
  actionSuccess: String,
});

const emit = defineEmits([
  "close",
  "logout",
  "update:friendEmail",
  "update:shareEmail",
  "update:selectedBookmarkId",
  "add-friend",
  "remove-friend",
  "approve-request",
  "delete-request",
  "share-bookmark",
]);

const activeTab = ref("share");
const bookmarkSearch = ref("");
const isBookmarkPickerOpen = ref(false);

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      bookmarkSearch.value = "";
      isBookmarkPickerOpen.value = false;
    }
  }
);

const domainCache = new Map();
function domain(link) {
  if (!link) return "";
  if (domainCache.has(link)) return domainCache.get(link);
  try {
    const d = new URL(link).hostname.replace("www.", "");
    domainCache.set(link, d);
    return d;
  } catch (e) {
    domainCache.set(link, link);
    return link;
  }
}

const faviconCache = new Map();
function favicon(link) {
  if (!link) return "";
  if (faviconCache.has(link)) return faviconCache.get(link);
  const d = domain(link);
  const url = d ? `https://www.google.com/s2/favicons?domain=${d}` : "";
  faviconCache.set(link, url);
  return url;
}

const selectedBookmark = computed(() => {
  if (!props.selectedBookmarkId) return null;
  return props.bookmarks.find((b) => String(b.id) === String(props.selectedBookmarkId)) || null;
});

const filteredShareBookmarks = computed(() => {
  if (!bookmarkSearch.value.trim()) return props.bookmarks;
  const q = bookmarkSearch.value.toLowerCase().trim();
  return props.bookmarks.filter(
    (b) =>
      (b.name || "").toLowerCase().includes(q) ||
      (b.folderName || "").toLowerCase().includes(q) ||
      (b.link || "").toLowerCase().includes(q)
  );
});

function selectBookmark(bookmark) {
  emit("update:selectedBookmarkId", bookmark.id);
  isBookmarkPickerOpen.value = false;
  bookmarkSearch.value = "";
}

function clearSelectedBookmark() {
  emit("update:selectedBookmarkId", null);
  isBookmarkPickerOpen.value = false;
}

function updateFriendEmail(e) {
  emit("update:friendEmail", e.target.value);
}

function updateShareEmail(e) {
  emit("update:shareEmail", e.target.value);
}

function selectFriendForShare(email) {
  emit("update:shareEmail", email || "");
}

function quickShareWithFriend(friend) {
  emit("update:shareEmail", friend.email);
  activeTab.value = "share";
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 p-4 sm:p-6 md:p-8 backdrop-blur-md transition-all duration-300"
    @click.self="$emit('close')"
  >
    <section
      class="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-cyan-100/20 bg-slate-900/90 text-cyan-50 shadow-2xl shadow-slate-950/80 backdrop-blur-2xl transition-all"
    >
      <!-- Modal Header -->
      <header
        class="flex items-center justify-between border-b border-cyan-100/10 px-6 sm:px-8 py-5 bg-white/[0.02]"
      >
        <div class="flex items-center gap-3.5">
          <div
            class="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/30 bg-gradient-to-br from-cyan-400/20 to-blue-500/10 text-cyan-200 shadow-inner"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-semibold text-white tracking-wide">
              Sharing & Account Hub
            </h2>
            <p class="text-xs text-cyan-100/60 truncate max-w-[220px] sm:max-w-sm mt-0.5">
              {{ authUser?.email }}
            </p>
          </div>
        </div>

        <button
          @click="$emit('close')"
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-100/20 bg-white/5 text-cyan-100/80 transition hover:border-cyan-100/40 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
          aria-label="Close modal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </header>

      <!-- Navigation Tabs -->
      <div class="px-6 sm:px-8 pt-5 pb-2">
        <div class="flex gap-2 rounded-2xl bg-black/30 p-1.5 border border-cyan-100/10">
          <button
            @click="activeTab = 'share'"
            type="button"
            :class="
              activeTab === 'share'
                ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/20 text-white border-cyan-300/30 shadow-md'
                : 'text-cyan-100/70 hover:text-white hover:bg-white/5 border-transparent'
            "
            class="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-medium border transition-all duration-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 text-cyan-300"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"
              />
            </svg>
            <span>Share Bookmark</span>
          </button>

          <button
            @click="activeTab = 'friends'"
            type="button"
            :class="
              activeTab === 'friends'
                ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/20 text-white border-cyan-300/30 shadow-md'
                : 'text-cyan-100/70 hover:text-white hover:bg-white/5 border-transparent'
            "
            class="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-medium border transition-all duration-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 text-cyan-300"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"
              />
            </svg>
            <span>Friends</span>
            <span
              v-if="friendRequests.length > 0"
              class="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-cyan-500 px-1.5 text-[10px] font-bold text-slate-950"
            >
              {{ friendRequests.length }}
            </span>
          </button>

          <button
            @click="activeTab = 'profile'"
            type="button"
            :class="
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/20 text-white border-cyan-300/30 shadow-md'
                : 'text-cyan-100/70 hover:text-white hover:bg-white/5 border-transparent'
            "
            class="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-medium border transition-all duration-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 text-cyan-300"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clip-rule="evenodd"
              />
            </svg>
            <span>Profile</span>
          </button>
        </div>
      </div>

      <!-- Modal Body -->
      <div class="flex-1 overflow-y-auto px-6 sm:px-8 py-5 space-y-5">
        <!-- Toast Status Alerts -->
        <transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-2 scale-95"
          enter-to-class="opacity-100 translate-y-0 scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-if="actionError"
            class="flex items-center gap-3 rounded-2xl border border-red-400/30 bg-red-500/15 p-4 text-sm text-red-200 shadow-lg shadow-red-950/20"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 flex-shrink-0 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
            <span class="flex-1 font-medium">{{ actionError }}</span>
          </div>
          <div
            v-else-if="actionSuccess"
            class="flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/15 p-4 text-sm text-emerald-200 shadow-lg shadow-emerald-950/20"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 flex-shrink-0 text-emerald-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
            <span class="flex-1 font-medium">{{ actionSuccess }}</span>
          </div>
        </transition>

        <!-- TAB 1: PRO SHARE BOOKMARK -->
        <div v-if="activeTab === 'share'" class="space-y-5">
          <!-- Step 1: Select Bookmark Card -->
          <div class="rounded-2xl border border-cyan-100/15 bg-white/[0.04] p-5 sm:p-6 transition hover:border-cyan-100/25">
            <div class="flex items-center justify-between mb-3">
              <label class="text-xs font-semibold uppercase tracking-wider text-cyan-200/90 flex items-center gap-2">
                <span class="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-[11px] text-cyan-300 font-bold">1</span>
                Select Bookmark to Share
              </label>
              <span v-if="bookmarks.length > 0" class="text-xs text-cyan-100/50">
                {{ bookmarks.length }} available
              </span>
            </div>

            <!-- If bookmark is already chosen, show rich preview card with option to change -->
            <div
              v-if="selectedBookmark"
              class="flex items-center justify-between gap-4 rounded-xl border border-cyan-300/30 bg-gradient-to-r from-cyan-500/15 to-blue-500/10 p-4 shadow-inner"
            >
              <div class="flex items-center gap-3.5 min-w-0 flex-1">
                <img
                  :src="favicon(selectedBookmark.link)"
                  alt="favicon"
                  class="h-7 w-7 rounded-lg ring-1 ring-white/20 flex-shrink-0 bg-slate-800 p-1"
                  loading="lazy"
                />
                <div class="min-w-0 flex-1">
                  <h4 class="truncate text-sm font-semibold text-white">
                    {{ selectedBookmark.name }}
                  </h4>
                  <p class="truncate text-xs text-cyan-100/70 mt-0.5">
                    {{ domain(selectedBookmark.link) }} • <span class="text-cyan-200/90 font-medium">{{ selectedBookmark.folderName || "General" }}</span>
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2 flex-shrink-0">
                <button
                  @click="isBookmarkPickerOpen = !isBookmarkPickerOpen"
                  type="button"
                  class="rounded-xl border border-cyan-200/30 bg-white/10 px-3 py-1.5 text-xs font-medium text-cyan-100 transition hover:bg-white/20"
                >
                  Change
                </button>
                <button
                  @click="clearSelectedBookmark"
                  type="button"
                  class="rounded-xl border border-white/10 bg-white/5 p-1.5 text-cyan-100/60 transition hover:text-white hover:bg-white/10"
                  title="Clear selection"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Otherwise, or if changing, show searchable bookmark picker -->
            <div v-if="!selectedBookmark || isBookmarkPickerOpen" class="space-y-3 mt-3">
              <div class="relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-100/50"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l3.817 3.817a1 1 0 01-1.414 1.414l-3.817-3.817A6 6 0 012 8z" clip-rule="evenodd" />
                </svg>
                <input
                  v-model="bookmarkSearch"
                  type="text"
                  placeholder="Search your bookmarks to share..."
                  class="w-full rounded-xl border border-cyan-100/20 bg-white/10 py-3 pl-10 pr-4 text-sm text-white placeholder-cyan-100/40 focus:border-cyan-200/40 focus:outline-none focus:ring-2 focus:ring-cyan-200/60"
                />
              </div>

              <!-- Filtered List of Bookmarks -->
              <div class="max-h-48 overflow-y-auto rounded-xl border border-cyan-100/10 bg-slate-950/50 p-2 space-y-1.5">
                <div v-if="filteredShareBookmarks.length === 0" class="py-6 text-center text-xs text-cyan-100/60">
                  No bookmarks match your search.
                </div>
                <div
                  v-for="bookmark in filteredShareBookmarks"
                  :key="bookmark.id"
                  @click="selectBookmark(bookmark)"
                  class="flex items-center gap-3 rounded-xl p-2.5 transition cursor-pointer hover:bg-cyan-500/15"
                  :class="String(selectedBookmarkId) === String(bookmark.id) ? 'bg-cyan-500/20 border border-cyan-300/30' : 'border border-transparent'"
                >
                  <img
                    :src="favicon(bookmark.link)"
                    alt="favicon"
                    class="h-5 w-5 rounded-md ring-1 ring-white/10 flex-shrink-0"
                    loading="lazy"
                  />
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-xs font-semibold text-white">{{ bookmark.name }}</p>
                    <p class="truncate text-[11px] text-cyan-100/60 mt-0.5">{{ domain(bookmark.link) }}</p>
                  </div>
                  <span class="rounded-full bg-white/10 px-2.5 py-1 text-[10px] text-cyan-100/80 font-medium">
                    {{ bookmark.folderName || "General" }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2: Recipient Selection Card -->
          <div class="rounded-2xl border border-cyan-100/15 bg-white/[0.04] p-5 sm:p-6 transition hover:border-cyan-100/25">
            <div class="flex items-center justify-between mb-3">
              <label class="text-xs font-semibold uppercase tracking-wider text-cyan-200/90 flex items-center gap-2">
                <span class="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-[11px] text-cyan-300 font-bold">2</span>
                Choose Recipient
              </label>
              <span class="text-xs text-cyan-100/50">Registered email</span>
            </div>

            <!-- Quick-select chips from Friends -->
            <div v-if="friends.length > 0" class="mb-4">
              <p class="text-[11px] font-medium text-cyan-100/60 mb-2">Quick select from friends:</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="friend in friends"
                  :key="friend.uid"
                  @click="selectFriendForShare(friend.email)"
                  type="button"
                  class="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs transition duration-150"
                  :class="
                    shareEmail?.toLowerCase() === friend.email?.toLowerCase()
                      ? 'border-cyan-300 bg-cyan-500/25 text-white font-medium shadow-sm'
                      : 'border-cyan-100/15 bg-white/5 text-cyan-100/80 hover:border-cyan-200/30 hover:bg-white/10'
                  "
                >
                  <span class="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-cyan-400/20 text-[10px] font-bold text-cyan-200">
                    {{ friend.email.charAt(0).toUpperCase() }}
                  </span>
                  <span>{{ friend.email }}</span>
                </button>
              </div>
            </div>

            <!-- Email Input -->
            <div class="relative">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-100/50"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              <input
                :value="shareEmail"
                @input="updateShareEmail"
                type="email"
                placeholder="friend@example.com"
                class="w-full rounded-xl border border-cyan-100/20 bg-white/10 py-3 pl-10 pr-4 text-sm text-white placeholder-cyan-100/40 focus:border-cyan-200/40 focus:outline-none focus:ring-2 focus:ring-cyan-200/60"
              />
            </div>
          </div>

          <!-- Share Preview Summary & Action Button -->
          <div class="rounded-2xl border border-cyan-200/20 bg-gradient-to-b from-cyan-500/10 to-blue-500/5 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-lg">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-white">Ready to share?</p>
              <p class="text-xs text-cyan-100/70">
                It will appear instantly in their <span class="text-cyan-200 font-medium">"Shared with Me"</span> folder.
              </p>
            </div>

            <button
              @click="$emit('share-bookmark')"
              :disabled="!selectedBookmarkId || !shareEmail?.trim()"
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all duration-200 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] flex-shrink-0"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
              <span>Send Bookmark</span>
            </button>
          </div>
        </div>

        <!-- TAB 2: FRIENDS & REQUESTS -->
        <div v-else-if="activeTab === 'friends'" class="space-y-5">
          <!-- Add Friend Card -->
          <div class="rounded-2xl border border-cyan-100/15 bg-white/[0.04] p-5 sm:p-6">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-cyan-200/90 mb-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-cyan-300" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
              </svg>
              Add Friend by Email
            </h3>
            <div class="flex gap-2.5">
              <div class="relative flex-1">
                <input
                  :value="friendEmail"
                  @input="updateFriendEmail"
                  type="email"
                  placeholder="friend@email.com"
                  class="w-full rounded-xl border border-cyan-100/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder-cyan-100/40 focus:border-cyan-200/40 focus:outline-none focus:ring-2 focus:ring-cyan-200/60"
                />
              </div>
              <button
                @click="$emit('add-friend')"
                type="button"
                class="rounded-xl border border-cyan-200/30 bg-cyan-500/20 px-5 py-2.5 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-500/30 flex-shrink-0"
              >
                Send Request
              </button>
            </div>
          </div>

          <!-- Pending Friend Requests -->
          <div class="rounded-2xl border border-cyan-100/15 bg-white/[0.04] p-5 sm:p-6">
            <div class="mb-4 flex items-center justify-between">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-cyan-200/90 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-amber-300" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
                Incoming Requests
              </h3>
              <span class="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-xs font-medium text-cyan-200">
                {{ friendRequests.length }}
              </span>
            </div>

            <div v-if="requestsLoading" class="py-6 text-center text-xs text-cyan-100/60">
              Loading requests...
            </div>
            <div v-else-if="friendRequests.length === 0" class="rounded-xl border border-cyan-100/10 bg-black/20 p-5 text-center text-xs text-cyan-100/60">
              No pending friend requests.
            </div>
            <div v-else class="space-y-2.5">
              <div
                v-for="request in friendRequests"
                :key="request.fromUid"
                class="flex items-center justify-between gap-3 rounded-xl border border-cyan-100/15 bg-white/5 p-3.5"
              >
                <div class="flex items-center gap-3 min-w-0 flex-1">
                  <span class="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/20 text-xs font-bold text-amber-200 flex-shrink-0">
                    {{ request.fromEmail?.charAt(0).toUpperCase() }}
                  </span>
                  <span class="truncate text-xs font-medium text-white">{{ request.fromEmail }}</span>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                  <button
                    @click="$emit('approve-request', request)"
                    type="button"
                    class="rounded-xl border border-emerald-400/30 bg-emerald-500/20 px-3.5 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/30"
                  >
                    Approve
                  </button>
                  <button
                    @click="$emit('delete-request', request)"
                    type="button"
                    class="rounded-xl border border-red-300/30 bg-red-500/10 px-3.5 py-1.5 text-xs font-medium text-red-100 transition hover:bg-red-500/20"
                  >
                    Ignore
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- My Friends List -->
          <div class="rounded-2xl border border-cyan-100/15 bg-white/[0.04] p-5 sm:p-6">
            <div class="mb-4 flex items-center justify-between">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-cyan-200/90 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-cyan-300" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
                Friends List
              </h3>
              <span class="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-xs font-medium text-cyan-200">
                {{ friends.length }}
              </span>
            </div>

            <div v-if="friendsLoading" class="py-6 text-center text-xs text-cyan-100/60">
              Loading friends...
            </div>
            <div v-else-if="friends.length === 0" class="rounded-xl border border-cyan-100/10 bg-black/20 p-5 text-center text-xs text-cyan-100/60">
              No friends added yet. Enter an email above to connect!
            </div>
            <div v-else class="space-y-2.5">
              <div
                v-for="friend in friends"
                :key="friend.uid"
                class="flex items-center justify-between gap-3 rounded-xl border border-cyan-100/10 bg-white/5 p-3.5 transition hover:border-cyan-100/25"
              >
                <div class="flex items-center gap-3 min-w-0 flex-1">
                  <span class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400/30 to-blue-500/20 text-xs font-bold text-cyan-200 flex-shrink-0">
                    {{ friend.email?.charAt(0).toUpperCase() }}
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-xs sm:text-sm font-semibold text-white">{{ friend.email }}</p>
                    <p class="text-[11px] text-cyan-100/60">Friend</p>
                  </div>
                </div>

                <div class="flex items-center gap-2 flex-shrink-0">
                  <button
                    @click="quickShareWithFriend(friend)"
                    type="button"
                    class="rounded-xl border border-cyan-200/30 bg-cyan-500/20 px-3.5 py-1.5 text-xs font-semibold text-cyan-50 transition hover:bg-cyan-500/30 flex items-center gap-1.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                    </svg>
                    <span>Share</span>
                  </button>
                  <button
                    @click="$emit('remove-friend', friend.uid)"
                    type="button"
                    class="rounded-xl border border-white/10 bg-white/5 p-2 text-red-200/60 transition hover:text-red-300 hover:bg-red-500/15"
                    title="Remove friend"
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

        <!-- TAB 3: PROFILE & LOGOUT -->
        <div v-else-if="activeTab === 'profile'" class="space-y-5">
          <div class="rounded-2xl border border-cyan-100/15 bg-white/[0.04] p-6 sm:p-7">
            <div class="flex items-center gap-4">
              <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-xl font-bold text-white shadow-lg shadow-cyan-500/20">
                {{ authUser?.email?.charAt(0).toUpperCase() }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-xs uppercase tracking-wider text-cyan-200/70 font-medium">Logged in Account</p>
                <h3 class="truncate text-base sm:text-lg font-semibold text-white mt-0.5">{{ authUser?.email }}</h3>
                <p class="text-xs text-cyan-100/60 mt-0.5">UID: <span class="font-mono text-[11px] opacity-75">{{ authUser?.uid }}</span></p>
              </div>
            </div>

            <div class="mt-6 grid grid-cols-2 gap-4 border-t border-cyan-100/10 pt-5">
              <div class="rounded-2xl bg-black/20 p-4 text-center border border-cyan-100/10">
                <p class="text-2xl font-bold text-white">{{ bookmarks.length }}</p>
                <p class="text-xs text-cyan-100/60 mt-1">Saved Bookmarks</p>
              </div>
              <div class="rounded-2xl bg-black/20 p-4 text-center border border-cyan-100/10">
                <p class="text-2xl font-bold text-white">{{ friends.length }}</p>
                <p class="text-xs text-cyan-100/60 mt-1">Friends</p>
              </div>
            </div>

            <button
              @click="$emit('logout')"
              type="button"
              class="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-500/15 py-3 px-4 text-sm font-semibold text-red-200 transition duration-200 hover:bg-red-500/25 hover:border-red-400/50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd" />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
