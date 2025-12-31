<script setup>
import { ref } from "vue";

const props = defineProps({
  formVisible: Boolean,
  folderName: String,
  urlName: String,
  link: String,
  editingId: [String, Number, null],
  faviconUrl: Function,
});

const emit = defineEmits([
  "update:folderName",
  "update:urlName",
  "update:link",
  "add-bookmark",
  "clear-form",
  "close-form",
]);

const formEl = ref(null);
defineExpose({ formEl });

function onSubmit(e) {
  e.preventDefault();
  emit("add-bookmark");
}

function updateFolder(e) {
  emit("update:folderName", e.target.value);
}
function updateUrlName(e) {
  emit("update:urlName", e.target.value);
}
function updateLink(e) {
  emit("update:link", e.target.value);
}
</script>

<template>
  <div
    v-show="formVisible"
    ref="formEl"
    class="bg-white/10 backdrop-blur-md rounded-lg shadow-lg border border-white/20 p-6 mb-6"
  >
    <h2
      class="flex items-center justify-between text-lg font-semibold text-gray-100 mb-4"
    >
      <span>{{ editingId ? "Edit Bookmark" : "Add New Bookmark" }}</span>
      <button
        @click="$emit('close-form')"
        class="text-gray-400 hover:text-gray-200"
      >
        ✕
      </button>
    </h2>

    <form @submit.prevent="onSubmit" class="space-y-4">
      <div class="grid grid-cols-1 gap-3 items-center">
        <input
          :value="folderName"
          @input="updateFolder"
          type="text"
          placeholder="Folder Name"
          class="md:col-span-2 w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-200 placeholder-gray-100"
        />
      </div>

      <div class="grid grid-cols-1 gap-3 items-center">
        <input
          :value="urlName"
          @input="updateUrlName"
          type="text"
          placeholder="Link Name"
          class="md:col-span-2 w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-200 placeholder-gray-100"
        />
      </div>

      <div class="grid grid-cols-1 gap-3 items-start">
        <div class="md:col-span-2 flex items-center gap-3">
          <input
            :value="link"
            @input="updateLink"
            type="url"
            placeholder="e.g. https://example.com"
            class="flex-1 px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-200 placeholder-gray-100"
          />
          <img
            v-if="link"
            :src="faviconUrl(link)"
            alt="favicon"
            class="w-8 h-8 rounded-sm"
          />
        </div>
      </div>

      <div class="flex gap-3 justify-end">
        <button
          type="submit"
          class="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-lg shadow-md hover:brightness-105 transition duration-150"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-4 h-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              d="M2 10a8 8 0 1116 0A8 8 0 012 10zm9-3a1 1 0 10-2 0v3H6a1 1 0 100 2h3v3a1 1 0 102 0v-3h3a1 1 0 100-2h-3V7z"
            />
          </svg>
          <span>{{ editingId ? "Update" : "Add" }}</span>
        </button>

        <button
          type="button"
          @click="
            $emit('clear-form');
            $emit('close-form');
          "
          class="px-4 py-2 border border-white/10 text-gray-300 rounded-lg hover:bg-white/5 transition duration-150"
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
</template>
