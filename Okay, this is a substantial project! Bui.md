Okay, this is a substantial project! Building a full-featured Chrome extension like "Later-List" involves several interconnected parts: the popup UI (React), background scripts for persistent logic and event handling, content scripts for interacting with web pages, and the manifest file to tie it all together.

We'll use **React** with **Vite** for the frontend (popup UI), **Zustand** for state management (simpler than Redux for this scale), and **react-beautiful-dnd** for drag-and-drop.

**Disclaimer:** This code is extensive and aims to be complete based on your requirements. However, debugging, edge-case handling, comprehensive styling, and robust error management in a real-world application would require further refinement. This provides a strong foundation.

---

**Step 1: Project Setup**

1.  **Install Node.js and npm/yarn:** If you haven't already, download and install Node.js (which includes npm) from [https://nodejs.org/](https://nodejs.org/).
2.  **Create Project:** Open your terminal or command prompt and run:
    ```bash
    npm create vite@latest later-list --template react
    cd later-list
    ```
3.  **Install Dependencies:**
    ```bash
    npm install zustand react-beautiful-dnd uuid @types/chrome @types/uuid @types/react-beautiful-dnd react-icons
    npm install -D @crxjs/vite-plugin@beta # For easier extension development with Vite
    ```
4.  **Configure Vite for Chrome Extensions:** Replace the contents of `vite.config.js` with:
    ```javascript
    // vite.config.js
    import { defineConfig } from 'vite'
    import react from '@vitejs/plugin-react'
    import { crx } from '@crxjs/vite-plugin'
    import manifest from './manifest.json' // Import the manifest

    export default defineConfig({
      plugins: [
        react(),
        crx({ manifest }), // Use crx plugin with manifest
      ],
      // Optional: Configure server port if needed, etc.
      server: {
        port: 3000, // Example port
        strictPort: true,
        hmr: {
          port: 3000,
        }
      },
      // Needed for Zustand + Chrome Extension Storage compatibility
      build: {
        rollupOptions: {
          output: {
             // Reduce chunking issues in extensions
            manualChunks: undefined,
          }
        }
      }
    })
    ```
5.  **Create `manifest.json`:** Create a `manifest.json` file in the project root (`later-list/`). This is the core configuration file for the extension.
6.  **Create Background & Content Scripts:** Create placeholder files: `src/background.js` and `src/content.js`.

---

**Step 2: `manifest.json`**

```json
// manifest.json
{
  "manifest_version": 3,
  "name": "Later-List",
  "version": "1.0.0",
  "description": "A 'read later' extension with tabs, containers, and drag-and-drop.",
  "permissions": [
    "storage",      // To save user data
    "tabs",         // To open links in new tabs, get current tab URL/title
    "contextMenus", // For the right-click menu
    "scripting",    // To inject content scripts programmatically if needed
    "activeTab"     // Often needed with scripting/tabs access
    // "favicon" permission is implied/handled via other means usually (like direct fetch)
  ],
  "background": {
    "service_worker": "src/background.js",
    "type": "module" // Important for using ES modules in background
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"], // Run on all websites
      "js": ["src/content.js"],
      "run_at": "document_start" // Run early to catch context menu events
    }
  ],
  "action": {
    "default_popup": "index.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

*   **Create Icons:** Create an `icons` folder in the `public` directory and add `icon16.png`, `icon48.png`, and `icon128.png`. You can find placeholder icons online or create your own.

---

**Step 3: Background Script (`src/background.js`)**

```javascript
// src/background.js
import { v4 as uuidv4 } from 'uuid';

const CONTEXT_MENU_ID = "laterListContextMenu";

// --- Helper Functions ---
async function getStorageData() {
  const result = await chrome.storage.local.get(['tabs', 'containers', 'links', 'firstUse']);
  return {
    tabs: result.tabs || [],
    containers: result.containers || {},
    links: result.links || {},
    firstUse: result.firstUse === undefined ? true : result.firstUse, // Default to true
  };
}

async function saveStorageData(data) {
  await chrome.storage.local.set(data);
}

async function getDefaultData() {
    const tabId1 = uuidv4();
    const tabId2 = uuidv4();
    const containerId1 = uuidv4();
    const containerId2 = uuidv4();
    const containerId3 = uuidv4();
    const archiveContainerId = 'archive'; // Fixed ID
    const trashContainerId = 'trash';     // Fixed ID

    const linkId1 = uuidv4();
    const linkId2 = uuidv4();
    const linkId3 = uuidv4();

    return {
        tabs: [
            { id: tabId1, name: 'Reading List', containerIds: [containerId1, containerId2] },
            { id: tabId2, name: 'Interesting Finds', containerIds: [containerId3] },
        ],
        containers: {
            [containerId1]: { id: containerId1, name: 'Tech News', linkIds: [linkId1] },
            [containerId2]: { id: containerId2, name: 'Tutorials', linkIds: [linkId2] },
            [containerId3]: { id: containerId3, name: 'Cool Tools', linkIds: [linkId3] },
            [archiveContainerId]: { id: archiveContainerId, name: 'Archive', linkIds: [] },
            [trashContainerId]: { id: trashContainerId, name: 'Trash', linkIds: [] },
        },
        links: {
            [linkId1]: {
                id: linkId1,
                url: 'https://react.dev/',
                title: 'React – A JavaScript library for building user interfaces',
                faviconUrl: `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent('https://react.dev/')}`,
                originalTabId: tabId1,
                originalContainerId: containerId1,
                addedDate: Date.now(),
            },
            [linkId2]: {
                id: linkId2,
                url: 'https://vitejs.dev/',
                title: 'Vite | Next Generation Frontend Tooling',
                faviconUrl: `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent('https://vitejs.dev/')}`,
                originalTabId: tabId1,
                originalContainerId: containerId2,
                addedDate: Date.now(),
            },
            [linkId3]: {
                id: linkId3,
                url: 'https://zustand-demo.pmnd.rs/',
                title: 'Zustand - Demo',
                faviconUrl: `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent('https://zustand-demo.pmnd.rs/')}`,
                originalTabId: tabId2,
                originalContainerId: containerId3,
                addedDate: Date.now(),
            },
        },
        firstUse: false, // Mark first use as done
        viewMode: 'list', // Default view mode
    };
}


// --- Event Listeners ---

// Setup on install/update
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("Later-List: onInstalled event triggered", details.reason);

  // Setup context menu
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: "Save to Later-List",
    contexts: ["page", "link", "selection"], // Show for page, links, selected text
  });

  // Check if it's the first install
  const { firstUse } = await getStorageData();
  if (firstUse) {
    console.log("Later-List: First installation detected. Setting up default data.");
    const defaultData = await getDefaultData();
    await saveStorageData(defaultData);
    console.log("Later-List: Default data saved.");
  } else {
    console.log("Later-List: Not first install or update.");
     // You might want to handle updates here (e.g., migrating data structures)
     // For now, we just ensure the context menu exists
  }
});

