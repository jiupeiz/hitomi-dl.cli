// ==UserScript==
// @name         LANraragi & Hitomi.la Metadata Bridge
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Manage "To-be-tagged" queue from LRR and sync metadata from Hitomi.la
// @author       Antigravity
// @match        https://hitomi.la/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        unsafeWindow
// @connect      *
// ==/UserScript==

(function () {
    'use strict';

    // --- Configuration ---
    const LRR_URL = "http://your.lanraragi.host:3000";
    const LRR_API_KEY = "YourLanraragiToken";

    // --- State Management ---
    const STATE = {
        queue: GM_getValue('lrr_queue', []),
        index: GM_getValue('lrr_queue_index', 0),
        panelPos: GM_getValue('lrr_panel_pos', { top: '10px', left: '10px' }),
        minimized: GM_getValue('lrr_minimized', false),
        currentPage: 0,
        pageList: []
    };

    function saveState() {
        GM_setValue('lrr_queue', STATE.queue);
        GM_setValue('lrr_queue_index', STATE.index);
        GM_setValue('lrr_minimized', STATE.minimized);
    }

    // --- API & Logic ---
    const API = {
        request: (method, endpoint, data = null, useFormData = false) => {
            return new Promise((resolve, reject) => {
                const headers = {
                    "Authorization": `Bearer ${btoa(LRR_API_KEY)}`,
                    "Accept": "application/json"
                };

                let body = null;
                if (data) {
                    if (useFormData) {
                        headers["Content-Type"] = "application/x-www-form-urlencoded";
                        body = new URLSearchParams(data).toString();
                    } else {
                        headers["Content-Type"] = "application/json";
                        body = JSON.stringify(data);
                    }
                }

                console.log(`[LRR Bridge] Request: ${method} ${endpoint}`, { headers, body: data });

                GM_xmlhttpRequest({
                    method: method,
                    url: `${LRR_URL}${endpoint}`,
                    headers: headers,
                    data: body,
                    onload: (response) => {
                        console.log(`[LRR Bridge] Response ${response.status}:`, response.responseText.substring(0, 200) + (response.responseText.length > 200 ? "..." : ""));
                        if (response.status >= 200 && response.status < 300) {
                            try { resolve(JSON.parse(response.responseText)); } catch (e) { resolve(response.responseText); }
                        } else {
                            reject(`Error ${response.status}: ${response.statusText} - ${response.responseText}`);
                        }
                    },
                    onerror: (err) => reject(err)
                });
            });
        },
        fetchQueue: async () => {
            updateStatus("Fetching untagged IDs...");
            try {
                const ids = await API.request('GET', '/api/archives/untagged');

                if (!ids || ids.length === 0) {
                    showToast("Queue is empty!");
                    STATE.queue = [];
                    STATE.index = 0;
                    saveState();
                    updateUI();
                    updateStatus("Queue Empty");

                    const panel = document.getElementById('lrr-panel');
                    if (panel && !panel.classList.contains('lrr-docked')) {
                        toggleMinimize(panel);
                    }
                    return;
                }

                STATE.queue = ids.map(id => ({
                    id: id,
                    title: `ID: ${id}`,
                    tags: "",
                    pagecount: 0,
                    loaded: false
                }));

                STATE.index = 0;
                saveState();
                updateUI();
                updateStatus(`${STATE.queue.length} untagged items found.`);
            } catch (err) {
                console.error(err);
                updateStatus("Error fetching queue");
            }
        },

        loadArchiveDetails: async (idx) => {
            if (!STATE.queue[idx]) return;
            // If already loaded, we don't do anything (unless we want to re-verify?)
            // But for this flow, we assume loaded items are valid.
            if (STATE.queue[idx].loaded) return;

            try {
                const meta = await API.request('GET', `/api/archives/${STATE.queue[idx].id}/metadata`);

                // Check filter: status:missing
                // The API usually returns tags as a comma-separated string
                const tags = meta.tags || "";
                if (tags.includes("status:missing")) {
                    console.log(`[LRR Bridge] Skipping ${meta.arcid} due to status:missing`);
                    // Remove from queue
                    STATE.queue.splice(idx, 1);
                    // If we removed the last item and we are at the end, decrement index or handle empty
                    if (STATE.index >= STATE.queue.length) {
                        STATE.index = Math.max(0, STATE.queue.length - 1);
                    }
                    saveState();
                    updateUI(); // This will trigger load for the new item at this index
                    return;
                }

                STATE.queue[idx] = {
                    id: meta.arcid,
                    title: meta.title,
                    tags: meta.tags,
                    pagecount: meta.pagecount,
                    loaded: true
                };
                if (STATE.index === idx) updateUI();
            } catch (e) {
                console.error("Failed to load metadata", e);

                // Handle "ID doesn't exist" or other fetch errors by skipping
                // The error message from API class is usually a string now: "Error 400: ..." 
                // or if it threw an object.
                const errStr = e.toString();
                if (errStr.includes("400") || errStr.includes("404") || errStr.includes("doesn't exist")) {
                    console.log(`[LRR Bridge] ID ${STATE.queue[idx].id} invalid/not found, removing from queue.`);
                    STATE.queue.splice(idx, 1);
                    if (STATE.index >= STATE.queue.length) {
                        STATE.index = Math.max(0, STATE.queue.length - 1);
                    }
                    saveState();
                    updateUI();
                } else {
                    // Start auto-retry or just invalid state?
                    updateStatus("Error loading metadata");
                }
            }
        },

        getPages: async (id) => {
            updateStatus("Getting pages...");
            try {
                // /files extraction returns { pages: [...] }
                const res = await API.request('GET', `/api/archives/${id}/files`);
                return res.pages || [];
            } catch (e) {
                console.error(e);
                return [];
            }
        },

        setCover: async (id, pageNum) => {
            updateStatus(`Setting cover to page ${pageNum}...`);
            try {
                await API.request('PUT', `/api/archives/${id}/thumbnail?page=${pageNum}`);
                updateStatus("Cover updated!");
            } catch (e) {
                updateStatus("Failed to set cover");
            }
        },

        findArtistArchives: async (artist) => {
            try {
                // Requirement 4: Find archives by this artist
                const res = await API.request('GET', `/api/search?filter=artist:${encodeURIComponent(artist)}$`);
                return res.data || [];
            } catch (e) {
                console.error("Artist search failed", e);
                return [];
            }
        },

        deleteArchive: async (id) => {
            return API.request('DELETE', `/api/archives/${id}`);
        },

        markAsMissing: async (id) => {
            // Get current tags first to append
            try {
                const meta = await API.request('GET', `/api/archives/${id}/metadata`);
                const currentTags = meta.tags || "";
                // Check if already missing
                if (currentTags.includes("status:missing")) return;

                const newTags = currentTags ? `${currentTags}, status:missing` : "status:missing";

                // LRR API expects 'tags' as a QUERY Parameter for PUT /metadata, not body
                // We need to encode it properly
                const finalUrl = `/api/archives/${id}/metadata?tags=${encodeURIComponent(newTags)}`;
                return API.request('PUT', finalUrl, null);
            } catch (e) {
                console.error("Failed to mark missing", e);
                throw e;
            }
        },

        syncTags: async (archiveId, metadata) => {
            updateStatus("Syncing...");
            try {
                await API.request('PUT', `/api/archives/${archiveId}/metadata`, metadata, true);
                updateStatus("Sync successful!");
                setTimeout(() => {
                    if (STATE.index < STATE.queue.length - 1) {
                        STATE.index++;
                        saveState();
                        updateUI();
                    } else {
                        API.fetchQueue();
                    }
                }, 1000);
            } catch (err) {
                console.error(err);
                updateStatus(`Sync failed! Check Console.`);
            }
        }
    };

    // --- UI Construction ---
    const STYLES = `
        /* Scrollbar Styling */
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        ::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .lrr-common-panel {
            position: fixed;
            top: 5vh;
            max-height: 90vh;
            background: rgba(30,30,30,0.85);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            color: #f0f0f0;
            border: 1px solid rgba(255,255,255,0.1);
            z-index: 999999;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 14px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            width: 25% !important;
            min-width: 250px;
        }

        #lrr-panel {
            left: 10px;
            border-radius: 12px;
        }
        
        #lrr-artist-panel {
            right: 10px;
            border-radius: 12px;
        }

        /* Docked States */
        .lrr-docked {
            width: 40px !important;
            min-width: 40px !important;
            height: 60px !important;
            max-height: 60px !important;
            top: 50vh !important;
            transform: translateY(-50%);
            padding: 0 !important;
            justify-content: center !important;
            align-items: center !important;
            cursor: pointer;
            background: rgba(30,30,30,0.95) !important;
            border: 1px solid rgba(255,255,255,0.2) !important;
        }

        #lrr-panel.docked-left {
            left: 0 !important;
            border-radius: 0 8px 8px 0 !important;
        }
        
        #lrr-artist-panel.docked-right {
           right: 0 !important;
           border-radius: 8px 0 0 8px !important;
        }

        /* Hide content when docked */
        .docked-left > *:not(.lrr-restore-icon),
        .docked-right > *:not(.lrr-restore-icon) {
            display: none !important;
        }
        
        /* Restore Icons */
        .lrr-restore-icon {
            display: none;
            color: #fff;
            font-size: 18px;
            font-weight: bold;
        }
        .docked-left .lrr-restore-icon,
        .docked-right .lrr-restore-icon {
            display: block;
        }

        .lrr-header-row {
            padding: 10px 16px;
            background: rgba(255,255,255,0.05);
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: 600;
        }
        
        .lrr-min-btn {
            cursor: pointer;
            width: 24px;
            height: 24px;
            display: flex;
            justify-content: center;
            align-items: center;
            border-radius: 4px;
            transition: background 0.2s;
            margin-left: 8px;
            font-family: monospace;
            font-size: 16px;
        }
        .lrr-min-btn:hover { background: rgba(255,255,255,0.1); }

        #lrr-counter {
            background: rgba(0,123,255,0.2);
            color: #4dabff;
            padding: 2px 10px;
            border-radius: 12px;
            font-size: 12px;
        }
        #lrr-body, #lrr-artist-list {
            padding: 16px;
            overflow-y: auto;
            flex: 1;
        }
        .lrr-btn-group { display: flex; gap: 8px; margin-bottom: 16px; }
        .lrr-btn-group button { flex: 1; }
        .lrr-btn-group #lrr-refresh { flex: 2; }
        .lrr-btn {
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.1);
            color: #ddd;
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s ease;
        }
        .lrr-btn:hover { background: rgba(255,255,255,0.2); color: #fff; }
        .lrr-btn.primary { background: linear-gradient(135deg, #007bff, #0056b3); border: none; color: white; }
        #lrr-current-display { 
            font-weight: 600; font-size: 15px; margin-bottom: 12px; 
            white-space: normal; overflow-wrap: anywhere; word-break: normal;
        }
        .lrr-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 8px; }
        .lrr-chip { background: rgba(255,255,255,0.08); padding: 4px 10px; border-radius: 16px; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); font-size: 12px; user-select: none; }
        .lrr-chip.selected { background: #007bff; border-color: #4dabff; color: white; }
        #lrr-thumb-container {
            width: 100%;
            min-height: 100px;
            background: rgba(0,0,0,0.2);
            overflow: hidden;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            position: relative;
            display: flex; justify-content: center; align-items: center;
        }
        #lrr-thumbnail {
            width: 100%;
            height: auto;
            display: none;
            object-fit: contain;
        }
        .lrr-sync-btn-injected {
            position: absolute; top: 8px; right: 8px; z-index: 100;
            background: #007bff; color: white; border: none; border-radius: 6px;
            padding: 6px 12px; cursor: pointer; font-weight: 600;
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 13px;
            min-width: 80px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            transition: all 0.2s ease;
            text-align: center;
        }
        .lrr-sync-btn-injected:hover {
            filter: brightness(1.1);
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            transform: translateY(-1px);
        }
        
        /* New Nav Buttons */
        .lrr-nav-btn {
            position: absolute; top: 50%; transform: translateY(-50%);
            width: 40px; height: 60px;
            background: rgba(0,0,0,0.3); color: white;
            border: none; cursor: pointer; display: flex;
            align-items: center; justify-content: center;
            font-size: 24px; transition: background 0.2s;
            user-select: none; z-index: 10;
        }
        .lrr-nav-btn:hover { background: rgba(0,0,0,0.7); }
        .lrr-nav-left { left: 0; border-radius: 0 8px 8px 0; }
        .lrr-nav-right { right: 0; border-radius: 8px 0 0 8px; }
        
        #lrr-page-count {
            position: absolute; top: 0; left: 0;
            background: rgba(0,0,0,0.6); color: #fff;
            padding: 4px 8px; font-size: 12px;
            border-bottom-right-radius: 8px; pointer-events: none;
            z-index: 11;
        }

        .lrr-artist-item {
            background: rgba(255,255,255,0.05);
            padding: 8px; border-radius: 4px; font-size: 13px;
        }
        .lrr-artist-meta {
            font-size: 11px; opacity: 0.7; margin-top: 4px; display: flex; justify-content: space-between;
        }

        /* Danger Zone Menu */
        .lrr-menu-container { 
            position: relative; 
            display: flex; /* Ensure child button stretches */
            margin-left: 6px;
        }
        .lrr-btn-group .lrr-menu-btn { 
            flex: 0 0 36px; padding: 0; font-size: 20px; line-height: 1; 
            margin: 0; /* Reset margin, handled by container */
            height: auto; /* Stretch to fill container */
        }
        .lrr-dropdown {
            position: absolute; top: 100%; right: 0; /* Open DOWNWARDS */
            margin-top: 8px; /* Spacing from button */
            margin-bottom: 0;
            background: #2a2a2a;
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.6);
            display: none;
            flex-direction: column;
            min-width: 160px;
            z-index: 10000;
            overflow: hidden;
            animation: lrr-fade-in 0.1s ease-out;
        }
        .lrr-dropdown.visible { display: flex; }
        .lrr-dropdown-item {
            padding: 12px 16px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            transition: all 0.2s;
            display: flex; align-items: center; gap: 8px;
        }
        .lrr-dropdown-item:last-child { border-bottom: none; }
        .lrr-dropdown-item:hover { background: rgba(255,255,255,0.1); }
        .lrr-dropdown-item.warning { color: #ffb74d; }
        .lrr-dropdown-item.error { color: #ff5252; }
        .lrr-dropdown-item.confirm { background: rgba(255,82,82,0.15); font-weight: 700; }
        
        @keyframes lrr-fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

        /* Toast Notifications */
        .lrr-toast {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            z-index: 1000001;
            font-size: 14px;
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255,255,255,0.1);
            animation: lrr-toast-in 0.3s ease-out, lrr-toast-out 0.3s ease-in 2.7s forwards;
        }
        @keyframes lrr-toast-in { from { bottom: 0; opacity: 0; } to { bottom: 20px; opacity: 1; } }
        @keyframes lrr-toast-out { from { bottom: 20px; opacity: 1; } to { bottom: 0; opacity: 0; } }

        /* Browse Panel Styles */
        #lrr-browse-overlay {
            position: absolute;
            top: 45px; /* Below header */
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(20, 20, 20, 0.95);
            backdrop-filter: blur(20px);
            z-index: 1000;
            display: none;
            flex-direction: column;
            animation: lrr-fade-in 0.2s ease-out;
        }

        #lrr-browse-overlay.visible { display: flex; }

        .lrr-browse-header {
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.05);
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        #lrr-browse-list {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
        }

        .lrr-browse-item {
            display: flex;
            align-items: center;
            padding: 12px;
            margin-bottom: 8px;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid transparent;
            min-height: 120px; /* Increased row height */
        }

        .lrr-browse-item:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.1);
        }

        .lrr-browse-item.active {
            background: rgba(0, 123, 255, 0.15);
            border-color: rgba(0, 123, 255, 0.4);
        }

        .lrr-browse-item img {
            width: 80px;  /* Increased size */
            height: 112px; /* Increased size */
            object-fit: cover;
            border-radius: 6px;
            margin-right: 16px;
            background: #111;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }

        .lrr-browse-item-info {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        .lrr-browse-item-title {
            font-size: 15px; /* Bigger font */
            font-weight: 600;
            white-space: normal; /* Allow wrap */
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            color: #fff;
            line-height: 1.4;
        }

        .lrr-browse-item-meta {
            font-size: 12px;
            color: #aaa;
            margin-top: 6px;
        }
    `;

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'lrr-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    function createPanel() {
        GM_addStyle(STYLES);
        const panel = document.createElement('div');
        panel.id = 'lrr-panel';
        panel.className = 'lrr-common-panel';
        panel.innerHTML = `
            <div id="lrr-header" class="lrr-header-row">
                <div style="display:flex; align-items:center;">
                    <button class="lrr-btn" id="lrr-browse-btn" style="padding: 2px 8px; margin-right: 8px; font-size: 11px;">Browse</button>
                    <span>LRR Bridge</span>
                </div>
                <div style="display:flex; align-items:center;">
                    <span id="lrr-counter">0/0</span>
                    <div id="lrr-minimize-btn" class="lrr-min-btn" title="Minimize">&minus;</div>
                </div>
            </div>
            <div id="lrr-browse-overlay">
                <div class="lrr-browse-header">
                    <span style="font-weight:600; font-size:12px; opacity:0.8;">Select Archive</span>
                    <div id="lrr-browse-close" class="lrr-min-btn" style="margin:0; font-size:18px;">&times;</div>
                </div>
                <div id="lrr-browse-list"></div>
            </div>
            <div class="lrr-restore-icon">&rsaquo;</div>
            <div id="lrr-body">
                <div class="lrr-btn-group">
                    <button class="lrr-btn" id="lrr-prev">Prev</button>
                    <button class="lrr-btn" id="lrr-refresh">Refresh</button>
                    <button class="lrr-btn" id="lrr-next">Next</button>
                    <div class="lrr-menu-container">
                        <button class="lrr-btn lrr-menu-btn" id="lrr-menu-toggle">&vellip;</button>
                        <div class="lrr-dropdown" id="lrr-menu-dropdown">
                            <div class="lrr-dropdown-item warning" id="lrr-menu-missing">
                                <span>⚠️</span> Mark as Missing
                            </div>
                            <div class="lrr-dropdown-item error" id="lrr-menu-delete">
                                <span>🗑️</span> Delete Archive
                            </div>
                        </div>
                    </div>
                </div>
                <div id="lrr-thumb-container">
                    <span id="lrr-page-count"></span>
                    <button class="lrr-nav-btn lrr-nav-left" id="lrr-img-prev">&lsaquo;</button>
                    <img id="lrr-thumbnail" src="" alt="Cover" />
                    <button class="lrr-nav-btn lrr-nav-right" id="lrr-img-next">&rsaquo;</button>
                </div>
                <button class="lrr-btn" id="lrr-set-cover" style="width:100%; margin-top:0; border-radius:0 0 4px 4px; border-top:none; display:none;">Set Current Page as Cover</button>
                
                <div id="lrr-current-display" style="margin-top:12px;">Queue Empty</div>
                <div id="lrr-segmentation" class="lrr-chips"></div>
                <button class="lrr-btn primary" id="lrr-search-btn" style="width:100%; margin-top:16px;">Search Selected</button>
                <button class="lrr-btn primary" id="lrr-gallery-sync-btn" style="width:100%; margin-top:8px; display:none;">Sync Current Gallery</button>
                <div id="lrr-status">Ready</div>
            </div>`;
        document.body.appendChild(panel);

        // Fix: If queue is empty or explicitly minimized, dock the panel
        if (STATE.minimized || STATE.queue.length === 0) {
            panel.classList.add('docked-left');
            panel.classList.add('lrr-docked');
        }

        panel.querySelector('#lrr-minimize-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMinimize(panel);
        });
        panel.addEventListener('click', (e) => {
            // Restore only if docked and clicked on the panel itself (not children)
            if (panel.classList.contains('docked-left')) {
                toggleMinimize(panel);
            }
        });
        panel.querySelector('#lrr-refresh').addEventListener('click', API.fetchQueue);
        panel.querySelector('#lrr-prev').addEventListener('click', () => { if (STATE.index > 0) { STATE.index--; saveState(); updateUI(); } });
        panel.querySelector('#lrr-next').addEventListener('click', () => { if (STATE.index < STATE.queue.length - 1) { STATE.index++; saveState(); updateUI(); } });

        // Image Nav
        panel.querySelector('#lrr-img-prev').addEventListener('click', (e) => { e.stopPropagation(); changePage(-1); });
        panel.querySelector('#lrr-img-next').addEventListener('click', (e) => { e.stopPropagation(); changePage(1); });
        panel.querySelector('#lrr-set-cover').addEventListener('click', (e) => {
            e.stopPropagation();
            const curr = STATE.queue[STATE.index];
            if (curr && STATE.currentPage >= 0) {
                // Page numbers are 1-based for the API
                API.setCover(curr.id, STATE.currentPage + 1);
            }
        });

        panel.querySelector('#lrr-search-btn').addEventListener('click', executeSearch);
        panel.querySelector('#lrr-gallery-sync-btn').addEventListener('click', () => syncCurrentGallery());

        // Browse Panel Logic
        const browseBtn = panel.querySelector('#lrr-browse-btn');
        const browseOverlay = panel.querySelector('#lrr-browse-overlay');
        const browseClose = panel.querySelector('#lrr-browse-close');

        browseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleBrowsePanel(true);
        });

        browseClose.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleBrowsePanel(false);
        });

        function toggleBrowsePanel(show) {
            if (show) {
                populateBrowsePanel();
                browseOverlay.classList.add('visible');
            } else {
                browseOverlay.classList.remove('visible');
            }
        }

        function populateBrowsePanel() {
            const list = panel.querySelector('#lrr-browse-list');
            list.innerHTML = '';

            STATE.queue.forEach((item, i) => {
                const div = document.createElement('div');
                div.className = `lrr-browse-item ${i === STATE.index ? 'active' : ''}`;

                div.innerHTML = `
                    <div style="position:relative;">
                        <img src="" alt="thumb" loading="lazy" 
                             style="opacity: 0; transition: opacity 0.3s; width: 80px; height: 112px; background: #111;">
                    </div>
                    <div class="lrr-browse-item-info">
                        <div class="lrr-browse-item-title" title="${item.title}">${item.title}</div>
                        <div class="lrr-browse-item-meta">${item.loaded ? (item.pagecount + 'p') : 'Loading Metadata...'}</div>
                    </div>
                `;

                // Handle clicking an item
                div.onclick = () => {
                    STATE.index = i;
                    saveState();
                    updateUI();
                    toggleBrowsePanel(false);
                };

                const img = div.querySelector('img');

                // Fetch authenticated thumbnail
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: `${LRR_URL}/api/archives/${item.id}/thumbnail`,
                    headers: { "Authorization": `Bearer ${btoa(LRR_API_KEY)}` },
                    responseType: 'blob',
                    onload: r => {
                        if (r.status === 200) {
                            const url = URL.createObjectURL(r.response);
                            img.src = url;
                            img.style.opacity = '1';
                        }
                    }
                });

                // Trigger metadata load if not loaded
                if (!item.loaded) {
                    API.loadArchiveDetails(i).then(() => {
                        const titleEl = div.querySelector('.lrr-browse-item-title');
                        const metaEl = div.querySelector('.lrr-browse-item-meta');
                        if (titleEl && STATE.queue[i].loaded) {
                            titleEl.textContent = STATE.queue[i].title;
                            titleEl.title = STATE.queue[i].title;
                            metaEl.textContent = STATE.queue[i].pagecount + 'p';
                        }
                    });
                }

                list.appendChild(div);

                // If it's the active one, scroll into view
                if (i === STATE.index) {
                    setTimeout(() => div.scrollIntoView({ block: 'nearest' }), 50);
                }
            });
        }

        // --- Danger Zone Logic ---
        const menuToggle = panel.querySelector('#lrr-menu-toggle');
        const menuDropdown = panel.querySelector('#lrr-menu-dropdown');
        const btnMissing = panel.querySelector('#lrr-menu-missing');
        const btnDelete = panel.querySelector('#lrr-menu-delete');

        // Toggle
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            menuDropdown.classList.toggle('visible');
            resetMenuItems();
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!menuDropdown.contains(e.target) && e.target !== menuToggle) {
                menuDropdown.classList.remove('visible');
                resetMenuItems();
            }
        });

        let dangerTimeout;

        function resetMenuItems() {
            clearTimeout(dangerTimeout);
            [btnMissing, btnDelete].forEach(btn => {
                if (btn.dataset.confirming === 'true') {
                    btn.dataset.confirming = 'false';
                    btn.innerHTML = btn.dataset.originalHtml;
                    btn.classList.remove('confirm');
                }
            });
        }

        function handleDangerAction(btn, actionName, callback) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (btn.dataset.confirming === 'true') {
                    // Confirmed
                    resetMenuItems();
                    menuDropdown.classList.remove('visible');
                    callback();
                } else {
                    // First Click
                    resetMenuItems(); // Reset others
                    btn.dataset.confirming = 'true';
                    btn.dataset.originalHtml = btn.innerHTML;
                    btn.innerHTML = `<span>❓</span> Are you sure?`;
                    btn.classList.add('confirm');

                    dangerTimeout = setTimeout(() => {
                        resetMenuItems();
                    }, 5000);
                }
            });
        }

        handleDangerAction(btnMissing, 'Missing', async () => {
            const current = STATE.queue[STATE.index];
            if (!current) return;
            updateStatus("Marking as missing...");
            try {
                await API.markAsMissing(current.id);
                updateStatus("Marked as missing!");
                // Auto Next
                setTimeout(() => {
                    if (STATE.index < STATE.queue.length - 1) {
                        STATE.index++;
                        saveState();
                        updateUI();
                    } else {
                        API.fetchQueue();
                    }
                }, 1000);
            } catch (e) { updateStatus("Error marking missing"); }
        });

        handleDangerAction(btnDelete, 'Delete', async () => {
            const current = STATE.queue[STATE.index];
            if (!current) return;
            updateStatus("Deleting archive...");
            try {
                await API.deleteArchive(current.id);
                updateStatus("Archive deleted!");
                // Auto Next
                setTimeout(() => {
                    if (STATE.index < STATE.queue.length - 1) {
                        STATE.index++;
                        saveState();
                        updateUI();
                    } else {
                        API.fetchQueue();
                    }
                }, 1000);
            } catch (e) { updateStatus("Error deleting archive"); }
        });

        updateUI();
    }





    function toggleMinimize(panel) {
        STATE.minimized = !STATE.minimized;
        // Use lrr-docked for common styles + docked-left for position specific
        panel.classList.toggle('docked-left', STATE.minimized);
        panel.classList.toggle('lrr-docked', STATE.minimized);
        const btn = panel.querySelector('#lrr-minimize-btn');
        // Restore/Minimize icon is handled by CSS swapping now
        saveState();
    }

    function updateStatus(msg) { const el = document.getElementById('lrr-status'); if (el) el.textContent = msg; }

    async function showPreviewImage(id, index) {
        const thumbEl = document.getElementById('lrr-thumbnail');
        if (!thumbEl || !STATE.pageList || STATE.pageList.length === 0) return;

        const path = STATE.pageList[index];
        if (!path) return;

        thumbEl.style.opacity = '0.5';

        // Fetch specific page image
        try {
            const res = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: `${LRR_URL}${path}`,
                    headers: { "Authorization": `Bearer ${btoa(LRR_API_KEY)}` },
                    responseType: 'blob',
                    onload: r => (r.status === 200) ? resolve(r.response) : reject(r),
                    onerror: reject
                });
            });

            const oldUrl = thumbEl.src;
            if (oldUrl && oldUrl.startsWith('blob:')) URL.revokeObjectURL(oldUrl);
            thumbEl.src = URL.createObjectURL(res);
            thumbEl.style.opacity = '1';
            thumbEl.style.display = 'block';
        } catch (e) {
            console.error("Image load failed", e);
        }
    }

    async function changePage(delta) {
        if (!STATE.pageList || STATE.pageList.length === 0) return;
        const newPage = STATE.currentPage + delta;
        if (newPage >= 0 && newPage < STATE.pageList.length) {
            STATE.currentPage = newPage;
            const current = STATE.queue[STATE.index];
            if (current) showPreviewImage(current.id, STATE.currentPage);
            document.getElementById('lrr-set-cover').style.display = 'block';
            updateUI(); // Update page count text
        }
    }

    async function updateUI() {
        const counter = document.getElementById('lrr-counter');
        const display = document.getElementById('lrr-current-display');
        const segContainer = document.getElementById('lrr-segmentation');
        const galleryBtn = document.getElementById('lrr-gallery-sync-btn');
        const countOverlay = document.getElementById('lrr-page-count');
        const setCoverBtn = document.getElementById('lrr-set-cover');
        const panel = document.getElementById('lrr-panel');

        if (panel) {
            const btn = panel.querySelector('#lrr-minimize-btn');
            if (btn) btn.textContent = '−';
        }

        if (!STATE.queue || STATE.queue.length === 0) {
            counter.textContent = "0/0"; display.textContent = "Queue Empty"; segContainer.innerHTML = "";
            const thumb = document.getElementById('lrr-thumbnail'); if (thumb) thumb.style.display = 'none';
            if (countOverlay) countOverlay.textContent = "";
            return;
        }

        const current = STATE.queue[STATE.index];

        // If metadata not loaded, trigger load and show loading state
        if (!current.loaded) {
            display.textContent = "Loading ID: " + current.id;
            counter.textContent = `${STATE.index + 1}/${STATE.queue.length}`;
            API.loadArchiveDetails(STATE.index); // Async trigger
        } else {
            display.textContent = current.title;

            // Update page count overlay: Current / Total
            if (countOverlay) {
                const total = current.pagecount || "?";
                const currentP = STATE.currentPage + 1;
                // Note: currentPage is 0-indexed index of STATE.pageList array.
                // This corresponds to the previewed page.
                // But wait, STATE.currentPage tracking is only valid if we are previewing images.
                // If we haven't loaded images yet, maybe show just "Total p".
                if (STATE.pageList && STATE.pageList.length > 0) {
                    countOverlay.textContent = `${currentP} / ${total}`;
                } else {
                    countOverlay.textContent = `${total}p`;
                }
            }

            // Setup tags
            const tokens = current.title.split(/[\[\]\(\)\s\-\._]+/).filter(t => t.trim().length > 0);
            segContainer.innerHTML = '';
            tokens.forEach(token => {
                const chip = document.createElement('span'); chip.className = 'lrr-chip'; chip.textContent = token;
                chip.onclick = () => chip.classList.toggle('selected'); segContainer.appendChild(chip);
            });
        }

        // Handle Image Preview
        // We only fetch pages if we haven't already for this ID to avoid spamming
        // Using a simple check: if currentPage is 0 and pageList is empty, fetch.
        // But if we switch archives, we need to clear pageList. This needs to be handled.
        // I'll attach a 'lastId' to STATE to detect switches.
        if (STATE.lastId !== current.id) {
            STATE.lastId = current.id;
            STATE.pageList = [];
            STATE.currentPage = 0;
            document.getElementById('lrr-thumbnail').style.display = 'none';
            setCoverBtn.style.display = 'none';

            // Fetch pages
            API.getPages(current.id).then(pages => {
                if (current.id !== STATE.queue[STATE.index].id) return; // Moved away
                STATE.pageList = pages;
                if (pages.length > 0) {
                    showPreviewImage(current.id, 0);
                    setCoverBtn.style.display = 'block';
                }
                updateStatus("Ready");
                // TRIGGER UI UPDATE TO SHOW PAGE COUNT
                updateUI();
            });
        } else {
            // Same archive, ensure image is shown
            if (STATE.pageList.length > 0) {
                // Don't refetch if already valid src
                const thumb = document.getElementById('lrr-thumbnail');
                if (thumb.style.display === 'none') showPreviewImage(current.id, STATE.currentPage);
                setCoverBtn.style.display = 'block';
            }
        }

        counter.textContent = `${STATE.index + 1}/${STATE.queue.length}`;

        // Visibility Check
        const isGallery = !!(document.querySelector('#gallery-brand') || document.querySelector('.gallery-info') || document.querySelector('#gallery-info'));
        if (galleryBtn) galleryBtn.style.display = isGallery ? 'block' : 'none';

        if (window.location.pathname.includes('search') || document.querySelector('.gallery-content')) {
            injectSearchButtons();
        }
    }

    async function checkArtistPage() {
        // Regex: /artist/(name)-[type].html
        // Capture everything between /artist/ and .html
        const regex = /\/artist\/(.+)\.html$/;
        const m = window.location.pathname.match(regex);

        if (m) {
            let artistRaw = decodeURIComponent(m[1]);
            // Remove -all, -english, -japanese suffix if present
            const suffixRegex = /-(all|english|japanese|korean|chinese)$/;
            const artistName = artistRaw.replace(suffixRegex, "");

            console.log(`[LRR Bridge] Detected artist page: ${artistName}`);
            const archives = await API.findArtistArchives(artistName);
            if (archives.length > 0) {
                createArtistPanel(artistName, archives);
            }
        }
    }

    function createArtistPanel(artist, archives) {
        const existing = document.getElementById('lrr-artist-panel');
        if (existing) existing.remove();

        const panel = document.createElement('div');
        panel.id = 'lrr-artist-panel';
        panel.className = 'lrr-common-panel';
        panel.innerHTML = `
            <div id="lrr-artist-header" class="lrr-header-row">
                <span>LRR: ${artist} (${archives.length})</span>
                <div class="lrr-min-btn" id="lrr-artist-min">&minus;</div>
            </div>
            <div class="lrr-restore-icon">&lsaquo;</div>
            <div id="lrr-artist-list"></div>
        `;

        // Docking logic for Artist Panel
        panel.addEventListener('click', (e) => {
            if (panel.classList.contains('lrr-docked')) {
                panel.classList.remove('docked-right', 'lrr-docked');
                e.stopPropagation();
            }
        });

        panel.querySelector('#lrr-artist-min').onclick = (e) => {
            e.stopPropagation();
            panel.classList.add('docked-right', 'lrr-docked');
        };

        const list = panel.querySelector('#lrr-artist-list');
        archives.forEach(arc => {
            const div = document.createElement('div');
            div.className = 'lrr-artist-item';
            div.innerHTML = `
                <div class="lrr-artist-title" title="${arc.title}">${arc.title}</div>
                <div class="lrr-artist-meta">
                   <span>${arc.pagecount}p</span>
                   <span>${new Date(arc.date_added * 1000).toLocaleDateString()}</span>
                </div>
             `;
            list.appendChild(div);
        });

        document.body.appendChild(panel);
    }

    function executeSearch() {
        const chips = document.querySelectorAll('.lrr-chip.selected');
        if (chips.length === 0) return;
        const query = Array.from(chips).map(c => c.textContent).join(' ');
        window.location.href = `https://hitomi.la/search.html?${encodeURIComponent(query)}`;
    }

    function getHitomiID(url) {
        if (!url) return "unknown";
        const match = url.match(/(\d+)(?:\.html|$)/);
        if (match) return match[1];
        const parts = url.split(/[?#]/)[0].split(/[-/]/);
        const idPart = parts.reverse().find(p => /^\d{5,}$/.test(p));
        return idPart || "unknown";
    }

    function extractMetadata(source) {
        console.log("[LRR Bridge] Starting metadata extraction...");
        const meta = { title: "", tags: [], timestamp: null };

        // Handle JSON object (Hitomi's precise galleryinfo.js format)
        if (typeof source === 'object' && source !== null && !source.nodeType) {
            console.log("[LRR Bridge] Extracting from data object:", source);
            const getNames = (arr, key) => (arr || []).map(item => item[key]).filter(Boolean);

            meta.title = source.japanese_title || source.title || "";

            // Map metadata to namespaced tags
            getNames(source.artists, 'artist').forEach(a => meta.tags.push(`artist:${a}`));
            getNames(source.groups, 'group').forEach(g => meta.tags.push(`group:${g}`));
            getNames(source.parodys, 'parody').forEach(p => meta.tags.push(`parody:${p}`));
            getNames(source.characters, 'character').forEach(c => meta.tags.push(`character:${c}`));

            if (source.tags) {
                source.tags.forEach(t => {
                    let name = t.tag;
                    if (t.female === "1" || t.female === 1) name = `female:${name}`;
                    else if (t.male === "1" || t.male === 1) name = `male:${name}`;
                    else name = `tag:${name}`;
                    meta.tags.push(name);
                });
            }

            if (source.language) meta.tags.push(`language:${source.language}`);
            if (source.type) meta.tags.push(`category:${source.type}`);

            if (source.date) {
                const d = new Date(source.date);
                if (!isNaN(d.getTime())) meta.timestamp = Math.floor(d.getTime() / 1000);
            }
        } else {
            const doc = source || document;
            const getInnerText = (selector) => {
                const el = doc.querySelector(selector);
                if (!el) return "";
                const text = el.innerText.trim();
                console.log(`[LRR Bridge] Selector ${selector} found: "${text}"`);
                return (text === "N/A" || text === "-" || text.includes("Series N/A")) ? "" : text;
            };
            const getList = (selector) => {
                const container = doc.querySelector(selector);
                if (!container) return [];
                const items = Array.from(container.querySelectorAll('a, li')).map(el => el.textContent.trim())
                    .filter(t => t.length > 0 && t !== "N/A" && !t.includes("Show all"));
                console.log(`[LRR Bridge] Selector ${selector} found ${items.length} items:`, items);
                return items;
            };

            meta.title = getInnerText('#gallery-brand');

            getList('#artists').forEach(a => meta.tags.push(`artist:${a}`));
            getList('.artist-list').forEach(a => meta.tags.push(`artist:${a}`));
            getList('#groups').forEach(g => meta.tags.push(`group:${g}`));
            getList('#series').forEach(s => meta.tags.push(`parody:${s}`));
            getList('.series-list').forEach(s => meta.tags.push(`parody:${s}`));

            const rawTags = getList('#tags').concat(getList('.relatedtags'));
            rawTags.forEach(tag => {
                let t = tag.replace(/\s+/g, ' ');
                if (t.endsWith(' ♀')) t = `female:${t.replace(' ♀', '')}`;
                else if (t.endsWith(' ♂')) t = `male:${t.replace(' ♂', '')}`;
                else t = `tag:${t}`;
                if (!meta.tags.includes(t)) meta.tags.push(t);
            });

            getList('#characters').forEach(c => meta.tags.push(`character:${c}`));
            if (getInnerText('#language')) meta.tags.push(`language:${getInnerText('#language')}`);
            if (getInnerText('#type')) meta.tags.push(`category:${getInnerText('#type')}`);

            const dateEl = doc.querySelector('.date');
            const posted = dateEl?.getAttribute('data-posted') || dateEl?.innerText;
            if (posted) {
                const d = new Date(posted.replace('年', '-').replace('月', '-').replace('日', ''));
                if (!isNaN(d.getTime())) meta.timestamp = Math.floor(d.getTime() / 1000);
            }
        }

        const res = {
            title: meta.title || "",
            tags: meta.tags.join(', ')
        };
        if (meta.timestamp) res.timestamp = meta.timestamp;
        console.log("[LRR Bridge] Extracted result:", res);
        return res;
    }

    async function syncCurrentGallery() {
        if (!STATE.queue[STATE.index]) return;

        // Use unsafeWindow.galleryinfo if available (fastest and most accurate)
        let metadata;
        if (typeof unsafeWindow !== 'undefined' && unsafeWindow.galleryinfo) {
            metadata = extractMetadata(unsafeWindow.galleryinfo);
        } else {
            metadata = extractMetadata(document);
        }

        const hitomiId = getHitomiID(window.location.href);
        metadata.tags += (metadata.tags ? ", " : "") + `hitomi:${hitomiId}`;
        console.log(`[LRR Bridge] Syncing current gallery with:`, metadata);
        await API.syncTags(STATE.queue[STATE.index].id, metadata);
    }

    function injectSearchButtons() {
        const container = document.querySelector('.gallery-content');
        if (!container) return;

        const attach = (node) => {
            if (node.querySelector('.lrr-sync-btn-injected')) return;
            const btn = document.createElement('button');
            btn.className = 'lrr-sync-btn-injected'; btn.textContent = 'Sync';
            btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); syncSearchResult(node); };
            node.style.position = 'relative'; node.appendChild(btn);
        };

        // Use a static check to avoid re-creating observer if it exists
        if (!window.lrrObserver) {
            window.lrrObserver = new MutationObserver(() => document.querySelectorAll('.gallery-content > div').forEach(attach));
            window.lrrObserver.observe(container, { childList: true });
        }

        document.querySelectorAll('.gallery-content > div').forEach(attach);
    }

    async function syncSearchResult(node) {
        if (!STATE.queue[STATE.index]) return;
        updateStatus("Fetching...");

        const link = node.querySelector('a[href*="/galleries/"], a[href*="/manga/"], a[href*="/doujinshi/"], a[href*="/cg/"]')?.href;
        if (!link) { updateStatus("Link not found"); return; }

        const hitomiId = getHitomiID(link);

        // Detect current data domain (Hitomi frequently changes aliases)
        let hitomiDomain = "ltn.hitomi.la";
        if (typeof unsafeWindow !== 'undefined' && unsafeWindow.domain) {
            hitomiDomain = unsafeWindow.domain;
        } else {
            // Fallback: try to find it from existing scripts
            const script = document.querySelector('script[src*="ltn."]');
            if (script) hitomiDomain = script.src.split('/')[2];
        }

        const dataUrl = `https://${hitomiDomain}/galleries/${hitomiId}.js`;
        console.log(`[LRR Bridge] Fetching dynamic metadata from: ${dataUrl}`);

        try {
            const res = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: dataUrl,
                    headers: {
                        "Referer": "https://hitomi.la/",
                        "Origin": "https://hitomi.la"
                    },
                    onload: r => {
                        if (r.status === 200) resolve(r.responseText);
                        else reject(r);
                    },
                    onerror: reject
                });
            });

            // The file content is "var galleryinfo = { ... }"
            const jsonStr = res.substring(res.indexOf('{'), res.lastIndexOf('}') + 1);
            const data = JSON.parse(jsonStr);

            const metadata = extractMetadata(data);
            metadata.tags += (metadata.tags ? ", " : "") + `hitomi:${hitomiId}`;

            console.log(`[LRR Bridge] Syncing search result with:`, metadata);
            await API.syncTags(STATE.queue[STATE.index].id, metadata);
        } catch (e) {
            console.error("[LRR Bridge] Data sync failed:", e);
            const status = e.status !== undefined ? e.status : "Network Error";
            updateStatus(`Sync failed (${status})`);
        }
    }

    createPanel();
    checkArtistPage();
    setTimeout(injectSearchButtons, 1000);
})();
