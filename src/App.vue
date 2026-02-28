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
import AccountModal from "./components/AccountModal.vue";
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
const accountModalOpen = ref(false);
const themeDropdown = ref(false);
const authMode = ref("login");
const authEmail = ref("");
const authPassword = ref("");
const authError = ref("");
const friends = ref([]);
const friendsLoading = ref(false);
const friendRequests = ref([]);
const requestsLoading = ref(false);
const friendEmail = ref("");
const shareEmail = ref("");
const selectedShareBookmarkId = ref("");
const accountActionError = ref("");
const accountActionSuccess = ref("");
const SHARED_FOLDER_NAME = "Shared with Me";

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

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function sharedBookmarkDocId(recipientUid, sourceBookmarkId) {
  return `shared_${recipientUid}_${sourceBookmarkId}`;
}

async function findUserByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const directQuery = query(collection(db, "users"), where("email", "==", normalized));
  const directSnap = await getDocs(directQuery);
  if (!directSnap.empty) {
    return directSnap.docs[0].data();
  }

  // Backward compatibility: legacy docs may have mixed-case emails.
  const allUsersSnap = await getDocs(collection(db, "users"));
  const match = allUsersSnap.docs.find(
    (d) => normalizeEmail(d.data()?.email) === normalized
  );
  return match ? match.data() : null;
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

const loadFriends = async (uid) => {
  if (!uid) return;
  friendsLoading.value = true;
  try {
    const snapshot = await getDocs(collection(db, "users", uid, "friends"));
    friends.value = snapshot.docs.map((friendDoc) => ({
      id: friendDoc.id,
      ...friendDoc.data(),
    }));
  } catch (error) {
    console.error("Error loading friends:", error);
    accountActionError.value = "Failed to load friends.";
  } finally {
    friendsLoading.value = false;
  }
};

const loadFriendRequests = async (uid) => {
  if (!uid) return;
  requestsLoading.value = true;
  try {
    const snapshot = await getDocs(
      collection(db, "users", uid, "friendRequestsIncoming")
    );
    friendRequests.value = snapshot.docs.map((requestDoc) => ({
      id: requestDoc.id,
      ...requestDoc.data(),
    }));
  } catch (error) {
    console.error("Error loading friend requests:", error);
    accountActionError.value = "Failed to load friend requests.";
  } finally {
    requestsLoading.value = false;
  }
};

const upsertSharedBookmarkForRecipient = async ({
  recipientUid,
  senderEmail,
  sourceBookmark,
}) => {
  const sharedId = sharedBookmarkDocId(recipientUid, sourceBookmark.id);
  await setDoc(doc(db, "bookmarks", sharedId), {
    userId: recipientUid,
    folderName: SHARED_FOLDER_NAME,
    name: sourceBookmark.name,
    link: sourceBookmark.link,
    shared: true,
    sharedSourceId: sourceBookmark.id,
    sharedFrom: normalizeEmail(senderEmail),
    updatedAt: new Date(),
  });
};

const backfillIncomingSharedBookmarks = async (uid) => {
  if (!uid) return;
  try {
    const incomingShares = await getDocs(
      query(collection(db, "sharedBookmarks"), where("toUid", "==", uid))
    );

    for (const shareDoc of incomingShares.docs) {
      const share = shareDoc.data();
      if (!share?.bookmarkId || !share?.bookmarkLink) continue;

      await upsertSharedBookmarkForRecipient({
        recipientUid: uid,
        senderEmail: share.fromEmail || "",
        sourceBookmark: {
          id: share.bookmarkId,
          name: share.bookmarkName || "Shared Bookmark",
          link: share.bookmarkLink,
        },
      });
    }
  } catch (error) {
    // Best-effort backfill: skip silently if rules deny read on sharedBookmarks.
    console.warn("Shared bookmark backfill skipped:", error?.message || error);
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
      email: normalizeEmail(userCredential.user.email),
      uid: userCredential.user.uid,
      createdAt: new Date(),
    });
    authEmail.value = "";
    authPassword.value = "";
    accountModalOpen.value = false;
    await loadFriends(userCredential.user.uid);
    await loadFriendRequests(userCredential.user.uid);
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
    accountModalOpen.value = false;
    await loadFriends(userCredential.user.uid);
    await loadFriendRequests(userCredential.user.uid);
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
        email: normalizeEmail(userCredential.user.email),
        uid: userCredential.user.uid,
        createdAt: new Date(),
      },
      { merge: true }
    );

    await loadBookmarks(userCredential.user.uid);
    accountModalOpen.value = false;
    await loadFriends(userCredential.user.uid);
    await loadFriendRequests(userCredential.user.uid);
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
    friends.value = [];
    friendRequests.value = [];
    friendEmail.value = "";
    shareEmail.value = "";
    selectedShareBookmarkId.value = "";
    accountModalOpen.value = false;
  } catch (e) {
    console.error("Logout error:", e);
  }
};

const openAccountModal = () => {
  accountActionError.value = "";
  accountActionSuccess.value = "";
  themeDropdown.value = false;
  accountModalOpen.value = true;
  if (userId.value) {
    loadFriends(userId.value);
    loadFriendRequests(userId.value);
  }
};

