<script setup>
const props = defineProps({
  authUser: Object,
  authDropdown: Boolean,
  themeDropdown: Boolean,
  themes: Array,
  selectedTheme: Object,
  authMode: String,
  authEmail: String,
  authPassword: String,
  authError: String,
  previewStyle: Function,
});

const emit = defineEmits([
  "update:authDropdown",
  "update:themeDropdown",
  "update:authEmail",
  "update:authPassword",
  "update:authMode",
  "login",
  "signup",
  "logout",
  "select-theme",
]);

function toggleAuth() {
  emit("update:authDropdown", !props.authDropdown);
  emit("update:themeDropdown", false);
}

function toggleTheme() {
  emit("update:themeDropdown", !props.themeDropdown);
  emit("update:authDropdown", false);
}

function updateEmail(e) {
  emit("update:authEmail", e.target.value);
}

function updatePassword(e) {
  emit("update:authPassword", e.target.value);
}

function setMode(mode) {
  emit("update:authMode", mode);
}
</script>

<template>
  <div>
    <div class="absolute top-6 right-16 mr-3">
      <div class="relative">
        <button
          @click="toggleTheme"
          class="w-11 h-11 rounded-full bg-white/6 border border-white/10 flex items-center justify-center text-gray-200 hover:bg-white/10 transition"
          aria-label="Themes"
        >
          <div
            :style="previewStyle(selectedTheme)"
            class="w-8 h-8 rounded-full object-cover"
          ></div>
        </button>

        <div
          v-show="themeDropdown"
          class="mt-2 w-48 z-[9999] bg-white/6 backdrop-blur-md border border-white/10 rounded-lg p-2 text-gray-200 shadow-lg right-0 absolute"
        >
          <div
            v-for="theme in themes"
            :key="theme.name"
            class="flex items-center gap-3 p-2 rounded-md hover:bg-white/5 cursor-pointer"
            @click="$emit('select-theme', theme)"
          >
            <div
              :style="previewStyle(theme)"
              class="w-8 h-8 rounded-sm object-cover"
            ></div>
            <div class="text-sm truncate">{{ theme.name }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="absolute top-11 left-8">
      <img src="/images/logo.png" class="h-[20px]" alt="" />
    </div>

    <div class="absolute top-6 right-6 z-50">
      <div class="relative">
        <button
          @click="toggleAuth"
          class="w-11 h-11 rounded-full bg-white/6 border border-white/10 flex items-center justify-center text-gray-200 hover:bg-white/10 transition"
          aria-label="Account"
        >
          <span v-if="authUser" class="text-sm">{{
            authUser.email?.charAt(0).toUpperCase()
          }}</span>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            class="w-5 h-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M10 2a4 4 0 100 8 4 4 0 000-8zm-7 16a7 7 0 0114 0H3z"
              clip-rule="evenodd"
            />
          </svg>
        </button>

        <div
          v-show="authDropdown"
          class="mt-2 w-64 bg-white/6 backdrop-blur-md border border-white/10 rounded-lg p-4 text-gray-200 shadow-lg right-0 absolute"
        >
          <div v-if="authUser">
            <div class="text-sm mb-3">Signed in as</div>
            <div class="font-medium truncate mb-3">{{ authUser.email }}</div>
            <button
              @click="$emit('logout')"
              class="w-full px-3 py-2 bg-white/5 rounded-lg text-gray-200 hover:bg-white/10 mb-2"
            >
              Logout
            </button>
          </div>

          <div v-else>
            <div class="flex gap-2 mb-3">
              <button
                @click="setMode('login')"
                :class="authMode === 'login' ? 'bg-white/10' : ''"
                class="flex-1 px-2 py-1 rounded-lg"
              >
                Login
              </button>
              <button
                @click="setMode('signup')"
                :class="authMode === 'signup' ? 'bg-white/10' : ''"
                class="flex-1 px-2 py-1 rounded-lg"
              >
                Sign up
              </button>
            </div>

            <div class="space-y-2">
              <input
                :value="authEmail"
                @input="updateEmail"
                type="email"
                placeholder="Email"
                class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-200"
              />
              <input
                :value="authPassword"
                @input="updatePassword"
                type="password"
                placeholder="Password"
                class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-200"
              />
              <div class="text-sm text-red-400" v-if="authError">
                {{ authError }}
              </div>
              <div class="flex gap-2 mt-2">
                <button
                  v-if="authMode === 'login'"
                  @click="$emit('login')"
                  class="flex-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg text-white"
                >
                  Login
                </button>
                <button
                  v-else
                  @click="$emit('signup')"
                  class="flex-1 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg text-white"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
