// ==UserScript==
// @name         Read Later App
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Save and organize links for later reading
// @match        file:///*laterList-view.html
// @grant        GM_setValue
// @grant        GM_getValue
// @require      https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js
// ==/UserScript==

( function () {
    'use strict';
    // Sample data structure
    const DEFAULT_DATA = {
        tabs: [
            {
                id: 'tab-1',
                name: 'Programming',
                containers: [
                    {
                        id: 'container-1',
                        name: 'JavaScript',
                        links: [
                            { id: 'link-1', title: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
                            { id: 'link-2', title: 'JavaScript.info', url: 'https://javascript.info' }
                        ]
                    },
                    {
                        id: 'container-2',
                        name: 'Python',
                        links: [
                            { id: 'link-3', title: 'Python Documentation', url: 'https://docs.python.org' }
                        ]
                    }
                ]
            },
            {
                id: 'tab-2',
                name: 'Reading List',
                containers: [
                    {
                        id: 'container-3',
                        name: 'Articles',
                        links: [
                            { id: 'link-4', title: 'Medium', url: 'https://medium.com' }
                        ]
                    }
                ]
            }
        ],
        trash: [] // New trash array to store deleted links
    };

    // Styles
    const styles = `

            .laterlist-popup {
            position: fixed;
            background: #1a1b1e;
            border: 1px solid #404040;
            border-radius: 8px;
            padding: 12px;
            z-index: 999999;
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .laterlist-popup select {
            display: block;
            width: 200px;
            margin: 8px 0;
            padding: 6px;
            background: #2c2d31;
            border: 1px solid #404040;
            border-radius: 4px;
            color: #ffffff;
        }

        .laterlist-popup button {
            background: #6366f1;
            border: none;
            border-radius: 4px;
            color: #ffffff;
            padding: 6px 12px;
            cursor: pointer;
            width: 100%;
        }

        .laterlist-popup button:hover {
            background: #4f46e5;
        }

        .trash-tab {
            background-color: #dc2626 !important;
            border-color: #dc2626 !important;
        }

        .trash-container {
            background: var(--bg-secondary);
            border-radius: 8px;
            border: 1px solid var(--border);
            padding: 12px;
            margin-top: 20px;
        }

        .trash-link {
            padding: 8px 12px;
            margin-bottom: 8px;
            background: var(--bg-primary);
            border-radius: 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .trash-actions {
            display: flex;
            gap: 8px;
        }

        .btn-restore {
            color: #22c55e;
        }

        .empty-trash-btn {
            background: #dc2626;
            border-color: #dc2626;
            margin-top: 10px;
        }

            .dragging-active .containers {
            display: grid !important;
            opacity: 0.7;
            margin-bottom: 20px;
        }

        .dragging-active .containers.active-tab {
            opacity: 1;
        }

        .tab-section {
            margin-bottom: 30px;
        }

        .tab-label {
            padding: 10px;
            background: var(--bg-secondary);
            border-radius: 6px;
            margin-bottom: 10px;
            font-weight: bold;
            display: none;
        }

        .dragging-active .tab-label {
            display: block;
        }

        .containers {
            position: relative;
        }

        .drag-indicator {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--accent);
            opacity: 0.1;
            pointer-events: none;
            display: none;
        }

        .containers.drag-hover .drag-indicator {
            display: block;
        }

    
        :root {
            --bg-primary: #1a1b1e;
            --bg-secondary: #2c2d31;
            --text-primary: #ffffff;
            --text-secondary: #a0a0a0;
            --accent: #6366f1;
            --border: #404040;
            --hover: #3f3f46;
        }

        body {
            margin: 0;
            padding: 20px;
            background: var(--bg-primary);
            color: var(--text-primary);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        #app {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            padding: 10px;
            background: var(--bg-secondary);
            border-radius: 8px;
            overflow-x: auto;
        }

        .tab {
            padding: 8px 16px;
            background: var(--bg-primary);
            border: 1px solid var(--border);
            border-radius: 6px;
            color: var(--text-primary);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            white-space: nowrap;
        }

        .tab.active {
            background: var(--accent);
        }

        .containers {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }

        .container {
            background: var(--bg-secondary);
            border-radius: 8px;
            border: 1px solid var(--border);
        }

        .container-header {
            padding: 12px;
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .container-content {
            min-height: 100px;
            padding: 12px;
        }

        .link {
            padding: 8px 12px;
            margin-bottom: 8px;
            background: var(--bg-primary);
            border-radius: 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
        }

        .link a {
            color: var(--text-primary);
            text-decoration: none;
        }

        .link a:hover {
            text-decoration: underline;
        }

        .btn {
            padding: 6px 12px;
            background: var(--bg-primary);
            border: 1px solid var(--border);
            border-radius: 4px;
            color: var(--text-primary);
            cursor: pointer;
        }

        .btn:hover {
            background: var(--hover);
        }

        .btn-delete {
            padding: 4px 8px;
            color: #ff4444;
        }

        .btn-primary {
            background: var(--accent);
            border-color: var(--accent);
        }

        .sortable-ghost {
            opacity: 0.5;
        }
    `;

    class ReadLaterApp {

        constructor () {

            this.isFaviconView = false; // Start in detailed view mode
            this.data = GM_getValue( 'readLaterData', DEFAULT_DATA );

            this.data = GM_getValue( 'readLaterData', DEFAULT_DATA );
            // Initialize trash if it doesn't exist in saved data
            if ( !this.data.trash ) {
                this.data.trash = [];
            }
            this.activeTab = this.data.tabs[ 0 ].id;
            this.isDragging = false;
            // Only initialize context menu if not on the view page
            if ( !location.href.includes( 'laterlist-view.html' ) ) {
                this.initContextMenu();
                return;
            }
            this.init();
        }

        toggleView () {
            this.isFaviconView = !this.isFaviconView;
            this.render();
        }


        initContextMenu () {
            document.addEventListener( 'contextmenu', ( e ) => {
                if ( !e.ctrlKey ) return;
                const targetAnchor = e.target.closest( 'a' );
                if ( !targetAnchor ) return;
                e.preventDefault();
                this.showPopup( e, targetAnchor.href, targetAnchor.textContent.trim() );
            } );
        }

        showPopup ( event, url, title ) {
            // Remove any existing popup
            const existingPopup = document.querySelector( '.laterlist-popup' );
            if ( existingPopup ) existingPopup.remove();

            const popup = document.createElement( 'div' );
            popup.className = 'laterlist-popup';
            style( popup, `
                left: ${ event.clientX }px;
                top: ${ event.clientY }px;
                position: fixed;
                background: #1a1b1e;
                border: 1px solid #404040;
                border-radius: 8px;
                padding: 12px;
                z-index: 999999;
                color: #ffffff;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            `);

            const tabSelect = document.createElement( 'select' );
            const containerSelect = document.createElement( 'select' );
            const saveButton = document.createElement( 'button' );

            // Populate tab select
            this.data.tabs.forEach( tab => {
                const option = document.createElement( 'option' );
                option.value = tab.id;
                option.textContent = tab.name;
                tabSelect.appendChild( option );
            } );

            // Update container select based on selected tab
            const updateContainers = () => {
                containerSelect.innerHTML = '';
                const selectedTab = this.data.tabs.find( tab => tab.id === tabSelect.value );
                selectedTab.containers.forEach( container => {
                    const option = document.createElement( 'option' );
                    option.value = container.id;
                    option.textContent = container.name;
                    containerSelect.appendChild( option );
                } );
            };

            tabSelect.addEventListener( 'change', updateContainers );
            updateContainers();

            saveButton.textContent = 'Save Link';
            saveButton.addEventListener( 'click', () => {
                this.saveLink( url, title, tabSelect.value, containerSelect.value );
                popup.remove();
            } );

            popup.appendChild( tabSelect );
            popup.appendChild( containerSelect );
            popup.appendChild( saveButton );

            document.body.appendChild( popup );
            console.log( popup );

            // Close popup when clicking outside
            document.addEventListener( 'click', function closePopup ( e ) {
                if ( !popup.contains( e.target ) ) {
                    popup.remove();
                    document.removeEventListener( 'click', closePopup );
                }
            } );
        }

        deleteContainer ( containerId ) {
            const currentTab = this.getCurrentTab();
            const container = currentTab.containers.find( c => c.id === containerId );

            // Move all links to trash
            if ( container && container.links ) {
                this.data.trash.push( ...container.links );
            }

            // Remove the container
            currentTab.containers = currentTab.containers.filter( c => c.id !== containerId );

            this.saveData();
            this.render();
        }


        saveLink ( url, title, tabId, containerId ) {
            const tab = this.data.tabs.find( t => t.id === tabId );
            const container = tab.containers.find( c => c.id === containerId );

            const newLink = {
                id: 'link-' + Date.now(),
                title: title || url,
                url: url
            };

            container.links.push( newLink );
            this.saveData();
        }

        init () {
            this.injectStyles();
            this.render();
            this.initSortable();
        }

        injectStyles () {
            const styleEl = document.createElement( 'style' );
            styleEl.textContent = styles;
            document.head.appendChild( styleEl );
        }

        saveData () {
            GM_setValue( 'readLaterData', this.data );
        }
        render () {
            const app = document.getElementById( 'app' );
            app.innerHTML = `
                <div class="header">
                    <h1>Read Later</h1>
                    <div>
                        <button class="btn" id="importData">Import</button>
                        <button class="btn" id="exportData">Export</button>
                        <button class="btn trash-tab" id="showTrash">Trash (${ this.data.trash.length })</button>
                        <button class="btn btn-primary" id="addTab">New Tab</button>
                        <button class="btn" id="toggleView">${ this.isFaviconView ? 'Detailed View' : 'Favicon View' }</button>
                    </div>
                </div>
                <div class="tabs">
                    ${ this.data.tabs.map( tab => `
                        <div class="tab ${ tab.id === this.activeTab ? 'active' : '' }" data-tab-id="${ tab.id }">
                            <span>${ tab.name }</span>
                            ${ this.data.tabs.length > 1 ? `
                                <button class="btn btn-delete" data-delete-tab="${ tab.id }">×</button>
                            ` : '' }
                        </div>
                    `).join( '' ) }
                </div>
                ${ this.activeTab === 'trash' ? this.renderTrash() : this.renderTabs() }
            `;
            this.attachEventListeners();
            if ( this.activeTab !== 'trash' ) {
                this.initSortable();
            }
        }

        renderTrash () {
            return `
                <div class="trash-container">
                    <h2>Trash</h2>
                    ${ this.data.trash.map( link => `
                        <div class="trash-link" data-link-id="${ link.id }">
                            <a href="${ link.url }" target="_blank">${ link.title }</a>
                            <div class="trash-actions">
                                <button class="btn btn-restore" data-restore-link="${ link.id }">↩</button>
                                <button class="btn btn-delete" data-permanent-delete="${ link.id }">×</button>
                            </div>
                        </div>
                    `).join( '' ) }
                    ${ this.data.trash.length > 0 ? `
                        <button class="btn empty-trash-btn" id="emptyTrash">Empty Trash</button>
                    ` : '<p>Trash is empty</p>' }
                </div>
            `;
        }

        renderTabs () {
            return this.data.tabs.map( tab => `
        <div class="tab-section" data-tab-section="${ tab.id }">
            <div class="tab-label">${ tab.name }</div>
            <div class="containers ${ tab.id === this.activeTab ? 'active-tab' : '' }" 
                 data-tab-content="${ tab.id }" 
                 style="display: ${ tab.id === this.activeTab ? 'grid' : 'none' }">
                <div class="drag-indicator"></div>
                ${ tab.containers.map( container => `
                    <div class="container">
                        <div class="container-header">
                            <span class="container-name" data-container-id="${ container.id }">${ container.name }</span>
                            <button class="btn btn-delete" data-delete-container="${ container.id }">×</button>
                        </div>
                        <div class="container-content" data-container-id="${ container.id }" data-tab-id="${ tab.id }">
                            ${ this.isFaviconView
                    ? container.links.map( link => `
                                    <div class="link" data-link-id="${ link.id }" style="display: inline-block; padding: 8px;">
                                        <a href="${ link.url }" target="_blank">
                                            <img src="https://www.google.com/s2/favicons?domain=${ new URL( link.url ).hostname }" 
                                                 alt="favicon" style="width: 32px; height: 32px;">
                                        </a>
                                    </div>
                                `).join( '' )
                    : container.links.map( link => `
                                    <div class="link" data-link-id="${ link.id }">
                                        <img src="https://www.google.com/s2/favicons?domain=${ new URL( link.url ).hostname }" 
                                             alt="favicon" style="width: 16px; height: 16px; margin-right: 8px;">
                                        <a href="${ link.url }" 
                                           target="_blank" 
                                           data-move-to-trash="${ link.id }" 
                                           data-link-url="${ link.url }">${ link.title }</a>
                                        <button class="btn btn-delete" data-delete-link="${ link.id }">×</button>
                                    </div>
                                `).join( '' )
                }
                        </div>
                    </div>
                `).join( '' ) }
                <button class="btn add-container-btn" data-add-container-tab="${ tab.id }">Add Container</button>
            </div>
        </div>
    `).join( '' );
        }



        getTemplate () {
            return `
                <div class="header">
                    <h1>Read Later</h1>
                    <button class="btn btn-primary" id="addTab">New Tab</button>
                </div>
                <div class="tabs">
                    ${ this.data.tabs.map( tab => `
                        <div class="tab ${ tab.id === this.activeTab ? 'active' : '' }" data-tab-id="${ tab.id }">
                            <span>${ tab.name }</span>
                            ${ this.data.tabs.length > 1 ? `
                                <button class="btn btn-delete" data-delete-tab="${ tab.id }">×</button>
                            ` : '' }
                        </div>
                    `).join( '' ) }
                </div>
                <div class="containers">
                    ${ this.getCurrentTab().containers.map( container => `
                        <div class="container">
                            <div class="container-header">
                                <span class="container-name" data-container-id="${ container.id }">${ container.name }</span>
                                <button class="btn btn-delete" data-delete-container="${ container.id }">×</button>
                            </div>
                            <div class="container-content" data-container-id="${ container.id }">
                                ${ container.links.map( link => `
                                    <div class="link" data-link-id="${ link.id }">
                                        <a href="${ link.url }" target="_blank">${ link.title }</a>
                                        <button class="btn btn-delete" data-delete-link="${ link.id }">×</button>
                                    </div>
                                `).join( '' ) }
                            </div>
                        </div>
                    `).join( '' ) }
                    <button class="btn" id="addContainer">Add Container</button>
                </div>
            `;
        }

        getCurrentTab () {
            return this.data.tabs.find( tab => tab.id === this.activeTab );
        }

        attachEventListeners () {

            document.getElementById( 'toggleView' )?.addEventListener( 'click', () => this.toggleView() );

            document.getElementById( 'importData' )?.addEventListener( 'click', () => this.importData() );
            document.getElementById( 'exportData' )?.addEventListener( 'click', () => this.exportData() );

            document.addEventListener( 'click', ( e ) => {

                const deleteTab = e.target.dataset.deleteTab;
                const deleteContainer = e.target.dataset.deleteContainer;
                const deleteLink = e.target.dataset.deleteLink;
                const addContainerTab = e.target.dataset.addContainerTab;
                const moveToTrash = e.target.dataset.moveToTrash;
                const restoreLink = e.target.dataset.restoreLink;
                const permanentDelete = e.target.dataset.permanentDelete;

                if ( deleteTab ) this.deleteTab( deleteTab );
                if ( deleteContainer ) this.deleteContainer( deleteContainer );
                if ( deleteLink ) this.moveToTrash( deleteLink );
                if ( addContainerTab ) this.addContainer( addContainerTab );
                if ( moveToTrash && e.target.tagName === 'A' ) {
                    e.preventDefault();
                    this.moveToTrash( moveToTrash );
                    window.open( e.target.dataset.linkUrl, '_blank' );
                }
                if ( restoreLink ) this.restoreFromTrash( restoreLink );
                if ( permanentDelete ) this.permanentDelete( permanentDelete );
            } );

            document.getElementById( 'showTrash' )?.addEventListener( 'click', () => {
                this.activeTab = 'trash';
                this.render();
            } );

            document.getElementById( 'emptyTrash' )?.addEventListener( 'click', () => {
                this.data.trash = [];
                this.saveData();
                this.render();
            } );


            // Tab switching
            document.querySelectorAll( '.tab' ).forEach( tab => {
                tab.addEventListener( 'click', ( e ) => {
                    const tabId = tab.dataset.tabId;
                    if ( tabId ) {
                        this.switchTab( tabId );
                    }
                } );
            } );

            // Delete buttons
            document.addEventListener( 'click', ( e ) => {
                const deleteTab = e.target.dataset.deleteTab;
                const deleteContainer = e.target.dataset.deleteContainer;
                const deleteLink = e.target.dataset.deleteLink;
                const addContainerTab = e.target.dataset.addContainerTab;

                if ( deleteTab ) this.deleteTab( deleteTab );
                if ( deleteContainer ) this.deleteContainer( deleteContainer );
                if ( deleteLink ) this.deleteLink( deleteLink );
                if ( addContainerTab ) this.addContainer( addContainerTab );
            } );

            // Add new tab
            document.getElementById( 'addTab' )?.addEventListener( 'click', () => this.addTab() );

            // Container name edit
            document.querySelectorAll( '.container-name' ).forEach( nameEl => {
                nameEl.addEventListener( 'dblclick', () => {
                    const containerId = nameEl.dataset.containerId;
                    this.renameContainer( containerId );
                } );
            } );
        }

        moveToTrash ( linkId ) {
            const currentTab = this.getCurrentTab();
            for ( const container of currentTab.containers ) {
                const linkIndex = container.links.findIndex( link => link.id === linkId );
                if ( linkIndex !== -1 ) {
                    const [ link ] = container.links.splice( linkIndex, 1 );
                    this.data.trash.push( link );
                    break;
                }
            }
            this.saveData();
            this.render();
        }

        restoreFromTrash ( linkId ) {
            const linkIndex = this.data.trash.findIndex( link => link.id === linkId );
            if ( linkIndex !== -1 ) {
                const [ link ] = this.data.trash.splice( linkIndex, 1 );
                // Add to first container of first tab
                if ( this.data.tabs[ 0 ].containers.length === 0 ) {
                    this.data.tabs[ 0 ].containers.push( {
                        id: 'container-' + Date.now(),
                        name: 'Restored Items',
                        links: []
                    } );
                }
                this.data.tabs[ 0 ].containers[ 0 ].links.push( link );
                this.saveData();
                this.render();
            }
        }

        permanentDelete ( linkId ) {
            this.data.trash = this.data.trash.filter( link => link.id !== linkId );
            this.saveData();
            this.render();
        }

        switchTab ( tabId ) {
            if ( this.isDragging ) return; // Don't switch tabs during drag

            this.activeTab = tabId;

            // Re-render the entire view when switching between normal tabs and trash
            this.render();
        }

        initSortable () {
            document.querySelectorAll( '.container-content' ).forEach( container => {
                new Sortable( container, {
                    group: 'links',
                    animation: 150,
                    ghostClass: 'sortable-ghost',
                    onStart: ( evt ) => {
                        document.body.classList.add( 'dragging-active' );
                        this.isDragging = true;
                    },
                    onEnd: ( evt ) => {
                        document.body.classList.remove( 'dragging-active' );
                        this.isDragging = false;
                        this.handleLinkMove( evt );
                        // Return to normal view after drag
                        this.switchTab( this.activeTab );
                    },
                    onChange: ( evt ) => {
                        // Update drag hover effect
                        document.querySelectorAll( '.containers' ).forEach( cont => {
                            cont.classList.remove( 'drag-hover' );
                        } );
                        if ( evt.to ) {
                            evt.to.closest( '.containers' ).classList.add( 'drag-hover' );
                        }
                    }
                } );
            } );
        }

        handleLinkMove ( evt ) {
            const linkId = evt.item.dataset.linkId;
            const toContainerId = evt.to.dataset.containerId;
            const fromContainerId = evt.from.dataset.containerId;
            const toTabId = evt.to.dataset.tabId;
            const fromTabId = evt.from.dataset.tabId;

            // Find source and target tabs
            const fromTab = this.data.tabs.find( tab => tab.id === fromTabId );
            const toTab = this.data.tabs.find( tab => tab.id === toTabId );

            // Find source and target containers
            const fromContainer = fromTab.containers.find( c => c.id === fromContainerId );
            const toContainer = toTab.containers.find( c => c.id === toContainerId );

            // Find and remove link from source
            const linkIndex = fromContainer.links.findIndex( l => l.id === linkId );
            if ( linkIndex === -1 ) return;

            const [ link ] = fromContainer.links.splice( linkIndex, 1 );

            // Add link to target
            toContainer.links.splice( evt.newIndex, 0, link );

            this.saveData();

            // If moving to a hidden tab, re-render to maintain consistency
            if ( fromTabId !== toTabId ) {
                this.render();
                this.initSortable();
            }
        }

        addTab () {
            const name = prompt( 'Enter tab name:' );
            if ( !name ) return;

            const newTab = {
                id: 'tab-' + Date.now(),
                name,
                containers: []
            };

            this.data.tabs.push( newTab );
            this.activeTab = newTab.id;
            this.saveData();
            this.render();
        }

        deleteTab ( tabId ) {
            // Removed confirmation
            this.data.tabs = this.data.tabs.filter( tab => tab.id !== tabId );
            if ( this.activeTab === tabId ) {
                this.activeTab = this.data.tabs[ 0 ].id;
            }
            this.saveData();
            this.render();
        }

        addContainer ( tabId ) {
            const name = prompt( 'Enter container name:' );
            if ( !name ) return;

            const tab = this.data.tabs.find( t => t.id === tabId );
            tab.containers.push( {
                id: 'container-' + Date.now(),
                name,
                links: []
            } );

            this.saveData();
            this.render();
            this.initSortable();
        }

        renameContainer ( containerId ) {
            const container = this.getCurrentTab().containers.find( c => c.id === containerId );
            const newName = prompt( 'Enter new name:', container.name );
            if ( !newName ) return;

            container.name = newName;
            this.saveData();
            this.render();
        }

        deleteLink ( linkId ) {
            const currentTab = this.getCurrentTab();
            currentTab.containers.forEach( container => {
                container.links = container.links.filter( link => link.id !== linkId );
            } );
            this.saveData();
            this.render();
        }

        exportData () {
            const dataStr = JSON.stringify( this.data, null, 2 );
            const blob = new Blob( [ dataStr ], { type: 'application/json' } );
            const url = URL.createObjectURL( blob );

            const a = document.createElement( 'a' );
            a.href = url;
            a.download = `read-later-backup-${ new Date().toISOString().split( 'T' )[ 0 ] }.json`;
            document.body.appendChild( a );
            a.click();
            document.body.removeChild( a );
            URL.revokeObjectURL( url );
        }

        importData () {
            const input = document.createElement( 'input' );
            input.type = 'file';
            input.accept = 'application/json';

            input.onchange = e => {
                const file = e.target.files[ 0 ];
                const reader = new FileReader();

                reader.onload = event => {
                    try {
                        const importedData = JSON.parse( event.target.result );

                        // Validate imported data structure
                        if ( !this.isValidDataStructure( importedData ) ) {
                            alert( 'Invalid data structure in imported file' );
                            return;
                        }

                        // Merge or replace data
                        if ( confirm( 'Do you want to merge with existing data? Click OK to merge, Cancel to replace.' ) ) {
                            this.mergeData( importedData );
                        } else {
                            this.data = importedData;
                        }

                        this.saveData();
                        this.render();
                        alert( 'Import successful!' );
                    } catch ( error ) {
                        alert( 'Error importing data: ' + error.message );
                    }
                };

                reader.readAsText( file );
            };

            input.click();
        }

        isValidDataStructure ( data ) {
            // Basic structure validation
            if ( !data.tabs || !Array.isArray( data.tabs ) ) return false;
            if ( !data.trash || !Array.isArray( data.trash ) ) return false;

            // Validate each tab
            for ( const tab of data.tabs ) {
                if ( !tab.id || !tab.name || !Array.isArray( tab.containers ) ) return false;

                // Validate containers
                for ( const container of tab.containers ) {
                    if ( !container.id || !container.name || !Array.isArray( container.links ) ) return false;

                    // Validate links
                    for ( const link of container.links ) {
                        if ( !link.id || !link.title || !link.url ) return false;
                    }
                }
            }

            return true;
        }

        mergeData ( importedData ) {
            // Merge trash items
            const existingTrashIds = new Set( this.data.trash.map( item => item.id ) );
            for ( const trashItem of importedData.trash ) {
                if ( !existingTrashIds.has( trashItem.id ) ) {
                    this.data.trash.push( trashItem );
                }
            }

            // Merge tabs
            const existingTabIds = new Set( this.data.tabs.map( tab => tab.id ) );
            for ( const importedTab of importedData.tabs ) {
                if ( !existingTabIds.has( importedTab.id ) ) {
                    // New tab - add it entirely
                    this.data.tabs.push( importedTab );
                } else {
                    // Existing tab - merge containers
                    const existingTab = this.data.tabs.find( tab => tab.id === importedTab.id );
                    this.mergeContainers( existingTab, importedTab );
                }
            }
        }

        mergeContainers ( existingTab, importedTab ) {
            const existingContainerIds = new Set( existingTab.containers.map( c => c.id ) );

            for ( const importedContainer of importedTab.containers ) {
                if ( !existingContainerIds.has( importedContainer.id ) ) {
                    // New container - add it entirely
                    existingTab.containers.push( importedContainer );
                } else {
                    // Existing container - merge links
                    const existingContainer = existingTab.containers.find( c => c.id === importedContainer.id );
                    const existingLinkIds = new Set( existingContainer.links.map( l => l.id ) );

                    for ( const importedLink of importedContainer.links ) {
                        if ( !existingLinkIds.has( importedLink.id ) ) {
                            existingContainer.links.push( importedLink );
                        }
                    }
                }
            }
        }
    }

    // Initialize the app
    new ReadLaterApp();

} )();