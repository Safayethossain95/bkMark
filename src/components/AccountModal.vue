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
  isDark: Boolean,
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
const linkCopied = ref(false);

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      bookmarkSearch.value = "";
      isBookmarkPickerOpen.value = false;
      linkCopied.value = false;
      if (props.selectedBookmarkId) {
        activeTab.value = "share";
      }
    }
  }
);

watch(
  () => props.selectedBookmarkId,
  (newId) => {
    if (newId) {
      activeTab.value = "share";
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

async function copySelectedLink() {
  const linkToCopy = selectedBookmark.value?.link;
  if (!linkToCopy) return;
  try {
    await navigator.clipboard.writeText(linkToCopy);
    linkCopied.value = true;
    setTimeout(() => {
      linkCopied.value = false;
    }, 2200);
  } catch (e) {}
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
      class="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-3 sm:p-5"
      @click.self="$emit('close')"
    >
      <section
        class="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] shadow-[0_24px_48px_rgba(60,64,67,0.18),0_12px_24px_rgba(60,64,67,0.12)] dark:shadow-[0_24px_48px_rgba(0,0,0,0.6)] font-google transition-colors duration-150"
      >
        <!-- Google Material Header -->
        <header
          class="flex items-center justify-between border-b border-[#dadce0] dark:border-[#3c4043] px-5 sm:px-6 py-4 select-none"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold bg-[#1a73e8] dark:bg-[#8ab4f8] text-white dark:text-[#202124] shadow-sm"
            >
              {{ authUser?.email ? authUser.email.charAt(0).toUpperCase() : "G" }}
            </div>
            <div class="min-w-0">
              <h2 class="text-base font-normal tracking-tight text-[#202124] dark:text-[#e8eaed] truncate">
                <span v-if="activeTab === 'share' && selectedBookmark">
                  Share "{{ selectedBookmark.name }}"
                </span>
                <span v-else-if="activeTab === 'share'">
                  Share with friends
                </span>
                <span v-else-if="activeTab === 'friends'">
                  Collaborators & Friends
                </span>
                <span v-else>
                  bk Keep Account
                </span>
              </h2>
              <p class="text-xs text-[#5f6368] dark:text-[#9aa0a6] truncate max-w-[260px] sm:max-w-xs">
                {{ authUser?.email }}
              </p>
            </div>
          </div>

          <button
            @click="$emit('close')"
            type="button"
            class="h-9 w-9 rounded-full flex items-center justify-center text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
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

        <!-- Google Material 3 Segmented Tabs -->
        <div class="px-5 sm:px-6 pt-3.5 pb-2 border-b border-[#dadce0] dark:border-[#3c4043]">
          <div
            class="flex gap-1 bg-[#f1f3f4] dark:bg-[#303134] p-1 rounded-full border border-[#dadce0] dark:border-[#3c4043]"
          >
            <button
              @click="activeTab = 'share'"
              type="button"
              :class="
                activeTab === 'share'
                  ? 'bg-white dark:bg-[#202124] text-[#1a73e8] dark:text-[#8ab4f8] shadow-sm font-semibold'
                  : 'text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-white font-medium'
              "
              class="flex-1 flex items-center justify-center gap-1.5 rounded-full py-1.5 px-3 text-xs transition cursor-pointer"
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
                  ? 'bg-white dark:bg-[#202124] text-[#1a73e8] dark:text-[#8ab4f8] shadow-sm font-semibold'
                  : 'text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-white font-medium'
              "
              class="flex-1 flex items-center justify-center gap-1.5 rounded-full py-1.5 px-3 text-xs transition cursor-pointer"
            >
              <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                <path
                  d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
                />
              </svg>
              <span>Friends</span>
              <span
                v-if="friendRequests.length > 0"
                class="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#d93025] text-white px-1 text-[9px] font-bold"
              >
                {{ friendRequests.length }}
              </span>
            </button>

            <button
              @click="activeTab = 'profile'"
              type="button"
              :class="
                activeTab === 'profile'
                  ? 'bg-white dark:bg-[#202124] text-[#1a73e8] dark:text-[#8ab4f8] shadow-sm font-semibold'
                  : 'text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-white font-medium'
              "
              class="flex-1 flex items-center justify-center gap-1.5 rounded-full py-1.5 px-3 text-xs transition cursor-pointer"
            >
              <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
                />
              </svg>
              <span>Account</span>
            </button>
          </div>
        </div>

        <!-- Modal Body Content -->
        <div class="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
          <!-- Google Status Alert Banners -->
          <div
            v-if="actionError"
            class="flex items-start gap-2.5 rounded-xl border border-[#f28b82]/50 bg-[#fce8e6] dark:bg-[#4a2422]/60 p-3 text-xs text-[#d93025] dark:text-[#f28b82] font-medium leading-relaxed"
          >
            <svg class="h-4 w-4 flex-shrink-0 fill-current mt-0.5" viewBox="0 0 24 24">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
              />
            </svg>
            <span class="flex-1">{{ actionError }}</span>
          </div>

          <div
            v-else-if="actionSuccess"
            class="flex items-start gap-2.5 rounded-xl border border-[#a8dab5]/50 bg-[#e6f4ea] dark:bg-[#234024]/60 p-3 text-xs text-[#137333] dark:text-[#81c995] font-medium leading-relaxed"
          >
            <svg class="h-4 w-4 flex-shrink-0 fill-current mt-0.5" viewBox="0 0 24 24">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
              />
            </svg>
            <span class="flex-1">{{ actionSuccess }}</span>
          </div>

          <!-- TAB 1: SHARE BOOKMARK (Google Drive / Keep style) -->
          <div v-if="activeTab === 'share'" class="space-y-4">
            <!-- 1. Bookmark Selection Card -->
            <div
              class="rounded-2xl border border-[#dadce0] dark:border-[#3c4043] bg-[#f8f9fa] dark:bg-[#303134]/40 p-3.5 sm:p-4"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold uppercase tracking-wider text-[#5f6368] dark:text-[#9aa0a6]">
                  Bookmark to Share
                </span>
                <span v-if="bookmarks.length > 0" class="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">
                  {{ bookmarks.length }} in collection
                </span>
              </div>

              <!-- Selected Bookmark Google Card -->
              <div
                v-if="selectedBookmark"
                class="flex items-center justify-between gap-3 rounded-xl border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#202124] p-3 shadow-sm"
              >
                <div class="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    class="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-[#f1f3f4] dark:bg-[#303134] overflow-hidden border border-[#dadce0]/50 dark:border-white/5"
                  >
                    <img
                      :src="favicon(selectedBookmark.link)"
                      alt="icon"
                      class="h-4 w-4 object-contain"
                      loading="lazy"
                    />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-xs font-semibold text-[#202124] dark:text-[#e8eaed]">
                      {{ selectedBookmark.name }}
                    </p>
                    <p class="truncate text-[11px] text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">
                      {{ domain(selectedBookmark.link) }}
                      <span class="mx-1">•</span>
                      <span class="inline-block px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium text-[10px]">
                        #{{ selectedBookmark.folderName || "General" }}
                      </span>
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    @click="isBookmarkPickerOpen = !isBookmarkPickerOpen"
                    type="button"
                    class="rounded-full border border-[#dadce0] dark:border-[#5f6368] px-3 py-1 text-xs text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-[#1a73e8]/5 dark:hover:bg-[#8ab4f8]/10 transition font-medium cursor-pointer"
                  >
                    Change
                  </button>
                  <button
                    @click="clearSelectedBookmark"
                    type="button"
                    class="h-7 w-7 rounded-full flex items-center justify-center text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                    title="Clear selection"
                  >
                    <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                      <path
                        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Empty selection or Change picker -->
              <div v-if="!selectedBookmark || isBookmarkPickerOpen" class="space-y-2 mt-2">
                <div class="relative">
                  <svg
                    class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#5f6368] dark:text-[#9aa0a6]"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                    />
                  </svg>
                  <input
                    v-model="bookmarkSearch"
                    type="text"
                    placeholder="Search bookmark to share..."
                    class="w-full rounded-lg border border-[#dadce0] dark:border-[#5f6368] bg-white dark:bg-[#202124] pl-9 pr-3 py-2 text-xs text-[#202124] dark:text-[#e8eaed] placeholder-[#9aa0a6] dark:placeholder-[#5f6368] outline-none focus:border-[#1a73e8] dark:focus:border-[#8ab4f8] focus:ring-1 focus:ring-[#1a73e8] dark:focus:ring-[#8ab4f8]"
                  />
                </div>

                <div
                  class="max-h-44 overflow-y-auto rounded-xl border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#202124] p-1.5 space-y-1"
                >
                  <div
                    v-if="filteredShareBookmarks.length === 0"
                    class="py-5 text-center text-xs text-[#5f6368] dark:text-[#9aa0a6]"
                  >
                    No bookmarks found.
                  </div>
                  <div
                    v-for="bookmark in filteredShareBookmarks"
                    :key="bookmark.id"
                    @click="selectBookmark(bookmark)"
                    class="flex items-center gap-2.5 rounded-lg p-2 transition cursor-pointer hover:bg-[#f1f3f4] dark:hover:bg-[#303134]"
                    :class="
                      String(selectedBookmarkId) === String(bookmark.id)
                        ? 'bg-[#e8f0fe] dark:bg-[#1a3644] text-[#1a73e8] dark:text-[#8ab4f8]'
                        : ''
                    "
                  >
                    <div
                      class="h-6 w-6 flex-shrink-0 flex items-center justify-center rounded bg-[#f1f3f4] dark:bg-white/10 overflow-hidden"
                    >
                      <img
                        :src="favicon(bookmark.link)"
                        alt="icon"
                        class="h-3.5 w-3.5 object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-xs font-medium text-[#202124] dark:text-[#e8eaed]">
                        {{ bookmark.name }}
                      </p>
                      <p class="truncate text-[10px] text-[#5f6368] dark:text-[#9aa0a6]">
                        {{ domain(bookmark.link) }}
                      </p>
                    </div>
                    <span class="text-[10px] text-gray-500 flex-shrink-0">
                      #{{ bookmark.folderName || "General" }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 2. Recipient Input & Collaborator Selection -->
            <div
              class="rounded-2xl border border-[#dadce0] dark:border-[#3c4043] bg-[#f8f9fa] dark:bg-[#303134]/40 p-3.5 sm:p-4"
            >
              <span class="text-xs font-semibold uppercase tracking-wider text-[#5f6368] dark:text-[#9aa0a6] block mb-2">
                Add People & Collaborators
              </span>

              <!-- Quick Friends Chips -->
              <div v-if="friends.length > 0" class="mb-3">
                <p class="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] mb-1.5">
                  Connected Friends:
                </p>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="friend in friends"
                    :key="friend.uid"
                    @click="selectFriendForShare(friend.email)"
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition cursor-pointer"
                    :class="
                      shareEmail?.toLowerCase() === friend.email?.toLowerCase()
                        ? 'border-[#1a73e8] bg-[#1a73e8]/10 text-[#1a73e8] dark:text-[#8ab4f8] font-semibold'
                        : 'border-[#dadce0] dark:border-[#5f6368] bg-white dark:bg-[#202124] text-[#3c4043] dark:text-[#e8eaed] hover:bg-[#f1f3f4] dark:hover:bg-[#303134]'
                    "
                  >
                    <span
                      class="h-4 w-4 rounded-full bg-[#1a73e8] text-white flex items-center justify-center text-[9px] font-bold"
                    >
                      {{ friend.email?.charAt(0).toUpperCase() }}
                    </span>
                    <span>{{ friend.email }}</span>
                  </button>
                </div>
              </div>

              <!-- Recipient Email Input with Google Outlined Field -->
              <div class="relative">
                <input
                  :value="shareEmail"
                  @input="updateShareEmail"
                  type="email"
                  placeholder="Enter email address (e.g. friend@gmail.com)"
                  class="w-full rounded-lg border border-[#dadce0] dark:border-[#5f6368] bg-white dark:bg-[#202124] px-3.5 py-2.5 text-xs sm:text-sm text-[#202124] dark:text-[#e8eaed] placeholder-[#9aa0a6] dark:placeholder-[#5f6368] outline-none transition focus:border-[#1a73e8] dark:focus:border-[#8ab4f8] focus:ring-1 focus:ring-[#1a73e8] dark:focus:ring-[#8ab4f8]"
                />
              </div>
            </div>

            <!-- 3. General Access Info Note -->
            <div
              class="flex items-start gap-3 rounded-2xl border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#202124] p-3.5 text-xs text-[#5f6368] dark:text-[#9aa0a6]"
            >
              <div
                class="h-7 w-7 rounded-full bg-amber-400/15 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5"
              >
                <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"
                  />
                </svg>
              </div>
              <div>
                <p class="font-medium text-[#202124] dark:text-[#e8eaed]">
                  Shared directly to friend's bk Keep Bookmarks
                </p>
                <p class="mt-0.5 text-[11px] leading-relaxed">
                  The recipient will see this bookmark inside their "Shared with Me" label with your sender note.
                </p>
              </div>
            </div>

            <!-- Bottom Action Footer -->
            <div
              class="flex items-center justify-between pt-2 border-t border-[#dadce0] dark:border-[#3c4043]"
            >
              <!-- Copy Link Button (Drive Style) -->
              <button
                @click="copySelectedLink"
                :disabled="!selectedBookmark?.link"
                type="button"
                class="inline-flex items-center gap-1.5 rounded-full border border-[#dadce0] dark:border-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-[#303134] text-[#1a73e8] dark:text-[#8ab4f8] px-3.5 py-2 text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                  <path
                    d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"
                  />
                </svg>
                <span>{{ linkCopied ? "Link Copied!" : "Copy link" }}</span>
              </button>

              <!-- Send Button (Google Blue Pill) -->
              <button
                @click="$emit('share-bookmark')"
                :disabled="!selectedBookmarkId || !shareEmail?.trim()"
                type="button"
                class="inline-flex items-center justify-center gap-2 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] dark:bg-[#8ab4f8] dark:hover:bg-[#93bbf9] text-white dark:text-[#202124] px-6 py-2 text-xs font-semibold shadow-sm hover:shadow transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Send Bookmark</span>
                <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </div>

          <!-- TAB 2: FRIENDS & COLLABORATORS -->
          <div v-else-if="activeTab === 'friends'" class="space-y-4">
            <!-- Add Friend Card -->
            <div
              class="rounded-2xl border border-[#dadce0] dark:border-[#3c4043] bg-[#f8f9fa] dark:bg-[#303134]/40 p-4"
            >
              <span class="text-xs font-semibold uppercase tracking-wider text-[#5f6368] dark:text-[#9aa0a6] block mb-2">
                Add Friend by Email
              </span>
              <div class="flex gap-2">
                <input
                  :value="friendEmail"
                  @input="updateFriendEmail"
                  type="email"
                  placeholder="colleague@example.com"
                  class="flex-1 rounded-lg border border-[#dadce0] dark:border-[#5f6368] bg-white dark:bg-[#202124] px-3.5 py-2 text-xs text-[#202124] dark:text-[#e8eaed] placeholder-[#9aa0a6] dark:placeholder-[#5f6368] outline-none transition focus:border-[#1a73e8] dark:focus:border-[#8ab4f8]"
                />
                <button
                  @click="$emit('add-friend')"
                  type="button"
                  class="rounded-full bg-[#1a73e8] hover:bg-[#1557b0] dark:bg-[#8ab4f8] dark:hover:bg-[#93bbf9] text-white dark:text-[#202124] px-4 py-2 text-xs font-semibold shadow-sm transition cursor-pointer"
                >
                  Send Invite
                </button>
              </div>
            </div>

            <!-- Incoming Friend Requests -->
            <div
              class="rounded-2xl border border-[#dadce0] dark:border-[#3c4043] bg-[#f8f9fa] dark:bg-[#303134]/40 p-4"
            >
              <div class="mb-3 flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-wider text-[#5f6368] dark:text-[#9aa0a6]">
                  Incoming Friend Requests
                </span>
                <span
                  v-if="friendRequests.length > 0"
                  class="rounded-full bg-[#d93025] text-white px-2 py-0.2 text-[10px] font-bold"
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
                class="rounded-xl border border-dashed border-[#dadce0] dark:border-[#3c4043] bg-white/50 dark:bg-[#202124]/50 p-4 text-center text-xs text-[#5f6368] dark:text-[#9aa0a6]"
              >
                No pending requests.
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="request in friendRequests"
                  :key="request.fromUid"
                  class="flex items-center justify-between gap-3 rounded-xl border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#202124] p-3 shadow-sm"
                >
                  <div class="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      class="h-7 w-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0"
                    >
                      {{ request.fromEmail?.charAt(0).toUpperCase() }}
                    </div>
                    <span class="truncate text-xs font-medium text-[#202124] dark:text-[#e8eaed]">
                      {{ request.fromEmail }}
                    </span>
                  </div>

                  <div class="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      @click="$emit('approve-request', request)"
                      type="button"
                      class="rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white px-3 py-1 text-xs font-medium transition cursor-pointer"
                    >
                      Accept
                    </button>
                    <button
                      @click="$emit('delete-request', request)"
                      type="button"
                      class="rounded-full border border-[#dadce0] dark:border-[#5f6368] text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10 px-3 py-1 text-xs font-medium transition cursor-pointer"
                    >
                      Ignore
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Connected Friends List -->
            <div
              class="rounded-2xl border border-[#dadce0] dark:border-[#3c4043] bg-[#f8f9fa] dark:bg-[#303134]/40 p-4"
            >
              <div class="mb-3 flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-wider text-[#5f6368] dark:text-[#9aa0a6]">
                  Connected Friends
                </span>
                <span class="text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6]">
                  {{ friends.length }} friends
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
                class="rounded-xl border border-dashed border-[#dadce0] dark:border-[#3c4043] bg-white/50 dark:bg-[#202124]/50 p-4 text-center text-xs text-[#5f6368] dark:text-[#9aa0a6]"
              >
                No friends added yet. Enter an email above to connect!
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="friend in friends"
                  :key="friend.uid"
                  class="flex items-center justify-between gap-3 rounded-xl border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#202124] p-3 shadow-sm"
                >
                  <div class="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      class="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full bg-[#1a73e8] text-white text-xs font-bold"
                    >
                      {{ friend.email?.charAt(0).toUpperCase() }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-xs font-medium text-[#202124] dark:text-[#e8eaed]">
                        {{ friend.email }}
                      </p>
                      <p class="text-[10px] text-[#5f6368] dark:text-[#9aa0a6]">
                        Connected collaborator
                      </p>
                    </div>
                  </div>

                  <div class="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      @click="quickShareWithFriend(friend)"
                      type="button"
                      class="rounded-full border border-[#1a73e8] dark:border-[#8ab4f8] bg-[#1a73e8]/5 dark:bg-[#8ab4f8]/10 text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-[#1a73e8]/15 px-3 py-1 text-xs font-medium transition cursor-pointer"
                    >
                      Share Note
                    </button>
                    <button
                      @click="$emit('remove-friend', friend.uid)"
                      type="button"
                      class="h-7 w-7 rounded-full flex items-center justify-center text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#d93025] hover:bg-red-50 dark:hover:bg-red-950/20 transition cursor-pointer"
                      title="Remove connection"
                    >
                      <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                        <path
                          d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 3: GOOGLE ACCOUNT & STATS -->
          <div v-else-if="activeTab === 'profile'" class="space-y-4">
            <div
              class="rounded-2xl border border-[#dadce0] dark:border-[#3c4043] bg-[#f8f9fa] dark:bg-[#303134]/40 p-5"
            >
              <div class="flex items-center gap-4">
                <div
                  class="h-14 w-14 rounded-full flex items-center justify-center bg-[#1a73e8] dark:bg-[#8ab4f8] text-white dark:text-[#202124] text-xl font-bold shadow"
                >
                  {{ authUser?.email?.charAt(0).toUpperCase() }}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider mb-0.5">
                    <span>bk Keep Account</span>
                  </div>
                  <h3 class="truncate text-base font-medium text-[#202124] dark:text-[#e8eaed]">
                    {{ authUser?.email }}
                  </h3>
                  <p class="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] font-mono mt-0.5 truncate">
                    User UID: {{ authUser?.uid }}
                  </p>
                </div>
              </div>

              <!-- Metrics -->
              <div
                class="mt-5 grid grid-cols-2 gap-3 border-t border-[#dadce0] dark:border-[#3c4043] pt-4"
              >
                <div
                  class="rounded-xl bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043] p-3 text-center shadow-sm"
                >
                  <p class="text-2xl font-normal text-[#202124] dark:text-[#e8eaed]">
                    {{ bookmarks.length }}
                  </p>
                  <p class="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">
                    Saved Bookmarks
                  </p>
                </div>
                <div
                  class="rounded-xl bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#3c4043] p-3 text-center shadow-sm"
                >
                  <p class="text-2xl font-normal text-[#202124] dark:text-[#e8eaed]">
                    {{ friends.length }}
                  </p>
                  <p class="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">
                    Connected Friends
                  </p>
                </div>
              </div>

              <!-- Sign Out Button -->
              <div class="mt-5 pt-3 border-t border-[#dadce0] dark:border-[#3c4043]">
                <button
                  @click="$emit('logout')"
                  type="button"
                  class="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#dadce0] dark:border-[#5f6368] text-[#d93025] dark:text-[#f28b82] hover:bg-red-50 dark:hover:bg-red-950/20 py-2.5 px-4 text-xs font-semibold transition cursor-pointer"
                >
                  <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path
                      d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"
                    />
                  </svg>
                  <span>Sign out of bk Keep</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </transition>
</template>
