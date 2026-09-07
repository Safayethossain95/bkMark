<script setup>
import { onMounted, watch } from "vue";
import AccountModal from "../components/AccountModal.vue";
import BookmarkForm from "../components/BookmarkForm.vue";
import BookmarkList from "../components/BookmarkList.vue";
import HeaderControls from "../components/HeaderControls.vue";
import LoginPanel from "../components/LoginPanel.vue";
import SearchBar from "../components/SearchBar.vue";
import { useBookmarks } from "../composables/useBookmarks";

const {
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
  collapsedFolders,
  themes,
  selectedTheme,
  filteredBookmarks,
  groupedBookmarks,
  backgroundStyle,
  previewStyle,
  selectTheme,
  addBookmark,
  editBookmark,
  deleteBookmark,
  clearForm,
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
} = useBookmarks();

onMounted(() => {
  initAuth();

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
    class="min-h-screen bg-cover py-8 px-4 relative transition-all duration-500"
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

    <!-- Initial Auth Loading Spinner -->
    <div
      v-if="authLoading"
      class="absolute inset-0 flex items-center justify-center pointer-events-none"
    >
      <div class="relative flex items-center justify-center">
        <!-- Glowing subtle aura -->
        <div class="absolute h-14 w-14 rounded-full bg-cyan-400/20 blur-lg animate-pulse"></div>
        <!-- Animated Spinner Ring -->
        <div
          class="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400"
        ></div>
      </div>
    </div>

    <!-- Authenticated App View -->
    <div class="max-w-6xl mx-auto lg:pt-[80px]" v-else-if="authUser">
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
        :loading="bookmarksLoading"
        @edit="editBookmark"
        @delete="deleteBookmark"
        @share="openShareModalForBookmark"
        @toggle-folder="toggleFolderCollapse"
        @expand-all="expandAllFolders"
        @collapse-all="collapseAllFolders"
      />
    </div>

    <!-- Unauthenticated View (Login Panel) -->
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
