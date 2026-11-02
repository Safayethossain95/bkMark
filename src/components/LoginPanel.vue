<script setup>
import { ref, computed } from "vue";

const props = defineProps({
  authMode: {
    type: String,
    default: "login",
  },
  authEmail: {
    type: String,
    default: "",
  },
  authPassword: {
    type: String,
    default: "",
  },
  authError: {
    type: String,
    default: "",
  },
  isDark: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "update:authMode",
  "update:authEmail",
  "update:authPassword",
  "login",
  "signup",
  "google-login",
]);

const showPassword = ref(false);

function setMode(mode) {
  emit("update:authMode", mode);
}

function updateEmail(e) {
  emit("update:authEmail", e.target.value);
}

function updatePassword(e) {
  emit("update:authPassword", e.target.value);
}

function handleSubmit() {
  if (props.authMode === "signup") {
    emit("signup");
  } else {
    emit("login");
  }
}

const formattedError = computed(() => {
  if (!props.authError) return "";
  const err = props.authError;
  if (
    err.includes("auth/invalid-credential") ||
    err.includes("auth/wrong-password") ||
    err.includes("auth/user-not-found")
  ) {
    return "Invalid email or password. Please check your credentials and try again.";
  }
  if (err.includes("auth/email-already-in-use")) {
    return "This email is already in use. Please sign in instead.";
  }
  if (err.includes("auth/weak-password")) {
    return "Password should be at least 6 characters.";
  }
  if (err.includes("auth/invalid-email")) {
    return "Please enter a valid email address.";
  }
  if (err.includes("auth/popup-closed-by-user")) {
    return "Sign-in was cancelled. Popup closed before completing.";
  }
  if (err.includes("auth/network-request-failed")) {
    return "Network error. Please check your internet connection.";
  }
  return err.replace(/^Firebase:\s*/i, "").replace(/^Error\s*\([^)]*\):\s*/i, "").trim();
});
</script>

