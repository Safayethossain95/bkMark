<script setup>
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { computed, onMounted, ref } from "vue";
import { auth, db } from "./firebase";

// Reactive state
const bookmarks = ref([]);
const searchQuery = ref("");
const folderName = ref("");
const urlName = ref("");
const link = ref("");
const editingId = ref(null);
const formOpen = ref(false);
const searchInput = ref(null);
// Auth state
const authUser = ref(null);
const userId = ref(null);
const authDropdown = ref(false);
const authMode = ref("login");
const authEmail = ref("");
const authPassword = ref("");
const authError = ref("");

// Computed property for filtered bookmarks
const filteredBookmarks = computed(() => {
  if (!searchQuery.value) return bookmarks.value;

  const query = searchQuery.value.toLowerCase();
  return bookmarks.value.filter(
    (bookmark) =>
      (bookmark.folderName?.toLowerCase() || "").includes(query) ||
      (bookmark.urlName?.toLowerCase() || "").includes(query) ||
      (bookmark.link?.toLowerCase() || "").includes(query)
  );
});

// Grouped bookmarks by folder
const groupedBookmarks = computed(() => {
  const groups = {};
  filteredBookmarks.value.forEach((bookmark) => {
    if (!groups[bookmark.folderName]) {
      groups[bookmark.folderName] = [];
    }
    groups[bookmark.folderName].push(bookmark);
  });

  // Sort folders by number of matches (descending)
  const sortedGroups = {};
  Object.keys(groups)
    .sort((a, b) => groups[b].length - groups[a].length)
    .forEach((folder) => {
      sortedGroups[folder] = groups[folder];
    });

  return sortedGroups;
});

// Helpers
function getDomain(link) {
  try {
    return new URL(link).hostname.replace("www.", "");
  } catch (e) {
    return "";
  }
}

function faviconUrl(link) {
  const d = getDomain(link);
  return d ? `https://www.google.com/s2/favicons?domain=${d}` : "";
}

// Load bookmarks from Firestore filtered by current user
const loadBookmarks = async (uid) => {
  if (!uid) return;
  try {
    const q = query(collection(db, "bookmarks"), where("userId", "==", uid));
    const querySnapshot = await getDocs(q);
    bookmarks.value = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error loading bookmarks:", error);
  }
};

// CRUD Operations
const addBookmark = async () => {
  if (!folderName.value || !urlName.value || !link.value) {
    alert("Please fill in all fields");
    return;
  }

  try {
    if (editingId.value !== null) {
      // Update existing bookmark in Firestore
      const docRef = doc(db, "bookmarks", editingId.value);
      await updateDoc(docRef, {
        userId: userId.value,
        folderName: folderName.value,
        urlName: urlName.value,
        link: link.value,
      });

      // Update local state
      const index = bookmarks.value.findIndex((b) => b.id === editingId.value);
      if (index !== -1) {
        bookmarks.value[index] = {
          id: editingId.value,
          folderName: folderName.value,
          urlName: urlName.value,
          link: link.value,
        };
      }
      editingId.value = null;
    } else {
      // Add new bookmark to Firestore
      const docRef = await addDoc(collection(db, "bookmarks"), {
        userId: userId.value,
        folderName: folderName.value,
        urlName: urlName.value,
        link: link.value,
      });

      // Update local state
      bookmarks.value.push({
        id: docRef.id,
        folderName: folderName.value,
        urlName: urlName.value,
        link: link.value,
      });
    }

    // Clear form and close it
    clearForm();
    formOpen.value = false;
  } catch (error) {
    console.error("Error saving bookmark:", error);
    alert("Error saving bookmark. Please try again.");
  }
};

const editBookmark = (bookmark) => {
  folderName.value = bookmark.folderName;
  urlName.value = bookmark.urlName;
  link.value = bookmark.link;
  editingId.value = bookmark.id;
  formOpen.value = true;
};

// Auth functions
const signup = async () => {
  authError.value = "";
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      authEmail.value,
      authPassword.value
    );
    authUser.value = userCredential.user;
    userId.value = userCredential.user.uid;
    // Create user doc in Firestore
    await setDoc(doc(db, "users", userCredential.user.uid), {
      email: userCredential.user.email,
      uid: userCredential.user.uid,
      createdAt: new Date(),
    });
    authEmail.value = "";
    authPassword.value = "";
    authDropdown.value = false;
  } catch (e) {
    authError.value = (e.code ? e.code + ": " : "") + e.message;
  }
};

const login = async () => {
  authError.value = "";
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      authEmail.value,
      authPassword.value
    );
    authUser.value = userCredential.user;
    userId.value = userCredential.user.uid;
    // Load bookmarks for this user
    await loadBookmarks(userCredential.user.uid);
    authEmail.value = "";
    authPassword.value = "";
    authDropdown.value = false;
  } catch (e) {
    authError.value = (e.code ? e.code + ": " : "") + e.message;
  }
};

