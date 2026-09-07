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
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { computed, nextTick, ref } from "vue";
import gsap from "gsap";
import { auth, db } from "../firebase";

// In-Memory Shared State (Singleton across routes)
const bookmarks = ref([]);
const bookmarksLoading = ref(true);
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
const authLoading = ref(true);
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
const collapsedFolders = ref({});
let isAuthInitialized = false;

// Helpers & Memoization
const domainCache = new Map();
export function getDomain(link) {
  if (!link) return "";
  if (domainCache.has(link)) return domainCache.get(link);
  try {
    const d = new URL(link).hostname.replace("www.", "");
    domainCache.set(link, d);
    return d;
  } catch (e) {
    domainCache.set(link, link);
    return link;
  }
}

const faviconCache = new Map();
export function faviconUrl(link) {
  if (!link) return "";
  if (faviconCache.has(link)) return faviconCache.get(link);
  const d = getDomain(link);
  const url = d ? `https://www.google.com/s2/favicons?domain=${d}&sz=64` : "";
  faviconCache.set(link, url);
  return url;
}

export function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

export function sharedBookmarkDocId(recipientUid, sourceBookmarkId) {
  return `shared_${recipientUid}_${sourceBookmarkId}`;
}

// Themes
const themes = ref([
  {
    name: "Obsidian Slate",
    type: "gradient",
    value: "linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e293b 100%)",
    accent: "#38bdf8",
  },
  {
    name: "Ocean Drift",
    type: "gradient",
    value: "linear-gradient(135deg, #0b1f3a 0%, #126e82 55%, #4fd3c4 100%)",
    accent: "#4fd3c4",
  },
  {
    name: "Cyberpunk Noir",
    type: "gradient",
    value: "linear-gradient(135deg, #180928 0%, #2b0938 50%, #090c1f 100%)",
    accent: "#c084fc",
  },
  {
    name: "Sunset Bloom",
    type: "gradient",
    value: "linear-gradient(135deg, #371b58 0%, #c84b31 55%, #fcbf49 100%)",
    accent: "#fb923c",
  },
  {
    name: "Mint Glow",
    type: "gradient",
    value: "linear-gradient(135deg, #0f2027 0%, #2c5364 45%, #7fffd4 100%)",
    accent: "#34d399",
  },
  {
    name: "Peach Mist",
    type: "gradient",
    value: "linear-gradient(135deg, #3a1c71 0%, #d76d77 48%, #ffaf7b 100%)",
    accent: "#f472b6",
  },
  {
    name: "Lagoon Sky",
    type: "gradient",
    value: "linear-gradient(135deg, #0b132b 0%, #1c2541 35%, #3a86ff 100%)",
    accent: "#60a5fa",
  },
  {
    name: "Aurora Veil",
    type: "gradient",
    value: "linear-gradient(135deg, #1f1147 0%, #006d77 45%, #83c5be 100%)",
    accent: "#2dd4bf",
  },
  {
    name: "Blush Cream",
    type: "gradient",
    value: "linear-gradient(135deg, #fdf0d5 0%, #f7cad0 40%, #cdb4db 100%)",
    accent: "#e879f9",
  },
  { name: "Default Image", type: "image", value: "/images/background.png" },
  { name: "Noir Gradient Image", type: "image", value: "/images/black-gd.jpg" },
]);

let _initialTheme = themes.value[0];
try {
  const stored = localStorage.getItem("selectedTheme");
  if (stored) {
    const found = themes.value.find((t) => t.name === stored);
    if (found) _initialTheme = found;
  }
} catch (e) {}

const selectedTheme = ref(_initialTheme);

