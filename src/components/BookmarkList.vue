<script setup>
import { ChevronRightIcon } from "@heroicons/vue/24/solid";

const props = defineProps({
  bookmarks: Array,
  groupedBookmarks: Object,
  filteredBookmarks: Array,
  collapsedFolders: Object,
  resultsRef: Object,
});

const emit = defineEmits([
  "edit",
  "delete",
  "toggle-folder",
  "expand-all",
  "collapse-all",
]);

function domain(link) {
  try {
    return new URL(link).hostname.replace("www.", "");
  } catch (e) {
    return link || "";
  }
}

function favicon(link) {
  const d = domain(link);
  return d ? `https://www.google.com/s2/favicons?domain=${d}` : "";
}

function displayFolder(folder) {
  return folder && folder.trim().length > 0 ? folder : "General";
}

function bookmarkCountLabel(count) {
  return `${count} bookmark${count === 1 ? "" : "s"}`;
}
</script>

<template>
  <div ref="resultsRef" class="space-y-5">
    <div
      v-if="bookmarks.length > 0"
      class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p class="text-sm text-cyan-100/80">Saved Collection</p>
        <p class="text-base font-semibold text-white">
          {{ bookmarkCountLabel(bookmarks.length) }}
        </p>
      </div>
      <div class="flex items-center gap-2 self-start sm:self-auto">
        <button
          @click="$emit('expand-all')"
          class="inline-flex items-center gap-2 rounded-xl border border-cyan-200/25 bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-50 transition hover:bg-cyan-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
          title="Expand all folders"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
              clip-rule="evenodd"
            />
          </svg>
          <span>Expand all</span>
        </button>
        <button
          @click="$emit('collapse-all')"
          class="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          title="Collapse all folders"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V4zm8 4a1 1 0 100-2H7a1 1 0 100 2h6zm0 4a1 1 0 100-2H7a1 1 0 100 2h6zm0 4a1 1 0 100-2H7a1 1 0 100 2h6z"
              clip-rule="evenodd"
            />
          </svg>
          <span>Collapse all</span>
        </button>
      </div>
    </div>

    <div
      v-if="bookmarks.length === 0"
      class="rounded-2xl border border-cyan-100/20 bg-slate-900/60 p-10 text-center shadow-xl shadow-slate-950/30 backdrop-blur-xl"
    >
      <p class="text-lg font-semibold text-cyan-50">No bookmarks yet</p>
      <p class="mt-2 text-sm text-cyan-100/70">
        Add your first bookmark from the form above to start building your
        collection.
      </p>
    </div>

    <div
      v-else-if="filteredBookmarks.length === 0"
      class="rounded-2xl border border-cyan-100/20 bg-slate-900/60 p-10 text-center shadow-xl shadow-slate-950/30 backdrop-blur-xl"
    >
      <p class="text-lg font-semibold text-cyan-50">No matches found</p>
      <p class="mt-2 text-sm text-cyan-100/70">
        Try another keyword, URL fragment, or folder name.
      </p>
    </div>

    <div v-else>
      <div
        v-for="(folderBookmarks, folder) in groupedBookmarks"
        :key="folder"
        :data-folder="folder"
        class="mb-4 overflow-hidden rounded-2xl border border-cyan-100/20 bg-slate-900/60 shadow-xl shadow-slate-950/30 backdrop-blur-xl"
      >
        <h3
          class="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-100/10 px-5 py-4 text-cyan-50"
        >
          <span class="flex items-center gap-2">
            <button
              @click="$emit('toggle-folder', folder)"
              class="grid h-8 w-8 place-content-center rounded-lg border border-cyan-100/20 bg-white/5 text-cyan-100 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
              :data-chevron="folder"
              :aria-label="`Toggle ${displayFolder(folder)} folder`"
            >
              <ChevronRightIcon
                :class="collapsedFolders[folder] ? 'rotate-0' : 'rotate-90'"
                class="h-5 w-5 transition-transform duration-300"
              />
            </button>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-cyan-100/90"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M2 5a2 2 0 012-2h3.2a2 2 0 011.6.8l.6.8a2 2 0 001.6.8H16a2 2 0 012 2v6a3 3 0 01-3 3H5a3 3 0 01-3-3V5z"
              />
            </svg>
            <span class="text-lg font-semibold">{{ displayFolder(folder) }}</span>
          </span>
          <span
            class="inline-flex items-center rounded-full border border-cyan-100/20 bg-cyan-500/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-100"
            >{{ folderBookmarks.length }}</span
          >
        </h3>

        <div v-show="!collapsedFolders[folder]" class="p-4">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div
              v-for="bookmark in folderBookmarks"
              :key="bookmark.id"
              class="bookmark-row group flex items-center gap-3 rounded-xl border border-cyan-100/10 bg-gradient-to-br from-white/10 to-white/5 p-3 shadow-md shadow-slate-950/20 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-100/25 hover:shadow-lg hover:shadow-slate-950/35"
            >
              <a
                :href="bookmark.link"
                target="_blank"
                rel="noopener noreferrer"
                class="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
              >
                <img
                  :src="favicon(bookmark.link)"
                  alt="favicon"
                  class="h-5 w-5 flex-shrink-0 rounded-sm ring-1 ring-white/20"
                  loading="lazy"
                />
                <div class="min-w-0">
                  <h4 class="truncate text-sm font-semibold text-white">
                    {{ bookmark.name }}
                  </h4>
                  <p
                    class="truncate text-xs text-cyan-100/70 transition group-hover:text-cyan-100/90"
                  >
                    {{ domain(bookmark.link) || bookmark.link }}
                  </p>
                </div>
              </a>

              <div class="flex items-center gap-1.5">
                <button
                  @click="$emit('edit', bookmark)"
                  aria-label="Edit"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-100/20 bg-white/10 text-cyan-100 transition hover:bg-cyan-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"
                    />
                    <path d="M2 15a1 1 0 011-1h3v2H3a1 1 0 01-1-1z" />
                  </svg>
                </button>

                <button
                  @click="$emit('delete', bookmark.id)"
                  aria-label="Delete"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-300/30 bg-red-500/10 text-red-100 transition hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/70"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M8 9a1 1 0 012 0v6a1 1 0 11-2 0V9zm4 0a1 1 0 10-2 0v6a1 1 0 102 0V9z"
                      clip-rule="evenodd"
                    />
                    <path
                      d="M6 2a1 1 0 00-1 1v1h10V3a1 1 0 00-1-1H6zM4 6h12l-1 10a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