<template>
  <div
    class="w-full max-w-[440px] rounded-[28px] border bg-white dark:bg-[#202124] border-[#dadce0] dark:border-[#3c4043] p-7 sm:p-9 shadow-[0_1px_3px_0_rgba(60,64,67,0.1),0_4px_8px_3px_rgba(60,64,67,0.05)] dark:shadow-2xl transition-colors duration-150 font-google"
  >
    <!-- bk Keep Icon & Brand Header -->
    <div class="flex flex-col items-center text-center mb-6">
      <div
        class="h-12 w-12 rounded-full bg-[#feefc3] dark:bg-[#4a3b1a] flex items-center justify-center mb-3 shadow-inner ring-1 ring-amber-400/20"
      >
        <svg class="h-7 w-7" viewBox="0 0 48 48">
          <path
            fill="#FFBB00"
            d="M24,4C14.06,4,6,12.06,6,22c0,6.07,3.03,11.44,7.67,14.68C14.49,37.26,15,38.16,15,39.12V40c0,1.1,0.9,2,2,2h14 c1.1,0,2-0.9,2-2v-0.88c0-0.96,0.51-1.86,1.33-2.44C38.97,33.44,42,28.07,42,22C42,12.06,33.94,4,24,4z"
          />
          <path fill="#E65100" d="M19,41h10v2c0,0.55-0.45,1-1,1h-8c-0.55,0-1-0.45-1-1V41z" />
          <path
            fill="#FFE082"
            d="M24,7c7.72,0,14,6.28,14,14c0,4.72-2.35,8.89-5.96,11.4C30.82,33.25,30,34.61,30,36.05V37h-3v-7 c0-0.55-0.45-1-1-1s-1,0.45-1,1v7h-2v-7c0-0.55-0.45-1-1-1s-1,0.45-1,1v7h-3v-0.95c0-1.44-0.82-2.8-2.04-3.65 C12.35,29.89,10,25.72,10,21C10,13.28,16.28,7,24,7z"
          />
        </svg>
      </div>

      <div class="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-amber-600 dark:text-amber-400 mb-1">
        <span>bk Keep</span>
        <span>•</span>
        <span>bookmarks</span>
      </div>

      <h1 class="text-2xl font-normal text-[#202124] dark:text-[#e8eaed] tracking-tight">
        {{ authMode === "signup" ? "Create an account" : "Sign in" }}
      </h1>
      <p class="mt-1 text-sm text-[#5f6368] dark:text-[#9aa0a6]">
        {{
          authMode === "signup"
            ? "to save and organize bookmarks with bk Keep"
            : "to continue to bk Keep Bookmarks"
        }}
      </p>
    </div>

    <!-- Segmented Control (Sign In / Sign Up) -->
    <div
      class="p-1 rounded-full bg-[#f1f3f4] dark:bg-[#303134] border border-[#dadce0] dark:border-[#3c4043] flex gap-1 mb-5 text-sm font-medium"
    >
      <button
        type="button"
        @click="setMode('login')"
        :class="
          authMode === 'login'
            ? 'bg-white dark:bg-[#202124] text-[#1a73e8] dark:text-[#8ab4f8] shadow-sm font-medium'
            : 'text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-[#e8eaed]'
        "
        class="flex-1 py-1.5 rounded-full transition-all duration-150 flex items-center justify-center gap-1.5 text-xs sm:text-sm cursor-pointer"
      >
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-4.43-.82-6.14-2.88C7.55 15.8 9.68 15 12 15s4.45.8 6.14 2.12C16.43 19.18 14.03 20 12 20z"
          />
        </svg>
        <span>Sign in</span>
      </button>
      <button
        type="button"
        @click="setMode('signup')"
        :class="
          authMode === 'signup'
            ? 'bg-white dark:bg-[#202124] text-[#1a73e8] dark:text-[#8ab4f8] shadow-sm font-medium'
            : 'text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-[#e8eaed]'
        "
        class="flex-1 py-1.5 rounded-full transition-all duration-150 flex items-center justify-center gap-1.5 text-xs sm:text-sm cursor-pointer"
      >
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
          />
        </svg>
        <span>Create account</span>
      </button>
    </div>

    <!-- Official Google SSO Button -->
    <button
      @click="$emit('google-login')"
      type="button"
      class="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-full border border-[#dadce0] dark:border-[#5f6368] bg-white dark:bg-[#303134] hover:bg-[#f8f9fa] dark:hover:bg-[#3c4043] active:bg-[#f1f3f4] text-[#3c4043] dark:text-[#e8eaed] text-sm font-medium transition-all shadow-sm hover:shadow cursor-pointer"
    >
      <svg class="h-4 w-4 flex-shrink-0" viewBox="0 0 48 48">
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.79l7.97-6.2z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </svg>
      <span>Continue with Google</span>
    </button>

    <!-- Google Divider -->
    <div class="my-5 flex items-center gap-3">
      <div class="h-px flex-1 bg-[#dadce0] dark:bg-[#3c4043]"></div>
      <span class="text-xs uppercase tracking-wider text-[#5f6368] dark:text-[#9aa0a6] font-medium"
        >or with email</span
      >
      <div class="h-px flex-1 bg-[#dadce0] dark:bg-[#3c4043]"></div>
    </div>

    <!-- Email & Password Form -->
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Email Field -->
      <div class="space-y-1.5">
        <label class="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6]">
          Email address
        </label>
        <div class="relative">
          <input
            :value="authEmail"
            @input="updateEmail"
            type="email"
            required
            autocomplete="email"
            placeholder="name@example.com"
            class="w-full rounded-lg border border-[#dadce0] dark:border-[#5f6368] bg-transparent px-3.5 py-2.5 text-sm text-[#202124] dark:text-[#e8eaed] placeholder-[#9aa0a6] dark:placeholder-[#5f6368] transition hover:border-[#202124] dark:hover:border-[#dadce0] focus:border-[#1a73e8] dark:focus:border-[#8ab4f8] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] dark:focus:ring-[#8ab4f8]"
          />
        </div>
      </div>

      <!-- Password Field -->
      <div class="space-y-1.5">
        <div class="flex items-center justify-between">
          <label class="block text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6]">
            Password
          </label>
          <span v-if="authMode === 'signup'" class="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">
            Min 6 characters
          </span>
        </div>
        <div class="relative">
          <input
            :value="authPassword"
            @input="updatePassword"
            :type="showPassword ? 'text' : 'password'"
            required
            :autocomplete="authMode === 'signup' ? 'new-password' : 'current-password'"
            placeholder="Enter password"
            class="w-full rounded-lg border border-[#dadce0] dark:border-[#5f6368] bg-transparent px-3.5 py-2.5 pr-10 text-sm text-[#202124] dark:text-[#e8eaed] placeholder-[#9aa0a6] dark:placeholder-[#5f6368] transition hover:border-[#202124] dark:hover:border-[#dadce0] focus:border-[#1a73e8] dark:focus:border-[#8ab4f8] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] dark:focus:ring-[#8ab4f8]"
          />
          <button
            type="button"
            @click="showPassword = !showPassword"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-[#e8eaed] rounded transition cursor-pointer"
            :title="showPassword ? 'Hide password' : 'Show password'"
          >
            <svg v-if="showPassword" class="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path
                d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"
              />
            </svg>
            <svg v-else class="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path
                d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Google Material Red Error Alert -->
      <div
        v-if="formattedError"
        class="flex items-start gap-2.5 p-3 rounded-lg bg-[#fce8e6] dark:bg-[#4a2422]/70 border border-[#f28b82]/50 text-[#d93025] dark:text-[#f28b82] text-xs leading-relaxed"
      >
        <svg class="h-4 w-4 flex-shrink-0 fill-current mt-0.5" viewBox="0 0 24 24">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
          />
        </svg>
        <div class="flex-1 font-medium">
          {{ formattedError }}
        </div>
      </div>

      <!-- Primary Action Button (Google Blue Pill Button) -->
      <button
        type="submit"
        class="w-full rounded-full bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] dark:bg-[#8ab4f8] dark:hover:bg-[#93bbf9] dark:active:bg-[#aecbfa] text-white dark:text-[#202124] py-2.5 px-6 text-sm font-medium tracking-wide shadow-sm hover:shadow active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer mt-2"
      >
        <span>{{ authMode === "signup" ? "Create account" : "Sign in" }}</span>
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
        </svg>
      </button>
    </form>

    <!-- Bottom Switcher Helper -->
    <div
      class="mt-6 pt-5 border-t border-[#dadce0] dark:border-[#3c4043] flex items-center justify-between text-xs"
    >
      <span class="text-[#5f6368] dark:text-[#9aa0a6]">
        {{ authMode === "signup" ? "Already have an account?" : "Need an account?" }}
      </span>
      <button
        type="button"
        @click="setMode(authMode === 'signup' ? 'login' : 'signup')"
        class="text-[#1a73e8] dark:text-[#8ab4f8] hover:underline font-semibold cursor-pointer"
      >
        {{ authMode === "signup" ? "Sign in instead" : "Create account" }}
      </button>
    </div>
  </div>
</template>
