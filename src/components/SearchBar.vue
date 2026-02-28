<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  searchQuery: String,
  formOpen: Boolean,
  // Receive the filtered list to access the first item
  filteredBookmarks: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["update:searchQuery", "toggle-form"]);

const inputRef = ref(null);

const resultCountLabel = computed(() => {
  const count = props.filteredBookmarks?.length || 0;
  return `${count} result${count === 1 ? "" : "s"}`;
});

defineExpose({
  focus: () => inputRef.value?.focus(),
});

function onInput(e) {
  emit("update:searchQuery", e.target.value);
}

function toggleForm() {
  emit("toggle-form");
}

function onEnter() {
  // Check if we have any results
  if (props.filteredBookmarks && props.filteredBookmarks.length > 0) {
    const firstItem = props.filteredBookmarks[0];
    if (firstItem && firstItem.link) {
      // Open in new tab
      window.open(firstItem.link, "_blank");
      
      // Optional: Clear search after opening
      // emit("update:searchQuery", "");
    }
  }
}
</script>

<template>
  <div
    class="mb-6 mt-[70px] rounded-2xl border border-cyan-100/20 bg-slate-900/60 p-4 shadow-xl shadow-slate-950/30 backdrop-blur-xl lg:mt-0"
  >
    <div class="mb-3 flex items-center justify-between">
      <p class="text-xs font-medium uppercase tracking-wide text-cyan-100/70">
        Search
      </p>
      <p class="text-xs text-cyan-100/70">{{ resultCountLabel }}</p>
    </div>

    <div class="flex flex-col gap-2 sm:flex-row">
      <div class="relative flex-1">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-100/60"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l3.817 3.817a1 1 0 01-1.414 1.414l-3.817-3.817A6 6 0 012 8z"
            clip-rule="evenodd"
          />
        </svg>
        <input
          ref="inputRef"
          :value="searchQuery"
          @input="onInput"
          @keydown.enter="onEnter"
          type="text"
          placeholder="Search bookmarks, folders, or domains"
          class="w-full rounded-xl border border-cyan-100/20 bg-white/10 py-2.5 pl-9 pr-3 text-sm text-white placeholder-cyan-100/45 transition focus:border-cyan-200/40 focus:outline-none focus:ring-2 focus:ring-cyan-200/60"
        />
      </div>

      <button
        @click="toggleForm"
        type="button"
        class="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-200/30 bg-cyan-500/20 px-4 py-2.5 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
            clip-rule="evenodd"
          />
        </svg>
        <span>{{ formOpen ? "Close Form" : "Add Bookmark" }}</span>
      </button>
    </div>
  </div>
</template>
