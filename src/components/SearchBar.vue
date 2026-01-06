<script setup>
import { ref } from "vue";

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
  <div class="bg-white/5 rounded-lg shadow-md p-4 mb-6 mt-[70px] lg:mt-0">
    <div class="flex gap-2">
      <input
        ref="inputRef"
        :value="searchQuery"
        @input="onInput"
        @keydown.enter="onEnter"
        type="text"
        placeholder="Search bookmarks... (Press Enter to open first result)"
        class="flex-1 px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-200 placeholder-gray-200"
      />
      <button
        @click="toggleForm"
        class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition duration-200"
      >
        +
      </button>
    </div>
  </div>
</template>