# bkMark Chrome & Edge Extension

A browser extension to save, organize, and categorize bookmarks directly to your **[bkMark App](https://bk-mark.vercel.app/)** with a single click.

---

## Features

- **Google Sign-In & Email Sign-In**: 1-click authentication using your Google account (via bkMark web integration) or email & password.
- **Instant Tab Detection**: Automatically pulls the current active tab's page title, URL, domain, and favicon.
- **Direct Cloud Sync**: Connects securely to the bkMark Firebase Firestore backend to save bookmarks in real-time.
- **Google Keep Styling**: Choose from authentic Google Keep color themes (White, Coral, Peach, Sand, Mint, Sage, Fog, Storm, Dusk, Blossom, Clay).
- **Folders & Labels**: Assign bookmarks to folders with one-click quick chips (`General`, `Work`, `Reading`, `Dev`, `Design`) or custom labels.
- **Notes & Pinning**: Add notes and pin important bookmarks directly to the top.
- **Dark / Light Mode**: Automatically adapts to your system theme with a manual toggle in the header.
- **Seamless Web App Integration**: 1-click shortcut to view bookmarks directly on [https://bk-mark.vercel.app/](https://bk-mark.vercel.app/).

---

## Installation Guide (Chrome & Microsoft Edge)

### In Google Chrome:
1. Open Google Chrome.
2. Navigate to `chrome://extensions/` in your address bar (or go to **Menu (⋮)** > **Extensions** > **Manage Extensions**).
3. In the top-right corner, turn on **Developer mode**.
4. Click the **Load unpacked** button in the top-left corner.
5. Select the `extension` folder located at:
   ```
   d:\Safayet\Personal\bkMark\extension
   ```
6. Click the puzzle icon in Chrome's toolbar and **pin** the **bkMark** extension icon for easy access.

---

### In Microsoft Edge:
1. Open Microsoft Edge.
2. Navigate to `edge://extensions/` in your address bar.
3. In the left sidebar (or bottom-left), toggle on **Developer mode**.
4. Click the **Load unpacked** button at the top.
5. Select the `extension` folder located at:
   ```
   d:\Safayet\Personal\bkMark\extension
   ```
6. Click the extension puzzle icon and click the **Show in toolbar** (eye) icon to pin it.

---

## How to Use

1. Click the **bkMark** extension icon in your browser toolbar while viewing any web page.
2. **First Time Authentication**:
   - Click **Continue with Google** for 1-click Google Sign-In, or enter your Email and Password.
   - Your session is securely preserved in the extension.
3. The popup will automatically prefill:
   - Page Title
   - Page URL
   - Domain and Favicon
4. Select a **Folder / Label**, pick a **Card Color**, add optional **Notes**, or toggle **Pin to top**.
5. Click **Add to bkMark** (or press <kbd>Enter</kbd>).
6. Your bookmark is immediately stored in your cloud collection and visible at [https://bk-mark.vercel.app/](https://bk-mark.vercel.app/).
