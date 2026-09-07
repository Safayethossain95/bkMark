<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const isRevampedRoute = computed(() => route.path === "/" || route.path === "");

function toggleVersion() {
  if (isRevampedRoute.value) {
    router.push("/version2");
  } else {
    router.push("/");
  }
}
</script>

<template>
  <div class="relative min-h-screen">
    <!-- Main Route View -->
    <router-view />

    <!-- Floating Version Switcher Pill -->
    <aside
      class="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-slate-950/80 p-1.5 text-xs text-white shadow-2xl shadow-slate-950/90 backdrop-blur-2xl transition hover:scale-105"
    >
      <button
        @click="router.push('/')"
        type="button"
        :class="
          isRevampedRoute
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
          !isRevampedRoute
            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-white shadow-md shadow-cyan-500/25'
            : 'text-cyan-100/60 hover:text-white hover:bg-white/5'
        "
        class="rounded-full px-3.5 py-1.5 transition-all duration-200 flex items-center gap-1.5"
      >
        <span>Classic v2</span>
      </button>
    </aside>
  </div>
</template>
