<script setup>
const props = defineProps({
  authUser: Object,
  themeDropdown: Boolean,
  themes: Array,
  selectedTheme: Object,
  accountDropdown: Boolean,
  previewStyle: Function,
});

const emit = defineEmits([
  "update:themeDropdown",
  "update:accountDropdown",
  "logout",
  "select-theme",
]);

function toggleAccount() {
  emit("update:accountDropdown", !props.accountDropdown);
  emit("update:themeDropdown", false);
}

function toggleTheme() {
  emit("update:themeDropdown", !props.themeDropdown);
  emit("update:accountDropdown", false);
}

function isSelectedTheme(theme) {
  return props.selectedTheme?.name === theme.name;
}
</script>

<template>
  <div>
    <div
      class="absolute top-6 mr-3"
      :class="authUser ? 'right-16' : 'right-6'"
    >
      <div class="relative">
        <button
          @click="toggleTheme"
          class="group inline-flex h-11 w-11 items-center justify-center rounded-full border border-cyan-100/20 bg-slate-900/60 text-cyan-50 shadow-lg shadow-slate-950/30 backdrop-blur-xl transition hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70"
          aria-label="Themes"
        >
          <div
            :style="previewStyle(selectedTheme)"
            class="h-7 w-7 rounded-full border border-white/30 object-cover transition group-hover:scale-105"
          ></div>
        </button>

        <div
          v-show="themeDropdown"
          class="absolute right-0 z-[9999] mt-2 w-72 rounded-2xl border border-cyan-100/20 bg-slate-900/70 p-3 text-cyan-50 shadow-xl shadow-slate-950/40 backdrop-blur-xl"
        >
          <div class="mb-2 px-1">
            <p class="text-xs font-medium uppercase tracking-wide text-cyan-100/70">
              Color Theme
            </p>
          </div>

          <div
            v-for="theme in themes"
            :key="theme.name"
            class="mb-1 flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 transition"
            :class="
              isSelectedTheme(theme)
                ? 'border-cyan-200/40 bg-cyan-500/15'
                : 'border-transparent hover:border-cyan-100/20 hover:bg-white/5'
            "
            @click="$emit('select-theme', theme)"
          >
            <div
              :style="previewStyle(theme)"
              class="h-9 w-9 rounded-lg border border-white/25 object-cover"
            ></div>
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-medium text-white">{{ theme.name }}</div>
              <div class="text-xs text-cyan-100/65">
                {{ theme.type === "image" ? "Photo background" : "Gradient palette" }}
              </div>
            </div>
            <svg
              v-if="isSelectedTheme(theme)"
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 text-cyan-100"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.75-3.75a1 1 0 011.414-1.414l3.043 3.043 6.543-6.543a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <div class="absolute top-11 left-8">
      <img src="/images/logo.png" class="h-[20px]" alt="" />
    </div>

    <div v-if="authUser" class="absolute top-6 right-6 z-50">
      <div class="relative">
        <button
          @click="toggleAccount"
          class="w-11 h-11 rounded-full bg-white/6 border border-white/10 flex items-center justify-center text-gray-200 hover:bg-white/10 transition"
          aria-label="Account"
        >
          <span class="text-sm">{{ authUser.email?.charAt(0).toUpperCase() }}</span>
        </button>

        <div
          v-show="accountDropdown"
          class="mt-2 w-64 bg-white/6 backdrop-blur-md border border-white/10 rounded-lg p-4 text-gray-200 shadow-lg right-0 absolute"
        >
          <div class="text-sm mb-3">Signed in as</div>
          <div class="font-medium truncate mb-3">{{ authUser.email }}</div>
          <button
            @click="$emit('logout')"
            class="w-full px-3 py-2 bg-white/5 rounded-lg text-gray-200 hover:bg-white/10"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
