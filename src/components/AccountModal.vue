<script setup>
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

function updateFriendEmail(e) {
  emit("update:friendEmail", e.target.value);
}

function updateShareEmail(e) {
  emit("update:shareEmail", e.target.value);
}

function updateBookmark(e) {
  emit("update:selectedBookmarkId", e.target.value);
}

function selectFriendEmail(email) {
  emit("update:shareEmail", email || "");
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm"
    @click.self="$emit('close')"
  >
    <section
      class="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-cyan-100/20 bg-slate-900/70 text-cyan-50 shadow-2xl shadow-slate-950/60 backdrop-blur-xl"
    >
      <header
        class="flex items-center justify-between border-b border-cyan-100/10 px-5 py-4"
      >
        <div>
          <p class="text-xs uppercase tracking-wide text-cyan-100/70">Account</p>
          <h2 class="mt-1 text-lg font-semibold text-white">User Hub</h2>
        </div>
        <button
          @click="$emit('close')"
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-100/20 bg-white/10 text-cyan-100 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
          aria-label="Close account modal"
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

      <div class="max-h-[calc(85vh-73px)] overflow-y-auto p-5">
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <article
            class="rounded-2xl border border-cyan-100/15 bg-white/5 p-4"
          >
            <p class="text-xs uppercase tracking-wide text-cyan-100/70">Profile</p>
            <p class="mt-2 truncate text-base font-semibold text-white">
              {{ authUser?.email }}
            </p>
            <p class="mt-1 text-sm text-cyan-100/70">
              {{ bookmarks.length }} bookmark{{ bookmarks.length === 1 ? "" : "s" }}
            </p>
            <button
              @click="$emit('logout')"
              type="button"
              class="mt-4 inline-flex items-center justify-center rounded-xl border border-red-300/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-100 transition hover:bg-red-500/20"
            >
              Logout
            </button>
          </article>

          <article
            class="rounded-2xl border border-cyan-100/15 bg-white/5 p-4"
          >
            <p class="text-xs uppercase tracking-wide text-cyan-100/70">Add Friend</p>
            <div class="mt-2 flex gap-2">
              <input
                :value="friendEmail"
                @input="updateFriendEmail"
                type="email"
                placeholder="friend@email.com"
                class="w-full rounded-xl border border-cyan-100/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-cyan-100/45 focus:border-cyan-200/40 focus:outline-none focus:ring-2 focus:ring-cyan-200/60"
              />
              <button
                @click="$emit('add-friend')"
                type="button"
                class="rounded-xl border border-cyan-200/30 bg-cyan-500/20 px-3 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-500/30"
              >
                Add
              </button>
            </div>
            <p class="mt-2 text-xs text-cyan-100/65">
              Add by email to quickly share bookmarks.
            </p>
          </article>
        </div>

        <article
          class="mt-4 rounded-2xl border border-cyan-100/15 bg-white/5 p-4"
        >
          <div class="mb-2 flex items-center justify-between">
            <p class="text-xs uppercase tracking-wide text-cyan-100/70">
              Pending Requests
            </p>
            <span class="text-xs text-cyan-100/60">{{ friendRequests.length }}</span>
          </div>

          <div
            v-if="requestsLoading"
            class="rounded-xl border border-cyan-100/10 bg-white/5 px-3 py-4 text-sm text-cyan-100/75"
          >
            Loading requests...
          </div>

          <div
            v-else-if="friendRequests.length === 0"
            class="rounded-xl border border-cyan-100/10 bg-white/5 px-3 py-4 text-sm text-cyan-100/70"
          >
            No pending requests.
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="request in friendRequests"
              :key="request.fromUid"
              class="flex items-center justify-between gap-3 rounded-xl border border-cyan-100/10 bg-white/5 px-3 py-2"
            >
              <div class="min-w-0 flex-1 truncate text-sm text-white">
                {{ request.fromEmail }}
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="$emit('approve-request', request)"
                  type="button"
                  class="rounded-lg border border-emerald-300/30 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-100 transition hover:bg-emerald-500/25"
                >
                  Approve
                </button>
                <button
                  @click="$emit('delete-request', request)"
                  type="button"
                  class="rounded-lg border border-red-300/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-100 transition hover:bg-red-500/20"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </article>

        <article
          class="mt-4 rounded-2xl border border-cyan-100/15 bg-white/5 p-4"
        >
          <div class="mb-2 flex items-center justify-between">
            <p class="text-xs uppercase tracking-wide text-cyan-100/70">Friends</p>
            <span class="text-xs text-cyan-100/60">{{ friends.length }}</span>
          </div>

          <div
            v-if="friendsLoading"
            class="rounded-xl border border-cyan-100/10 bg-white/5 px-3 py-4 text-sm text-cyan-100/75"
          >
            Loading friends...
          </div>

          <div
            v-else-if="friends.length === 0"
            class="rounded-xl border border-cyan-100/10 bg-white/5 px-3 py-4 text-sm text-cyan-100/70"
          >
            No friends yet.
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="friend in friends"
              :key="friend.uid"
              class="flex items-center justify-between gap-3 rounded-xl border border-cyan-100/10 bg-white/5 px-3 py-2"
            >
              <button
                @click="selectFriendEmail(friend.email)"
                class="min-w-0 flex-1 truncate text-left text-sm text-white hover:text-cyan-100"
                :title="`Use ${friend.email} for sharing`"
              >
                {{ friend.email }}
              </button>
              <button
                @click="$emit('remove-friend', friend.uid)"
                type="button"
                class="rounded-lg border border-red-300/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-100 transition hover:bg-red-500/20"
              >
                Remove
              </button>
            </div>
          </div>
        </article>

        <article
          class="mt-4 rounded-2xl border border-cyan-100/15 bg-white/5 p-4"
        >
          <p class="text-xs uppercase tracking-wide text-cyan-100/70">
            Share Bookmark
          </p>
          <div class="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
            <select
              :value="selectedBookmarkId ?? ''"
              @change="updateBookmark"
              class="rounded-xl border border-cyan-100/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-cyan-200/40 focus:outline-none focus:ring-2 focus:ring-cyan-200/60"
            >
              <option disabled value="">Select a bookmark</option>
              <option
                v-for="bookmark in bookmarks"
                :key="bookmark.id"
                :value="bookmark.id"
              >
                {{ bookmark.name }} - {{ bookmark.folderName || "General" }}
              </option>
            </select>

            <input
              :value="shareEmail"
              @input="updateShareEmail"
              type="email"
              placeholder="recipient@email.com"
              class="rounded-xl border border-cyan-100/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-cyan-100/45 focus:border-cyan-200/40 focus:outline-none focus:ring-2 focus:ring-cyan-200/60"
            />
          </div>

          <button
            @click="$emit('share-bookmark')"
            type="button"
            class="mt-3 rounded-xl border border-cyan-200/30 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-500/30"
          >
            Share
          </button>

          <p v-if="actionError" class="mt-3 text-sm text-red-300">
            {{ actionError }}
          </p>
          <p v-else-if="actionSuccess" class="mt-3 text-sm text-emerald-300">
            {{ actionSuccess }}
          </p>
        </article>
      </div>
    </section>
  </div>
</template>