const logout = async () => {
  try {
    await signOut(auth);
    authUser.value = null;
  } catch (e) {
    console.error("Logout error:", e);
  }
};

const deleteBookmark = async (id) => {
  if (confirm("Are you sure you want to delete this bookmark?")) {
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, "bookmarks", id));

      // Update local state
      bookmarks.value = bookmarks.value.filter((b) => b.id !== id);
    } catch (error) {
      console.error("Error deleting bookmark:", error);
      alert("Error deleting bookmark. Please try again.");
    }
  }
};

const clearForm = () => {
  folderName.value = "";
  urlName.value = "";
  link.value = "";
  editingId.value = null;
};

// Open first search result when Enter is pressed
const openFirstResult = () => {
  if (filteredBookmarks.value.length > 0) {
    const firstBookmark = filteredBookmarks.value[0];
    window.open(firstBookmark.link, "_blank");
  }
};

// Link all existing bookmarks to current user
const linkAllBookmarks = async () => {
  if (!userId.value) {
    alert("Please log in first");
    return;
  }

  if (
    !confirm("This will link all existing bookmarks to your account. Continue?")
  ) {
    return;
  }

  try {
    // Fetch all bookmarks without userId filter
    const allBookmarksSnapshot = await getDocs(collection(db, "bookmarks"));
    const bookmarkDocs = allBookmarksSnapshot.docs;

    if (bookmarkDocs.length === 0) {
      alert("No bookmarks found to link.");
      return;
    }

    let successCount = 0;
    let failureCount = 0;

    // Update each bookmark with current user's userId
    for (const docSnap of bookmarkDocs) {
      try {
        const docRef = doc(db, "bookmarks", docSnap.id);
        const bookmarkData = docSnap.data();

        await updateDoc(docRef, {
          userId: userId.value,
        });
        successCount++;
      } catch (error) {
        console.error("Error updating bookmark:", docSnap.id, error);
        failureCount++;
      }
    }

    // Reload bookmarks
    await loadBookmarks(userId.value);
    console.log("Reloaded bookmarks. Current count:", bookmarks.value.length);

    alert(
      `Found ${bookmarkDocs.length} bookmarks. Updated: ${successCount}, Failed: ${failureCount}. Now showing: ${bookmarks.value.length}`
    );
  } catch (error) {
    console.error("Error linking bookmarks:", error);
    alert("Error linking bookmarks. Please try again.");
  }
};

// Setup keyboard shortcut Ctrl+K for search focus and restore session
onMounted(() => {
  // Check for existing auth session
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      authUser.value = user;
      userId.value = user.uid;
      await loadBookmarks(user.uid);
    }
  });

  // Keyboard shortcut Ctrl+K
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      searchInput.value?.focus();
    }
  });
});
</script>

