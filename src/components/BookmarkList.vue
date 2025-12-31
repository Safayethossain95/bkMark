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
</script>

<template>
  <div ref="resultsRef" class="space-y-4">
    <div
      v-if="bookmarks.length > 0"
      class="flex items-center justify-between mb-4"
    >
      <span class="text-sm text-gray-300"
        >{{ bookmarks.length }} bookmark{{
          bookmarks.length !== 1 ? "s" : ""
        }}</span
      >
      <div class="flex items-center gap-2">
        <button
          @click="$emit('expand-all')"
          class="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 transition"
          title="Expand all folders"
        >
          <!-- icon omitted for brevity -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-5 h-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
        <button
          @click="$emit('collapse-all')"
          class="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 transition"
          title="Collapse all folders"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-5 h-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V4zm8 4a1 1 0 100-2H7a1 1 0 100 2h6zm0 4a1 1 0 100-2H7a1 1 0 100 2h6zm0 4a1 1 0 100-2H7a1 1 0 100 2h6z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>

    <div
      v-if="bookmarks.length === 0"
      class="bg-white/20 backdrop-blur-md rounded-lg shadow-lg border border-white/30 p-8 text-center"
    >
      <p class="text-gray-500 text-lg">
        No bookmarks yet. Add your first bookmark above!
      </p>
    </div>

    <div
      v-else-if="filteredBookmarks.length === 0"
      class="bg-white/20 backdrop-blur-md rounded-lg shadow-lg border border-white/30 p-8 text-center"
    >
      <p class="text-gray-500 text-lg">No bookmarks match your search.</p>
    </div>

    <div v-else>
      <div
        v-for="(folderBookmarks, folder) in groupedBookmarks"
        :key="folder"
        :data-folder="folder"
        class="bg-white/20 backdrop-blur-md rounded-lg shadow-lg border border-white/30 p-6 mb-4"
      >
        <h3
          class="flex items-center justify-between text-xl font-semibold text-gray-100 mb-4 border-b pb-2"
        >
          <span class="flex items-center gap-2">
            <button
              @click="$emit('toggle-folder', folder)"
              class="text-lg hover:opacity-70 transition"
              :data-chevron="folder"
            >
              <ChevronRightIcon
                :class="collapsedFolders[folder] ? 'rotate-0' : 'rotate-90'"
                class="w-5 h-5 transition-transform duration-300"
              />
            </button>
            <span class="text-lg">📁</span>
            <span>{{ folder && folder.length > 0 ? folder : "General" }}</span>
          </span>
          <span
            class="inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium bg-white/5 text-gray-200"
            >{{ folderBookmarks.length }}</span
          >
        </h3>

        <div v-show="!collapsedFolders[folder]" class="space-y-3">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              v-for="bookmark in folderBookmarks"
              :key="bookmark.id"
              class="bookmark-row flex items-center justify-between gap-4 p-3 bg-white/6 backdrop-blur-sm rounded-lg border border-white/10 hover:shadow-lg hover:scale-[1.01] transition-transform duration-150 will-change-transform"
            >
              <a
                :href="bookmark.link"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
              >
                <img
                  :src="favicon(bookmark.link)"
                  alt="favicon"
                  class="w-5 h-5 rounded-sm flex-shrink-0"
                />
                <div class="min-w-0">
                  <h4 class="font-medium text-gray-100 truncate">
                    {{ bookmark.name }}
                  </h4>
                  <p
                    class="text-gray-300 hover:text-gray-100 text-sm break-all truncate"
                  >
                    {{ domain(bookmark.link) || bookmark.link }}
                  </p>
                </div>
              </a>

              <div class="flex items-center gap-2">
                <button
                  @click="$emit('edit', bookmark)"
                  aria-label="Edit"
                  class="w-9 h-9 flex items-center justify-center bg-white/5 border border-white/10 text-gray-200 rounded-full hover:bg-white/10 transition duration-150"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-4 h-4"
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
                  class="w-9 h-9 flex items-center justify-center bg-white/5 border border-white/10 text-gray-200 rounded-full hover:bg-white/10 transition duration-150"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-4 h-4"
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
