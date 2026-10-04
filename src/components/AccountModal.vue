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
    const raw = link.startsWith("http") ? link : `https://${link}`;
    const d = new URL(raw).hostname.replace(/^www\./, "");
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
  const url = d ? `https://www.google.com/s2/favicons?domain=${d}&sz=64` : "";
  faviconCache.set(link, url);
  return url;
}

const selectedBookmark = computed(() => {
  if (!props.selectedBookmarkId) return null;
  return (
    props.bookmarks.find(
      (b) => String(b.id) === String(props.selectedBookmarkId)
    ) || null
  );
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
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0 scale-98"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-100 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-98"
  >
    <div
      v-if="open"
      class="fixed inset-0 z-[140] flex items-center justify-center bg-black/50 p-3 sm:p-5"
      @click.self="$emit('close')"
    >
      <section
        class="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] shadow-none font-sans"
      >
        <!-- Flat Minimal Header -->
        <header
          class="flex items-center justify-between border-b border-[#dadce0] dark:border-[#3c4043] px-4 sm:px-5 py-3 select-none"
        >
          <div class="flex items-center gap-3 min-w-0">
            <!-- Google Profile Avatar Circle -->
            <div
              class="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold bg-[#1a73e8] text-white"
            >
              {{ authUser?.email ? authUser.email.charAt(0).toUpperCase() : 'G' }}
            </div>
            <div class="min-w-0">
              <h2 class="text-sm font-semibold tracking-tight text-[#202124] dark:text-[#e8eaed]">
                Google Account & Share
              </h2>
              <p class="text-xs text-[#5f6368] dark:text-[#9aa0a6] truncate max-w-[200px] sm:max-w-xs">
                {{ authUser?.email }}
              </p>
            </div>
          </div>

          <button
            @click="$emit('close')"
            type="button"
            class="h-8 w-8 rounded-lg flex items-center justify-center text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
            aria-label="Close"
            title="Close"
          >
            <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </button>
        </header>

        <!-- Minimal Flat Tabs -->
        <div class="px-4 sm:px-5 pt-3 pb-1 border-b border-[#dadce0] dark:border-[#3c4043]">
          <div class="flex gap-1 bg-[#f1f3f4] dark:bg-[#303134] p-1 rounded-xl">
            <button
              @click="activeTab = 'share'"
              type="button"
              :class="
                activeTab === 'share'
                  ? 'bg-white dark:bg-[#202124] text-[#1a73e8] dark:text-[#8ab4f8] font-semibold'
                  : 'text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-white font-medium'
              "
              class="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-3 text-xs transition cursor-pointer"
            >
              <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                <path
                  d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"
                />
              </svg>
              <span>Share</span>
            </button>

            <button
              @click="activeTab = 'friends'"
              type="button"
              :class="
                activeTab === 'friends'
                  ? 'bg-white dark:bg-[#202124] text-[#1a73e8] dark:text-[#8ab4f8] font-semibold'
                  : 'text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-white font-medium'
              "
              class="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-3 text-xs transition cursor-pointer"
            >
              <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                <path
                  d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
                />
              </svg>
              <span>Friends</span>
              <span
                v-if="friendRequests.length > 0"
                class="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#1a73e8] text-white px-1 text-[9px] font-bold"
              >
                {{ friendRequests.length }}
              </span>
            </button>

            <button
              @click="activeTab = 'profile'"
              type="button"
              :class="
                activeTab === 'profile'
                  ? 'bg-white dark:bg-[#202124] text-[#1a73e8] dark:text-[#8ab4f8] font-semibold'
                  : 'text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-white font-medium'
              "
              class="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-3 text-xs transition cursor-pointer"
            >
              <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
                />
              </svg>
              <span>Profile</span>
            </button>
          </div>
        </div>

        <!-- Modal Body Content -->
        <div class="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3.5">
          <!-- Status Alerts -->
          <div
            v-if="actionError"
            class="flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-2.5 text-xs text-red-700 dark:text-red-300 font-medium"
          >
            <span>⚠️</span>
            <span class="flex-1">{{ actionError }}</span>
          </div>
          <div
            v-else-if="actionSuccess"
            class="flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-2.5 text-xs text-emerald-800 dark:text-emerald-300 font-medium"
          >
            <span>✓</span>
            <span class="flex-1">{{ actionSuccess }}</span>
          </div>

          <!-- TAB 1: SHARE BOOKMARK -->
          <div v-if="activeTab === 'share'" class="space-y-3">
            <!-- Step 1: Bookmark selection -->
            <div
              class="rounded-xl border border-[#dadce0] dark:border-[#3c4043] bg-[#f8f9fa] dark:bg-[#282a2d] p-3 sm:p-4"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold text-[#5f6368] dark:text-[#9aa0a6]">
                  1. Bookmark to Share
                </span>
                <span v-if="bookmarks.length > 0" class="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">
                  {{ bookmarks.length }} items
                </span>
              </div>

              <!-- Selected Bookmark Card -->
              <div
                v-if="selectedBookmark"
                class="flex items-center justify-between gap-2.5 rounded-lg border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#202124] p-2.5"
              >
                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    class="h-7 w-7 flex-shrink-0 flex items-center justify-center rounded bg-black/5 dark:bg-white/10 overflow-hidden"
                  >
                    <img
                      :src="favicon(selectedBookmark.link)"
                      alt="icon"
                      class="h-4 w-4 object-contain"
                      loading="lazy"
                    />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-xs font-semibold text-[#202124] dark:text-white">
                      {{ selectedBookmark.name }}
                    </p>
                    <p class="truncate text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">
                      {{ domain(selectedBookmark.link) }} • #{{ selectedBookmark.folderName || "General" }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    @click="isBookmarkPickerOpen = !isBookmarkPickerOpen"
                    type="button"
                    class="rounded-md border border-[#dadce0] dark:border-[#3c4043] px-2.5 py-1 text-xs text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                  >
                    Change
                  </button>
                  <button
                    @click="clearSelectedBookmark"
                    type="button"
                    class="p-1 rounded text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                    title="Clear"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <!-- Searchable Bookmark Picker -->
              <div v-if="!selectedBookmark || isBookmarkPickerOpen" class="space-y-2 mt-2">
                <input
                  v-model="bookmarkSearch"
                  type="text"
                  placeholder="Search your bookmarks..."
                  class="w-full rounded-lg border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#202124] px-3 py-1.5 text-xs text-[#202124] dark:text-white placeholder-[#5f6368] dark:placeholder-[#9aa0a6] outline-none focus:border-[#1a73e8]"
                />

                <div
                  class="max-h-40 overflow-y-auto rounded-lg border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#202124] p-1 space-y-0.5"
                >
                  <div
                    v-if="filteredShareBookmarks.length === 0"
                    class="py-4 text-center text-xs text-[#5f6368] dark:text-[#9aa0a6]"
                  >
                    No bookmarks found.
                  </div>
                  <div
                    v-for="bookmark in filteredShareBookmarks"
                    :key="bookmark.id"
                    @click="selectBookmark(bookmark)"
                    class="flex items-center gap-2 rounded-md p-1.5 transition cursor-pointer hover:bg-[#f1f3f4] dark:hover:bg-[#303134]"
                    :class="String(selectedBookmarkId) === String(bookmark.id) ? 'bg-amber-50 dark:bg-amber-400/10' : ''"
                  >
                    <div
                      class="h-5 w-5 flex-shrink-0 flex items-center justify-center rounded bg-black/5 dark:bg-white/10 overflow-hidden"
                    >
                      <img
                        :src="favicon(bookmark.link)"
                        alt="icon"
                        class="h-3.5 w-3.5 object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-xs font-medium text-[#202124] dark:text-white">
                        {{ bookmark.name }}
                      </p>
                    </div>
                    <span class="text-[10px] text-gray-500">
                      #{{ bookmark.folderName || "General" }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Step 2: Recipient selection -->
            <div
              class="rounded-xl border border-[#dadce0] dark:border-[#3c4043] bg-[#f8f9fa] dark:bg-[#282a2d] p-3 sm:p-4"
            >
              <span class="text-xs font-semibold text-[#5f6368] dark:text-[#9aa0a6] block mb-2">
                2. Recipient Email
              </span>

              <!-- Quick friends selection -->
              <div v-if="friends.length > 0" class="mb-2.5">
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="friend in friends"
                    :key="friend.uid"
                    @click="selectFriendForShare(friend.email)"
                    type="button"
                    class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition cursor-pointer"
                    :class="
                      shareEmail?.toLowerCase() === friend.email?.toLowerCase()
                        ? 'border-[#1a73e8] bg-[#1a73e8]/10 text-[#1a73e8] dark:text-[#8ab4f8] font-semibold'
                        : 'border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#202124] text-[#5f6368] dark:text-[#9aa0a6]'
                    "
                  >
                    <span>{{ friend.email }}</span>
                  </button>
                </div>
              </div>

              <!-- Email input -->
              <input
                :value="shareEmail"
                @input="updateShareEmail"
                type="email"
                placeholder="recipient@example.com"
                class="w-full rounded-lg border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#202124] px-3 py-2 text-xs text-[#202124] dark:text-white placeholder-[#5f6368] dark:placeholder-[#9aa0a6] outline-none focus:border-[#1a73e8]"
              />
            </div>

            <!-- Share Action Footer -->
            <div
              class="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <p class="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">
                Appears in friend's "Shared with Me" folder.
              </p>

              <button
                @click="$emit('share-bookmark')"
                :disabled="!selectedBookmarkId || !shareEmail?.trim()"
                type="button"
                class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] text-white px-4 py-2 text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Send Bookmark</span>
              </button>
            </div>
          </div>

          <!-- TAB 2: FRIENDS & REQUESTS -->
          <div v-else-if="activeTab === 'friends'" class="space-y-3">
            <!-- Add Friend -->
            <div
              class="rounded-xl border border-[#dadce0] dark:border-[#3c4043] bg-[#f8f9fa] dark:bg-[#282a2d] p-3 sm:p-4"
            >
              <span class="text-xs font-semibold text-[#5f6368] dark:text-[#9aa0a6] block mb-1.5">
                Add Friend by Email
              </span>
              <div class="flex gap-2">
                <input
                  :value="friendEmail"
                  @input="updateFriendEmail"
                  type="email"
                  placeholder="friend@email.com"
                  class="flex-1 rounded-lg border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#202124] px-3 py-1.5 text-xs text-[#202124] dark:text-white placeholder-[#5f6368] dark:placeholder-[#9aa0a6] outline-none focus:border-[#1a73e8]"
                />
                <button
                  @click="$emit('add-friend')"
                  type="button"
                  class="rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] text-white px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer"
                >
                  Send
                </button>
              </div>
            </div>

            <!-- Pending Requests -->
            <div
              class="rounded-xl border border-[#dadce0] dark:border-[#3c4043] bg-[#f8f9fa] dark:bg-[#282a2d] p-3 sm:p-4"
            >
              <div class="mb-2 flex items-center justify-between">
                <span class="text-xs font-semibold text-[#5f6368] dark:text-[#9aa0a6]">
                  Incoming Friend Requests
                </span>
                <span
                  class="rounded-full bg-[#1a73e8]/10 text-[#1a73e8] dark:text-[#8ab4f8] px-2 py-0.2 text-[10px] font-bold"
                >
                  {{ friendRequests.length }}
                </span>
              </div>

              <div
                v-if="requestsLoading"
                class="py-4 text-center text-xs text-[#5f6368] dark:text-[#9aa0a6]"
              >
                Loading requests...
              </div>
              <div
                v-else-if="friendRequests.length === 0"
                class="rounded-lg border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#202124] p-3 text-center text-xs text-[#5f6368] dark:text-[#9aa0a6]"
              >
                No pending friend requests.
              </div>
              <div v-else class="space-y-1.5">
                <div
                  v-for="request in friendRequests"
                  :key="request.fromUid"
                  class="flex items-center justify-between gap-2 rounded-lg border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#202124] p-2"
                >
                  <span class="truncate text-xs font-medium text-[#202124] dark:text-white">
                    {{ request.fromEmail }}
                  </span>
                  <div class="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      @click="$emit('approve-request', request)"
                      type="button"
                      class="rounded bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-xs font-medium transition cursor-pointer"
                    >
                      Accept
                    </button>
                    <button
                      @click="$emit('delete-request', request)"
                      type="button"
                      class="rounded border border-[#dadce0] dark:border-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6] px-2.5 py-1 text-xs font-medium transition cursor-pointer"
                    >
                      Ignore
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Friends List -->
            <div
              class="rounded-xl border border-[#dadce0] dark:border-[#3c4043] bg-[#f8f9fa] dark:bg-[#282a2d] p-3 sm:p-4"
            >
              <div class="mb-2 flex items-center justify-between">
                <span class="text-xs font-semibold text-[#5f6368] dark:text-[#9aa0a6]">
                  Connected Friends
                </span>
                <span class="text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6]">
                  {{ friends.length }}
                </span>
              </div>

              <div
                v-if="friendsLoading"
                class="py-4 text-center text-xs text-[#5f6368] dark:text-[#9aa0a6]"
              >
                Loading friends...
              </div>
              <div
                v-else-if="friends.length === 0"
                class="rounded-lg border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#202124] p-3 text-center text-xs text-[#5f6368] dark:text-[#9aa0a6]"
              >
                No friends added yet.
              </div>
              <div v-else class="space-y-1.5">
                <div
                  v-for="friend in friends"
                  :key="friend.uid"
                  class="flex items-center justify-between gap-2 rounded-lg border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#202124] p-2"
                >
                  <div class="flex items-center gap-2 min-w-0 flex-1">
                    <div
                      class="h-6 w-6 flex-shrink-0 flex items-center justify-center rounded-full bg-[#1a73e8] text-white text-[10px] font-bold"
                    >
                      {{ friend.email?.charAt(0).toUpperCase() }}
                    </div>
                    <span class="truncate text-xs font-medium text-[#202124] dark:text-white">
                      {{ friend.email }}
                    </span>
                  </div>

                  <div class="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      @click="quickShareWithFriend(friend)"
                      type="button"
                      class="rounded border border-[#1a73e8] bg-[#1a73e8]/10 text-[#1a73e8] dark:text-[#8ab4f8] px-2.5 py-1 text-xs font-medium transition cursor-pointer"
                    >
                      Share
                    </button>
                    <button
                      @click="$emit('remove-friend', friend.uid)"
                      type="button"
                      class="p-1 rounded text-[#5f6368] dark:text-[#9aa0a6] hover:text-red-500 transition cursor-pointer"
                      title="Remove"
                    >
                      <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 3: PROFILE & ACCOUNT STATS -->
          <div v-else-if="activeTab === 'profile'" class="space-y-3">
            <div
              class="rounded-xl border border-[#dadce0] dark:border-[#3c4043] bg-[#f8f9fa] dark:bg-[#282a2d] p-4"
            >
              <div class="flex items-center gap-3">
                <div
                  class="h-11 w-11 rounded-full flex items-center justify-center bg-[#1a73e8] text-white text-base font-bold"
                >
                  {{ authUser?.email?.charAt(0).toUpperCase() }}
                </div>
                <div class="min-w-0 flex-1">
                  <h3 class="truncate text-sm font-semibold text-[#202124] dark:text-white">
                    {{ authUser?.email }}
                  </h3>
                  <p class="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] font-mono mt-0.5 truncate">
                    ID: {{ authUser?.uid }}
                  </p>
                </div>
              </div>

              <!-- Stats -->
              <div class="mt-3.5 grid grid-cols-2 gap-2 border-t border-[#dadce0] dark:border-[#3c4043] pt-3">
                <div
                  class="rounded-lg bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043] p-3 text-center"
                >
                  <p class="text-xl font-bold text-[#202124] dark:text-white">{{ bookmarks.length }}</p>
                  <p class="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">Bookmarks</p>
                </div>
                <div
                  class="rounded-lg bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043] p-3 text-center"
                >
                  <p class="text-xl font-bold text-[#202124] dark:text-white">{{ friends.length }}</p>
                  <p class="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">Friends</p>
                </div>
              </div>

              <!-- Sign Out -->
              <button
                @click="$emit('logout')"
                type="button"
                class="mt-3.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-300 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 py-2 px-3 text-xs font-semibold transition cursor-pointer"
              >
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </transition>
</template>
