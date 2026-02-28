<script setup>
import { computed, ref } from "vue";

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

const panelTitle = computed(() =>
  props.editingId ? "Edit Bookmark" : "Add Bookmark"
);

const submitLabel = computed(() =>
  props.editingId ? "Save Changes" : "Add Bookmark"
);

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

function closeForm() {
  emit("close-form");
}

function cancel() {
  emit("clear-form");
  emit("close-form");
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 -translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-1"
  >
    <section
      v-show="formVisible"
      ref="formEl"
      class="mb-6 overflow-hidden rounded-2xl border border-cyan-100/20 bg-slate-900/60 shadow-xl shadow-slate-950/30 backdrop-blur-xl"
    >
      <header
        class="flex items-start justify-between gap-3 border-b border-cyan-100/10 px-5 py-4"
      >
        <div>
          <p class="text-xs font-medium uppercase tracking-wide text-cyan-100/70">
            Quick Capture
          </p>
          <h2 class="mt-1 text-lg font-semibold text-white">{{ panelTitle }}</h2>
          <p class="mt-1 text-sm text-cyan-100/70">
            Save links without leaving your current view.
          </p>
        </div>
        <button
          @click="closeForm"
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-100/20 bg-white/10 text-cyan-100 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
          aria-label="Close form"
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

      <form @submit.prevent="onSubmit" class="space-y-4 p-5">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-cyan-100/70">
              Folder
            </span>
            <input
              :value="folderName"
              @input="updateFolder"
              type="text"
              placeholder="General"
              class="w-full rounded-xl border border-cyan-100/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-cyan-100/40 transition focus:border-cyan-200/40 focus:outline-none focus:ring-2 focus:ring-cyan-200/60"
            />
          </label>

          <label class="block">
            <span class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-cyan-100/70">
              Link Name
            </span>
            <input
              :value="urlName"
              @input="updateUrlName"
              type="text"
              placeholder="Design Inspiration"
              class="w-full rounded-xl border border-cyan-100/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-cyan-100/40 transition focus:border-cyan-200/40 focus:outline-none focus:ring-2 focus:ring-cyan-200/60"
              required
            />
          </label>

          <label class="block md:col-span-2">
            <span class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-cyan-100/70">
              URL
            </span>
            <div class="flex items-center gap-3">
              <input
                :value="link"
                @input="updateLink"
                type="url"
                placeholder="https://example.com"
                class="w-full rounded-xl border border-cyan-100/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-cyan-100/40 transition focus:border-cyan-200/40 focus:outline-none focus:ring-2 focus:ring-cyan-200/60"
                required
              />
              <div
                class="grid h-10 w-10 place-content-center rounded-lg border border-cyan-100/20 bg-white/10"
              >
                <img
                  v-if="link"
                  :src="faviconUrl(link)"
                  alt="Site icon"
                  class="h-5 w-5 rounded-sm"
                  loading="lazy"
                />
                <svg
                  v-else
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4 text-cyan-100/60"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fill-rule="evenodd"
                    d="M12.586 2H7.414A2 2 0 006 2.586L2.586 6A2 2 0 002 7.414v5.172a2 2 0 00.586 1.414L6 17.414A2 2 0 007.414 18h5.172A2 2 0 0014 17.414L17.414 14A2 2 0 0018 12.586V7.414A2 2 0 0017.414 6L14 2.586A2 2 0 0012.586 2zM10 6a1 1 0 100 2 1 1 0 000-2zm0 6a1 1 0 100 2 1 1 0 000-2zm4-3a1 1 0 10-2 0 1 1 0 002 0zm-8 0a1 1 0 102 0 1 1 0 00-2 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </label>
        </div>

        <div
          class="flex flex-col-reverse gap-2 border-t border-cyan-100/10 pt-4 sm:flex-row sm:items-center sm:justify-end"
        >
          <button
            type="button"
            @click="cancel"
            class="inline-flex items-center justify-center rounded-xl border border-cyan-100/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-cyan-50 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-200/30 bg-cyan-500/20 px-4 py-2.5 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                d="M2 10a8 8 0 1116 0A8 8 0 012 10zm9-3a1 1 0 10-2 0v3H6a1 1 0 100 2h3v3a1 1 0 102 0v-3h3a1 1 0 100-2h-3V7z"
              />
            </svg>
            <span>{{ submitLabel }}</span>
          </button>
        </div>
      </form>
    </section>
  </Transition>
</template>
