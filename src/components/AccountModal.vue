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
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="open"
      class="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6"
      @click.self="$emit('close')"
    >
      <section
        class="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-[#dadce0] dark:border-[#5f6368] bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] shadow-2xl transition-colors font-sans"
      >
        <!-- Google Material 3 Modal Header -->
        <header
          class="flex items-center justify-between border-b border-[#dadce0] dark:border-[#5f6368]/60 px-4 sm:px-6 py-3.5 sm:py-4"
        >
          <div class="flex items-center gap-3 min-w-0">
            <!-- Google Profile Avatar Circle -->
            <div
              class="h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold bg-[#1a73e8] text-white shadow-xs select-none"
            >
              {{ authUser?.email ? authUser.email.charAt(0).toUpperCase() : 'G' }}
            </div>
            <div class="min-w-0">
              <h2 class="text-base sm:text-lg font-medium tracking-tight text-[#202124] dark:text-[#e8eaed]">
                Share & Account
              </h2>
              <p class="text-xs text-[#5f6368] dark:text-[#9aa0a6] truncate max-w-[170px] sm:max-w-md">
                {{ authUser?.email }}
              </p>
            </div>
          </div>

          <button
            @click="$emit('close')"
            type="button"
            class="h-9 w-9 rounded-full flex items-center justify-center text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
            aria-label="Close modal"
            title="Close"
          >
            <svg class="h-5 w-5 fill-current" viewBox="0 0 24 24">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </button>
        </header>

        <!-- Google Material 3 Segmented Capsule Tabs -->
        <div class="px-4 sm:px-6 pt-3 sm:pt-4 pb-1">
          <div class="flex gap-1 rounded-full bg-[#f1f3f4] dark:bg-[#303134] p-1 border border-black/5 dark:border-white/5">
            <button
              @click="activeTab = 'share'"
              type="button"
              :class="
                activeTab === 'share'
                  ? 'bg-white dark:bg-[#202124] text-[#1a73e8] dark:text-[#8ab4f8] font-semibold shadow-xs'
                  : 'text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-white font-medium'
              "
              class="flex-1 flex items-center justify-center gap-2 rounded-full py-2 px-3 text-xs sm:text-sm transition cursor-pointer"
            >
              <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path
                  d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"
                />
              </svg>
              <span>Share Bookmark</span>
            </button>

            <button
              @click="activeTab = 'friends'"
              type="button"
              :class="
                activeTab === 'friends'
                  ? 'bg-white dark:bg-[#202124] text-[#1a73e8] dark:text-[#8ab4f8] font-semibold shadow-xs'
                  : 'text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-white font-medium'
              "
              class="flex-1 flex items-center justify-center gap-2 rounded-full py-2 px-3 text-xs sm:text-sm transition cursor-pointer"
            >
              <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path
                  d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
                />
              </svg>
              <span>Friends</span>
              <span
                v-if="friendRequests.length > 0"
                class="flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-[#1a73e8] text-white px-1.5 text-[10px] font-bold"
              >
                {{ friendRequests.length }}
              </span>
            </button>

            <button
              @click="activeTab = 'profile'"
              type="button"
              :class="
                activeTab === 'profile'
                  ? 'bg-white dark:bg-[#202124] text-[#1a73e8] dark:text-[#8ab4f8] font-semibold shadow-xs'
                  : 'text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-white font-medium'
              "
              class="flex-1 flex items-center justify-center gap-2 rounded-full py-2 px-3 text-xs sm:text-sm transition cursor-pointer"
            >
              <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
                />
              </svg>
              <span>Profile</span>
            </button>
          </div>
        </div>

        <!-- Modal Body Content -->
        <div class="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          <!-- Status Alerts -->
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
              class="flex items-center gap-3 rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/15 p-3.5 text-sm text-red-700 dark:text-red-200"
            >
              <svg
                class="h-5 w-5 flex-shrink-0 text-red-500 fill-current"
                viewBox="0 0 20 20"
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
              class="flex items-center gap-3 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/15 p-3.5 text-sm text-emerald-800 dark:text-emerald-200"
            >
              <svg
                class="h-5 w-5 flex-shrink-0 text-emerald-600 fill-current"
                viewBox="0 0 20 20"
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

          <!-- TAB 1: SHARE BOOKMARK (Google Workspace Style) -->
          <div v-if="activeTab === 'share'" class="space-y-4">
            <!-- Step 1: Select Bookmark Card -->
            <div
              class="rounded-2xl border border-[#dadce0] dark:border-[#5f6368] bg-[#f8fafd] dark:bg-[#282a2d] p-4 sm:p-5"
            >
              <div class="flex items-center justify-between mb-3">
                <span
                  class="text-xs font-semibold uppercase tracking-wider text-[#5f6368] dark:text-[#9aa0a6] flex items-center gap-1.5"
                >
                  <span>1.</span> Select Bookmark to Share
                </span>
                <span v-if="bookmarks.length > 0" class="text-xs text-[#5f6368] dark:text-[#9aa0a6]">
                  {{ bookmarks.length }} available
                </span>
              </div>

              <!-- Selected Bookmark Rich Preview -->
              <div
                v-if="selectedBookmark"
                class="flex items-center justify-between gap-3 rounded-2xl border border-[#dadce0] dark:border-white/10 bg-white dark:bg-[#202124] p-3.5 shadow-xs"
              >
                <div class="flex items-center gap-3 min-w-0 flex-1">
                  <!-- Favicon Avatar Container -->
                  <div
                    class="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl border border-[#dadce0] dark:border-white/10 bg-white dark:bg-[#303134] overflow-hidden shadow-2xs"
                  >
                    <img
                      :src="favicon(selectedBookmark.link)"
                      alt="favicon"
                      class="h-5 w-5 object-contain"
                      loading="lazy"
                    />
                  </div>
                  <div class="min-w-0 flex-1">
                    <h4 class="truncate text-sm font-semibold text-[#202124] dark:text-white">
                      {{ selectedBookmark.name }}
                    </h4>
                    <p class="truncate text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">
                      {{ domain(selectedBookmark.link) }} •
                      <span class="font-medium text-[#1a73e8] dark:text-[#8ab4f8]">
                        {{ selectedBookmark.folderName || "General" }}
                      </span>
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-2 flex-shrink-0">
                  <button
                    @click="isBookmarkPickerOpen = !isBookmarkPickerOpen"
                    type="button"
                    class="rounded-full border border-[#dadce0] dark:border-[#5f6368] bg-white dark:bg-[#202124] px-3.5 py-1.5 text-xs font-medium text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-[#f1f3f4] dark:hover:bg-[#303134] transition cursor-pointer"
                  >
                    Change
                  </button>
                  <button
                    @click="clearSelectedBookmark"
                    type="button"
                    class="h-8 w-8 rounded-full flex items-center justify-center text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                    title="Clear selection"
                  >
                    <svg class="h-4 w-4 fill-current" viewBox="0 0 20 20">
                      <path
                        fill-rule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Searchable Bookmark Picker -->
              <div v-if="!selectedBookmark || isBookmarkPickerOpen" class="space-y-2.5 mt-2">
                <div class="relative">
                  <input
                    v-model="bookmarkSearch"
                    type="text"
                    placeholder="Search bookmarks by name, URL, or folder..."
                    class="w-full rounded-xl border border-[#dadce0] dark:border-[#5f6368] bg-white dark:bg-[#202124] px-3.5 py-2.5 text-sm text-[#202124] dark:text-white placeholder-[#5f6368] dark:placeholder-[#9aa0a6] transition focus:border-[#1a73e8] dark:focus:border-[#8ab4f8] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]"
                  />
                </div>

                <!-- Filtered List of Bookmarks -->
                <div
                  class="max-h-48 overflow-y-auto rounded-xl border border-[#dadce0] dark:border-[#5f6368] bg-white dark:bg-[#202124] p-1.5 space-y-1"
                >
                  <div
                    v-if="filteredShareBookmarks.length === 0"
                    class="py-6 text-center text-xs text-[#5f6368] dark:text-[#9aa0a6]"
                  >
                    No bookmarks match your search.
                  </div>
                  <div
                    v-for="bookmark in filteredShareBookmarks"
                    :key="bookmark.id"
                    @click="selectBookmark(bookmark)"
                    class="flex items-center gap-3 rounded-xl p-2.5 transition cursor-pointer hover:bg-[#f1f3f4] dark:hover:bg-[#303134]"
                    :class="
                      String(selectedBookmarkId) === String(bookmark.id)
                        ? 'bg-amber-50 dark:bg-amber-400/10 border border-amber-300 dark:border-amber-400/30'
                        : 'border border-transparent'
                    "
                  >
                    <div
                      class="h-7 w-7 flex-shrink-0 flex items-center justify-center rounded-lg border border-[#dadce0] dark:border-white/10 bg-white dark:bg-[#282a2d] overflow-hidden"
                    >
                      <img
                        :src="favicon(bookmark.link)"
                        alt="favicon"
                        class="h-4 w-4 object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-xs font-semibold text-[#202124] dark:text-white">
                        {{ bookmark.name }}
                      </p>
                      <p class="truncate text-[11px] text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">
                        {{ domain(bookmark.link) }}
                      </p>
                    </div>
                    <span
                      class="rounded-md bg-[#f1f3f4] dark:bg-white/10 px-2 py-0.5 text-[10px] text-[#5f6368] dark:text-gray-300 font-medium"
                    >
                      {{ bookmark.folderName || "General" }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Step 2: Recipient Selection Card -->
            <div
              class="rounded-2xl border border-[#dadce0] dark:border-[#5f6368] bg-[#f8fafd] dark:bg-[#282a2d] p-4 sm:p-5"
            >
              <div class="flex items-center justify-between mb-3">
                <span
                  class="text-xs font-semibold uppercase tracking-wider text-[#5f6368] dark:text-[#9aa0a6] flex items-center gap-1.5"
                >
                  <span>2.</span> Choose Recipient
                </span>
                <span class="text-xs text-[#5f6368] dark:text-[#9aa0a6]">Registered email</span>
              </div>

              <!-- Quick-select chips from Friends -->
              <div v-if="friends.length > 0" class="mb-3">
                <p class="text-[11px] font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-2">
                  Quick select from friends:
                </p>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="friend in friends"
                    :key="friend.uid"
                    @click="selectFriendForShare(friend.email)"
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition cursor-pointer"
                    :class="
                      shareEmail?.toLowerCase() === friend.email?.toLowerCase()
                        ? 'border-[#1a73e8] bg-[#1a73e8]/10 text-[#1a73e8] dark:text-[#8ab4f8] font-semibold'
                        : 'border-[#dadce0] dark:border-[#5f6368] bg-white dark:bg-[#202124] text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#303134]'
                    "
                  >
                    <span
                      class="flex h-4 w-4 items-center justify-center rounded-full bg-[#1a73e8] text-[9px] font-bold text-white"
                    >
                      {{ friend.email.charAt(0).toUpperCase() }}
                    </span>
                    <span>{{ friend.email }}</span>
                  </button>
                </div>
              </div>

              <!-- Email Input (Material Outlined Style) -->
              <label class="block">
                <span
                  class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5f6368] dark:text-[#9aa0a6]"
                >
                  Recipient Email
                </span>
                <input
                  :value="shareEmail"
                  @input="updateShareEmail"
                  type="email"
                  placeholder="friend@example.com"
                  class="w-full rounded-xl border border-[#dadce0] dark:border-[#5f6368] bg-white dark:bg-[#202124] px-3.5 py-2.5 text-sm text-[#202124] dark:text-white placeholder-[#5f6368] dark:placeholder-[#9aa0a6] transition focus:border-[#1a73e8] dark:focus:border-[#8ab4f8] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]"
                />
              </label>
            </div>

            <!-- Share Action Footer -->
            <div
              class="flex flex-col-reverse gap-3 border-t border-[#dadce0] dark:border-[#5f6368]/60 pt-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <p class="text-xs text-[#5f6368] dark:text-[#9aa0a6]">
                Shared links appear in your friend's
                <span class="font-semibold text-[#1a73e8] dark:text-[#8ab4f8]">"Shared with Me"</span> folder.
              </p>

              <button
                @click="$emit('share-bookmark')"
                :disabled="!selectedBookmarkId || !shareEmail?.trim()"
                type="button"
                class="inline-flex items-center justify-center gap-2 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white px-6 py-2.5 text-sm font-medium transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 cursor-pointer"
              >
                <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
                <span>Send Bookmark</span>
              </button>
            </div>
          </div>

          <!-- TAB 2: FRIENDS & REQUESTS (Google Workspace Style) -->
          <div v-else-if="activeTab === 'friends'" class="space-y-4">
            <!-- Add Friend Card -->
            <div
              class="rounded-2xl border border-[#dadce0] dark:border-[#5f6368] bg-[#f8fafd] dark:bg-[#282a2d] p-4 sm:p-5"
            >
              <span
                class="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#5f6368] dark:text-[#9aa0a6]"
              >
                Add Friend by Email
              </span>
              <div class="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <input
                  :value="friendEmail"
                  @input="updateFriendEmail"
                  type="email"
                  placeholder="friend@email.com"
                  class="w-full flex-1 rounded-xl border border-[#dadce0] dark:border-[#5f6368] bg-white dark:bg-[#202124] px-3.5 py-2.5 text-sm text-[#202124] dark:text-white placeholder-[#5f6368] dark:placeholder-[#9aa0a6] transition focus:border-[#1a73e8] dark:focus:border-[#8ab4f8] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]"
                />
                <button
                  @click="$emit('add-friend')"
                  type="button"
                  class="inline-flex items-center justify-center gap-2 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white px-5 py-2.5 text-sm font-medium transition flex-shrink-0 cursor-pointer shadow-xs"
                >
                  <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                  <span>Send Request</span>
                </button>
              </div>
            </div>

            <!-- Pending Friend Requests -->
            <div
              class="rounded-2xl border border-[#dadce0] dark:border-[#5f6368] bg-[#f8fafd] dark:bg-[#282a2d] p-4 sm:p-5"
            >
              <div class="mb-3 flex items-center justify-between">
                <span
                  class="text-xs font-semibold uppercase tracking-wider text-[#5f6368] dark:text-[#9aa0a6]"
                >
                  Incoming Requests
                </span>
                <span
                  class="rounded-full bg-[#1a73e8]/10 text-[#1a73e8] dark:text-[#8ab4f8] px-2.5 py-0.5 text-xs font-semibold"
                >
                  {{ friendRequests.length }}
                </span>
              </div>

              <div
                v-if="requestsLoading"
                class="py-6 text-center text-xs text-[#5f6368] dark:text-[#9aa0a6]"
              >
                Loading requests...
              </div>
              <div
                v-else-if="friendRequests.length === 0"
                class="rounded-xl border border-[#dadce0] dark:border-[#5f6368]/60 bg-white dark:bg-[#202124] p-5 text-center text-xs text-[#5f6368] dark:text-[#9aa0a6]"
              >
                No pending friend requests.
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="request in friendRequests"
                  :key="request.fromUid"
                  class="flex items-center justify-between gap-3 rounded-xl border border-[#dadce0] dark:border-[#5f6368]/60 bg-white dark:bg-[#202124] p-3 shadow-2xs"
                >
                  <div class="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      class="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full bg-[#1a73e8] text-white text-xs font-semibold"
                    >
                      {{ request.fromEmail?.charAt(0).toUpperCase() }}
                    </div>
                    <span class="truncate text-xs font-medium text-[#202124] dark:text-white">
                      {{ request.fromEmail }}
                    </span>
                  </div>
                  <div class="flex items-center gap-2 flex-shrink-0">
                    <button
                      @click="$emit('approve-request', request)"
                      type="button"
                      class="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-medium transition cursor-pointer shadow-2xs"
                    >
                      Approve
                    </button>
                    <button
                      @click="$emit('delete-request', request)"
                      type="button"
                      class="rounded-full border border-[#dadce0] dark:border-[#5f6368] hover:bg-black/5 dark:hover:bg-white/10 text-[#5f6368] dark:text-[#9aa0a6] px-3.5 py-1.5 text-xs font-medium transition cursor-pointer"
                    >
                      Ignore
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- My Friends List -->
            <div
              class="rounded-2xl border border-[#dadce0] dark:border-[#5f6368] bg-[#f8fafd] dark:bg-[#282a2d] p-4 sm:p-5"
            >
              <div class="mb-3 flex items-center justify-between">
                <span
                  class="text-xs font-semibold uppercase tracking-wider text-[#5f6368] dark:text-[#9aa0a6]"
                >
                  Friends List
                </span>
                <span
                  class="rounded-full bg-[#1a73e8]/10 text-[#1a73e8] dark:text-[#8ab4f8] px-2.5 py-0.5 text-xs font-semibold"
                >
                  {{ friends.length }}
                </span>
              </div>

              <div
                v-if="friendsLoading"
                class="py-6 text-center text-xs text-[#5f6368] dark:text-[#9aa0a6]"
              >
                Loading friends...
              </div>
              <div
                v-else-if="friends.length === 0"
                class="rounded-xl border border-[#dadce0] dark:border-[#5f6368]/60 bg-white dark:bg-[#202124] p-5 text-center text-xs text-[#5f6368] dark:text-[#9aa0a6]"
              >
                No friends added yet. Enter an email above to connect!
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="friend in friends"
                  :key="friend.uid"
                  class="flex items-center justify-between gap-3 rounded-xl border border-[#dadce0] dark:border-[#5f6368]/60 bg-white dark:bg-[#202124] p-3 shadow-2xs hover:border-[#1a73e8]/40 transition"
                >
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      class="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-full bg-[#1a73e8] text-white text-xs font-semibold"
                    >
                      {{ friend.email?.charAt(0).toUpperCase() }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-xs sm:text-sm font-semibold text-[#202124] dark:text-white">
                        {{ friend.email }}
                      </p>
                      <p class="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">Friend</p>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 flex-shrink-0">
                    <button
                      @click="quickShareWithFriend(friend)"
                      type="button"
                      class="inline-flex items-center gap-1.5 rounded-full border border-[#1a73e8] bg-[#1a73e8]/10 text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-[#1a73e8] hover:text-white px-3.5 py-1.5 text-xs font-medium transition cursor-pointer"
                    >
                      <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                      </svg>
                      <span>Share</span>
                    </button>
                    <button
                      @click="$emit('remove-friend', friend.uid)"
                      type="button"
                      class="h-8 w-8 rounded-full flex items-center justify-center text-[#5f6368] dark:text-[#9aa0a6] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                      title="Remove friend"
                    >
                      <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 3: PROFILE & LOGOUT (Google Account Style) -->
          <div v-else-if="activeTab === 'profile'" class="space-y-4">
            <div
              class="rounded-2xl border border-[#dadce0] dark:border-[#5f6368] bg-[#f8fafd] dark:bg-[#282a2d] p-5 sm:p-6"
            >
              <div class="flex items-center gap-4">
                <div
                  class="h-14 w-14 rounded-full flex items-center justify-center bg-[#1a73e8] text-white text-xl font-bold shadow-xs select-none"
                >
                  {{ authUser?.email?.charAt(0).toUpperCase() }}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-semibold uppercase tracking-wider text-[#5f6368] dark:text-[#9aa0a6]">
                    Google Synced Account
                  </p>
                  <h3 class="truncate text-base sm:text-lg font-semibold text-[#202124] dark:text-white mt-0.5">
                    {{ authUser?.email }}
                  </h3>
                  <p class="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">
                    UID: <span class="font-mono text-[11px] opacity-75">{{ authUser?.uid }}</span>
                  </p>
                </div>
              </div>

              <!-- Stat Badges -->
              <div class="mt-5 grid grid-cols-2 gap-3 border-t border-[#dadce0] dark:border-[#5f6368]/60 pt-4">
                <div
                  class="rounded-xl bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#5f6368]/60 p-4 text-center shadow-2xs"
                >
                  <p class="text-2xl font-bold text-[#202124] dark:text-white">{{ bookmarks.length }}</p>
                  <p class="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-1 font-medium">Saved Bookmarks</p>
                </div>
                <div
                  class="rounded-xl bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#5f6368]/60 p-4 text-center shadow-2xs"
                >
                  <p class="text-2xl font-bold text-[#202124] dark:text-white">{{ friends.length }}</p>
                  <p class="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-1 font-medium">Friends</p>
                </div>
              </div>

              <!-- Sign Out Button -->
              <button
                @click="$emit('logout')"
                type="button"
                class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-red-300 dark:border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 py-2.5 px-4 text-sm font-semibold transition cursor-pointer"
              >
                <svg class="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                    clip-rule="evenodd"
                  />
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