const closeAccountModal = () => {
  accountModalOpen.value = false;
  accountActionError.value = "";
  accountActionSuccess.value = "";
};

const addFriendByEmail = async () => {
  accountActionError.value = "";
  accountActionSuccess.value = "";

  const uid = userId.value;
  const email = normalizeEmail(friendEmail.value);
  if (!uid || !email) {
    accountActionError.value = "Enter a valid friend email.";
    return;
  }

  if (email === normalizeEmail(authUser.value?.email)) {
    accountActionError.value = "You cannot add yourself.";
    return;
  }

  try {
    const friendUser = await findUserByEmail(email);
    if (!friendUser) {
      accountActionError.value = "No user found with this email.";
      return;
    }

    if (!friendUser?.uid || !friendUser?.email) {
      accountActionError.value = "Friend account data is incomplete.";
      return;
    }

    if (friends.value.some((f) => f.uid === friendUser.uid)) {
      accountActionError.value = "This user is already your friend.";
      return;
    }

    await setDoc(doc(db, "users", uid, "friendRequestsOutgoing", friendUser.uid), {
      toUid: friendUser.uid,
      toEmail: normalizeEmail(friendUser.email),
      fromUid: uid,
      fromEmail: normalizeEmail(authUser.value?.email),
      createdAt: new Date(),
    });

    await setDoc(
      doc(db, "users", friendUser.uid, "friendRequestsIncoming", uid),
      {
        fromUid: uid,
        fromEmail: normalizeEmail(authUser.value?.email),
        createdAt: new Date(),
      }
    );

    friendEmail.value = "";
    accountActionSuccess.value = `Friend request sent to ${friendUser.email}.`;
  } catch (error) {
    console.error("Error adding friend:", error);
    accountActionError.value = "Failed to send request. Try again.";
  }
};

const removeFriend = async (friendUid) => {
  accountActionError.value = "";
  accountActionSuccess.value = "";
  if (!userId.value || !friendUid) return;

  try {
    await deleteDoc(doc(db, "users", userId.value, "friends", friendUid));
    await deleteDoc(doc(db, "users", friendUid, "friends", userId.value));

    friends.value = friends.value.filter(
      (f) => String(f.uid) !== String(friendUid)
    );
    accountActionSuccess.value = "Friend removed.";
  } catch (error) {
    console.error("Error removing friend:", error);
    accountActionError.value = "Failed to remove friend.";
  }
};

const approveFriendRequest = async (request) => {
  accountActionError.value = "";
  accountActionSuccess.value = "";

  const currentUid = userId.value;
  const requesterUid = request?.fromUid;
  const requesterEmail = normalizeEmail(request?.fromEmail);
  const currentEmail = normalizeEmail(authUser.value?.email);

  if (!currentUid || !requesterUid) {
    accountActionError.value = "Invalid friend request.";
    return;
  }

  try {
    await setDoc(doc(db, "users", currentUid, "friends", requesterUid), {
      uid: requesterUid,
      email: requesterEmail,
      approvedAt: new Date(),
    });
    await setDoc(doc(db, "users", requesterUid, "friends", currentUid), {
      uid: currentUid,
      email: currentEmail,
      approvedAt: new Date(),
    });

    await deleteDoc(
      doc(db, "users", currentUid, "friendRequestsIncoming", requesterUid)
    );
    await deleteDoc(
      doc(db, "users", requesterUid, "friendRequestsOutgoing", currentUid)
    );

    accountActionSuccess.value = `${requesterEmail} is now your friend.`;
    await loadFriends(currentUid);
    await loadFriendRequests(currentUid);
  } catch (error) {
    console.error("Error approving friend request:", error);
    accountActionError.value = "Failed to approve request.";
  }
};

const deleteFriendRequest = async (request) => {
  accountActionError.value = "";
  accountActionSuccess.value = "";

  const currentUid = userId.value;
  const requesterUid = request?.fromUid;
  if (!currentUid || !requesterUid) {
    accountActionError.value = "Invalid friend request.";
    return;
  }

  try {
    await deleteDoc(
      doc(db, "users", currentUid, "friendRequestsIncoming", requesterUid)
    );
    await deleteDoc(
      doc(db, "users", requesterUid, "friendRequestsOutgoing", currentUid)
    );

    friendRequests.value = friendRequests.value.filter(
      (r) => String(r.fromUid) !== String(requesterUid)
    );
    accountActionSuccess.value = "Friend request deleted.";
  } catch (error) {
    console.error("Error deleting friend request:", error);
    accountActionError.value = "Failed to delete request.";
  }
};

