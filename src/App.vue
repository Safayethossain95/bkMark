<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const currentPath = computed(() => route.path);
</script>

<template>
  <div class="relative min-h-screen">
    <!-- Main Route View -->
    <router-view />

    <!-- Floating Version Switcher Pill -->
    <aside
      class="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-950/85 p-1.5 text-xs text-white shadow-2xl shadow-slate-950/90 backdrop-blur-2xl transition hover:scale-[1.02]"
    >
      <button
        @click="router.push('/')"
        type="button"
        :class="
          currentPath === '/' || currentPath === ''
            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-white shadow-md shadow-cyan-500/25'
            : 'text-cyan-100/60 hover:text-white hover:bg-white/5'
        "
        class="rounded-full px-3.5 py-1.5 transition-all duration-200 flex items-center gap-1.5"
      >
        <span class="text-[11px]">✦</span>
        <span>Revamped (Pro)</span>
      </button>

      <button
        @click="router.push('/version2')"
        type="button"
        :class="
          currentPath === '/version2'
            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-white shadow-md shadow-cyan-500/25'
            : 'text-cyan-100/60 hover:text-white hover:bg-white/5'
        "
        class="rounded-full px-3.5 py-1.5 transition-all duration-200 flex items-center gap-1.5"
      >
        <span>Classic v2</span>
      </button>

      <button
        @click="router.push('/google')"
        type="button"
        :class="
          currentPath === '/google'
            ? 'bg-[#fbbc04] font-bold text-slate-950 shadow-md shadow-amber-500/35'
            : 'text-cyan-100/60 hover:text-white hover:bg-white/5'
        "
        class="rounded-full px-3.5 py-1.5 transition-all duration-200 flex items-center gap-1.5"
      >
        <svg class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6A5.006 5.006 0 0 1 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z"/>
        </svg>
        <span>Google</span>
      </button>
    </aside>
  </div>
</template>