// Listen for context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === CONTEXT_MENU_ID) {
    console.log("Later-List: Context menu clicked", info);

    const urlToAdd = info.linkUrl || info.pageUrl; // Prefer link URL if available
    const pageTitle = tab?.title || "Untitled Page"; // Get title from the tab

    // Send message to content script to show the selection popup
    try {
        if (tab?.id) {
             console.log(`Later-List: Sending message to tab ${tab.id} to show save dialog`);
             await chrome.tabs.sendMessage(tab.id, {
                type: "SHOW_SAVE_DIALOG",
                payload: {
                    url: urlToAdd,
                    title: pageTitle, // Send current page title as default
                }
            });
            console.log(`Later-List: Message sent successfully to tab ${tab.id}`);
        } else {
             console.error("Later-List: Could not get tab ID to send message.");
             // Fallback: Add to a default location immediately? Or show error?
             // For now, we'll rely on the content script message.
        }
    } catch (error) {
         console.error("Later-List: Error sending message to content script:", error);
         // This might happen if the content script isn't ready or injected properly.
         // Fallback: Add to the first container of the first tab as a last resort
         console.warn("Later-List: Falling back to adding link to default location.");
         await addLinkToDefaultLocation(urlToAdd, pageTitle);
    }
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Later-List: Message received in background", request);

  // Handle async operations properly by returning true
  if (request.type === "GET_TABS_AND_CONTAINERS") {
    (async () => {
      try {
        const { tabs, containers } = await getStorageData();
        // Filter out special containers (archive, trash) for the selection dialog
        const userContainers = {};
        Object.keys(containers).forEach(key => {
            if (key !== 'archive' && key !== 'trash') {
                userContainers[key] = containers[key];
            }
        });
        sendResponse({ success: true, data: { tabs, containers: userContainers } });
      } catch (error) {
        console.error("Later-List: Error getting tabs/containers:", error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Indicates async response
  }

  if (request.type === "SAVE_LINK") {
    (async () => {
      const { url, title, tabId, containerId } = request.payload;
      if (!url || !tabId || !containerId) {
        console.error("Later-List: Missing data for SAVE_LINK", request.payload);
        sendResponse({ success: false, error: "Missing data" });
        return;
      }
      try {
        const data = await getStorageData();
        const newLinkId = uuidv4();
        const faviconUrl = `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(url)}`; // Simple favicon fetching

        // Add link to links object
        data.links[newLinkId] = {
          id: newLinkId,
          url: url,
          title: title || url, // Use URL as fallback title
          faviconUrl: faviconUrl,
          originalTabId: tabId,
          originalContainerId: containerId,
          addedDate: Date.now(),
        };

        // Add link ID to the specified container's linkIds array
        if (data.containers[containerId]) {
          // Ensure linkIds exists and is an array
          if (!Array.isArray(data.containers[containerId].linkIds)) {
            data.containers[containerId].linkIds = [];
          }
           // Add to the beginning (newest first)
          data.containers[containerId].linkIds.unshift(newLinkId);
        } else {
          console.error(`Later-List: Target container ${containerId} not found.`);
           // Optionally handle this error, maybe add to a default container?
           // For now, we'll let it fail to indicate a problem.
           sendResponse({ success: false, error: `Container ${containerId} not found.` });
           return;
        }

        await saveStorageData(data);
        console.log("Later-List: Link saved successfully", newLinkId);
        sendResponse({ success: true });
      } catch (error) {
        console.error("Later-List: Error saving link:", error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Indicates async response
  }

   // --- Fallback function in case content script messaging fails ---
   async function addLinkToDefaultLocation(url, title) {
    try {
        let data = await getStorageData();
        let targetTabId = null;
        let targetContainerId = null;

        // Find the first user tab and its first container
        if (data.tabs.length > 0) {
            const firstTab = data.tabs[0];
            targetTabId = firstTab.id;
            if (firstTab.containerIds.length > 0) {
                targetContainerId = firstTab.containerIds[0];
            }
        }

        // If no suitable container found, create a default one? Or log error?
        if (!targetTabId || !targetContainerId) {
            console.error("Later-List: Could not find a default location to save the link.");
            // Optional: Create a default tab/container if none exist
            // if (data.tabs.length === 0) { ... create tab ... }
            // else if (!targetContainerId) { ... create container ... }
            return; // Exit if no location found/created
        }

        const newLinkId = uuidv4();
        const faviconUrl = `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(url)}`;

        // Add link to links object
        data.links[newLinkId] = {
          id: newLinkId,
          url: url,
          title: title || url,
          faviconUrl: faviconUrl,
          originalTabId: targetTabId,
          originalContainerId: targetContainerId,
          addedDate: Date.now(),
        };

        // Add link ID to the target container
        if (!data.containers[targetContainerId]) {
            // Should not happen if logic above is correct, but safeguard
            data.containers[targetContainerId] = { id: targetContainerId, name: "Default Container", linkIds: []};
             // Also ensure this container ID is in the tab's list
            const tab = data.tabs.find(t => t.id === targetTabId);
            if (tab && !tab.containerIds.includes(targetContainerId)) {
                tab.containerIds.push(targetContainerId);
            }
        }
         if (!Array.isArray(data.containers[targetContainerId].linkIds)) {
            data.containers[targetContainerId].linkIds = [];
         }
        data.containers[targetContainerId].linkIds.unshift(newLinkId); // Add to beginning

        await saveStorageData(data);
        console.log(`Later-List: Link saved to default location (Tab: ${targetTabId}, Container: ${targetContainerId})`, newLinkId);

    } catch (error) {
        console.error("Later-List: Error saving link to default location:", error);
    }
   }


  // Return false for synchronous message handlers or if the message type isn't handled here
  // return false; // Not needed if all paths return true or throw
});

console.log("Later-List: Background script loaded.");

```

---

**Step 4: Content Script (`src/content.js`)**

This script handles the Ctrl+Right-click interaction and displays a small modal/popup.

```javascript
// src/content.js

let linkToSave = null;
let saveDialogElement = null;

console.log("Later-List: Content script loaded.");

// --- Helper: Create Save Dialog ---
function createSaveDialog(url, title, tabs, containers) {
    if (saveDialogElement) {
        saveDialogElement.remove(); // Remove existing dialog if any
    }

    saveDialogElement = document.createElement('div');
    saveDialogElement.id = 'later-list-save-dialog';
    saveDialogElement.style.position = 'fixed';
    saveDialogElement.style.top = '20px';
    saveDialogElement.style.right = '20px';
    saveDialogElement.style.zIndex = '999999'; // High z-index
    saveDialogElement.style.backgroundColor = '#2d3748'; // Dark background
    saveDialogElement.style.color = '#e2e8f0'; // Light text
    saveDialogElement.style.border = '1px solid #4a5568';
    saveDialogElement.style.borderRadius = '8px';
    saveDialogElement.style.padding = '20px';
    saveDialogElement.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
    saveDialogElement.style.fontFamily = 'sans-serif';
    saveDialogElement.style.fontSize = '14px';
    saveDialogElement.style.maxWidth = '300px';

    let tabsOptions = '<option value="">Select Tab...</option>';
    tabs.forEach(tab => {
        tabsOptions += `<option value="${tab.id}">${tab.name}</option>`;
    });

    // Initial containers dropdown (will be updated when tab changes)
    let containersOptions = '<option value="">Select Container...</option>';

    saveDialogElement.innerHTML = `
        <h3 style="margin-top: 0; margin-bottom: 15px; color: #a0aec0; font-size: 16px; font-weight: 600;">Save to Later-List</h3>
        <div style="margin-bottom: 10px;">
            <label style="display: block; margin-bottom: 5px; color: #cbd5e0;">URL:</label>
            <input type="text" id="later-list-url" value="${url}" readonly style="width: 95%; padding: 8px; border: 1px solid #4a5568; background-color: #1a202c; color: #e2e8f0; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 10px;">
            <label style="display: block; margin-bottom: 5px; color: #cbd5e0;">Title:</label>
            <input type="text" id="later-list-title" value="${title}" style="width: 95%; padding: 8px; border: 1px solid #4a5568; background-color: #1a202c; color: #e2e8f0; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 10px;">
            <label style="display: block; margin-bottom: 5px; color: #cbd5e0;">Tab:</label>
            <select id="later-list-tab-select" style="width: 100%; padding: 8px; border: 1px solid #4a5568; background-color: #1a202c; color: #e2e8f0; border-radius: 4px;">
                ${tabsOptions}
            </select>
        </div>
        <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; color: #cbd5e0;">Container:</label>
            <select id="later-list-container-select" style="width: 100%; padding: 8px; border: 1px solid #4a5568; background-color: #1a202c; color: #e2e8f0; border-radius: 4px;" disabled>
                ${containersOptions}
            </select>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button id="later-list-cancel-btn" style="padding: 8px 15px; border: none; background-color: #4a5568; color: #e2e8f0; border-radius: 4px; cursor: pointer;">Cancel</button>
            <button id="later-list-save-btn" style="padding: 8px 15px; border: none; background-color: #3182ce; color: white; border-radius: 4px; cursor: pointer;" disabled>Save</button>
        </div>
    `;

    document.body.appendChild(saveDialogElement);

    // --- Add Event Listeners for the Dialog ---
    const tabSelect = saveDialogElement.querySelector('#later-list-tab-select');
    const containerSelect = saveDialogElement.querySelector('#later-list-container-select');
    const saveButton = saveDialogElement.querySelector('#later-list-save-btn');
    const cancelButton = saveDialogElement.querySelector('#later-list-cancel-btn');
    const titleInput = saveDialogElement.querySelector('#later-list-title');

    // Update container dropdown when tab changes
    tabSelect.addEventListener('change', (e) => {
        const selectedTabId = e.target.value;
        containerSelect.innerHTML = '<option value="">Select Container...</option>'; // Reset
        containerSelect.disabled = true;
        saveButton.disabled = true;

        if (selectedTabId) {
            const selectedTab = tabs.find(t => t.id === selectedTabId);
            if (selectedTab && selectedTab.containerIds && selectedTab.containerIds.length > 0) {
                 selectedTab.containerIds.forEach(containerId => {
                     const container = containers[containerId];
                     if (container) { // Check if container exists
                         containerSelect.innerHTML += `<option value="${container.id}">${container.name}</option>`;
                     } else {
                         console.warn(`Later-List: Container ID ${containerId} not found in containers object for tab ${selectedTabId}`);
                     }
                 });
                containerSelect.disabled = false;
            } else {
                 containerSelect.innerHTML = '<option value="">No containers in this tab</option>';
                 // Keep it disabled
            }
        }
         // Re-check save button state after potential container change
         checkSaveButtonState();
    });

    // Enable save button only when both tab and container are selected
    containerSelect.addEventListener('change', checkSaveButtonState);
    tabSelect.addEventListener('change', checkSaveButtonState); // Also check on tab change

    function checkSaveButtonState() {
        const selectedTabId = tabSelect.value;
        const selectedContainerId = containerSelect.value;
        saveButton.disabled = !selectedTabId || !selectedContainerId;
    }


    // Handle Save
    saveButton.addEventListener('click', async () => {
        const finalUrl = url; // Use the initially captured URL
        const finalTitle = titleInput.value || url; // Get current value from input
        const selectedTabId = tabSelect.value;
        const selectedContainerId = containerSelect.value;

        if (!selectedTabId || !selectedContainerId) return; // Should be disabled, but safety check

        try {
            console.log("Later-List: Sending SAVE_LINK message", { url: finalUrl, title: finalTitle, tabId: selectedTabId, containerId: selectedContainerId });
            const response = await chrome.runtime.sendMessage({
                type: "SAVE_LINK",
                payload: {
                    url: finalUrl,
                    title: finalTitle,
                    tabId: selectedTabId,
                    containerId: selectedContainerId,
                }
            });
             console.log("Later-List: SAVE_LINK response", response);
            if (response?.success) {
                console.log("Later-List: Link saved successfully via content script dialog.");
                // Optionally show a success message briefly
            } else {
                console.error("Later-List: Failed to save link:", response?.error || "Unknown error");
                alert(`Failed to save link: ${response?.error || "Unknown error"}`);
            }
        } catch (error) {
            console.error("Later-List: Error sending SAVE_LINK message:", error);
            alert(`Error saving link: ${error.message}`);
        } finally {
             closeSaveDialog(); // Close dialog regardless of success/failure
        }
    });

    // Handle Cancel
    cancelButton.addEventListener('click', closeSaveDialog);

     // Close dialog if clicked outside
    document.addEventListener('click', handleOutsideClick, true); // Use capture phase
}

function closeSaveDialog() {
    if (saveDialogElement) {
        saveDialogElement.remove();
        saveDialogElement = null;
    }
    linkToSave = null; // Reset captured link
    document.removeEventListener('click', handleOutsideClick, true);
}

function handleOutsideClick(event) {
    if (saveDialogElement && !saveDialogElement.contains(event.target)) {
        closeSaveDialog();
    }
}


// --- Listen for Ctrl+Right-click ---
document.addEventListener('contextmenu', (event) => {
    // Check if Ctrl key (or Cmd on Mac) is pressed
    if (event.ctrlKey || event.metaKey) {
        let targetElement = event.target;
        let potentialLink = null;

        // Traverse up the DOM to find the nearest link element if clicked inside one
        while (targetElement && targetElement.tagName !== 'A') {
            targetElement = targetElement.parentElement;
        }

        if (targetElement && targetElement.tagName === 'A') {
            potentialLink = targetElement.href; // Get URL from link
            console.log("Later-List: Ctrl+Click detected on link:", potentialLink);
        } else {
            potentialLink = window.location.href; // Get current page URL
            console.log("Later-List: Ctrl+Click detected on page:", potentialLink);
        }

        if (potentialLink) {
            event.preventDefault(); // Prevent default context menu
            linkToSave = {
                url: potentialLink,
                // Try to get a sensible title (link text or page title)
                title: (targetElement && targetElement.tagName === 'A' ? targetElement.textContent.trim() : document.title) || potentialLink
            };
            console.log("Later-List: Link captured, requesting data for save dialog...", linkToSave);

            // Request tab/container data from background script
            chrome.runtime.sendMessage({ type: "GET_TABS_AND_CONTAINERS" })
                .then(response => {
                     console.log("Later-List: Received data for save dialog", response);
                    if (response?.success && linkToSave) { // Check linkToSave again in case user clicked elsewhere quickly
                        createSaveDialog(linkToSave.url, linkToSave.title, response.data.tabs, response.data.containers);
                    } else {
                        console.error("Later-List: Failed to get data for save dialog or linkToSave is null.", response?.error);
                        // Optionally show an error to the user here
                         alert(`Later-List Error: Could not retrieve save locations. ${response?.error || ''}`);
                    }
                })
                .catch(error => {
                    console.error("Later-List: Error requesting data for save dialog:", error);
                     alert(`Later-List Error: Could not contact background script. ${error.message}`);
                });
        }
    }
}, true); // Use capture phase to potentially catch event earlier


// --- Listen for messages from the Background script ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Later-List: Message received in content script", request);
    if (request.type === "SHOW_SAVE_DIALOG") {
         console.log("Later-List: Received SHOW_SAVE_DIALOG request.");
        const { url, title } = request.payload;
        linkToSave = { url, title }; // Store it temporarily

        // Request tab/container data from background script
         chrome.runtime.sendMessage({ type: "GET_TABS_AND_CONTAINERS" })
             .then(response => {
                 console.log("Later-List: Received data for save dialog (triggered by background)", response);
                 if (response?.success && linkToSave) {
                     createSaveDialog(linkToSave.url, linkToSave.title, response.data.tabs, response.data.containers);
                     sendResponse({ success: true }); // Acknowledge showing the dialog
                 } else {
                     console.error("Later-List: Failed to get data for save dialog (triggered by background).", response?.error);
                     sendResponse({ success: false, error: response?.error || "Failed to get data"});
                 }
             })
             .catch(error => {
                 console.error("Later-List: Error requesting data for save dialog (triggered by background):", error);
                 sendResponse({ success: false, error: error.message });
             });

        return true; // Indicates async response will be sent
    }
    // Handle other message types if needed
});

// Clean up dialog if the page unloads unexpectedly
window.addEventListener('beforeunload', () => {
    closeSaveDialog();
});
```

---

**Step 5: React App Structure and State (Zustand)**

1.  **`public/index.html`:** Update the HTML file.
    ```html
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" type="image/png" href="/icons/icon16.png" />
        <title>Later-List</title>
        <style>
          /* Basic dark mode body styles */
          body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
              'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
              sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            background-color: #1a202c; /* Dark background */
            color: #e2e8f0; /* Light text */
            min-width: 500px; /* Minimum width for the popup */
            min-height: 400px; /* Minimum height */
            overflow-x: hidden; /* Prevent horizontal scroll */
          }
          /* Add scrollbar styling for dark mode */
           ::-webkit-scrollbar { width: 8px; }
           ::-webkit-scrollbar-track { background: #2d3748; }
           ::-webkit-scrollbar-thumb { background: #4a5568; border-radius: 4px; }
           ::-webkit-scrollbar-thumb:hover { background: #718096; }
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script type="module" src="/src/main.jsx"></script>
      </body>
    </html>
    ```

2.  **`src/main.jsx`:** Entry point for React.
    ```jsx
    import React from 'react'
    import ReactDOM from 'react-dom/client'
    import App from './App'
    import './index.css' // Main CSS file

    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
    ```

3.  **`src/index.css`:** Basic global styles and dark mode variables.
    ```css
    /* src/index.css */
    :root {
      /* Dark Theme Colors */
      --bg-primary: #1a202c;
      --bg-secondary: #2d3748;
      --bg-tertiary: #4a5568;
      --text-primary: #e2e8f0;
      --text-secondary: #a0aec0;
      --text-muted: #718096;
      --border-color: #4a5568;
      --accent-color: #3182ce; /* Blue accent */
      --accent-hover: #2b6cb0;
      --danger-color: #e53e3e; /* Red for delete/trash */
      --danger-hover: #c53030;
      --success-color: #38a169; /* Green for restore */
      --success-hover: #2f855a;
      --archive-color: #d69e2e; /* Yellow/Orange for archive */
      --archive-hover: #b7791f;

      --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
                   'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
                   sans-serif;

      /* Transitions */
      --transition-fast: all 0.15s ease-in-out;
      --transition-normal: all 0.3s ease-in-out;
    }

    body {
      background-color: var(--bg-primary);
      color: var(--text-primary);
      font-family: var(--font-sans);
      margin: 0;
      font-size: 14px;
       /* Ensure body takes up height for potential empty states */
       min-height: 100vh;
       box-sizing: border-box;
    }

    *, *::before, *::after {
      box-sizing: inherit;
    }

    a {
      color: var(--accent-color);
      text-decoration: none;
      transition: var(--transition-fast);
    }

    a:hover {
      color: var(--accent-hover);
      text-decoration: underline;
    }

    button {
      font-family: inherit;
      cursor: pointer;
      border-radius: 4px;
      padding: 6px 12px;
      font-size: 13px;
      transition: var(--transition-fast);
      border: 1px solid transparent;
    }

    /* Basic Button Styles */
    .button-primary {
      background-color: var(--accent-color);
      color: white;
      border-color: var(--accent-color);
    }
    .button-primary:hover { background-color: var(--accent-hover); border-color: var(--accent-hover); }

    .button-secondary {
      background-color: var(--bg-tertiary);
      color: var(--text-primary);
      border-color: var(--bg-tertiary);
    }
    .button-secondary:hover { background-color: #667386; border-color: #667386;} /* Slightly lighter hover */

    .button-danger {
        background-color: var(--danger-color);
        color: white;
        border-color: var(--danger-color);
    }
    .button-danger:hover { background-color: var(--danger-hover); border-color: var(--danger-hover); }

    .button-icon {
      background: none;
      border: none;
      padding: 4px;
      color: var(--text-secondary);
      line-height: 1; /* Prevent extra space */
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .button-icon:hover { color: var(--text-primary); background-color: var(--bg-secondary); }


    input[type="text"],
    input[type="url"],
    input[type="file"],
    select {
      background-color: var(--bg-secondary);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
      padding: 8px 10px;
      border-radius: 4px;
      font-size: 14px;
      width: 100%; /* Default to full width */
    }

    input[type="text"]:focus,
    input[type="url"]:focus,
    select:focus {
      outline: none;
      border-color: var(--accent-color);
      box-shadow: 0 0 0 2px rgba(49, 130, 206, 0.5); /* Focus ring */
    }

    /* react-beautiful-dnd specific styles */
    .dragging-link {
       opacity: 0.8;
       transform: rotate(3deg);
       box-shadow: 0 5px 15px rgba(0,0,0,0.2);
       background-color: var(--bg-tertiary) !important; /* Ensure visibility */
    }
     .dragging-container {
       opacity: 0.9;
       background-color: var(--bg-secondary) !important;
       border: 1px dashed var(--accent-color);
       box-shadow: 0 8px 20px rgba(0,0,0,0.25);
    }

    /* Placeholder styles for drop zones */
    .drop-placeholder {
        background-color: rgba(49, 130, 206, 0.1); /* Light blueish placeholder */
        border: 1px dashed var(--accent-color);
        min-height: 40px; /* Ensure placeholder has some height */
        margin: 5px 0; /* Match item margins */
        border-radius: 4px;
    }

    /* Animations */
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .fade-in {
      animation: fadeIn 0.3s ease-in-out;
    }

    /* Utility Classes */
    .visually-hidden {
      border: 0;
      clip: rect(0 0 0 0);
      height: 1px;
      margin: -1px;
      overflow: hidden;
      padding: 0;
      position: absolute;
      width: 1px;
      white-space: nowrap; /* 1 */
    }

    .flex-center {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .space-between {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    ```

4.  **`src/store/useStore.js`:** Zustand store for managing application state.
    ```javascript
    import { create } from 'zustand';
    import { persist, createJSONStorage } from 'zustand/middleware';
    import { v4 as uuidv4 } from 'uuid';

    // Helper for Chrome Extension Storage
    const chromeStorage = {
      getItem: async (name) => {
        // console.log(`Getting item ${name} from chrome.storage`);
        const result = await chrome.storage.local.get([name]);
        // console.log(`Got result for ${name}:`, result);
        return result[name] ?? null; // Return null if undefined
      },
      setItem: async (name, value) => {
        // console.log(`Setting item ${name} in chrome.storage:`, value);
        await chrome.storage.local.set({ [name]: value });
        // console.log(`Item ${name} set successfully.`);
      },
      removeItem: async (name) => {
        // console.log(`Removing item ${name} from chrome.storage`);
        await chrome.storage.local.remove(name);
        // console.log(`Item ${name} removed successfully.`);
      },
    };


    // Define fixed IDs for special containers
    const ARCHIVE_CONTAINER_ID = 'archive';
    const TRASH_CONTAINER_ID = 'trash';

    const useStore = create(
      persist(
        (set, get) => ({
          // --- State ---
          tabs: [], // { id, name, containerIds: [] }
          containers: {}, // { [id]: { id, name, linkIds: [] } }
          links: {}, // { [id]: { id, url, title, faviconUrl, originalTabId, originalContainerId, addedDate } }
          viewMode: 'list', // 'list' or 'favicon'
          activeTabId: null,
          isLoading: true, // Start in loading state
          firstUse: true, // Determined by background script on install

          // --- Actions ---
          loadInitialData: async () => {
            set({ isLoading: true });
            try {
              const result = await chrome.storage.local.get([
                'tabs', 'containers', 'links', 'viewMode', 'firstUse'
              ]);
              console.log("Zustand: Loaded data from storage:", result);

              const tabs = result.tabs || [];
              const containers = result.containers || {
                  [ARCHIVE_CONTAINER_ID]: { id: ARCHIVE_CONTAINER_ID, name: 'Archive', linkIds: [] },
                  [TRASH_CONTAINER_ID]: { id: TRASH_CONTAINER_ID, name: 'Trash', linkIds: [] },
              };
              // Ensure special containers exist
              if (!containers[ARCHIVE_CONTAINER_ID]) {
                 containers[ARCHIVE_CONTAINER_ID] = { id: ARCHIVE_CONTAINER_ID, name: 'Archive', linkIds: [] };
              }
               if (!containers[TRASH_CONTAINER_ID]) {
                 containers[TRASH_CONTAINER_ID] = { id: TRASH_CONTAINER_ID, name: 'Trash', linkIds: [] };
              }

              set({
                tabs: tabs,
                containers: containers,
                links: result.links || {},
                viewMode: result.viewMode || 'list',
                activeTabId: tabs.length > 0 ? tabs[0].id : null,
                firstUse: result.firstUse === undefined ? true : result.firstUse,
                isLoading: false,
              });
            } catch (error) {
              console.error("Zustand: Error loading data from storage:", error);
              set({ isLoading: false }); // Still finish loading on error
              // Handle error state appropriately in UI
            }
          },

          // --- Tab Management ---
          addTab: (name) => {
            const newTabId = uuidv4();
            set((state) => ({
              tabs: [...state.tabs, { id: newTabId, name: name || 'New Tab', containerIds: [] }],
              activeTabId: state.activeTabId === null ? newTabId : state.activeTabId, // Activate if it's the first tab
            }));
          },
          renameTab: (tabId, newName) => {
            set((state) => ({
              tabs: state.tabs.map((tab) =>
                tab.id === tabId ? { ...tab, name: newName } : tab
              ),
            }));
          },
          deleteTab: (tabId) => {
            set((state) => {
              const tabToDelete = state.tabs.find((t) => t.id === tabId);
              if (!tabToDelete) return state;

              const remainingTabs = state.tabs.filter((t) => t.id !== tabId);
              const newContainers = { ...state.containers };
              const newLinks = { ...state.links };

              // Move links from deleted tab's containers to Trash
               const trashContainer = newContainers[TRASH_CONTAINER_ID] || { id: TRASH_CONTAINER_ID, name: 'Trash', linkIds: [] };
               if (!Array.isArray(trashContainer.linkIds)) trashContainer.linkIds = []; // Ensure array


              tabToDelete.containerIds.forEach((containerId) => {
                const container = state.containers[containerId];
                if (container) {
                  container.linkIds.forEach((linkId) => {
                    if (state.links[linkId]) {
                       // Update link's original location before moving
                       const updatedLink = {
                           ...state.links[linkId],
                           // Keep originalTabId/originalContainerId as they were *before* deletion
                       };
                       newLinks[linkId] = updatedLink;
                       // Add to trash
                      if (!trashContainer.linkIds.includes(linkId)) {
                         trashContainer.linkIds.unshift(linkId); // Add to beginning of trash
                      }
                    }
                  });
                  delete newContainers[containerId]; // Delete the container itself
                }
              });
              newContainers[TRASH_CONTAINER_ID] = trashContainer; // Update trash container in state


              // Update activeTabId if the deleted tab was active
              let newActiveTabId = state.activeTabId;
              if (state.activeTabId === tabId) {
                newActiveTabId = remainingTabs.length > 0 ? remainingTabs[0].id : null;
              }

              return {
                tabs: remainingTabs,
                containers: newContainers,
                links: newLinks,
                activeTabId: newActiveTabId,
              };
            });
          },
          setActiveTabId: (tabId) => set({ activeTabId: tabId }),
          setTabsOrder: (newTabs) => set({ tabs: newTabs }), // For potential future tab D&D

          // --- Container Management ---
          addContainer: (tabId, name) => {
            const newContainerId = uuidv4();
            set((state) => {
              const targetTab = state.tabs.find((t) => t.id === tabId);
              if (!targetTab) return state; // Tab not found

              return {
                tabs: state.tabs.map((tab) =>
                  tab.id === tabId
                    ? { ...tab, containerIds: [...tab.containerIds, newContainerId] }
                    : tab
                ),
                containers: {
                  ...state.containers,
                  [newContainerId]: { id: newContainerId, name: name || 'New Container', linkIds: [] },
                },
              };
            });
          },
          renameContainer: (containerId, newName) => {
             if (containerId === ARCHIVE_CONTAINER_ID || containerId === TRASH_CONTAINER_ID) return; // Don't rename special containers
            set((state) => ({
              containers: {
                ...state.containers,
                [containerId]: { ...state.containers[containerId], name: newName },
              },
            }));
          },
          deleteContainer: (tabId, containerId) => {
            if (containerId === ARCHIVE_CONTAINER_ID || containerId === TRASH_CONTAINER_ID) return; // Don't delete special containers

            set((state) => {
              const targetTab = state.tabs.find((t) => t.id === tabId);
              if (!targetTab) return state;

              const containerToDelete = state.containers[containerId];
              if (!containerToDelete) return state;

              const newContainers = { ...state.containers };
              const newLinks = { ...state.links };
              const trashContainer = newContainers[TRASH_CONTAINER_ID] || { id: TRASH_CONTAINER_ID, name: 'Trash', linkIds: [] };
              if (!Array.isArray(trashContainer.linkIds)) trashContainer.linkIds = []; // Ensure array

              // Move links to Trash
              containerToDelete.linkIds.forEach((linkId) => {
                if (state.links[linkId]) {
                  const updatedLink = { ...state.links[linkId] }; // Keep original info
                  newLinks[linkId] = updatedLink;
                  if (!trashContainer.linkIds.includes(linkId)) {
                     trashContainer.linkIds.unshift(linkId);
                  }
                }
              });
              newContainers[TRASH_CONTAINER_ID] = trashContainer; // Update trash

              delete newContainers[containerId]; // Delete the container object

              // Remove containerId from the tab's list
              const updatedTabs = state.tabs.map((tab) =>
                tab.id === tabId
                  ? { ...tab, containerIds: tab.containerIds.filter((id) => id !== containerId) }
                  : tab
              );

              return {
                tabs: updatedTabs,
                containers: newContainers,
                links: newLinks,
              };
            });
          },

          // --- Link Management ---
          addLink: (linkData) => { // Used internally or by import
             const newLinkId = linkData.id || uuidv4();
             const { url, title, faviconUrl, tabId, containerId } = linkData;
             if (!url || !tabId || !containerId) {
                 console.error("addLink: Missing required data", linkData);
                 return;
             }
             set(state => {
                 const targetContainer = state.containers[containerId];
                 if (!targetContainer) {
                     console.error(`addLink: Container ${containerId} not found.`);
                     return state;
                 }
                 // Ensure linkIds is an array
                  if (!Array.isArray(targetContainer.linkIds)) {
                      targetContainer.linkIds = [];
                  }


                 return {
                     links: {
                         ...state.links,
                         [newLinkId]: {
                             id: newLinkId,
                             url: url,
                             title: title || url,
                             faviconUrl: faviconUrl || `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(url)}`,
                             originalTabId: tabId,
                             originalContainerId: containerId,
                             addedDate: Date.now(),
                         }
                     },
                     containers: {
                         ...state.containers,
                         [containerId]: {
                             ...targetContainer,
                             linkIds: [newLinkId, ...targetContainer.linkIds] // Add to beginning
                         }
                     }
                 }
             })
          },

          moveLinkToTrash: (linkId) => {
            set((state) => {
              const link = state.links[linkId];
              if (!link) return state;

              const sourceContainerId = Object.keys(state.containers).find(cId =>
                  state.containers[cId].linkIds.includes(linkId) && cId !== TRASH_CONTAINER_ID && cId !== ARCHIVE_CONTAINER_ID
              );

              if (!sourceContainerId) {
                   // Maybe it's already in trash or archive? Or orphaned? Log warning.
                  console.warn(`moveLinkToTrash: Could not find source container for link ${linkId}`);
                  // If it's in archive, still move to trash
                   if (state.containers[ARCHIVE_CONTAINER_ID]?.linkIds.includes(linkId)) {
                       const archiveLinks = state.containers[ARCHIVE_CONTAINER_ID].linkIds.filter(id => id !== linkId);
                       const trashLinks = [linkId, ...(state.containers[TRASH_CONTAINER_ID]?.linkIds || [])];
                       return {
                           ...state,
                           containers: {
                               ...state.containers,
                               [ARCHIVE_CONTAINER_ID]: { ...state.containers[ARCHIVE_CONTAINER_ID], linkIds: archiveLinks },
                               [TRASH_CONTAINER_ID]: { ...state.containers[TRASH_CONTAINER_ID], linkIds: trashLinks },
                           }
                       }
                   }
                  return state; // Otherwise, do nothing if source not found
              }


              const sourceContainer = state.containers[sourceContainerId];
              const trashContainer = state.containers[TRASH_CONTAINER_ID];
               if (!Array.isArray(trashContainer.linkIds)) trashContainer.linkIds = [];


              return {
                containers: {
                  ...state.containers,
                  [sourceContainerId]: {
                    ...sourceContainer,
                    linkIds: sourceContainer.linkIds.filter((id) => id !== linkId),
                  },
                  [TRASH_CONTAINER_ID]: {
                    ...trashContainer,
                    linkIds: [linkId, ...trashContainer.linkIds], // Add to beginning of trash
                  },
                },
                // Update originalTabId/ContainerId if not already set (should be set on add)
                links: {
                    ...state.links,
                    [linkId]: {
                        ...link,
                        originalTabId: link.originalTabId || sourceContainer.tabId, // Store where it came from
                        originalContainerId: link.originalContainerId || sourceContainerId,
                    }
                }
              };
            });
          },

          moveLinkToArchive: (linkId) => {
             set((state) => {
                 const link = state.links[linkId];
                 if (!link) return state;

                 const sourceContainerId = Object.keys(state.containers).find(cId =>
                    state.containers[cId]?.linkIds.includes(linkId) && cId !== ARCHIVE_CONTAINER_ID && cId !== TRASH_CONTAINER_ID
                 );

                  if (!sourceContainerId) {
                     console.warn(`moveLinkToArchive: Could not find source container for link ${linkId}`);
                      // Allow moving from trash to archive? Maybe not typical. Let's ignore if in trash.
                     return state;
                  }

                 const sourceContainer = state.containers[sourceContainerId];
                 const archiveContainer = state.containers[ARCHIVE_CONTAINER_ID];
                 if (!Array.isArray(archiveContainer.linkIds)) archiveContainer.linkIds = [];

                 return {
                    containers: {
                       ...state.containers,
                       [sourceContainerId]: {
                          ...sourceContainer,
                          linkIds: sourceContainer.linkIds.filter((id) => id !== linkId),
                       },
                       [ARCHIVE_CONTAINER_ID]: {
                          ...archiveContainer,
                          linkIds: [linkId, ...archiveContainer.linkIds], // Add to beginning of archive
                       },
                    },
                    links: { // Ensure original location is stored
                        ...state.links,
                        [linkId]: {
                            ...link,
                            originalTabId: link.originalTabId, // Should already exist
                            originalContainerId: link.originalContainerId,
                        }
                    }
                 };
             });
          },

          deleteLinkPermanently: (linkId) => {
             set(state => {
                 const newLinks = { ...state.links };
                 delete newLinks[linkId]; // Remove from links object

                 const newContainers = { ...state.containers };
                 // Remove from trash container specifically
                  const trashContainer = newContainers[TRASH_CONTAINER_ID];
                  if (trashContainer && Array.isArray(trashContainer.linkIds)) {
                      newContainers[TRASH_CONTAINER_ID] = {
                          ...trashContainer,
                          linkIds: trashContainer.linkIds.filter(id => id !== linkId)
                      };
                  } else {
                      console.warn(`deleteLinkPermanently: Link ${linkId} not found in trash or trash is invalid.`);
                  }


                 return {
                     links: newLinks,
                     containers: newContainers,
                 }
             })
          },

          restoreLink: (linkId) => {
            set((state) => {
              const link = state.links[linkId];
              if (!link || !link.originalContainerId) {
                  console.error(`restoreLink: Cannot restore link ${linkId} - missing link or original location.`);
                  return state; // Cannot restore without original location
              }

              // Check if original container still exists
              const originalContainer = state.containers[link.originalContainerId];
              if (!originalContainer) {
                  console.warn(`restoreLink: Original container ${link.originalContainerId} no longer exists for link ${linkId}. Restoring to first container of original tab or first tab.`);
                  // Find original tab
                   let targetTab = state.tabs.find(t => t.id === link.originalTabId);
                   if (!targetTab && state.tabs.length > 0) {
                       targetTab = state.tabs[0]; // Fallback to first tab
                   }

                   if (!targetTab) {
                       console.error(`restoreLink: No suitable tab found to restore link ${linkId}. Cannot restore.`);
                       return state; // Cannot restore if no tab found
                   }

                   // Find first container in the target tab
                   let targetContainerId = targetTab.containerIds.length > 0 ? targetTab.containerIds[0] : null;

                   // If no container exists in the target tab, we might need to create one? Or fail?
                   // For simplicity, let's fail if no container exists in the fallback tab.
                   if (!targetContainerId || !state.containers[targetContainerId]) {
                        console.error(`restoreLink: No suitable container found in fallback tab ${targetTab.id} to restore link ${linkId}. Cannot restore.`);
                        return state;
                   }

                  // Update link's target restoration location
                   link.originalContainerId = targetContainerId;
                   // We don't need to update originalTabId here, as it's just for reference.
              }


              const newContainers = { ...state.containers };
              let sourceContainerId = null;

              // Find where the link currently is (Trash or Archive)
              if (newContainers[TRASH_CONTAINER_ID]?.linkIds.includes(linkId)) {
                sourceContainerId = TRASH_CONTAINER_ID;
              } else if (newContainers[ARCHIVE_CONTAINER_ID]?.linkIds.includes(linkId)) {
                sourceContainerId = ARCHIVE_CONTAINER_ID;
              }

              if (!sourceContainerId) {
                  console.warn(`restoreLink: Link ${linkId} not found in Trash or Archive.`);
                  return state; // Link isn't in a restorable location
              }

               // Ensure target container linkIds is an array
               if (!Array.isArray(newContainers[link.originalContainerId].linkIds)) {
                    newContainers[link.originalContainerId].linkIds = [];
               }

               // Ensure source container linkIds is an array
                if (!Array.isArray(newContainers[sourceContainerId].linkIds)) {
                     newContainers[sourceContainerId].linkIds = [];
                }

              // Remove from source (Trash or Archive)
              newContainers[sourceContainerId] = {
                ...newContainers[sourceContainerId],
                linkIds: newContainers[sourceContainerId].linkIds.filter((id) => id !== linkId),
              };

              // Add to original container (at the beginning)
              newContainers[link.originalContainerId] = {
                ...newContainers[link.originalContainerId],
                linkIds: [linkId, ...newContainers[link.originalContainerId].linkIds],
              };

              return { containers: newContainers };
            });
          },

          // --- Drag and Drop Handling ---
          handleDragEnd: (result) => {
            const { source, destination, draggableId, type } = result;
            // console.log("handleDragEnd:", result);

            // No destination or dropped in same place
            if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
              return;
            }

            set((state) => {
              const newState = { ...state }; // Shallow copy state

              if (type === 'LINK') {
                const startContainerId = source.droppableId;
                const endContainerId = destination.droppableId;
                const startContainer = newState.containers[startContainerId];
                const endContainer = newState.containers[endContainerId];

                if (!startContainer || !endContainer) {
                    console.error("DND Error: Start or end container not found for link drag.");
                    return state; // Abort if containers are invalid
                }

                // Ensure linkIds are arrays
                const startLinkIds = Array.isArray(startContainer.linkIds) ? [...startContainer.linkIds] : [];
                const endLinkIds = Array.isArray(endContainer.linkIds) ? [...endContainer.linkIds] : [];


                // Remove link from source
                startLinkIds.splice(source.index, 1);

                // If moving within the same container
                if (startContainerId === endContainerId) {
                  endLinkIds.splice(destination.index, 0, draggableId); // Insert at new position
                  newState.containers[startContainerId] = { ...startContainer, linkIds: endLinkIds };
                }
                // If moving between different containers
                else {
                  endLinkIds.splice(destination.index, 0, draggableId); // Insert into destination
                  newState.containers[startContainerId] = { ...startContainer, linkIds: startLinkIds };
                  newState.containers[endContainerId] = { ...endContainer, linkIds: endLinkIds };

                   // Update the link's originalTabId/originalContainerId IF moving out of Archive/Trash
                   if (startContainerId === ARCHIVE_CONTAINER_ID || startContainerId === TRASH_CONTAINER_ID) {
                        // Find the tab this container belongs to
                        const targetTab = newState.tabs.find(tab => tab.containerIds.includes(endContainerId));
                        if(targetTab && newState.links[draggableId]){
                            newState.links[draggableId] = {
                                ...newState.links[draggableId],
                                originalTabId: targetTab.id,
                                originalContainerId: endContainerId
                            }
                        }
                   } else if (endContainerId !== ARCHIVE_CONTAINER_ID && endContainerId !== TRASH_CONTAINER_ID) {
                       // Update original location if moving between regular containers
                       const targetTab = newState.tabs.find(tab => tab.containerIds.includes(endContainerId));
                        if(targetTab && newState.links[draggableId]){
                             newState.links[draggableId] = {
                                 ...newState.links[draggableId],
                                 originalTabId: targetTab.id, // Keep track of the *new* original location
                                 originalContainerId: endContainerId
                             }
                         }
                   }
                   // If moving TO archive/trash, don't update original location (keep where it came from)

                }
              } else if (type === 'CONTAINER') {
                const startTabId = source.droppableId; // Tab ID where dragging started
                const endTabId = destination.droppableId; // Tab ID where dropping occurred
                const containerId = draggableId;

                const startTab = newState.tabs.find(t => t.id === startTabId);
                const endTab = newState.tabs.find(t => t.id === endTabId);

                if (!startTab || !endTab) {
                    console.error("DND Error: Start or end tab not found for container drag.");
                     return state; // Abort if tabs are invalid
                }

                // Ensure containerIds are arrays
                const startContainerIds = Array.isArray(startTab.containerIds) ? [...startTab.containerIds] : [];
                const endContainerIds = Array.isArray(endTab.containerIds) ? [...endTab.containerIds] : [];

                // Remove container from source tab's list
                 startContainerIds.splice(source.index, 1);

                // If moving within the same tab (reordering)
                if (startTabId === endTabId) {
                    endContainerIds.splice(destination.index, 0, containerId); // Insert at new position
                    const updatedTabs = newState.tabs.map(tab =>
                        tab.id === startTabId ? { ...tab, containerIds: endContainerIds } : tab
                    );
                    newState.tabs = updatedTabs;
                }
                // If moving between different tabs
                else {
                    endContainerIds.splice(destination.index, 0, containerId); // Insert into destination tab's list
                    const updatedTabs = newState.tabs.map(tab => {
                        if (tab.id === startTabId) return { ...tab, containerIds: startContainerIds };
                        if (tab.id === endTabId) return { ...tab, containerIds: endContainerIds };
                        return tab;
                    });
                    newState.tabs = updatedTabs;

                    // Update originalTabId for all links within the moved container
                     const movedContainer = newState.containers[containerId];
                     if (movedContainer && Array.isArray(movedContainer.linkIds)) {
                         movedContainer.linkIds.forEach(linkId => {
                             if (newState.links[linkId]) {
                                 newState.links[linkId] = {
                                     ...newState.links[linkId],
                                     originalTabId: endTabId // Update to the new tab ID
                                     // originalContainerId remains the same (it's the container being moved)
                                 };
                             }
                         });
                     }
                }
              } else if (type === 'TAB') {
                  // Optional: Implement tab reordering via DND if needed
                  const newTabs = Array.from(state.tabs);
                  const [reorderedItem] = newTabs.splice(source.index, 1);
                  newTabs.splice(destination.index, 0, reorderedItem);
                  newState.tabs = newTabs;
              }

              // Update state (triggers persistence)
              return newState;
            });
          },

          // --- View Mode ---
          setViewMode: (mode) => set({ viewMode: mode }), // 'list' or 'favicon'

          // --- Import/Export ---
          exportData: () => {
            const { tabs, containers, links, viewMode } = get();
            const dataToExport = {
              tabs,
              containers,
              links,
              viewMode,
              exportDate: new Date().toISOString(),
              source: 'Later-List',
            };
            return JSON.stringify(dataToExport, null, 2); // Pretty print JSON
          },

          importData: (jsonData) => {
             return new Promise((resolve, reject) => {
                 try {
                    const parsedData = JSON.parse(jsonData);
                    console.log("Importing data:", parsedData);

                    // Basic validation
                    if (typeof parsedData !== 'object' || parsedData === null) {
                        throw new Error("Invalid data format: Not an object.");
                    }

                     // Check for Later-List format
                     if (parsedData.source === 'Later-List' && Array.isArray(parsedData.tabs) && typeof parsedData.containers === 'object' && typeof parsedData.links === 'object') {
                         set(state => {
                              // Simple merge: Overwrite existing data - consider merging strategies later if needed
                             const importedTabs = parsedData.tabs || [];
                             const importedContainers = parsedData.containers || {};
                             const importedLinks = parsedData.links || {};

                             // Ensure special containers from existing state are preserved/merged if not in import
                             const finalContainers = { ...importedContainers };
                             if (!finalContainers[ARCHIVE_CONTAINER_ID] && state.containers[ARCHIVE_CONTAINER_ID]) {
                                 finalContainers[ARCHIVE_CONTAINER_ID] = state.containers[ARCHIVE_CONTAINER_ID];
                             } else if (!finalContainers[ARCHIVE_CONTAINER_ID]) {
                                 finalContainers[ARCHIVE_CONTAINER_ID] = { id: ARCHIVE_CONTAINER_ID, name: 'Archive', linkIds: [] };
                             }

                             if (!finalContainers[TRASH_CONTAINER_ID] && state.containers[TRASH_CONTAINER_ID]) {
                                 finalContainers[TRASH_CONTAINER_ID] = state.containers[TRASH_CONTAINER_ID];
                             } else if (!finalContainers[TRASH_CONTAINER_ID]) {
                                 finalContainers[TRASH_CONTAINER_ID] = { id: TRASH_CONTAINER_ID, name: 'Trash', linkIds: [] };
                             }


                             return {
                                 tabs: importedTabs,
                                 containers: finalContainers,
                                 links: importedLinks,
                                 viewMode: parsedData.viewMode || state.viewMode || 'list',
                                 activeTabId: importedTabs.length > 0 ? importedTabs[0].id : null,
                                 isLoading: false, // Ensure loading is finished
                                 firstUse: false, // Mark as not first use after import
                             }
                         });
                         console.log("Later-List data imported successfully.");
                         resolve({ success: true, message: "Later-List data imported successfully." });
                     } else {
                         // Handle potential OneTab import (simple format: newline separated URLs)
                         // OneTab exports are typically plain text files.
                         // We might need a different input method (e.g., text area) for this.
                         // This function expects JSON. Let's modify to handle text for OneTab.
                         throw new Error("Invalid Later-List JSON format.");
                     }

                 } catch (error) {
                     console.error("Import failed:", error);
                     reject({ success: false, message: `Import failed: ${error.message}` });
                 }
             });
          },

           importOneTabData: (textData) => {
                return new Promise((resolve, reject) => {
                    try {
                        const lines = textData.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                        if (lines.length === 0) {
                            throw new Error("No valid URLs found in the text data.");
                        }

                        console.log(`Importing ${lines.length} links from OneTab format.`);

                        set(state => {
                            const newState = { ...state };
                            let targetTabId = null;
                            let targetContainerId = null;

                            // Try to find or create an "Imported from OneTab" tab/container
                            const oneTabName = "Imported from OneTab";
                            let importTab = newState.tabs.find(t => t.name === oneTabName);

                            if (!importTab) {
                                // Create new tab
                                targetTabId = uuidv4();
                                targetContainerId = uuidv4();
                                const newTab = { id: targetTabId, name: oneTabName, containerIds: [targetContainerId] };
                                const newContainer = { id: targetContainerId, name: "Imported Links", linkIds: [] };

                                newState.tabs = [...newState.tabs, newTab];
                                newState.containers = { ...newState.containers, [targetContainerId]: newContainer };
                                newState.activeTabId = newState.activeTabId ?? targetTabId; // Activate if no tab was active
                                importTab = newTab; // Use the newly created tab
                            } else {
                                targetTabId = importTab.id;
                                // Use the first container in that tab, or create one if none exists
                                if (importTab.containerIds.length > 0) {
                                    targetContainerId = importTab.containerIds[0];
                                    // Ensure the container actually exists in the containers object
                                    if (!newState.containers[targetContainerId]) {
                                        const firstContainerName = "Imported Links"; // Default name
                                        newState.containers[targetContainerId] = { id: targetContainerId, name: firstContainerName, linkIds: [] };
                                    }
                                } else {
                                    targetContainerId = uuidv4();
                                    const newContainer = { id: targetContainerId, name: "Imported Links", linkIds: [] };
                                    newState.containers = { ...newState.containers, [targetContainerId]: newContainer };
                                    // Update the tab to include this new container
                                     newState.tabs = newState.tabs.map(t => t.id === targetTabId ? { ...t, containerIds: [targetContainerId] } : t);
                                }
                            }

                            // Ensure target container exists and linkIds is an array
                             if (!newState.containers[targetContainerId]) {
                                // This case should be handled by the logic above, but as a safeguard:
                                newState.containers[targetContainerId] = { id: targetContainerId, name: "Imported Links", linkIds: [] };
                             }
                            if (!Array.isArray(newState.containers[targetContainerId].linkIds)) {
                                newState.containers[targetContainerId].linkIds = [];
                            }

                            // Add links
                            const newLinks = { ...newState.links };
                            const newLinkIds = [];
                            lines.forEach(line => {
                                let url = line;
                                let title = line; // Default title is URL

                                // Check for OneTab's "URL | Title" format
                                const parts = line.split('|').map(part => part.trim());
                                if (parts.length > 1 && parts[0].startsWith('http')) {
                                    url = parts[0];
                                    title = parts.slice(1).join('|').trim(); // Join remaining parts for title
                                } else if (!url.startsWith('http')) {
                                    console.warn(`Skipping invalid URL from OneTab import: ${url}`);
                                    return; // Skip lines that don't look like URLs
                                }


                                const newLinkId = uuidv4();
                                newLinks[newLinkId] = {
                                    id: newLinkId,
                                    url: url,
                                    title: title,
                                    faviconUrl: `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(url)}`,
                                    originalTabId: targetTabId,
                                    originalContainerId: targetContainerId,
                                    addedDate: Date.now(),
                                };
                                newLinkIds.push(newLinkId);
                            });

                             // Add new link IDs to the beginning of the target container
                            newState.containers[targetContainerId].linkIds = [
                                ...newLinkIds,
                                ...newState.containers[targetContainerId].linkIds
                            ];
                            newState.links = newLinks;
                            newState.isLoading = false; // Ensure loading is finished
                            newState.firstUse = false; // Mark as not first use

                            return newState;
                        });
                         console.log("OneTab data imported successfully.");
                        resolve({ success: true, message: "OneTab data imported successfully." });

                    } catch (error) {
                        console.error("OneTab Import failed:", error);
                         reject({ success: false, message: `OneTab Import failed: ${error.message}` });
                    }
                });
           },

        }),
        {
          name: 'later-list-storage', // name of the item in storage
          storage: createJSONStorage(() => chromeStorage), // Use custom Chrome Storage adapter
           partialize: (state) => ({ // Only persist these parts of the state
               tabs: state.tabs,
               containers: state.containers,
               links: state.links,
               viewMode: state.viewMode,
               firstUse: state.firstUse, // Need to persist this after first load
           }),
           onRehydrateStorage: (state) => {
               console.log("Zustand: Hydration finished");
               // Optional: Called HydraulicManually, modify state or perform actions upon hydration
               // state?.loadInitialData(); // Maybe trigger load again? No, persistence handles it.
               return (state, error) => {
                 if (error) {
                   console.error('Zustand: An error happened during hydration:', error);
                 } else {
                   console.log('Zustand: Hydration successful.');
                    // Ensure loading state is false after successful hydration
                    if (state) {
                        state.isLoading = false;
                        // Ensure activeTabId is set correctly after hydration
                        if (!state.activeTabId && state.tabs.length > 0) {
                            state.activeTabId = state.tabs[0].id;
                        } else if (state.tabs.length === 0) {
                            state.activeTabId = null;
                        }
                        // Ensure special containers exist after hydration if they were missing
                         if (!state.containers[ARCHIVE_CONTAINER_ID]) {
                            state.containers[ARCHIVE_CONTAINER_ID] = { id: ARCHIVE_CONTAINER_ID, name: 'Archive', linkIds: [] };
                         }
                          if (!state.containers[TRASH_CONTAINER_ID]) {
                             state.containers[TRASH_CONTAINER_ID] = { id: TRASH_CONTAINER_ID, name: 'Trash', linkIds: [] };
                         }
                    }
                 }
               }
           },
           // Optional: Handle migration if state structure changes
           // version: 1,
           // migrate: (persistedState, version) => { ... }
        }
      )
    );

    // Call loadInitialData once when the store is initialized
    // Note: Because persistence middleware might hydrate *after* this initial call,
    // it's often better to call loadInitialData from the App component's useEffect.
    // useStore.getState().loadInitialData(); // Let's move this to App.jsx

    export default useStore;
    export { ARCHIVE_CONTAINER_ID, TRASH_CONTAINER_ID };

    ```

5.  **Create Folders:** Create `src/components`, `src/store`, `src/hooks`, `src/utils`. Move `useStore.js` into `src/store`.

---

**Step 6: React Components**

This requires creating multiple component files within `src/components`.

1.  **`src/components/EditableText.jsx`:**
    ```jsx
    import React, { useState, useRef, useEffect } from 'react';

    function EditableText({ initialValue, onSave, inputClassName = '', displayClassName = '' }) {
      const [isEditing, setIsEditing] = useState(false);
      const [value, setValue] = useState(initialValue);
      const inputRef = useRef(null);

      useEffect(() => {
        setValue(initialValue); // Update if initialValue prop changes
      }, [initialValue]);

      useEffect(() => {
        if (isEditing && inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select(); // Select text for easy replacement
        }
      }, [isEditing]);

      const handleDoubleClick = () => {
        setIsEditing(true);
      };

      const handleChange = (e) => {
        setValue(e.target.value);
      };

      const handleBlur = () => {
        save();
      };

      const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
          save();
        } else if (e.key === 'Escape') {
          setValue(initialValue); // Revert changes
          setIsEditing(false);
        }
      };

      const save = () => {
        if (value.trim() === '') {
            setValue(initialValue); // Revert if empty
        } else if (value !== initialValue) {
            onSave(value);
        }
        setIsEditing(false);
      };

      return (
        <div onDoubleClick={handleDoubleClick} style={{ cursor: 'text' }}>
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className={inputClassName} // Allow custom styling
              style={{ // Basic inline styles for input mode
                  padding: '2px 4px',
                  margin: '-2px -4px', // Offset padding
                  border: '1px solid var(--accent-color)',
                  outline: 'none',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  borderRadius: '3px',
                  fontSize: 'inherit', // Inherit font size from parent
                  width: '100%'
              }}
            />
          ) : (
            <span className={displayClassName} title="Double-click to edit">{value}</span>
          )}
        </div>
      );
    }

    export default EditableText;
    ```

2.  **`src/components/LinkItem.jsx`:**
    ```jsx
    import React from 'react';
    import { Draggable } from 'react-beautiful-dnd';
    import useStore, { ARCHIVE_CONTAINER_ID, TRASH_CONTAINER_ID } from '../store/useStore';
    import { FaTrash, FaArchive, FaUndo, FaTrashRestore, FaExternalLinkAlt } from 'react-icons/fa'; // Import icons

    function LinkItem({ link, index, containerId }) {
      const { viewMode, moveLinkToTrash, moveLinkToArchive, restoreLink, deleteLinkPermanently } = useStore();

      if (!link) {
        console.warn("LinkItem rendered with null link for container:", containerId);
        return null; // Don't render if link data is missing
      }

      const isArchive = containerId === ARCHIVE_CONTAINER_ID;
      const isTrash = containerId === TRASH_CONTAINER_ID;

      const handleOpenLink = (e) => {
        e.preventDefault(); // Prevent default link navigation
        chrome.tabs.create({ url: link.url, active: true }); // Open in new tab
        if (!isArchive && !isTrash) {
             moveLinkToArchive(link.id); // Move to archive on click (if not already there or in trash)
        }
      };

      const handleRestore = () => {
        restoreLink(link.id);
      };

      const handleTrash = () => {
        moveLinkToTrash(link.id);
      };

       const handlePermanentDelete = () => {
           if (window.confirm(`Permanently delete "${link.title}"? This cannot be undone.`)) {
               deleteLinkPermanently(link.id);
           }
       }

      const handleArchive = () => {
          moveLinkToArchive(link.id);
      }

       // Favicon error handling
       const handleFaviconError = (e) => {
           // Replace with a generic icon or hide image on error
           e.target.src = 'icons/icon16.png'; // Use a placeholder icon
           e.target.style.opacity = '0.6';
       };

      return (
        <Draggable draggableId={link.id} index={index}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps} // Drag handle is the whole item
              style={{
                userSelect: 'none',
                padding: viewMode === 'list' ? '10px 12px' : '5px',
                margin: '0 0 8px 0',
                backgroundColor: snapshot.isDragging ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                borderRadius: '4px',
                boxShadow: snapshot.isDragging ? '0 4px 8px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: viewMode === 'list' ? '10px' : '5px',
                transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
                 minHeight: '38px', // Ensure consistent height, especially in favicon view
                 position: 'relative', // For absolute positioning of actions
                ...provided.draggableProps.style, // Required styles from dnd
              }}
              className={`link-item ${snapshot.isDragging ? 'dragging-link' : ''}`}
              title={viewMode === 'favicon' ? `${link.title}\n${link.url}` : link.url} // Show title/url on hover
            >
              {/* Favicon */}
              <img
                src={link.faviconUrl || 'icons/icon16.png'} // Fallback icon
                alt="" // Decorative
                width={viewMode === 'list' ? 18 : 24}
                height={viewMode === 'list' ? 18 : 24}
                style={{ flexShrink: 0, borderRadius: '3px', objectFit: 'contain' }}
                onError={handleFaviconError}
              />

              {/* Link Title/URL (List View Only) */}
              {viewMode === 'list' && (
                <a
                  href={link.url}
                  onClick={handleOpenLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flexGrow: 1,
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    fontSize: '14px',
                  }}
                  title={`Open and Archive: ${link.title}`}
                >
                  {link.title || link.url}
                </a>
              )}

              {/* Action Buttons */}
               <div className="link-actions" style={{
                   display: 'flex',
                   alignItems: 'center',
                   marginLeft: viewMode === 'list' ? 'auto' : '0', // Push right in list view
                   flexShrink: 0,
                   // Make actions appear on hover (optional enhancement)
                   // opacity: snapshot.isDragging ? 1 : 0, // Initially hidden
                   // transition: 'opacity 0.2s ease',
               }}
               // onMouseEnter={(e) => e.currentTarget.style.opacity = 1} // Show on hover
               // onMouseLeave={(e) => e.currentTarget.style.opacity = 0} // Hide on leave
               >
                {!isTrash && !isArchive && (
                     <>
                         <button onClick={handleOpenLink} className="button-icon" title="Open and Archive">
                           <FaExternalLinkAlt size={14} />
                         </button>
                         <button onClick={handleArchive} className="button-icon" title="Archive" style={{ color: 'var(--archive-color)'}}>
                             <FaArchive size={14} />
                         </button>
                         <button onClick={handleTrash} className="button-icon" title="Move to Trash" style={{ color: 'var(--danger-color)' }}>
                             <FaTrash size={14} />
                         </button>
                     </>
                 )}
                 {isArchive && (
                     <button onClick={handleRestore} className="button-icon" title="Restore to Original Location" style={{ color: 'var(--success-color)'}}>
                         <FaUndo size={14} />
                     </button>
                 )}
                  {isTrash && (
                     <>
                         <button onClick={handleRestore} className="button-icon" title="Restore to Original Location" style={{ color: 'var(--success-color)'}}>
                             <FaTrashRestore size={14} />
                         </button>
                         <button onClick={handlePermanentDelete} className="button-icon" title="Delete Permanently" style={{ color: 'var(--danger-color)'}}>
                             <FaTrash size={14} />
                         </button>
                     </>
                 )}
               </div>
               {/* Add placeholder style when dragging over */}
                {provided.placeholder}
            </div>
          )}
        </Draggable>
      );
    }

    export default LinkItem;
    ```

3.  **`src/components/Container.jsx`:**
    ```jsx
    import React, { useState } from 'react';
    import { Droppable, Draggable } from 'react-beautiful-dnd';
    import useStore, { ARCHIVE_CONTAINER_ID, TRASH_CONTAINER_ID } from '../store/useStore';
    import LinkItem from './LinkItem';
    import EditableText from './EditableText';
    import { FaTrash, FaPlus } from 'react-icons/fa'; // Import icons

    function Container({ container, tabId, index }) {
      const { links, renameContainer, deleteContainer } = useStore();
      const containerLinks = container.linkIds
                                .map(linkId => links[linkId])
                                .filter(Boolean); // Get link objects and filter out any potentially missing ones

      const isSpecialContainer = container.id === ARCHIVE_CONTAINER_ID || container.id === TRASH_CONTAINER_ID;

      const handleRename = (newName) => {
        renameContainer(container.id, newName);
      };

      const handleDelete = () => {
        if (!isSpecialContainer && window.confirm(`Delete container "${container.name}" and move all its links to Trash?`)) {
          deleteContainer(tabId, container.id);
        }
      };

      // Note: Adding links directly via UI is handled by context menu/background script
      // We might add a button here later if needed, but sticking to requirements for now.

      return (
        <Draggable draggableId={container.id} index={index} isDragDisabled={isSpecialContainer}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              style={{
                margin: '0 8px 16px 8px', // Add some margin around containers
                padding: '12px',
                backgroundColor: snapshot.isDragging ? 'var(--bg-secondary)' : 'var(--bg-secondary)',
                borderRadius: '6px',
                border: snapshot.isDragging ? '1px dashed var(--accent-color)' : '1px solid var(--border-color)',
                boxShadow: snapshot.isDragging ? '0 8px 20px rgba(0,0,0,0.2)' : 'none',
                transition: 'border-color 0.2s ease, background-color 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                minWidth: '250px', // Give containers a minimum width
                maxWidth: '350px', // And a max width
                flexShrink: 0, // Prevent shrinking in flex row
                ...provided.draggableProps.style,
              }}
              className={`container ${snapshot.isDragging ? 'dragging-container' : ''}`}
            >
              {/* Container Header */}
              <div
                {...provided.dragHandleProps} // Drag handle is the header
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid var(--border-color)',
                  cursor: isSpecialContainer ? 'default' : 'grab', // Indicate draggable state
                   minHeight: '24px', // Ensure header has height
                }}
              >
                <EditableText
                  initialValue={container.name}
                  onSave={handleRename}
                  displayClassName="container-title"
                  inputClassName="container-title-input" // Add specific classes if needed
                />
                {!isSpecialContainer && (
                  <button
                    onClick={handleDelete}
                    className="button-icon"
                    title="Delete Container (moves links to Trash)"
                    style={{ color: 'var(--danger-color)' }}
                  >
                    <FaTrash size={14} />
                  </button>
                )}
                 {/* Add button removed as adding is via context menu */}
                 {/* { !isSpecialContainer && <button className="button-icon" title="Add Link (Manual - Placeholder)"> <FaPlus size={14} /> </button> } */}
              </div>

              {/* Links Area (Droppable) */}
              <Droppable droppableId={container.id} type="LINK">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      minHeight: '50px', // Ensure droppable area has height even when empty
                      padding: '5px',
                      borderRadius: '4px',
                      backgroundColor: snapshot.isDraggingOver ? 'rgba(49, 130, 206, 0.1)' : 'transparent', // Highlight when dragging over
                      transition: 'background-color 0.2s ease',
                       flexGrow: 1, // Allow link list to grow
                       overflowY: 'auto', // Scroll if links overflow container height (set max-height on outer div if needed)
                    }}
                  >
                    {containerLinks.length > 0 ? (
                      containerLinks.map((link, index) => (
                        <LinkItem key={link.id} link={link} index={index} containerId={container.id} />
                      ))
                    ) : (
                        !snapshot.isDraggingOver && <p style={{textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', marginTop: '15px'}}>Empty</p>
                    )}
                    {provided.placeholder} {/* Placeholder for dragging items */}
                  </div>
                )}
              </Droppable>
            </div>
          )}
        </Draggable>
      );
    }

    export default Container;

    ```

4.  **`src/components/TabContent.jsx`:**
    ```jsx
    import React from 'react';
    import { Droppable } from 'react-beautiful-dnd';
    import useStore from '../store/useStore';
    import Container from './Container';
    import { FaPlus } from 'react-icons/fa';

    function TabContent({ tab }) {
      const { containers, addContainer } = useStore();
      const tabContainers = tab.containerIds
                              .map(containerId => containers[containerId])
                              .filter(Boolean); // Get container objects for this tab

      const handleAddContainer = () => {
        const name = prompt("Enter name for the new container:", "New Container");
        if (name) {
          addContainer(tab.id, name);
        }
      };

      return (
        <Droppable droppableId={tab.id} type="CONTAINER" direction="horizontal">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{
                display: 'flex',
                flexDirection: 'row', // Arrange containers horizontally
                padding: '16px 8px', // Padding around the container area
                overflowX: 'auto',   // Allow horizontal scrolling for containers
                overflowY: 'hidden', // Prevent vertical scroll here (containers handle their own)
                minHeight: '300px',  // Ensure it takes up some space
                flexGrow: 1,         // Allow it to fill remaining vertical space
                alignItems: 'flex-start', // Align containers to the top
                backgroundColor: snapshot.isDraggingOver ? 'rgba(74, 85, 104, 0.1)' : 'transparent', // Highlight on container drag over
                 position: 'relative', // For positioning add button
              }}
            >
              {tabContainers.map((container, index) => (
                <Container key={container.id} container={container} tabId={tab.id} index={index} />
              ))}
              {provided.placeholder}

              {/* Add Container Button */}
              <button
                onClick={handleAddContainer}
                title="Add New Container to this Tab"
                style={{
                   flexShrink: 0,
                   alignSelf: 'flex-start', // Align with top of containers
                   marginTop: '12px', // Align with container padding
                   marginLeft: '10px',
                   marginRight: '16px', // Extra space at the end
                   padding: '10px 15px',
                   backgroundColor: 'var(--bg-tertiary)',
                   color: 'var(--text-secondary)',
                   border: '1px dashed var(--border-color)',
                   borderRadius: '6px',
                   cursor: 'pointer',
                   display: 'flex',
                   alignItems: 'center',
                   gap: '5px'
                }}
                className='add-container-button button-secondary'
              >
                <FaPlus size={14} /> Add Container
              </button>
            </div>
          )}
        </Droppable>
      );
    }

    export default TabContent;
    ```

5.  **`src/components/TabsBar.jsx`:**
    ```jsx
    import React from 'react';
    import useStore from '../store/useStore';
    import EditableText from './EditableText';
    import { FaTimes, FaPlus, FaFolderOpen, FaTrashAlt } from 'react-icons/fa'; // Import icons

    function TabsBar() {
      const { tabs, activeTabId, setActiveTabId, addTab, renameTab, deleteTab, setViewMode, viewMode } = useStore();
      const { archive, trash } = useStore(state => ({ // Get special containers separately for special tabs
        archive: state.containers['archive'],
        trash: state.containers['trash']
      }));

      const handleAddTab = () => {
        const name = prompt("Enter name for the new tab:", "New Tab");
        if (name) {
          addTab(name);
        }
      };

      const handleRenameTab = (tabId, newName) => {
        renameTab(tabId, newName);
      };

      const handleDeleteTab = (e, tabId, tabName) => {
        e.stopPropagation(); // Prevent tab selection when clicking delete
        if (window.confirm(`Delete tab "${tabName}" and move all its links to Trash?`)) {
          deleteTab(tabId);
        }
      };

      return (
        <div style={styles.tabsContainer}>
           {/* Main User Tabs */}
          <div style={styles.scrollableTabs}>
             {tabs.map((tab) => (
               <div
                 key={tab.id}
                 onClick={() => setActiveTabId(tab.id)}
                 style={{
                   ...styles.tab,
                   ...(activeTabId === tab.id ? styles.activeTab : {}),
                 }}
                 title={tab.name}
               >
                 <EditableText
                   initialValue={tab.name}
                   onSave={(newName) => handleRenameTab(tab.id, newName)}
                   displayClassName="tab-name" // For specific styling if needed
                 />
                 <button
                   onClick={(e) => handleDeleteTab(e, tab.id, tab.name)}
                   className="button-icon"
                   style={styles.deleteTabButton}
                   title="Delete Tab"
                 >
                   <FaTimes size={12} />
                 </button>
               </div>
             ))}
              {/* Add Tab Button */}
             <button onClick={handleAddTab} style={styles.addTabButton} title="Add New Tab">
               <FaPlus size={14} />
             </button>
          </div>

           {/* Spacer */}
           <div style={{ flexGrow: 1 }}></div>

           {/* Special Tabs (Archive & Trash) */}
           <div style={styles.specialTabs}>
               <div
                   key={archive?.id || 'archive-placeholder'}
                   onClick={() => setActiveTabId(archive.id)}
                   style={{
                       ...styles.tab,
                       ...(activeTabId === archive?.id ? styles.activeTab : {}),
                       color: activeTabId === archive?.id ? 'var(--archive-color)' : 'var(--text-secondary)', // Color indication
                   }}
                   title={`Archive (${archive?.linkIds?.length || 0} items)`}
               >
                   <FaFolderOpen style={{ marginRight: '5px'}} /> Archive
               </div>
               <div
                   key={trash?.id || 'trash-placeholder'}
                   onClick={() => setActiveTabId(trash.id)}
                   style={{
                       ...styles.tab,
                       ...(activeTabId === trash?.id ? styles.activeTab : {}),
                       color: activeTabId === trash?.id ? 'var(--danger-color)' : 'var(--text-secondary)', // Color indication
                   }}
                   title={`Trash (${trash?.linkIds?.length || 0} items)`}
               >
                   <FaTrashAlt style={{ marginRight: '5px'}} /> Trash
               </div>
           </div>


           {/* View Switcher */}
           <div style={styles.viewSwitcher}>
               <button
                   onClick={() => setViewMode('list')}
                   style={{...styles.viewButton, ...(viewMode === 'list' ? styles.activeViewButton : {})}}
                   title="List View"
               >
                   List
               </button>
               <button
                   onClick={() => setViewMode('favicon')}
                   style={{...styles.viewButton, ...(viewMode === 'favicon' ? styles.activeViewButton : {})}}
                   title="Favicon Only View"
               >
                   Grid
               </button>
           </div>
        </div>
      );
    }

    // Basic inline styles (consider moving to CSS file for better organization)
    const styles = {
      tabsContainer: {
        display: 'flex',
        alignItems: 'center',
        padding: '5px 10px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        flexShrink: 0, // Prevent shrinking
        overflow: 'hidden', // Hide overflow, inner div handles scroll
      },
      scrollableTabs: {
         display: 'flex',
         overflowX: 'auto', // Allow horizontal scrolling for many tabs
         overflowY: 'hidden',
         flexShrink: 1, // Allow this section to shrink if needed
         paddingBottom: '5px', // Space for scrollbar without overlap
         scrollbarWidth: 'thin', // Firefox
         scrollbarColor: 'var(--bg-tertiary) var(--bg-secondary)', // Firefox
         '::-webkit-scrollbar': { height: '5px' }, // Chrome/Safari
         '::-webkit-scrollbar-track': { background: 'var(--bg-secondary)' },
         '::-webkit-scrollbar-thumb': { background: 'var(--bg-tertiary)', borderRadius: '3px' },
      },
      tab: {
        display: 'flex',
        alignItems: 'center',
        padding: '8px 15px',
        marginRight: '5px',
        cursor: 'pointer',
        border: '1px solid transparent', // For consistent sizing
        borderBottom: 'none',
        borderRadius: '4px 4px 0 0', // Rounded top corners
        position: 'relative', // For positioning delete button
        whiteSpace: 'nowrap', // Prevent tab name wrapping
        transition: 'background-color 0.2s ease, color 0.2s ease',
        color: 'var(--text-secondary)',
        maxWidth: '180px', // Limit tab width
        overflow: 'hidden',
         textOverflow: 'ellipsis',
      },
      activeTab: {
        backgroundColor: 'var(--bg-primary)', // Match main background
        color: 'var(--text-primary)',
        border: '1px solid var(--border-color)',
        borderBottom: '1px solid var(--bg-primary)', // Hide bottom border to merge with content area
         zIndex: 1, // Bring active tab slightly forward
      },
      deleteTabButton: {
        marginLeft: '8px',
        padding: '2px',
        borderRadius: '50%',
        lineHeight: '1',
        opacity: 0.6,
         color: 'inherit' // Inherit color from tab text
      },
      tabName: {
          maxWidth: '120px', // Limit name width inside editable text
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'inline-block', // Needed for ellipsis
      },
      addTabButton: {
        padding: '8px 10px',
        marginLeft: '5px',
        backgroundColor: 'transparent',
        border: 'none',
        color: 'var(--text-secondary)',
         flexShrink: 0,
      },
      specialTabs: {
         display: 'flex',
         marginLeft: '20px', // Space before special tabs
         flexShrink: 0,
      },
      viewSwitcher: {
        display: 'flex',
        marginLeft: '20px', // Space before view switcher
        backgroundColor: 'var(--bg-tertiary)',
        borderRadius: '4px',
        padding: '2px',
         flexShrink: 0,
      },
       viewButton: {
         padding: '4px 10px',
         border: 'none',
         background: 'none',
         color: 'var(--text-secondary)',
         borderRadius: '3px',
         fontSize: '12px',
       },
       activeViewButton: {
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
       }
    };
    // Hover effect for delete button visibility (add this if preferred)
    // styles.tab:hover .button-icon { opacity: 1; }
    // styles.tab .button-icon { transition: opacity 0.2s ease; }


    export default TabsBar;
    ```

6.  **`src/components/ImportExport.jsx`:**
    ```jsx
    import React, { useState, useRef } from 'react';
    import useStore from '../store/useStore';
    import { FaUpload, FaDownload, FaBroom } from 'react-icons/fa'; // Import icons

    function ImportExport() {
      const { exportData, importData, importOneTabData, links, containers, TRASH_CONTAINER_ID, deleteLinkPermanently } = useStore();
      const [isLoading, setIsLoading] = useState(false);
      const [message, setMessage] = useState({ text: '', type: '' }); // type: 'success' or 'error'
      const fileInputRef = useRef(null);
       const oneTabInputRef = useRef(null);

      const handleExport = () => {
        try {
          const jsonData = exportData();
          const blob = new Blob([jsonData], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          a.href = url;
          a.download = `later-list-backup-${timestamp}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setMessage({ text: 'Data exported successfully.', type: 'success' });
        } catch (error) {
          console.error("Export failed:", error);
          setMessage({ text: `Export failed: ${error.message}`, type: 'error' });
        }
         clearMessageAfterDelay();
      };

      const handleImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
          const content = e.target.result;
          setIsLoading(true);
          setMessage({ text: 'Importing...', type: '' });
          try {
            let result;
             // Try parsing as JSON first (Later-List format)
             try {
                 result = await importData(content);
             } catch (jsonError) {
                  // If JSON parsing fails, assume it might be plain text (OneTab)
                  console.log("JSON import failed, trying OneTab import.", jsonError);
                 result = await importOneTabData(content);
             }

            setMessage({ text: result.message, type: 'success' });
          } catch (error) {
            console.error("Import failed:", error);
            setMessage({ text: error.message || 'Import failed. Invalid file format.', type: 'error' });
          } finally {
            setIsLoading(false);
             // Reset file input to allow importing the same file again if needed
             if (fileInputRef.current) fileInputRef.current.value = "";
             clearMessageAfterDelay();
          }
        };
         reader.onerror = (e) => {
             console.error("File reading error:", e);
             setMessage({ text: "Error reading file.", type: 'error'});
             setIsLoading(false);
             clearMessageAfterDelay();
         }
        reader.readAsText(file);
      };

      const triggerFileInput = () => {
        fileInputRef.current?.click();
      };

      const handleEmptyTrash = () => {
         const trashContainer = containers[TRASH_CONTAINER_ID];
         const trashLinksCount = trashContainer?.linkIds?.length || 0;

         if (trashLinksCount === 0) {
             setMessage({text: 'Trash is already empty.', type: ''});
             clearMessageAfterDelay();
             return;
         }

         if (window.confirm(`Permanently delete all ${trashLinksCount} items in the Trash? This cannot be undone.`)) {
             setIsLoading(true);
             setMessage({text: 'Emptying Trash...', type: ''});
             try {
                 // Create a copy of the link IDs to avoid issues while iterating and modifying
                 const linkIdsToDelete = [...(trashContainer.linkIds || [])];
                 linkIdsToDelete.forEach(linkId => {
                     deleteLinkPermanently(linkId); // Call the store action for each
                 });
                 setMessage({text: 'Trash emptied successfully.', type: 'success'});
             } catch (error) {
                  console.error("Error emptying trash:", error);
                 setMessage({text: `Error emptying trash: ${error.message}`, type: 'error'});
             } finally {
                 setIsLoading(false);
                 clearMessageAfterDelay();
             }
         }
      };

       const clearMessageAfterDelay = (delay = 4000) => {
           setTimeout(() => setMessage({ text: '', type: '' }), delay);
       };

      const trashCount = containers[TRASH_CONTAINER_ID]?.linkIds?.length || 0;

      return (
        <div style={styles.container}>
          <h3 style={styles.heading}>Settings & Data</h3>
          <div style={styles.buttonGroup}>
            <button onClick={triggerFileInput} disabled={isLoading} className="button-secondary" style={styles.button}>
              <FaUpload style={styles.icon} /> Import (.json / .txt)
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImport}
              accept=".json,.txt" // Accept JSON and plain text
              style={{ display: 'none' }}
            />
            <button onClick={handleExport} disabled={isLoading} className="button-secondary" style={styles.button}>
              <FaDownload style={styles.icon} /> Export (.json)
            </button>
             <button onClick={handleEmptyTrash} disabled={isLoading || trashCount === 0} className="button-danger" style={styles.button}>
               <FaBroom style={styles.icon} /> Empty Trash ({trashCount})
             </button>
          </div>
           {message.text && (
             <p style={{
                 ...styles.message,
                 color: message.type === 'error' ? 'var(--danger-color)' : (message.type === 'success' ? 'var(--success-color)' : 'var(--text-secondary)')
             }}>
               {message.text}
             </p>
           )}
           {isLoading && <p style={styles.message}>Processing...</p>}
        </div>
      );
    }

    const styles = {
       container: {
           padding: '15px 20px',
           backgroundColor: 'var(--bg-secondary)',
           borderTop: '1px solid var(--border-color)',
           marginTop: 'auto', // Push to bottom if possible (depends on parent layout)
           flexShrink: 0,
       },
       heading: {
           marginTop: 0,
           marginBottom: '15px',
           fontSize: '15px',
           color: 'var(--text-secondary)',
           fontWeight: 500,
       },
       buttonGroup: {
           display: 'flex',
           gap: '10px',
           flexWrap: 'wrap', // Allow buttons to wrap on smaller widths
       },
       button: {
           display: 'inline-flex',
           alignItems: 'center',
           gap: '6px', // Space between icon and text
       },
       icon: {
           // marginRight: '6px',
       },
       message: {
           marginTop: '12px',
           fontSize: '13px',
           textAlign: 'left',
       }
    };


    export default ImportExport;
    ```

7.  **`src/components/SpecialContainer.jsx`:** (Re-usable for Archive/Trash Views)
    ```jsx
    import React from 'react';
    import { Droppable } from 'react-beautiful-dnd';
    import useStore from '../store/useStore';
    import LinkItem from './LinkItem';
    import { FaArchive, FaTrashAlt } from 'react-icons/fa';

    // Renders the content area for Archive or Trash
    function SpecialContainer({ containerId }) {
      const { containers, links } = useStore();
      const container = containers[containerId];

      if (!container) {
        // Handle case where container might not be initialized yet
        return <div style={styles.loading}>Loading {containerId}...</div>;
      }

       const containerLinks = (container.linkIds || [])
                                .map(linkId => links[linkId])
                                .filter(Boolean); // Get link objects and filter out any potentially missing ones


       const isArchive = containerId === 'archive';
       const IconComponent = isArchive ? FaArchive : FaTrashAlt;
       const title = isArchive ? 'Archived Items' : 'Trash';

      return (
        <div style={styles.wrapper}>
           <h2 style={styles.title}><IconComponent style={{ marginRight: '8px', color: isArchive ? 'var(--archive-color)' : 'var(--danger-color)' }} /> {title}</h2>
           <Droppable droppableId={container.id} type="LINK">
             {(provided, snapshot) => (
               <div
                 ref={provided.innerRef}
                 {...provided.droppableProps}
                 style={{
                   ...styles.droppableArea,
                   backgroundColor: snapshot.isDraggingOver ? 'rgba(74, 85, 104, 0.1)' : 'transparent', // Highlight when dragging over
                 }}
               >
                 {containerLinks.length > 0 ? (
                   containerLinks.map((link, index) => (
                     <LinkItem key={link.id} link={link} index={index} containerId={container.id} />
                   ))
                 ) : (
                    !snapshot.isDraggingOver && <p style={styles.emptyMessage}>The {title} is empty.</p>
                 )}
                 {provided.placeholder}
               </div>
             )}
           </Droppable>
        </div>
      );
    }

    const styles = {
       wrapper: {
           padding: '20px',
           flexGrow: 1,
           overflowY: 'auto', // Allow vertical scrolling for links
           display: 'flex',
           flexDirection: 'column',
       },
       title: {
           fontSize: '1.3em',
           color: 'var(--text-secondary)',
           marginBottom: '20px',
           display: 'flex',
           alignItems: 'center',
            fontWeight: 500,
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '10px',
       },
        droppableArea: {
           minHeight: '100px', // Ensure area has height
           borderRadius: '4px',
           padding: '5px',
           flexGrow: 1, // Take available space
           transition: 'background-color 0.2s ease',
        },
        emptyMessage: {
           textAlign: 'center',
           color: 'var(--text-muted)',
           fontSize: '14px',
           marginTop: '30px',
        },
       loading: {
           padding: '20px',
           textAlign: 'center',
           color: 'var(--text-muted)',
       }
    };


    export default SpecialContainer;

    ```

---

**Step 7: Main App Component (`src/App.jsx`)**

```jsx
import React, { useEffect } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import useStore, { ARCHIVE_CONTAINER_ID, TRASH_CONTAINER_ID } from './store/useStore';
import TabsBar from './components/TabsBar';
import TabContent from './components/TabContent';
import SpecialContainer from './components/SpecialContainer';
import ImportExport from './components/ImportExport';
import './App.css'; // Optional: App specific styles

function App() {
  const {
    tabs,
    activeTabId,
    handleDragEnd,
    loadInitialData,
    isLoading,
    firstUse, // Get firstUse flag
    setActiveTabId // Needed to potentially set active tab after initial load
  } = useStore();

  useEffect(() => {
    // Load data from storage when the app mounts
    loadInitialData();
     // Log firstUse status from store after initial load attempt
     // console.log("App Mounted, firstUse state:", useStore.getState().firstUse);

     // Set initial active tab AFTER data might be loaded
      const unsubscribe = useStore.subscribe(
         (state) => state.isLoading, // Subscribe to isLoading changes
         (loading, prevLoading) => {
           if (!loading && prevLoading) { // If loading just finished
              const currentState = useStore.getState();
             if (!currentState.activeTabId && currentState.tabs.length > 0) {
                console.log("Setting initial active tab ID:", currentState.tabs[0].id);
               setActiveTabId(currentState.tabs[0].id);
             } else if (currentState.tabs.length === 0 && currentState.activeTabId !== ARCHIVE_CONTAINER_ID && currentState.activeTabId !== TRASH_CONTAINER_ID) {
                 // If no user tabs, default to Archive or Trash if they exist? Or null? Let's keep it null.
                 // setActiveTabId(null); // Or maybe ARCHIVE_CONTAINER_ID ?
             }
           }
         }
       );

       return unsubscribe; // Cleanup subscription on unmount

  }, [loadInitialData, setActiveTabId]); // Dependencies for initial setup

  const activeTab = tabs.find(tab => tab.id === activeTabId);
  const isSpecialTabActive = activeTabId === ARCHIVE_CONTAINER_ID || activeTabId === TRASH_CONTAINER_ID;

  if (isLoading) {
    return <div style={styles.loadingState}>Loading Later-List...</div>;
  }

   // Optional: Display a welcome message or tutorial on first use
    if (firstUse && !isLoading) {
        // You could replace this with a more elaborate welcome component
        console.log("App: First use detected, showing basic message.");
         // The default data is already loaded by the background script and store initialization.
         // The store will automatically set firstUse to false after the first successful hydration/load.
    }


  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div style={styles.appContainer}>
        <TabsBar />
        <main style={styles.mainContent}>
          {isSpecialTabActive ? (
            <SpecialContainer containerId={activeTabId} />
          ) : activeTab ? (
            <TabContent key={activeTab.id} tab={activeTab} />
          ) : (
             // Show message if no tabs exist and neither Archive nor Trash is selected
             tabs.length === 0 && !isSpecialTabActive ? (
                <div style={styles.emptyState}>
                    <h2>Welcome to Later-List!</h2>
                    <p>Create your first tab using the '+' button above to get started.</p>
                </div>
             ) : null // Or some other placeholder if needed
          )}
        </main>
        <ImportExport />
      </div>
    </DragDropContext>
  );
}

// Basic inline styles for layout
const styles = {
  appContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh', // Full viewport height
    maxHeight: '600px', // Max height for popup
    minHeight: '400px', // Min height for popup
    overflow: 'hidden', // Prevent outer scroll
    backgroundColor: 'var(--bg-primary)',
  },
  mainContent: {
    flexGrow: 1, // Takes remaining vertical space
    overflowY: 'auto', // Allows content (tabs/containers) to scroll vertically if needed
     overflowX: 'hidden', // Prevent horizontal scroll at main level
     display: 'flex', // Needed for TabContent/SpecialContainer to grow
     flexDirection: 'column', // Stack content vertically
  },
  loadingState: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    color: 'var(--text-secondary)',
    fontSize: '1.2em',
  },
   emptyState: {
       display: 'flex',
       flexDirection: 'column',
       justifyContent: 'center',
       alignItems: 'center',
       flexGrow: 1,
       textAlign: 'center',
       color: 'var(--text-muted)',
       padding: '20px',
   }
};

export default App;

```

8.  **(Optional) `src/App.css`:** You can add more specific styles here if needed, beyond `index.css`.

---

**Step 8: Build and Load the Extension**

1.  **Build:** Open your terminal in the `later-list` project directory and run:
    ```bash
    npm run build
    ```
    This will create a `dist` folder containing the bundled extension files. Vite (with the `crx` plugin) handles copying the manifest, icons, and compiling/bundling the JS/CSS/React code.

2.  **Load in Chrome/Chromium:**
    *   Open your browser.
    *   Go to the extensions page: `chrome://extensions`
    *   Enable "Developer mode" (usually a toggle in the top right).
    *   Click "Load unpacked".
    *   Navigate to and select the `later-list/dist` folder created in the previous step.
    *   The "Later-List" extension should now appear in your extensions list and its icon in the toolbar.

---

**Step 9: Testing and Refinement**

1.  **Click the Icon:** Open the popup. Check if the default data loads correctly on the first run.
2.  **Add/Rename/Delete:** Test creating, renaming, and deleting tabs and containers.
3.  **Drag and Drop:**
    *   Drag links between containers in the same tab.
    *   Drag links between containers in different tabs (drag link, hover over target tab, wait for it to switch, drop in container).
    *   Drag containers to reorder within a tab.
    *   Drag containers onto different tab headers to move them.
4.  **Add Links:**
    *   Go to any webpage.
    *   Ctrl+Right-click (or Cmd+Right-click on Mac) on the page background. The save dialog should appear. Select a tab/container and save. Check if the link appears correctly.
    *   Ctrl+Right-click on a link element on a webpage. Check if the dialog appears with the link's URL and allows saving.
5.  **Open/Archive/Trash:**
    *   Click a link in the popup. It should open in a new tab, and the link item should move to the Archive.
    *   Use the trash icon on a link. It should move to the Trash container.
    *   Use the archive icon. It should move to the Archive container.
6.  **Restore:** Go to Archive or Trash, use the restore button on a link. It should return to its original container (or a fallback if the original is gone).
7.  **View Switcher:** Test toggling between 'List' and 'Favicon' (Grid) views.
8.  **Import/Export:**
    *   Export the data. Check the downloaded JSON file.
    *   Make some changes.
    *   Import the previously exported file. Check if the data is restored.
    *   Create a plain text file with some URLs (one per line, optionally `url | title` format) and import it. Check if an "Imported from OneTab" tab/container is created with the links.
9.  **Empty Trash:** Test the "Empty Trash" button.
10. **Dark Mode & UI:** Check if the dark mode is applied consistently and if the UI looks reasonably good (animations might need CSS tuning).
11. **Console Logs:** Check the background page console (`chrome://extensions` -> Later-List -> `service worker`) and the popup console (Right-click inside popup -> Inspect) and the content script console (Right-click on a regular webpage -> Inspect -> Console) for errors.

This comprehensive setup provides the core functionality you requested. Further development would involve refining the CSS, adding more robust error handling, potentially optimizing state management for very large lists, and adding more sophisticated features if desired.