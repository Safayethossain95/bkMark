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
  <transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="open"
      class="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4 sm:p-6 backdrop-blur-md"
      @click.self="$emit('close')"
    >
      <section
        class="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-cyan-100/20 bg-slate-900/95 text-cyan-50 shadow-xl shadow-slate-950/40 backdrop-blur-xl"
      >
      <!-- Modal Header -->
      <header
        class="flex items-start justify-between gap-3 border-b border-cyan-100/10 px-5 py-4"
      >
        <div>
          <p class="text-xs font-medium uppercase tracking-wide text-cyan-100/70">
            Account & Hub
          </p>
          <h2 class="mt-1 text-lg font-semibold text-white">
            Sharing & Account Hub
          </h2>
          <p class="mt-0.5 text-xs text-cyan-100/70 truncate max-w-[240px] sm:max-w-md">
            {{ authUser?.email }}
          </p>
        </div>
        <button
          @click="$emit('close')"
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-100/20 bg-white/10 text-cyan-100 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
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
      <div class="px-5 pt-4 pb-1">
        <div class="flex gap-1.5 rounded-xl border border-cyan-100/15 bg-white/5 p-1">
          <button
            @click="activeTab = 'share'"
            type="button"
            :class="
              activeTab === 'share'
                ? 'border-cyan-200/30 bg-cyan-500/20 text-white font-semibold shadow-sm'
                : 'border-transparent text-cyan-100/70 hover:bg-white/10 hover:text-white font-medium'
            "
            class="flex-1 flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-xs sm:text-sm border transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
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
                ? 'border-cyan-200/30 bg-cyan-500/20 text-white font-semibold shadow-sm'
                : 'border-transparent text-cyan-100/70 hover:bg-white/10 hover:text-white font-medium'
            "
            class="flex-1 flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-xs sm:text-sm border transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
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
              class="flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-cyan-500/30 border border-cyan-200/40 px-1.5 text-[10px] font-bold text-cyan-100"
            >
              {{ friendRequests.length }}
            </span>
          </button>

          <button
            @click="activeTab = 'profile'"
            type="button"
            :class="
              activeTab === 'profile'
                ? 'border-cyan-200/30 bg-cyan-500/20 text-white font-semibold shadow-sm'
                : 'border-transparent text-cyan-100/70 hover:bg-white/10 hover:text-white font-medium'
            "
            class="flex-1 flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-xs sm:text-sm border transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
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
      <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">
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
            class="flex items-center gap-3 rounded-xl border border-red-400/30 bg-red-500/15 p-3.5 text-sm text-red-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 flex-shrink-0 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
            <span class="flex-1 text-xs sm:text-sm font-medium">{{ actionError }}</span>
          </div>
          <div
            v-else-if="actionSuccess"
            class="flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/15 p-3.5 text-sm text-emerald-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 flex-shrink-0 text-emerald-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
            <span class="flex-1 text-xs sm:text-sm font-medium">{{ actionSuccess }}</span>
          </div>
        </transition>

        <!-- TAB 1: SHARE BOOKMARK -->
        <div v-if="activeTab === 'share'" class="space-y-4">
          <!-- Step 1: Select Bookmark Card -->
          <div class="rounded-xl border border-cyan-100/15 bg-white/5 p-4 sm:p-5">
            <div class="flex items-center justify-between mb-2.5">
              <span class="text-xs font-medium uppercase tracking-wide text-cyan-100/70 flex items-center gap-1.5">
                <span>1.</span> Select Bookmark to Share
              </span>
              <span v-if="bookmarks.length > 0" class="text-xs text-cyan-100/50">
                {{ bookmarks.length }} available
              </span>
            </div>

            <!-- If bookmark is already chosen, show rich preview card with option to change -->
            <div
              v-if="selectedBookmark"
              class="flex items-center justify-between gap-3 rounded-xl border border-cyan-200/30 bg-cyan-500/15 p-3.5"
            >
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <div class="grid h-10 w-10 flex-shrink-0 place-content-center rounded-lg border border-cyan-100/20 bg-white/10">
                  <img
                    :src="favicon(selectedBookmark.link)"
                    alt="favicon"
                    class="h-5 w-5 rounded-sm"
                    loading="lazy"
                  />
                </div>
                <div class="min-w-0 flex-1">
                  <h4 class="truncate text-sm font-semibold text-white">
                    {{ selectedBookmark.name }}
                  </h4>
                  <p class="truncate text-xs text-cyan-100/70 mt-0.5">
                    {{ domain(selectedBookmark.link) }} • <span class="text-cyan-200 font-medium">{{ selectedBookmark.folderName || "General" }}</span>
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2 flex-shrink-0">
                <button
                  @click="isBookmarkPickerOpen = !isBookmarkPickerOpen"
                  type="button"
                  class="rounded-lg border border-cyan-100/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-cyan-100 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
                >
                  Change
                </button>
                <button
                  @click="clearSelectedBookmark"
                  type="button"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-100/20 bg-white/10 text-cyan-100/70 transition hover:text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
                  title="Clear selection"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Otherwise, or if changing, show searchable bookmark picker -->
            <div v-if="!selectedBookmark || isBookmarkPickerOpen" class="space-y-2.5 mt-2.5">
              <div class="relative">
                <input
                  v-model="bookmarkSearch"
                  type="text"
                  placeholder="Search bookmarks by name, URL, or folder..."
                  class="w-full rounded-xl border border-cyan-100/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-cyan-100/40 transition focus:border-cyan-200/40 focus:outline-none focus:ring-2 focus:ring-cyan-200/60"
                />
              </div>

              <!-- Filtered List of Bookmarks -->
              <div class="max-h-48 overflow-y-auto rounded-xl border border-cyan-100/15 bg-black/25 p-1.5 space-y-1">
                <div v-if="filteredShareBookmarks.length === 0" class="py-5 text-center text-xs text-cyan-100/60">
                  No bookmarks match your search.
                </div>
                <div
                  v-for="bookmark in filteredShareBookmarks"
                  :key="bookmark.id"
                  @click="selectBookmark(bookmark)"
                  class="flex items-center gap-3 rounded-lg p-2 transition cursor-pointer hover:bg-white/10"
                  :class="String(selectedBookmarkId) === String(bookmark.id) ? 'bg-cyan-500/20 border border-cyan-200/30' : 'border border-transparent'"
                >
                  <div class="grid h-7 w-7 flex-shrink-0 place-content-center rounded-md border border-cyan-100/20 bg-white/10">
                    <img
                      :src="favicon(bookmark.link)"
                      alt="favicon"
                      class="h-4 w-4 rounded-sm"
                      loading="lazy"
                    />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-xs font-semibold text-white">{{ bookmark.name }}</p>
                    <p class="truncate text-[11px] text-cyan-100/60 mt-0.5">{{ domain(bookmark.link) }}</p>
                  </div>
                  <span class="rounded-lg bg-white/10 px-2 py-0.5 text-[10px] text-cyan-100/80 font-medium">
                    {{ bookmark.folderName || "General" }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2: Recipient Selection Card -->
          <div class="rounded-xl border border-cyan-100/15 bg-white/5 p-4 sm:p-5">
            <div class="flex items-center justify-between mb-2.5">
              <span class="text-xs font-medium uppercase tracking-wide text-cyan-100/70 flex items-center gap-1.5">
                <span>2.</span> Choose Recipient
              </span>
              <span class="text-xs text-cyan-100/50">Registered email</span>
            </div>

            <!-- Quick-select chips from Friends -->
            <div v-if="friends.length > 0" class="mb-3">
              <p class="text-[11px] font-medium text-cyan-100/60 mb-2">Quick select from friends:</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="friend in friends"
                  :key="friend.uid"
                  @click="selectFriendForShare(friend.email)"
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition"
                  :class="
                    shareEmail?.toLowerCase() === friend.email?.toLowerCase()
                      ? 'border-cyan-200/40 bg-cyan-500/25 text-white font-medium'
                      : 'border-cyan-100/20 bg-white/10 text-cyan-100/80 hover:bg-white/15 hover:text-white'
                  "
                >
                  <span class="flex h-4 w-4 items-center justify-center rounded-full bg-cyan-400/20 text-[9px] font-bold text-cyan-200">
                    {{ friend.email.charAt(0).toUpperCase() }}
                  </span>
                  <span>{{ friend.email }}</span>
                </button>
              </div>
            </div>

            <!-- Email Input -->
            <label class="block">
              <span class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-cyan-100/70">
                Recipient Email
              </span>
              <input
                :value="shareEmail"
                @input="updateShareEmail"
                type="email"
                placeholder="friend@example.com"
                class="w-full rounded-xl border border-cyan-100/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-cyan-100/40 transition focus:border-cyan-200/40 focus:outline-none focus:ring-2 focus:ring-cyan-200/60"
              />
            </label>
          </div>

          <!-- Share Action & Footer -->
          <div
            class="flex flex-col-reverse gap-2 border-t border-cyan-100/10 pt-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p class="text-xs text-cyan-100/70">
              Shared links appear in your friend's <span class="text-cyan-200 font-medium">"Shared with Me"</span> folder.
            </p>

            <button
              @click="$emit('share-bookmark')"
              :disabled="!selectedBookmarkId || !shareEmail?.trim()"
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-200/30 bg-cyan-500/20 px-4 py-2.5 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
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
        <div v-else-if="activeTab === 'friends'" class="space-y-4">
          <!-- Add Friend Card -->
          <div class="rounded-xl border border-cyan-100/15 bg-white/5 p-4 sm:p-5">
            <span class="mb-2 block text-xs font-medium uppercase tracking-wide text-cyan-100/70">
              Add Friend by Email
            </span>
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                :value="friendEmail"
                @input="updateFriendEmail"
                type="email"
                placeholder="friend@email.com"
                class="w-full flex-1 rounded-xl border border-cyan-100/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-cyan-100/40 transition focus:border-cyan-200/40 focus:outline-none focus:ring-2 focus:ring-cyan-200/60"
              />
              <button
                @click="$emit('add-friend')"
                type="button"
                class="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-200/30 bg-cyan-500/20 px-4 py-2.5 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70 flex-shrink-0"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z"
                  />
                </svg>
                <span>Send Request</span>
              </button>
            </div>
          </div>

          <!-- Pending Friend Requests -->
          <div class="rounded-xl border border-cyan-100/15 bg-white/5 p-4 sm:p-5">
            <div class="mb-3 flex items-center justify-between">
              <span class="text-xs font-medium uppercase tracking-wide text-cyan-100/70">
                Incoming Requests
              </span>
              <span class="rounded-full bg-cyan-500/20 border border-cyan-200/30 px-2 py-0.5 text-xs font-medium text-cyan-200">
                {{ friendRequests.length }}
              </span>
            </div>

            <div v-if="requestsLoading" class="py-5 text-center text-xs text-cyan-100/60">
              Loading requests...
            </div>
            <div v-else-if="friendRequests.length === 0" class="rounded-lg border border-cyan-100/10 bg-black/20 p-4 text-center text-xs text-cyan-100/60">
              No pending friend requests.
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="request in friendRequests"
                :key="request.fromUid"
                class="flex items-center justify-between gap-3 rounded-lg border border-cyan-100/15 bg-white/5 p-3"
              >
                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                  <div class="grid h-7 w-7 flex-shrink-0 place-content-center rounded-md border border-cyan-100/20 bg-white/10 text-xs font-bold text-cyan-200">
                    {{ request.fromEmail?.charAt(0).toUpperCase() }}
                  </div>
                  <span class="truncate text-xs font-medium text-white">{{ request.fromEmail }}</span>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                  <button
                    @click="$emit('approve-request', request)"
                    type="button"
                    class="rounded-lg border border-emerald-200/30 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
                  >
                    Approve
                  </button>
                  <button
                    @click="$emit('delete-request', request)"
                    type="button"
                    class="rounded-lg border border-red-200/30 bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
                  >
                    Ignore
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- My Friends List -->
          <div class="rounded-xl border border-cyan-100/15 bg-white/5 p-4 sm:p-5">
            <div class="mb-3 flex items-center justify-between">
              <span class="text-xs font-medium uppercase tracking-wide text-cyan-100/70">
                Friends List
              </span>
              <span class="rounded-full bg-cyan-500/20 border border-cyan-200/30 px-2 py-0.5 text-xs font-medium text-cyan-200">
                {{ friends.length }}
              </span>
            </div>

            <div v-if="friendsLoading" class="py-5 text-center text-xs text-cyan-100/60">
              Loading friends...
            </div>
            <div v-else-if="friends.length === 0" class="rounded-lg border border-cyan-100/10 bg-black/20 p-4 text-center text-xs text-cyan-100/60">
              No friends added yet. Enter an email above to connect!
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="friend in friends"
                :key="friend.uid"
                class="flex items-center justify-between gap-3 rounded-lg border border-cyan-100/10 bg-white/5 p-3 transition hover:border-cyan-100/20"
              >
                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                  <div class="grid h-8 w-8 flex-shrink-0 place-content-center rounded-lg border border-cyan-100/20 bg-white/10 text-xs font-bold text-cyan-200">
                    {{ friend.email?.charAt(0).toUpperCase() }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-xs sm:text-sm font-semibold text-white">{{ friend.email }}</p>
                    <p class="text-[11px] text-cyan-100/60">Friend</p>
                  </div>
                </div>

                <div class="flex items-center gap-2 flex-shrink-0">
                  <button
                    @click="quickShareWithFriend(friend)"
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200/30 bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-50 transition hover:bg-cyan-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                    </svg>
                    <span>Share</span>
                  </button>
                  <button
                    @click="$emit('remove-friend', friend.uid)"
                    type="button"
                    class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-100/10 bg-white/5 text-cyan-100/60 transition hover:text-red-300 hover:bg-red-500/15 hover:border-red-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
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
        <div v-else-if="activeTab === 'profile'" class="space-y-4">
          <div class="rounded-xl border border-cyan-100/15 bg-white/5 p-5 sm:p-6">
            <div class="flex items-center gap-3.5">
              <div class="grid h-12 w-12 place-content-center rounded-xl border border-cyan-200/30 bg-cyan-500/20 text-lg font-bold text-cyan-100">
                {{ authUser?.email?.charAt(0).toUpperCase() }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-medium uppercase tracking-wide text-cyan-100/70">Logged in Account</p>
                <h3 class="truncate text-base sm:text-lg font-semibold text-white mt-0.5">{{ authUser?.email }}</h3>
                <p class="text-xs text-cyan-100/60 mt-0.5">UID: <span class="font-mono text-[11px] opacity-75">{{ authUser?.uid }}</span></p>
              </div>
            </div>

            <div class="mt-5 grid grid-cols-2 gap-3 border-t border-cyan-100/10 pt-4">
              <div class="rounded-xl bg-white/5 p-3.5 text-center border border-cyan-100/10">
                <p class="text-2xl font-bold text-white">{{ bookmarks.length }}</p>
                <p class="text-xs text-cyan-100/70 mt-1 font-medium">Saved Bookmarks</p>
              </div>
              <div class="rounded-xl bg-white/5 p-3.5 text-center border border-cyan-100/10">
                <p class="text-2xl font-bold text-white">{{ friends.length }}</p>
                <p class="text-xs text-cyan-100/70 mt-1 font-medium">Friends</p>
              </div>
            </div>

            <button
              @click="$emit('logout')"
              type="button"
              class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200/30 bg-red-500/15 py-2.5 px-4 text-sm font-semibold text-red-100 transition duration-200 hover:bg-red-500/25 hover:border-red-300/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/50"
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
  </transition>
</template>
