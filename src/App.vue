<script setup>
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
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
import { computed, nextTick, onMounted, ref, watch } from "vue";
import BookmarkForm from "./components/BookmarkForm.vue";
import BookmarkList from "./components/BookmarkList.vue";
import HeaderControls from "./components/HeaderControls.vue";
import LoginPanel from "./components/LoginPanel.vue";
import SearchBar from "./components/SearchBar.vue";
import { auth, db } from "./firebase";

// Reactive state
const bookmarks = ref([]);
const searchQuery = ref("");
const folderName = ref("");
const urlName = ref("");
const link = ref("");
const editingId = ref(null);
const formOpen = ref(false);
const formVisible = ref(false);
const formEl = ref(null);
const searchInput = ref(null);
// Auth state
const authUser = ref(null);
const userId = ref(null);
const accountDropdown = ref(false);
const themeDropdown = ref(false);
const authMode = ref("login");
const authEmail = ref("");
const authPassword = ref("");
const authError = ref("");

// Computed property for filtered bookmarks
const filteredBookmarks = computed(() => {
  if (!searchQuery.value) return bookmarks.value;

  const query = searchQuery.value.toLowerCase();
  return bookmarks.value.filter((bookmark) =>
    (bookmark.name?.toLowerCase() || "").includes(query)
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
        name: urlName.value,
        link: link.value,
      });

      // Update local state
      const index = bookmarks.value.findIndex((b) => b.id === editingId.value);
      if (index !== -1) {
        bookmarks.value[index] = {
          id: editingId.value,
          folderName: folderName.value,
          name: urlName.value,
          link: link.value,
        };
      }
      editingId.value = null;
    } else {
      // Add new bookmark to Firestore
      const docRef = await addDoc(collection(db, "bookmarks"), {
        userId: userId.value,
        folderName: folderName.value,
        name: urlName.value,
        link: link.value,
      });

      // Update local state
      bookmarks.value.push({
        id: docRef.id,
        folderName: folderName.value,
        name: urlName.value,
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
  urlName.value = bookmark.name;
  link.value = bookmark.link;
  editingId.value = bookmark.id;
  formOpen.value = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
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
    accountDropdown.value = false;
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
    accountDropdown.value = false;
  } catch (e) {
    authError.value = (e.code ? e.code + ": " : "") + e.message;
  }
};

const loginWithGoogle = async () => {
  authError.value = "";
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    authUser.value = userCredential.user;
    userId.value = userCredential.user.uid;

    await setDoc(
      doc(db, "users", userCredential.user.uid),
      {
        email: userCredential.user.email,
        uid: userCredential.user.uid,
        createdAt: new Date(),
      },
      { merge: true }
    );

    await loadBookmarks(userCredential.user.uid);
    accountDropdown.value = false;
  } catch (e) {
    authError.value = (e.code ? e.code + ": " : "") + e.message;
  }
};