const shareBookmarkByEmail = async () => {
  accountActionError.value = "";
  accountActionSuccess.value = "";

  const ownerUid = userId.value;
  const recipientEmail = normalizeEmail(shareEmail.value);
  const bookmarkId = selectedShareBookmarkId.value;

  if (!ownerUid) return;
  if (!bookmarkId) {
    accountActionError.value = "Select a bookmark to share.";
    return;
  }
  if (!recipientEmail) {
    accountActionError.value = "Enter recipient email.";
    return;
  }

  const bookmark = bookmarks.value.find((b) => String(b.id) === String(bookmarkId));
  if (!bookmark) {
    accountActionError.value = "Bookmark not found.";
    return;
  }

  if (recipientEmail === normalizeEmail(authUser.value?.email)) {
    accountActionError.value = "You cannot share with yourself.";
    return;
  }

  try {
    const recipient = await findUserByEmail(recipientEmail);
    if (!recipient) {
      accountActionError.value = "Recipient is not registered.";
      return;
    }

    await upsertSharedBookmarkForRecipient({
      recipientUid: recipient.uid,
      senderEmail: authUser.value?.email || "",
      sourceBookmark: bookmark,
    });

    await addDoc(collection(db, "sharedBookmarks"), {
      fromUid: ownerUid,
      fromEmail: normalizeEmail(authUser.value?.email),
      toUid: recipient.uid,
      toEmail: normalizeEmail(recipient.email),
      bookmarkId: bookmark.id,
      bookmarkName: bookmark.name,
      bookmarkLink: bookmark.link,
      folderName: bookmark.folderName || "",
      createdAt: new Date(),
    });

    accountActionSuccess.value = `Shared "${bookmark.name}" with ${recipient.email}. It will appear in "${SHARED_FOLDER_NAME}".`;
  } catch (error) {
    console.error("Error sharing bookmark:", error);
    accountActionError.value = "Failed to share bookmark.";
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
      await backfillIncomingSharedBookmarks(user.uid);
      await loadBookmarks(user.uid);
      await loadFriends(user.uid);
      await loadFriendRequests(user.uid);
    } else {
      authUser.value = null;
      userId.value = null;
      bookmarks.value = [];
      friends.value = [];
      friendRequests.value = [];
      accountModalOpen.value = false;
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

  const resolveFormElement = () => {
    const exposed = formEl.value;
    return exposed?.formEl?.value || exposed?.formEl || exposed || null;
  };

  let el = resolveFormElement();
  if (!el) {
    formVisible.value = open;
    return;
  }

  if (open) {
    formVisible.value = true;
    await nextTick();
    el = resolveFormElement();
    if (!el) return;

    gsap.killTweensOf(el);
    gsap.set(el, {
      transformOrigin: "top center",
      transformPerspective: 800,
      backfaceVisibility: "hidden",
      willChange: "height,opacity,transform",
      overflow: "hidden",
    });
    const expandedHeight = el.scrollHeight;
    const tl = gsap.timeline();
    tl.fromTo(
      el,
      {
        height: 0,
        autoAlpha: 0,
        rotationX: -10,
        y: -8,
        scale: 0.985,
      },
      {
        height: expandedHeight,
        autoAlpha: 1,
        rotationX: 0,
        y: 0,
        scale: 1,
        duration: 0.62,
        ease: "expo.out",
      }
    ).to(el, {
      height: "auto",
      duration: 0.01,
      clearProps: "height,overflow,willChange,transformPerspective,backfaceVisibility",
    });
  } else {
    gsap.killTweensOf(el);
    const currentHeight = el.offsetHeight || el.scrollHeight;
    gsap.set(el, {
      height: currentHeight,
      transformOrigin: "top center",
      transformPerspective: 800,
      backfaceVisibility: "hidden",
      willChange: "height,opacity,transform",
      overflow: "hidden",
    });
    gsap.to(el, {
      height: 0,
      autoAlpha: 0,
      rotationX: -10,
      y: -6,
      scale: 0.985,
      duration: 0.5,
      ease: "expo.inOut",
      onComplete() {
        formVisible.value = false;
        // ensure inline animation styles are cleaned up
        el.style.height = "";
        el.style.overflow = "";
        el.style.willChange = "";
        el.style.transformPerspective = "";
        el.style.backfaceVisibility = "";
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
      :previewStyle="previewStyle"
      @update:themeDropdown="(val) => (themeDropdown = val)"
      @open-account="openAccountModal"
      @select-theme="selectTheme"
    />

    <AccountModal
      :open="accountModalOpen"
      :authUser="authUser"
      :bookmarks="bookmarks"
      :friends="friends"
      :friendsLoading="friendsLoading"
      :friendRequests="friendRequests"
      :requestsLoading="requestsLoading"
      :friendEmail="friendEmail"
      :shareEmail="shareEmail"
      :selectedBookmarkId="selectedShareBookmarkId"
      :actionError="accountActionError"
      :actionSuccess="accountActionSuccess"
      @close="closeAccountModal"
      @logout="logout"
      @update:friendEmail="(val) => (friendEmail = val)"
      @update:shareEmail="(val) => (shareEmail = val)"
      @update:selectedBookmarkId="(val) => (selectedShareBookmarkId = val)"
      @add-friend="addFriendByEmail"
      @remove-friend="removeFriend"
      @approve-request="approveFriendRequest"
      @delete-request="deleteFriendRequest"
      @share-bookmark="shareBookmarkByEmail"
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
