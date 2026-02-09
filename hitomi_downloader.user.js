// ==UserScript==
// @name         Hitomi Downloader UI
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Download integration for hitomi.la with local Flask API
// @author       Assistant
// @match        https://hitomi.la/*
// @connect      /***YourDownloader.Host***/
// @connect      127.0.0.1
// @connect      localhost
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // --- Configuration ---
    const API_BASE = "http://your.downloader.host:5000"; // Updated from plan
    const POLL_INTERVAL = 1000;

    // --- CSS Styles ---
    const STYLES = `
        :root {
            --neon-color: #0ff;
            --neon-glow: 0 0 10px var(--neon-color), 0 0 20px var(--neon-color);
            --bg-dark: rgba(30, 30, 30, 0.95);
            --border-light: rgba(255, 255, 255, 0.1);
            --text-main: #f0f0f0;
        }

        /* --- Download Button --- */
        .hd-btn-container {
            position: absolute;
            top: 8px;
            right: 98px; /* Adjusted for larger Sync button */
            margin: 0;
            z-index: 100;
        }

        .hd-btn {
            display: inline-block;
            padding: 6px 12px;
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 13px;
            font-weight: 600;
            color: white;
            background-color: #66bb6a; /* Low saturation green */
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
            user-select: none;
            min-width: 80px;
            box-sizing: border-box;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2); /* Added shadow */
        }

        .hd-btn:hover {
            filter: brightness(1.1);
            box-shadow: 0 4px 8px rgba(0,0,0,0.3); /* Hover shadow */
            transform: translateY(-1px);
        }

        .hd-btn.confirm {
            background-color: #f59e0b;
            animation: pulse-warning 1s infinite;
        }

        .hd-btn.queued {
            background-color: #10b981;
            cursor: default;
            opacity: 0.8;
        }

        @keyframes pulse-warning {
            0% { transform: scale(1); }
            50% { transform: scale(1.02); }
            100% { transform: scale(1); }
        }

        /* --- Dashboard UI --- */
        .hd-dashboard {
            position: fixed;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            z-index: 999999;
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: var(--text-main);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Minimized State (Tab) */
        .hd-minimized {
            background: var(--bg-dark);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid var(--border-light);
            border-bottom: none;
            padding: 8px 24px;
            border-radius: 8px 8px 0 0;
            cursor: pointer;
            font-weight: 600;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 -4px 12px rgba(0,0,0,0.3);
        }

        /* Neon Effect */
        .hd-neon {
            border-color: var(--neon-color);
            box-shadow: 0 -4px 12px var(--neon-color);
            animation: neon-breathe 2s ease-in-out infinite;
        }

        @keyframes neon-breathe {
            0%, 100% { box-shadow: 0 0 10px var(--neon-color) inset; border-color: var(--neon-color); }
            50% { box-shadow: 0 0 20px var(--neon-color) inset; border-color: #fff; }
        }

        /* Expanded State */
        .hd-expanded {
            background: var(--bg-dark);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--border-light);
            border-bottom: none;
            border-radius: 12px 12px 0 0;
            width: 75vw;
            max-width: 800px;
            max-height: 40vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 -8px 32px rgba(0,0,0,0.5);
            /* overflow: hidden; Removed to allow menu to popup */
        }

        .hd-header {
            padding: 12px 16px;
            background: rgba(255,255,255,0.05);
            border-bottom: 1px solid var(--border-light);
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: 600;
            border-radius: 12px 12px 0 0; /* Added radius since parent overflow is visible */
        }

        .hd-header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        /* Menu Styles */
        .hd-menu-container {
            position: relative;
            display: inline-block;
        }

        .hd-menu-btn {
            background: transparent;
            border: none;
            color: #aaa;
            cursor: pointer;
            font-size: 18px;
            padding: 4px 8px;
            border-radius: 4px;
            line-height: 1;
        }
        .hd-menu-btn:hover { color: white; background: rgba(255,255,255,0.1); }

        .hd-menu-dropdown {
            position: absolute;
            bottom: 100%; /* Opens upwards */
            top: auto;
            left: 0;
            margin-bottom: 8px; /* Spacing */
            background: var(--bg-dark);
            border: 1px solid var(--border-light);
            border-radius: 6px;
            padding: 4px 0;
            min-width: 180px;
            box-shadow: 0 -4px 12px rgba(0,0,0,0.5); /* Shadow upwards */
            display: none;
            z-index: 1000;
        }
        
        .hd-menu-dropdown.show {
            display: block;
        }

        .hd-menu-item {
            padding: 8px 16px;
            margin: 2px 4px; /* Space for border radius */
            border-radius: 4px; /* Rounded corners for hover state */
            font-size: 13px;
            color: #ddd;
            cursor: pointer;
            transition: background 0.2s;
            white-space: nowrap;
        }
        
        .hd-menu-item:hover {
            background: rgba(255,255,255,0.1);
            color: white;
        }

        .hd-close-btn {
            background: transparent;
            border: none;
            color: #aaa;
            cursor: pointer;
            font-size: 18px;
            padding: 4px;
        }
        .hd-close-btn:hover { color: white; }

        .hd-body {
            padding: 0;
            overflow-y: auto;
            flex: 1;
            /* Custom Scrollbar */
            scrollbar-width: thin;
            scrollbar-color: rgba(255,255,255,0.3) transparent;
        }

        .hd-body::-webkit-scrollbar {
            width: 8px;
        }

        .hd-body::-webkit-scrollbar-track {
            background: rgba(0,0,0,0.1);
        }

        .hd-body::-webkit-scrollbar-thumb {
            background-color: rgba(255,255,255,0.2);
            border-radius: 4px;
            border: 2px solid transparent; /* Padding around thumb */
            background-clip: content-box;
        }

        .hd-body::-webkit-scrollbar-thumb:hover {
            background-color: rgba(255,255,255,0.4);
        }

        .hd-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }

        .hd-table th, .hd-table td {
            padding: 10px 16px;
            text-align: left;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .hd-table th {
            background: rgba(30,30,30,0.95); /* Match bg-dark but solid/less transparent to cover content */
            font-weight: 600;
            color: #ccc;
            position: sticky;
            top: 0;
            z-index: 10;
            box-shadow: 0 1px 0 rgba(255,255,255,0.1); /* Separator line */
        }

        .hd-status-badge {
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .status-queued { background: #3b82f6; color: white; }
        .status-downloading { background: #f59e0b; color: white; animation: pulse-opacity 1.5s infinite; }
        .status-completed { background: #10b981; color: white; }
        .status-failed { background: #ef4444; color: white; }
        .status-default { background: #6b7280; color: white; }

        @keyframes pulse-opacity {
            0% { opacity: 0.7; }
            50% { opacity: 1; }
            100% { opacity: 0.7; }
        }
    `;

    GM_addStyle(STYLES);

    // --- API Helper ---
    const API = {
        request: (method, endpoint, data = null) => {
            return new Promise((resolve, reject) => {
                const options = {
                    method: method,
                    url: `${API_BASE}${endpoint}`,
                    headers: {
                        "Content-Type": "application/json"
                    },
                    onload: (response) => {
                        if (response.status >= 200 && response.status < 300) {
                            try {
                                resolve(JSON.parse(response.responseText));
                            } catch (e) {
                                resolve(response.responseText);
                            }
                        } else {
                            reject(`Error ${response.status}: ${response.statusText}`);
                        }
                    },
                    onerror: (err) => reject(err)
                };

                if (data) {
                    options.data = JSON.stringify(data);
                }

                GM_xmlhttpRequest(options);
            });
        },
        download: (url) => API.request('POST', '/api/download', { url }),
        getJobs: () => API.request('GET', '/api/jobs'),
        clearJobs: (status) => API.request('POST', status ? `/api/jobs/clear?status=${status}` : '/api/jobs/clear')
    };

    // --- Component: Download Button ---
    class DownloadButton {
        constructor(container, url) {
            this.container = container;
            this.url = url;
            this.state = 'IDLE'; // IDLE, CONFIRM, QUEUED
            this.timer = null;
            this.element = null;
            
            this.render();
        }

        render() {
            // Check if button already exists (avoid dupes)
            if (this.container.querySelector('.hd-btn')) return;

            // Create wrapper
            const wrapper = document.createElement('div');
            wrapper.className = 'hd-btn-container';

            this.element = document.createElement('button');
            this.element.className = 'hd-btn';
            this.updateVisuals();

            this.element.addEventListener('click', (e) => this.handleClick(e));

            wrapper.appendChild(this.element);
            this.container.appendChild(wrapper);
        }

        updateVisuals() {
            if (!this.element) return;
            
            // Reset classes
            this.element.className = 'hd-btn';

            switch (this.state) {
                case 'IDLE':
                    this.element.textContent = 'Download';
                    break;
                case 'CONFIRM':
                    this.element.textContent = 'Confirm Download';
                    this.element.classList.add('confirm');
                    break;
                case 'QUEUED':
                    this.element.textContent = 'In Queue';
                    this.element.classList.add('queued');
                    this.element.disabled = true;
                    break;
            }
        }

        handleClick(e) {
            e.preventDefault();
            e.stopPropagation();

            if (this.state === 'IDLE') {
                this.state = 'CONFIRM';
                this.updateVisuals();
                
                // Start 5s timer
                this.timer = setTimeout(() => {
                    if (this.state === 'CONFIRM') {
                        this.state = 'IDLE';
                        this.updateVisuals();
                    }
                }, 5000);
            } else if (this.state === 'CONFIRM') {
                // Confirm clicked!
                clearTimeout(this.timer);
                this.triggerDownload();
            }
        }

        async triggerDownload() {
            try {
                // Optimistic update
                this.element.textContent = "Sending...";
                await API.download(this.url);
                this.state = 'QUEUED';
                this.updateVisuals();
                // Optionally trigger dashboard update immediately
                if (window.hdDashboard) window.hdDashboard.fetchJobs();
            } catch (err) {
                console.error("Download failed", err);
                this.element.textContent = "Error!";
                setTimeout(() => {
                    this.state = 'IDLE';
                    this.updateVisuals();
                }, 2000);
            }
        }
    }

    // --- Component: Dashboard UI ---
    class DashboardUI {
        constructor() {
            this.isMinimized = GM_getValue('hd_minimized', true);
            this.jobs = [];
            this.root = document.createElement('div');
            this.root.className = 'hd-dashboard';
            document.body.appendChild(this.root);

            // Global click handler to close menus
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.hd-menu-container')) {
                    const dropdowns = document.querySelectorAll('.hd-menu-dropdown.show');
                    dropdowns.forEach(d => d.classList.remove('show'));
                }
            });

            this.render();
            this.startPolling();
            
            // Expose for external calls
            window.hdDashboard = this;
        }

        toggle() {
            this.isMinimized = !this.isMinimized;
            GM_setValue('hd_minimized', this.isMinimized);
            this.render();
        }

        render() {
            const isDomMinimized = !!this.root.querySelector('.hd-minimized');
            const isDomExpanded = !!this.root.querySelector('.hd-expanded');
            
            // Handle Frame Switching or Initial Render
            if (!isDomMinimized && !isDomExpanded) {
                // Initial
                this.root.innerHTML = '';
                if (this.isMinimized) this.renderMinimizedFrame();
                else this.renderExpandedFrame();
            } else if (this.isMinimized && !isDomMinimized) {
                // Switch to Minimized
                this.root.innerHTML = '';
                this.renderMinimizedFrame();
            } else if (!this.isMinimized && !isDomExpanded) {
                // Switch to Expanded
                this.root.innerHTML = '';
                this.renderExpandedFrame();
            }
            
            // Update Content
            if (this.isMinimized) {
                this.updateMinimizedContent();
            } else {
                this.updateExpandedContent();
            }
            
            this.updateNeonEffect();
        }

        renderMinimizedFrame() {
            const pill = document.createElement('div');
            pill.className = 'hd-minimized';
            pill.onclick = () => this.toggle();
            this.root.appendChild(pill);
        }

        updateMinimizedContent() {
            const pill = this.root.querySelector('.hd-minimized');
            if (pill) {
                const activeCount = this.jobs.filter(j => j.status === 'DOWNLOADING' || j.status === 'QUEUED').length;
                pill.innerHTML = `<span>Downloads: ${activeCount} Active</span>`;
            }
        }

        renderExpandedFrame() {
            const container = document.createElement('div');
            container.className = 'hd-expanded';
            
            // Header
            const header = document.createElement('div');
            header.className = 'hd-header';
            
            const headerLeft = document.createElement('div');
            headerLeft.className = 'hd-header-left';

            // Menu
            const menuContainer = document.createElement('div');
            menuContainer.className = 'hd-menu-container';
            
            const menuBtn = document.createElement('button');
            menuBtn.className = 'hd-menu-btn';
            menuBtn.innerHTML = '⋮'; 
            menuBtn.title = 'Menu';
            
            const dropdown = document.createElement('div');
            dropdown.className = 'hd-menu-dropdown';
            
            const menuItems = [
                { label: 'Clear Completed', action: () => this.clearJobs('COMPLETED') },
                { label: 'Clear Failed', action: () => this.clearJobs('FAILED') }
            ];

            menuItems.forEach(item => {
                const el = document.createElement('div');
                el.className = 'hd-menu-item';
                el.textContent = item.label;
                el.onclick = (e) => {
                    e.stopPropagation();
                    item.action();
                    dropdown.classList.remove('show');
                };
                dropdown.appendChild(el);
            });

            menuBtn.onclick = (e) => {
                e.stopPropagation();
                const wasShown = dropdown.classList.contains('show');
                dropdown.classList.toggle('show', !wasShown);
            };

            menuContainer.appendChild(menuBtn);
            menuContainer.appendChild(dropdown);
            
            headerLeft.appendChild(menuContainer);
            headerLeft.appendChild(document.createTextNode('Download Jobs'));

            header.appendChild(headerLeft);
            
            const closeBtn = document.createElement('button');
            closeBtn.className = 'hd-close-btn';
            closeBtn.innerHTML = '&times;';
            closeBtn.onclick = () => this.toggle();
            
            header.appendChild(closeBtn);
            container.appendChild(header);

            // Body
            const body = document.createElement('div');
            body.className = 'hd-body';
            
            // Restore scroll if we have it saved
            if (this._lastScrollTop !== undefined) {
                body.scrollTop = this._lastScrollTop;
            }
            
            body.addEventListener('scroll', () => {
                this._lastScrollTop = body.scrollTop;
            });

            container.appendChild(body);
            this.root.appendChild(container);
        }

        updateExpandedContent() {
            const body = this.root.querySelector('.hd-body');
            if (!body) return;

            const currentScroll = body.scrollTop;

            if (this.jobs.length === 0) {
                body.innerHTML = '<div style="padding:20px; text-align:center; color:#888;">No jobs found</div>';
            } else {
                const tableHtml = `
                    <table class="hd-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Status</th>
                            <th>Progress</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.jobs.map(job => {
                            const progressText = (job.total_files && job.total_files > 0) 
                                ? `${job.downloaded_files || 0} / ${job.total_files}` 
                                : (job.downloaded_files ? `${job.downloaded_files} files` : '-');
                            
                            const displayId = job.id ? job.id.substring(0, 8) : '???';
                            
                            return `
                            <tr>
                                <td><span style="font-family:monospace; opacity:0.7;">${displayId}</span></td>
                                <td style="max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${job.title || job.url}">
                                    ${job.title || 'Fetching Metadata...'}
                                </td>
                                <td><span class="hd-status-badge status-${(job.status || 'default').toLowerCase()}">${job.status}</span></td>
                                <td>${progressText}</td>
                            </tr>
                        `}).join('')}
                    </tbody>
                    </table>
                `;
                body.innerHTML = tableHtml;
            }
            
            if (currentScroll > 0) {
                 body.scrollTop = currentScroll;
            }
        }

        updateNeonEffect() {
            const hasActive = this.jobs.some(j => j.status === 'DOWNLOADING' || j.status === 'QUEUED');
            const pill = this.root.querySelector('.hd-minimized');
            
            if (pill) {
                if (hasActive) {
                    pill.classList.add('hd-neon');
                } else {
                    pill.classList.remove('hd-neon');
                }
            }
        }

        async fetchJobs() {
            try {
                const res = await API.getJobs();
                this.jobs = Array.isArray(res) ? res : (res.jobs || []);
                this.render();
            } catch (err) {
                console.error("Failed to fetch jobs", err);
            }
        }

        async clearJobs(status) {
            try {
                await API.clearJobs(status);
                await this.fetchJobs();
            } catch (err) {
                console.error("Failed to clear jobs", err);
            }
        }

        startPolling() {
            this.fetchJobs();
            setInterval(() => this.fetchJobs(), POLL_INTERVAL);
        }
    }

    // --- Main Logic ---
    function init() {
        console.log("Hitomi Downloader UI Initializing...");
        
        // 1. Setup Dashboard
        const dashboard = new DashboardUI();

        // 2. Setup Observer for Gallery Items
        // Hitomi uses .gallery-content for main list, but structure varies slightly.
        // We look for <a> tags that link to galleries.
        
        const processNode = (node) => {
            // node can be the list item itself or a container
            // We want to inject the button INSIDE the item, usually at the bottom.
            if (!node || !node.querySelector) return;

            // Target gallery items (usually <div> or <li>)
            // Selector might need adjustment based on specific Hitomi layout
            // Usually: .gallery-content > div
            
            // Find the link to get the URL
            const link = node.querySelector('a[href*="/galleries/"], a[href*="/manga/"], a[href*="/doujinshi/"], a[href*="/cg/"], a[href*="/gamecg/"], a[href*="/anime/"]');
            
            if (link) {
                const url = link.href;
                
                // Find a place to inject. 
                // We need a stable container. Usually the direct parent or the node itself if it's the wrapper.
                // In hitomi list views, the item container usually has class 'gallery-content > div' or similar.
                
                // If node has 'hd-btn', skip
                if (node.querySelector('.hd-btn')) return;

                // Position: absolute needs a relative parent
                if (getComputedStyle(node).position === 'static') {
                    node.style.position = 'relative';
                }

                new DownloadButton(node, url);
            }
        };

        const observer = new MutationObserver((mutations) => {
            mutations.forEach(m => {
                m.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element
                        // Check if node is a gallery item or contains them
                        if (node.matches && node.matches('.gallery-content > div')) {
                             processNode(node);
                        } else {
                             // Fallback: search inside
                             node.querySelectorAll && node.querySelectorAll('.gallery-content > div').forEach(processNode);
                        }
                    }
                });
            });
        });

        const target = document.body; // Broad observer to catch infinite scroll anywhere
        observer.observe(target, { childList: true, subtree: true });

        // Initial pass
        document.querySelectorAll('.gallery-content > div, .artist-list li').forEach(processNode);
    }

    // Run
    init();

})();
