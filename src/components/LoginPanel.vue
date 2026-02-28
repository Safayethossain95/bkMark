<script setup>
const props = defineProps({
  authMode: String,
  authEmail: String,
  authPassword: String,
  authError: String,
});

const emit = defineEmits([
  "update:authMode",
  "update:authEmail",
  "update:authPassword",
  "login",
  "signup",
  "google-login",
]);

function setMode(mode) {
  emit("update:authMode", mode);
}

function updateEmail(e) {
  emit("update:authEmail", e.target.value);
}

function updatePassword(e) {
  emit("update:authPassword", e.target.value);
}
</script>

<template>
  <div
    class="w-full max-w-md rounded-2xl border border-cyan-100/20 bg-slate-900/60 p-6 text-cyan-50 shadow-xl shadow-slate-950/30 backdrop-blur-xl"
  >
    <h2 class="text-2xl font-semibold text-white">Welcome back</h2>
    <p class="mt-1 text-sm text-cyan-100/75">
      Sign in to sync and manage your bookmark collection.
    </p>

    <div class="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-white/5 p-1">
      <button
        @click="setMode('login')"
        type="button"
        :class="authMode === 'login' ? 'bg-white/15 text-white' : 'text-cyan-100/75'"
        class="rounded-lg px-3 py-2 text-sm font-medium transition"
      >
        Login
      </button>
      <button
        @click="setMode('signup')"
        type="button"
        :class="authMode === 'signup' ? 'bg-white/15 text-white' : 'text-cyan-100/75'"
        class="rounded-lg px-3 py-2 text-sm font-medium transition"
      >
        Sign up
      </button>
    </div>

    <div class="mt-4 space-y-3">
      <input
        :value="authEmail"
        @input="updateEmail"
        type="email"
        placeholder="Email"
        class="w-full rounded-xl border border-cyan-100/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-cyan-100/40 focus:border-cyan-200/40 focus:outline-none focus:ring-2 focus:ring-cyan-200/60"
      />
      <input
        :value="authPassword"
        @input="updatePassword"
        type="password"
        placeholder="Password"
        class="w-full rounded-xl border border-cyan-100/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-cyan-100/40 focus:border-cyan-200/40 focus:outline-none focus:ring-2 focus:ring-cyan-200/60"
      />

      <div v-if="authError" class="text-sm text-red-300">
        {{ authError }}
      </div>

      <button
        v-if="authMode === 'login'"
        @click="$emit('login')"
        type="button"
        class="w-full rounded-xl border border-cyan-200/30 bg-cyan-500/20 px-4 py-2.5 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-500/30"
      >
        Login with Email
      </button>
      <button
        v-else
        @click="$emit('signup')"
        type="button"
        class="w-full rounded-xl border border-emerald-200/30 bg-emerald-500/20 px-4 py-2.5 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-500/30"
      >
        Create Account
      </button>
    </div>

    <div class="my-4 flex items-center gap-3">
      <div class="h-px flex-1 bg-cyan-100/20"></div>
      <span class="text-xs uppercase tracking-wide text-cyan-100/60">or</span>
      <div class="h-px flex-1 bg-cyan-100/20"></div>
    </div>

    <button
      @click="$emit('google-login')"
      type="button"
      class="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="h-4 w-4">
        <path
          fill="#FFC107"
          d="M43.611,20.083H42V20H24v8h11.303C33.653,32.657,29.199,36,24,36c-6.627,0-12-5.373-12-12
          c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24
          c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
        />
        <path
          fill="#FF3D00"
          d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657
          C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
        />
        <path
          fill="#4CAF50"
          d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.143,35.091,26.715,36,24,36
          c-5.181,0-9.624-3.322-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
        />
        <path
          fill="#1976D2"
          d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.094,5.571c0.001-0.001,6.19,5.238,6.19,5.238
          C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
        />
      </svg>
      <span>Continue with Google</span>
    </button>
  </div>
</template>