<template>
  <div
    class="min-h-screen bg-[url('/images/background.png')] bg-cover py-8 px-4 relative"
  >
    <!-- Not logged in message -->
    <div
      v-if="!authUser"
      class="absolute inset-0 flex items-center justify-center"
    >
      <div
        class="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-8 text-center"
      >
        <h2 class="text-2xl font-bold text-gray-100 mb-2">Please Log In</h2>
        <p class="text-gray-400 mb-6">
          Click the button in the top-right to sign up or log in
        </p>
      </div>
    </div>

    <!-- Auth dropdown (top-right) - Always visible -->
    <div class="absolute top-6 right-6 z-50">
      <div class="relative">
        <button
          @click="authDropdown = !authDropdown"
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
              @click="logout"
              class="w-full px-3 py-2 bg-white/5 rounded-lg text-gray-200 hover:bg-white/10 mb-2"
            >
              Logout
            </button>
            <button
              @click="linkAllBookmarks"
              class="w-full px-3 py-2 bg-white/5 rounded-lg text-gray-200 hover:bg-white/10 text-sm"
            >
              Link All Bookmarks
            </button>
          </div>

          <div v-else>
            <div class="flex gap-2 mb-3">
              <button
                @click="authMode = 'login'"
                :class="authMode === 'login' ? 'bg-white/10' : ''"
                class="flex-1 px-2 py-1 rounded-lg"
              >
                Login
              </button>
              <button
                @click="authMode = 'signup'"
                :class="authMode === 'signup' ? 'bg-white/10' : ''"
                class="flex-1 px-2 py-1 rounded-lg"
              >
                Sign up
              </button>
            </div>

            <div class="space-y-2">
              <input
                v-model="authEmail"
                type="email"
                placeholder="Email"
                class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-200"
              />
              <input
                v-model="authPassword"
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
                  @click="login"
                  class="flex-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg text-white"
                >
                  Login
                </button>
                <button
                  v-else
                  @click="signup"
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

    <div class="max-w-3xl mx-auto" v-if="authUser">
      <!-- Search Bar -->
      <div class="bg-transparent rounded-lg shadow-md p-4 mb-6">
        <div class="flex gap-2">
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            placeholder="Search bookmarks..."
            @keydown.enter="openFirstResult"
            class="flex-1 px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-200 placeholder-gray-200"
          />
          <button
            @click="formOpen = !formOpen"
            class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition duration-200"
          >
            +
          </button>
        </div>
      </div>

      <!-- Add/Edit Form -->
      <div
        v-show="formOpen"
        class="bg-white/10 backdrop-blur-md rounded-lg shadow-lg border border-white/20 p-6 mb-6"
      >
        <h2
          class="flex items-center justify-between text-lg font-semibold text-gray-100 mb-4"
        >
          <span>{{ editingId ? "Edit Bookmark" : "Add New Bookmark" }}</span>
          <button
            @click="formOpen = false"
            class="text-gray-400 hover:text-gray-200"
          >
            ✕
          </button>
        </h2>

        <form @submit.prevent="addBookmark" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
            <label class="text-sm text-gray-300">Folder</label>
            <input
              v-model="folderName"
              type="text"
              placeholder="e.g., Development"
              class="md:col-span-2 w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-200 placeholder-gray-100"
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
            <label class="text-sm text-gray-300">Title</label>
            <input
              v-model="urlName"
              type="text"
              placeholder="e.g., GitHub"
              class="md:col-span-2 w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-200 placeholder-gray-100"
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
            <label class="text-sm text-gray-300">Link</label>
            <div class="md:col-span-2 flex items-center gap-3">
              <input
                v-model="link"
                type="url"
                placeholder="https://example.com"
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
                clearForm();
                formOpen = false;
              "
              class="px-4 py-2 border border-white/10 text-gray-300 rounded-lg hover:bg-white/5 transition duration-150"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <!-- Bookmarks List -->
      <div class="space-y-4">
        <div
          v-if="bookmarks.length === 0"
          class="bg-white/20 backdrop-blur-md rounded-lg shadow-lg border border-white/30 p-8 text-center"
        >
          <p class="text-gray-500 text-lg">
            No bookmarks yet. Add your first bookmark above!
          </p>
        </div>

        <div
          v-else-if="filteredBookmarks.length === 0"
          class="bg-white/20 backdrop-blur-md rounded-lg shadow-lg border border-white/30 p-8 text-center"
        >
          <p class="text-gray-500 text-lg">No bookmarks match your search.</p>
        </div>

        <div v-else>
          <div
            v-for="(folderBookmarks, folder) in groupedBookmarks"
            :key="folder"
            class="bg-white/20 backdrop-blur-md rounded-lg shadow-lg border border-white/30 p-6 mb-4"
          >
            <h3
              class="flex items-center justify-between text-xl font-semibold text-gray-100 mb-4 border-b pb-2"
            >
              <span class="flex items-center gap-2">
                <span class="text-lg">📁</span>
                <span>{{ folder }}</span>
              </span>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium bg-white/5 text-gray-200"
                >{{ folderBookmarks.length }}</span
              >
            </h3>

            <div class="space-y-3">
              <div
                v-for="bookmark in folderBookmarks"
                :key="bookmark.id"
                class="flex items-center justify-between gap-4 p-3 bg-white/6 backdrop-blur-sm rounded-lg border border-white/10 hover:shadow-lg hover:scale-[1.01] transition-transform duration-150"
              >
                <a
                  :href="bookmark.link"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                >
                  <img
                    :src="faviconUrl(bookmark.link)"
                    alt="favicon"
                    class="w-5 h-5 rounded-sm flex-shrink-0"
                  />
                  <div class="min-w-0">
                    <h4 class="font-medium text-gray-100 truncate">
                      {{ bookmark.urlName }}
                    </h4>
                    <p
                      class="text-gray-300 hover:text-gray-100 text-sm break-all truncate"
                    >
                      {{ getDomain(bookmark.link) || bookmark.link }}
                    </p>
                  </div>
                </a>

                <div class="flex items-center gap-2">
                  <button
                    @click="editBookmark(bookmark)"
                    aria-label="Edit"
                    class="w-9 h-9 flex items-center justify-center bg-white/5 border border-white/10 text-gray-200 rounded-full hover:bg-white/10 transition duration-150"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="w-4 h-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"
                      />
                      <path d="M2 15a1 1 0 011-1h3v2H3a1 1 0 01-1-1z" />
                    </svg>
                  </button>

                  <button
                    @click="deleteBookmark(bookmark.id)"
                    aria-label="Delete"
                    class="w-9 h-9 flex items-center justify-center bg-white/5 border border-white/10 text-gray-200 rounded-full hover:bg-white/10 transition duration-150"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="w-4 h-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M8 9a1 1 0 012 0v6a1 1 0 11-2 0V9zm4 0a1 1 0 10-2 0v6a1 1 0 102 0V9z"
                        clip-rule="evenodd"
                      />
                      <path
                        d="M6 2a1 1 0 00-1 1v1h10V3a1 1 0 00-1-1H6zM4 6h12l-1 10a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