export function useBookmarks() {
  const filteredBookmarks = computed(() => {
    if (!searchQuery.value) return bookmarks.value;
    const q = searchQuery.value.toLowerCase().trim();
    return bookmarks.value.filter((b) =>
      (b.name || "").toLowerCase().includes(q) ||
      (b.folderName || "").toLowerCase().includes(q) ||
      (b.link || "").toLowerCase().includes(q)
    );
  });

  const groupedBookmarks = computed(() => {
    const groups = {};
    filteredBookmarks.value.forEach((bookmark) => {
      const fName = bookmark.folderName && bookmark.folderName.trim() ? bookmark.folderName.trim() : "General";
      if (!groups[fName]) {
        groups[fName] = [];
      }
      groups[fName].push(bookmark);
    });

    const sortedGroups = {};
    Object.keys(groups)
      .sort((a, b) => groups[b].length - groups[a].length)
      .forEach((folder) => {
        sortedGroups[folder] = groups[folder];
      });

    return sortedGroups;
  });

  const allFoldersList = computed(() => {
    const set = new Set();
    bookmarks.value.forEach((b) => {
      if (b.folderName && b.folderName.trim()) set.add(b.folderName.trim());
    });
    return Array.from(set).sort();
  });

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

  async function findUserByEmail(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;

    const directQuery = query(
      collection(db, "users"),
      where("email", "==", normalized),
      limit(1)
    );
    const directSnap = await getDocs(directQuery);
    if (!directSnap.empty) {
      return directSnap.docs[0].data();
    }

    const rawQuery = query(
      collection(db, "users"),
      where("email", "==", email.trim()),
      limit(1)
    );
    const rawSnap = await getDocs(rawQuery);
    if (!rawSnap.empty) {
      return rawSnap.docs[0].data();
    }

    return null;
  }

  const loadBookmarks = async (uid) => {
    if (!uid) {
      bookmarksLoading.value = false;
      return;
    }
    bookmarksLoading.value = true;
    try {
      const q = query(collection(db, "bookmarks"), where("userId", "==", uid));
      const querySnapshot = await getDocs(q);
      bookmarks.value = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error loading bookmarks:", error);
    } finally {
      bookmarksLoading.value = false;
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
      console.warn("Shared bookmark backfill skipped:", error?.message || error);
    }
  };

  const addBookmark = async (customPayload) => {
    const fVal = customPayload?.folderName || folderName.value || "General";
    const uVal = customPayload?.name || urlName.value;
    const lVal = customPayload?.link || link.value;

    if (!uVal || !lVal) {
      alert("Please enter a bookmark title and URL");
      return;
    }

    try {
      if (editingId.value !== null && !customPayload) {
        const docRef = doc(db, "bookmarks", editingId.value);
        await updateDoc(docRef, {
          userId: userId.value,
          folderName: fVal,
          name: uVal,
          link: lVal,
        });

        const index = bookmarks.value.findIndex((b) => b.id === editingId.value);
        if (index !== -1) {
          bookmarks.value[index] = {
            id: editingId.value,
            folderName: fVal,
            name: uVal,
            link: lVal,
          };
        }
        editingId.value = null;
      } else {
        const docRef = await addDoc(collection(db, "bookmarks"), {
          userId: userId.value,
          folderName: fVal,
          name: uVal,
          link: lVal,
          createdAt: new Date(),
        });

        bookmarks.value.push({
          id: docRef.id,
          folderName: fVal,
          name: uVal,
          link: lVal,
        });
      }

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

  const deleteBookmark = async (id) => {
    if (confirm("Are you sure you want to delete this bookmark?")) {
      try {
        await deleteDoc(doc(db, "bookmarks", id));
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

  const openFirstResult = () => {
    if (filteredBookmarks.value.length > 0) {
      const firstBookmark = filteredBookmarks.value[0];
      window.open(firstBookmark.link, "_blank");
    }
  };

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
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: normalizeEmail(userCredential.user.email),
        uid: userCredential.user.uid,
        createdAt: new Date(),
      });
      authEmail.value = "";
      authPassword.value = "";
      accountModalOpen.value = false;
      await Promise.all([
        loadFriends(userCredential.user.uid),
        loadFriendRequests(userCredential.user.uid),
      ]);
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
      authEmail.value = "";
      authPassword.value = "";
      accountModalOpen.value = false;
      await Promise.all([
        loadBookmarks(userCredential.user.uid),
        loadFriends(userCredential.user.uid),
        loadFriendRequests(userCredential.user.uid),
      ]);
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

      accountModalOpen.value = false;
      await Promise.all([
        loadBookmarks(userCredential.user.uid),
        loadFriends(userCredential.user.uid),
        loadFriendRequests(userCredential.user.uid),
      ]);
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
      bookmarksLoading.value = false;
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

  const openShareModalForBookmark = (bookmark) => {
    selectedShareBookmarkId.value = bookmark.id;
    openAccountModal();
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
      accountActionError.value = "Failed to send friend request.";
    }
  };

  const removeFriend = async (friendUid) => {
    if (!confirm("Are you sure you want to remove this friend?")) return;
    accountActionError.value = "";
    accountActionSuccess.value = "";

    const currentUid = userId.value;
    if (!currentUid || !friendUid) return;

    try {
      await deleteDoc(doc(db, "users", currentUid, "friends", friendUid));
      await deleteDoc(doc(db, "users", friendUid, "friends", currentUid));
      friends.value = friends.value.filter((f) => f.uid !== friendUid);
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
    const currentEmail = normalizeEmail(authUser.value?.email);
    const requesterUid = request?.fromUid;
    const requesterEmail = normalizeEmail(request?.fromEmail);

    if (!currentUid || !requesterUid) return;

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
    if (!currentUid || !requesterUid) return;

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
      accountActionSuccess.value = "Friend request removed.";
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

    if (!ownerUid || !bookmarkId || !recipientEmail) {
      accountActionError.value = "Select a bookmark and recipient email.";
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

      accountActionSuccess.value = `Shared "${bookmark.name}" with ${recipient.email}!`;
    } catch (error) {
      console.error("Error sharing bookmark:", error);
      accountActionError.value = "Failed to share bookmark.";
    }
  };

  const collapseAllFolders = () => {
    Object.keys(groupedBookmarks.value).forEach((folder) => {
      collapsedFolders.value[folder] = true;
    });
  };

  const expandAllFolders = () => {
    Object.keys(groupedBookmarks.value).forEach((folder) => {
      collapsedFolders.value[folder] = false;
    });
  };

  const toggleFolderCollapse = async (folderName) => {
    collapsedFolders.value[folderName] = !collapsedFolders.value[folderName];

    if (!collapsedFolders.value[folderName]) {
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
          duration: 0.25,
          ease: "power2.out",
          stagger: 0.015,
        }
      );
    }
  };

  function initAuth() {
    if (isAuthInitialized) return;
    isAuthInitialized = true;

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        authUser.value = user;
        userId.value = user.uid;
        authLoading.value = false;
        await Promise.all([
          loadBookmarks(user.uid),
          backfillIncomingSharedBookmarks(user.uid),
          loadFriends(user.uid),
          loadFriendRequests(user.uid),
        ]);
      } else {
        authUser.value = null;
        userId.value = null;
        bookmarks.value = [];
        friends.value = [];
        friendRequests.value = [];
        accountModalOpen.value = false;
        authLoading.value = false;
        bookmarksLoading.value = false;
      }
    });
  }

  return {
    bookmarks,
    bookmarksLoading,
    searchQuery,
    folderName,
    urlName,
    link,
    editingId,
    formOpen,
    formVisible,
    formEl,
    searchInput,
    authUser,
    userId,
    authLoading,
    accountModalOpen,
    themeDropdown,
    authMode,
    authEmail,
    authPassword,
    authError,
    friends,
    friendsLoading,
    friendRequests,
    requestsLoading,
    friendEmail,
    shareEmail,
    selectedShareBookmarkId,
    accountActionError,
    accountActionSuccess,
    SHARED_FOLDER_NAME,
    collapsedFolders,
    themes,
    selectedTheme,
    filteredBookmarks,
    groupedBookmarks,
    allFoldersList,
    backgroundStyle,
    previewStyle,
    selectTheme,
    loadBookmarks,
    loadFriends,
    loadFriendRequests,
    addBookmark,
    editBookmark,
    deleteBookmark,
    clearForm,
    openFirstResult,
    signup,
    login,
    loginWithGoogle,
    logout,
    openAccountModal,
    openShareModalForBookmark,
    closeAccountModal,
    addFriendByEmail,
    removeFriend,
    approveFriendRequest,
    deleteFriendRequest,
    shareBookmarkByEmail,
    collapseAllFolders,
    expandAllFolders,
    toggleFolderCollapse,
    initAuth,
    faviconUrl,
    getDomain,
  };
}