const logout = async () => {
  try {
    await signOut(auth);
    authUser.value = null;
    userId.value = null;
    bookmarks.value = [];
    accountDropdown.value = false;
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
// const linkAllBookmarks = async () => {
//   if (!userId.value) {
//     alert("Please log in first");
//     return;
//   }

//   if (
//     !confirm("This will link all existing bookmarks to your account. Continue?")
//   ) {
//     return;
//   }

//   try {
//     // Fetch all bookmarks without userId filter
//     const allBookmarksSnapshot = await getDocs(collection(db, "bookmarks"));
//     const bookmarkDocs = allBookmarksSnapshot.docs;

//     if (bookmarkDocs.length === 0) {
//       alert("No bookmarks found to link.");
//       return;
//     }

//     let successCount = 0;
//     let failureCount = 0;

//     // Update each bookmark with current user's userId
//     for (const docSnap of bookmarkDocs) {
//       try {
//         const docRef = doc(db, "bookmarks", docSnap.id);
//         const bookmarkData = docSnap.data();

//         await updateDoc(docRef, {
//           userId: userId.value,
//         });
//         successCount++;
//       } catch (error) {
//         console.error("Error updating bookmark:", docSnap.id, error);
//         failureCount++;
//       }
//     }

//     // Reload bookmarks
//     await loadBookmarks(userId.value);
//     console.log("Reloaded bookmarks. Current count:", bookmarks.value.length);

//     alert(
//       `Found ${bookmarkDocs.length} bookmarks. Updated: ${successCount}, Failed: ${failureCount}. Now showing: ${bookmarks.value.length}`
//     );
//   } catch (error) {
//     console.error("Error linking bookmarks:", error);
//     alert("Error linking bookmarks. Please try again.");
//   }
// };

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
// Watch the requested open state and animate with GSAP
watch(formOpen, async (open) => {
  // dynamic import so app doesn't break if gsap isn't installed yet
  let gsap;
  try {
    gsap =
      (await import("gsap")).gsap ||
      (await import("gsap")).default ||
      (await import("gsap"));
  } catch (e) {
    // If GSAP is not available, fallback to immediate visibility
    formVisible.value = open;
    return;
  }

  const el = formEl.value;
  if (!el) {
    formVisible.value = open;
    return;
  }

  if (open) {
    formVisible.value = true;
    await nextTick();
    gsap.fromTo(
      el,
      { height: 0, opacity: 0.8, overflow: "hidden" },
      {
        height: "auto",
        opacity: 1,
        duration: 0.44,
        ease: "power2.out",
        clearProps: "height,overflow",
      }
    );
  } else {
    gsap.to(el, {
      height: "auto",
      opacity: 0,
      duration: 0.44,
      ease: "power2.in",
      overflow: "hidden",
      onComplete() {
        formVisible.value = false;
        // ensure props cleared
        el.style.height = "";
        el.style.overflow = "";
      },
    });
  }
});
const resultsEl = ref(null);
let searchDebounceTimer = null;
const collapsedFolders = ref({});

const themes = ref([
  {
    name: "Ocean Drift",
    type: "gradient",
    value: "linear-gradient(135deg, #0b1f3a 0%, #126e82 55%, #4fd3c4 100%)",
  },
  {
    name: "Sunset Bloom",
    type: "gradient",
    value: "linear-gradient(135deg, #371b58 0%, #c84b31 55%, #fcbf49 100%)",
  },
  {
    name: "Mint Glow",
    type: "gradient",
    value: "linear-gradient(135deg, #0f2027 0%, #2c5364 45%, #7fffd4 100%)",
  },
  {
    name: "Peach Mist",
    type: "gradient",
    value: "linear-gradient(135deg, #3a1c71 0%, #d76d77 48%, #ffaf7b 100%)",
  },
  {
    name: "Lagoon Sky",
    type: "gradient",
    value: "linear-gradient(135deg, #0b132b 0%, #1c2541 35%, #3a86ff 100%)",
  },
  {
    name: "Aurora Veil",
    type: "gradient",
    value: "linear-gradient(135deg, #1f1147 0%, #006d77 45%, #83c5be 100%)",
  },
  {
    name: "Blush Cream",
    type: "gradient",
    value: "linear-gradient(135deg, #fdf0d5 0%, #f7cad0 40%, #cdb4db 100%)",
  },
  // Keep image options too if desired
  { name: "Default Image", type: "image", value: "/images/background.png" },
  {
    name: "Noir Gradient Image",
    type: "image",
    value: "/images/black-gd.jpg",
  },
]);
// Initialize selected theme from localStorage (fallback to first theme)
let _initialTheme = themes.value[0];
try {
  const stored = localStorage.getItem("selectedTheme");
  if (stored) {
    const found = themes.value.find((t) => t.name === stored);
    if (found) _initialTheme = found;
  }
} catch (e) {
  // ignore localStorage errors
}
const selectedTheme = ref(_initialTheme);

const backgroundStyle = computed(() => {
  const t = selectedTheme.value;
  if (!t) return {};
  if (t.type === "image") {
    return {
      backgroundImage: `url(${t.value})`,
      backgroundSize: "cover",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "center",
    };
  }

  // gradient
  return {
    backgroundImage: t.value,
    backgroundSize: "cover",
  };
});

function previewStyle(theme) {
  if (!theme) return {};
  if (theme.type === "image") {
    return {
      backgroundImage: `url(${theme.value})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  return {
    backgroundImage: theme.value,
    backgroundSize: "cover",
  };
}

function selectTheme(theme) {
  selectedTheme.value = theme;
  try {
    localStorage.setItem("selectedTheme", theme.name);
  } catch (e) {}
  themeDropdown.value = false;
}

// Collapse all folders
const collapseAllFolders = () => {
  Object.keys(groupedBookmarks.value).forEach((folder) => {
    collapsedFolders.value[folder] = true;
  });
};

// Expand all folders
const expandAllFolders = () => {
  Object.keys(groupedBookmarks.value).forEach((folder) => {
    collapsedFolders.value[folder] = false;
  });
};

// Toggle folder collapse/expand with GSAP animation
const toggleFolderCollapse = async (folderName) => {
  let gsap;
  try {
    gsap =
      (await import("gsap")).gsap ||
      (await import("gsap")).default ||
      (await import("gsap"));
  } catch (e) {
    // Fallback without animation
    collapsedFolders.value[folderName] = !collapsedFolders.value[folderName];
    return;
  }

  const chevronButton = document.querySelector(
    `[data-chevron="${folderName}"]`
  );

  collapsedFolders.value[folderName] = !collapsedFolders.value[folderName];

  if (!collapsedFolders.value[folderName]) {
    // Expanding - animate items in
    await nextTick();

    const itemsContainer = document.querySelector(
      `[data-folder="${folderName}"] .space-y-3`
    );
    if (!itemsContainer) return;
    const items = itemsContainer.querySelectorAll(".bookmark-row");
    if (!items || items.length === 0) return;

    gsap.fromTo(
      items,
      { scale: 0.94, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        duration: 0.34,
        ease: "power2.out",
        stagger: 0.02,
      }
    );
  }
};
clearTimeout(searchDebounceTimer);
searchDebounceTimer = setTimeout(async () => {
  await nextTick();
  let gsap;
  try {
    gsap =
      (await import("gsap")).gsap ||
      (await import("gsap")).default ||
      (await import("gsap"));
  } catch (e) {
    return;
  }

  const el = resultsEl.value;
  if (!el) return;
  const items = el.querySelectorAll(".bookmark-row");
  if (!items || items.length === 0) return;

  gsap.fromTo(
    items,
    { opacity: 0 },
    {
      opacity: 1,
      duration: 0.42,
      ease: "power2.out",
      stagger: 0.04,
    }
  );
}, 280);
</script>

<template>
  <div
    class="min-h-screen bg-cover py-8 px-4 relative"
    :style="backgroundStyle"
  >
    <HeaderControls
      :authUser="authUser"
      :themeDropdown="themeDropdown"
      :themes="themes"
      :selectedTheme="selectedTheme"
      :accountDropdown="accountDropdown"
      :previewStyle="previewStyle"
      @update:themeDropdown="(val) => (themeDropdown = val)"
      @update:accountDropdown="(val) => (accountDropdown = val)"
      @logout="logout"
      @select-theme="selectTheme"
    />

    <div class="max-w-6xl mx-auto" v-if="authUser">
      <SearchBar
        v-model:searchQuery="searchQuery"
        :formOpen="formOpen"
        :filtered-bookmarks="filteredBookmarks"
        @toggle-form="
          () => {
            formOpen = !formOpen;
            clearForm();
          }
        "
        ref="searchInput"
      />

      <BookmarkForm
        :formVisible="formVisible"
        v-model:folderName="folderName"
        v-model:urlName="urlName"
        v-model:link="link"
        :editingId="editingId"
        :faviconUrl="faviconUrl"
        @add-bookmark="addBookmark"
        @close-form="() => (formOpen = false)"
        @clear-form="clearForm"
        ref="formEl"
      />

      <BookmarkList
        :bookmarks="bookmarks"
        :groupedBookmarks="groupedBookmarks"
        :filteredBookmarks="filteredBookmarks"
        :collapsedFolders="collapsedFolders"
        @edit="editBookmark"
        @delete="deleteBookmark"
        @toggle-folder="toggleFolderCollapse"
        @expand-all="expandAllFolders"
        @collapse-all="collapseAllFolders"
        :resultsRef="resultsEl"
      />
    </div>

    <div v-else class="absolute inset-0 flex items-center justify-center px-4">
      <LoginPanel
        :authMode="authMode"
        :authEmail="authEmail"
        :authPassword="authPassword"
        :authError="authError"
        @update:authMode="(val) => (authMode = val)"
        @update:authEmail="(val) => (authEmail = val)"
        @update:authPassword="(val) => (authPassword = val)"
        @login="login"
        @signup="signup"
        @google-login="loginWithGoogle"
      />
    </div>
  </div>
</template>
