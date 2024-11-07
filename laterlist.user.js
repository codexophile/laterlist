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
    if ( window.top != window.self ) return; //don't run on frames or iframes


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

    class ReadLaterApp {

        constructor () {

            this.isFaviconView = false; // Start in detailed view mode
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
                GM_addValueChangeListener( 'trigger', async ( name, oldValue, newValue, remote ) => {
                    if ( !remote ) return;
                    GM_setValue( `tab-list-item-${ Math.random() }`, { title: document.title, url: window.location.href } );
                } );
                return;
            }

            window.addEventListener( 'hashchange', () => {
                const hash = window.location.hash.slice( 1 ); // Remove the '#'
                if ( hash === 'trash' ) {
                    this.activeTab = 'trash';
                } else if ( hash.startsWith( 'tab/' ) ) {
                    const tabId = hash.split( '/' ).pop();
                    this.activeTab = tabId;
                } else {
                    this.activeTab = this.data.tabs[ 0 ].id; // Default to the first tab
                }
                this.render();
            } );

            window.addEventListener( 'popstate', () => {
                const path = window.location.pathname;
                if ( path === '/trash' ) {
                    this.activeTab = 'trash';
                } else if ( path.startsWith( '/tab/' ) ) {
                    const tabId = path.split( '/' ).pop();
                    this.activeTab = tabId;
                } else {
                    this.activeTab = this.data.tabs[ 0 ].id; // Default to the first tab
                }
                this.render();
            } );

            this.init();
        }

        getTotalLinks () {
            const tabLinks = this.data.tabs.reduce( ( total, tab ) =>
                total + tab.containers.reduce( ( containerTotal, container ) =>
                    containerTotal + container.links.length, 0 ), 0 );
            return tabLinks + this.data.trash.length;
        }

        // Modify the toggleView method to preserve link state
        toggleView () {
            this.isFaviconView = !this.isFaviconView;

            // Save current state before toggling
            this.saveData();

            // Re-render with preserved state
            this.render();

            // Re-initialize sortable after view change
            this.initSortable();
        }

        async initContextMenu () {

            const collapsible = await Collapsible();
            const laterlistCollapsibleBtn = collapsible.addButton( '⏳', null, ( event ) => {
                this.showPopup( event, location.href, document.title );
                event.preventDefault();
            } );

            document.addEventListener( 'contextmenu', ( e ) => {
                if ( !e.ctrlKey ) return;

                e.preventDefault();

                // Check if clicked on or near a link
                const targetAnchor = e.target.closest( 'a' );

                // Use link URL if clicking on a link, otherwise use current page URL
                const url = targetAnchor ? targetAnchor.href : window.location.href;
                const title = targetAnchor ? targetAnchor.textContent.trim() : document.title;

                this.showPopup( e, url, title, targetAnchor );
            } );
        }

        showPopup ( event, url, title, targetAnchor ) {
            // Remove any existing popup
            const existingPopup = document.querySelector( '.laterlist-popup' );
            if ( existingPopup ) existingPopup.remove();

            const popup = document.createElement( 'div' );
            popup.className = 'laterlist-popup';
            popup.style.left = `${ event.clientX }px`;
            popup.style.top = `${ event.clientY }px`;

            // Fade in effect
            requestAnimationFrame( () => {
                popup.style.opacity = '1';
            } );

            const titleElement = document.createElement( 'div' );
            titleElement.className = 'laterlist-popup__title';
            titleElement.textContent = title;

            const urlElement = document.createElement( 'div' );
            urlElement.className = 'laterlist-popup__url';
            urlElement.textContent = url;

            const selectWrapper = document.createElement( 'div' );
            selectWrapper.className = 'laterlist-popup__select-wrapper';

            const tabSelect = createSelect();
            const containerSelect = createSelect();

            // Populate tab select
            this.data.tabs.forEach( tab => {
                const option = document.createElement( 'option' );
                option.value = tab.id;
                option.textContent = tab.name;
                tabSelect.appendChild( option );
            } );
            tabSelect.size = Math.min( this.data.tabs.length, 5 );

            // Helper function to create styled select elements
            function createSelect () {
                const select = document.createElement( 'select' );
                select.className = 'laterlist-popup__select';
                return select;
            }

            // Helper function to create buttons
            function createButton ( text, isPrimary = false ) {
                const button = document.createElement( 'button' );
                button.textContent = text;
                button.className = `laterlist-popup__button ${ isPrimary ? 'laterlist-popup__button--primary' : '' }`;
                return button;
            }

            const saveButton = createButton( '💾 Save', true );
            saveButton.addEventListener( 'click', () => {
                saveAndClosePopup();
            } );

            // Update container select based on selected tab
            const updateContainers = () => {
                const escapeHTMLPolicy = trustedTypes.createPolicy( "forceInner", {
                    createHTML: ( to_escape ) => to_escape
                } );

                containerSelect.innerHTML = escapeHTMLPolicy.createHTML( '' );

                const selectedTab = this.data.tabs.find( tab => tab.id === tabSelect.value );
                selectedTab.containers.forEach( container => {
                    const option = document.createElement( 'option' );
                    option.value = container.id;
                    option.textContent = container.name;
                    containerSelect.appendChild( option );
                } );
                containerSelect.size = Math.min( selectedTab.containers.length, 5 );
            };

            const saveAndClosePopup = async () => {
                try { addHistoryEntry( url ); } catch { }
                this.data = await GM.getValue( 'readLaterData', DEFAULT_DATA );
                await this.saveLink( url, title, tabSelect.value, containerSelect.value );

                // Fade out effect
                popup.style.opacity = '0';
                setTimeout( () => popup.remove(), 200 );
            };

            tabSelect.addEventListener( 'change', updateContainers );
            updateContainers();

            const buttonContainer = document.createElement( 'div' );
            buttonContainer.className = 'laterlist-popup__button-container';
            buttonContainer.appendChild( saveButton );

            if ( !targetAnchor ) {
                const saveAndCloseBtn = createButton( '💾 Save & Close' );
                saveAndCloseBtn.addEventListener( 'click', async () => {
                    await saveAndClosePopup();
                    window.close();
                } );

                buttonContainer.appendChild( saveAndCloseBtn );
            }

            selectWrapper.appendChild( tabSelect );
            selectWrapper.appendChild( containerSelect );

            popup.appendChild( titleElement );
            popup.appendChild( urlElement );
            popup.appendChild( selectWrapper );
            popup.appendChild( buttonContainer );

            document.body.appendChild( popup );

            // Ensure popup stays within the viewport
            const rect = popup.getBoundingClientRect();
            const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

            if ( rect.right > viewportWidth ) {
                popup.style.left = `${ viewportWidth - rect.width - 20 }px`;
            }
            if ( rect.bottom > viewportHeight ) {
                popup.style.top = `${ viewportHeight - rect.height - 20 }px`;
            }

            // Delay the close popup event listener to avoid immediate closure
            setTimeout( () => {
                // Close popup when clicking outside
                document.addEventListener( 'click', function closePopup ( e ) {
                    if ( !popup.contains( e.target ) ) {
                        popup.style.opacity = '0';
                        setTimeout( () => {
                            popup.remove();
                            document.removeEventListener( 'click', closePopup );
                        }, 200 );
                    }
                } );
            }, 100 ); // Adjust the delay as needed
        }

        deleteContainer ( containerId ) {
            const currentTab = this.getCurrentTab();
            const containerIndex = currentTab.containers.findIndex( c => c.id === containerId );
            if ( containerIndex !== -1 ) {
                // Move all links from the container to the trash
                this.data.trash.push( ...currentTab.containers[ containerIndex ].links );
                currentTab.containers.splice( containerIndex, 1 );
                this.saveData();
                this.render();
            }
        }

        async saveLink ( url, title, tabId, containerId ) {
            const tab = this.data.tabs.find( t => t.id === tabId );
            const container = tab.containers.find( c => c.id === containerId );

            const newLink = {
                id: 'link-' + Date.now(),
                title: title || url,
                url: url
            };

            container.links.push( newLink );
            await this.saveData();
        }

        init () {
            const hash = window.location.hash.slice( 1 ); // Remove the '#'
            if ( hash === 'trash' ) {
                this.activeTab = 'trash';
            } else if ( hash.startsWith( 'tab/' ) ) {
                const tabId = hash.split( '/' ).pop();
                this.activeTab = tabId;
            } else {
                this.activeTab = this.data.tabs[ 0 ].id; // Default to the first tab
            }

            this.render();
            this.initSortable();
            this.initContainerSortable(); // Initialize Sortable for containers
            document.querySelector( `.tab-section` ).scrollIntoView();

            // Set up ValueChangeListener
            GM_addValueChangeListener( 'readLaterData', ( name, oldValue, newValue, remote ) => {
                if ( remote ) {
                    this.data = newValue;
                    this.render();
                }
            } );
        }

        async saveData () {
            await GM.setValue( 'readLaterData', this.data );
            // Debugging: Log the saved data
        }

        render () {
            const app = document.getElementById( 'app' );
            app.innerHTML = `
            <div class="header">
                <div class="header-left">
                    <h1>Read Later</h1>
                    <span class="total-links">Total Links: ${ this.getTotalLinks() }</span>
                </div>
                <div>
                    <button class="btn" id="importData">Import</button>
                    <button class="btn" id="importFromOneTab">Import from OneTab</button>
                    <button class="btn" id="exportData">Export</button>
                    <button class="btn trash-tab" id="showTrash">Trash (${ this.data.trash.length })</button>
                    <button class="btn btn-primary" id="addTab">New Tab</button>
                    <button class="btn" id="toggleView">${ this.isFaviconView ? 'Detailed View' : 'Favicon View' }</button>
                </div>
            </div>
            <div class="tabs">
                ${ this.data.tabs.map( tab => `
                    <div class="tab ${ tab.id === this.activeTab ? 'active' : '' }" data-tab-id="${ tab.id }">
                        <span> ${ tab.name } </span>
                        <span class=link-count> ${ this.getTotalLinksInTab( tab ) } links</span>
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
                this.initContainerSortable(); // Ensure Sortable is initialized for containers
            }

        }

        renderTabs () {
            return this.data.tabs.map( tab => {
                // Create a map to track URLs and their counts
                const urlMap = new Map();

                // Populate the map with URLs and their counts
                tab.containers.forEach( container => {
                    container.links.forEach( link => {
                        if ( urlMap.has( link.url ) ) {
                            urlMap.set( link.url, urlMap.get( link.url ) + 1 );
                        } else {
                            urlMap.set( link.url, 1 );
                        }
                    } );
                } );

                return `
            <div class="tab-section" data-tab-section="${ tab.id }">
                <!-- Update the total number of links here -->
                <div class="tab-label">${ tab.name } (${ this.getTotalLinksInTab( tab ) } links)</div>
                <div class="containers ${ tab.id === this.activeTab ? 'active-tab' : '' }" 
                     data-tab-content="${ tab.id }" 
                     data-tab-id="${ tab.id }" 
                     style="display: ${ tab.id === this.activeTab ? 'grid' : 'none' }">
                    <div class="drag-indicator"></div>
                    ${ tab.containers.map( container => `
                        <div class="container" data-container-id="${ container.id }" data-tab-id="${ tab.id }">
                            <div class="container-header">
                                <div class="container-stats">
                                    <span class="container-name" data-container-id="${ container.id }">${ container.name }</span>
                                    <span class="link-count">${ container.links.length } links</span>
                                </div>
                                <div class="container-actions">
                                    <button title="Import JSON"      class="btn btn-import-backup" data-import-backup="${ container.id }"  >📥</button>
                                    <button title="Open all"         class="btn btn-open-all"  data-open-all-container="${ container.id }" >↗️</button>
                                    <button title="Pull all"         class="btn btn-pull-tabs" data-pull-tabs-container="${ container.id }">⬅️</button>
                                    <button title="Rename"           class="btn btn-rename"    data-rename-container="${ container.id }"   >✏️</button>
                                    <button title="Trash all"        class="btn btn-trash-all" data-trash-all-container="${ container.id }">🗑️</button> 
                                    <button title="Delete container" class="btn btn-delete"    data-delete-container="${ container.id }"   >❌</button>
                                </div>
                            </div>
                            <div class="container-content" data-container-id="${ container.id }" data-tab-id="${ tab.id }">
                                ${ this.isFaviconView
                        ? container.links.map( link => `
                                        <div class="link ${ urlMap.get( link.url ) > 1 ? 'duplicate-link' : '' }" data-link-id="${ link.id }" style="display: inline-block; padding: 8px;">
                                            <a href="${ link.url }" target="_blank">
                                                <img src="https://www.google.com/s2/favicons?domain=${ new URL( link.url ).hostname }" 
                                                     alt="favicon" style="width: 32px; height: 32px;">
                                            </a>
                                        </div>
                                    `).join( '' )
                        : container.links.map( link => `
                                        <div class="link ${ urlMap.get( link.url ) > 1 ? 'duplicate-link' : '' }" data-link-id="${ link.id }">
                                            <img src="https://www.google.com/s2/favicons?domain=${ new URL( link.url ).hostname }" 
                                                 alt="favicon" style="width: 16px; height: 16px; margin-right: 8px;">
                                            <a href="${ link.url }" 
                                               target="_blank" 
                                               data-move-to-trash="${ link.id }" 
                                               data-link-url="${ link.url }">${ link.title }</a>
                                            <button class="btn btn-delete" data-delete-link="${ link.id }">×</button>
                                        </div>
                                    `).join( '' ) }
                            </div>
                        </div>
                    `).join( '' ) }
                    <button class="btn add-container-btn" id="add-container-${ tab.id }">Add Container</button>
                </div>
            </div>
        `;
            } ).join( '' );
        }

        renderTrash () {
            return `
                <div class="trash-container">
                    <h2>Trash</h2>
                    <div id=trash-items>
                    ${ this.data.trash.map( link => `
                        <div class="trash-link" data-link-id="${ link.id }">
                            <a href="${ link.url }" target="_blank">${ link.title }</a>
                            <div class="trash-actions">
                                <button class="btn btn-restore" data-restore-link="${ link.id }">↩</button>
                                <button class="btn btn-delete" data-permanent-delete="${ link.id }">×</button>
                            </div>
                        </div>
                    `).join( '' ) }
                    </div>
                    ${ this.data.trash.length > 0 ? `
                        <button class="btn empty-trash-btn" id="emptyTrash">Empty Trash</button>
                    ` : '<p>Trash is empty</p>' }
                </div>
            `;
        }


        getTotalLinksInTab ( tab ) {
            return tab.containers.reduce( ( total, container ) => total + container.links.length, 0 );
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
                            <span class="tab-count">${ this.getTotalLinksInTab( tab ) }</span>
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

        //* Event listeners
        attachEventListeners () {

            // Remove all previous add container listeners
            document.querySelectorAll( '.add-container-btn' ).forEach( btn => {
                btn.replaceWith( btn.cloneNode( true ) );
            } );

            // Add new listeners to add container buttons
            document.querySelectorAll( '.add-container-btn' ).forEach( btn => {
                const tabId = btn.id.replace( 'add-container-', '' );
                btn.addEventListener( 'click', ( e ) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.addContainer( tabId );
                }, { once: true } ); // This ensures the listener only fires once
            } );

            // Import/Export handlers
            document.getElementById( 'importFromOneTab' )?.addEventListener( 'click', () => this.importFromOneTab() );
            document.getElementById( 'importData' )?.addEventListener( 'click', () => this.importData() );
            document.getElementById( 'exportData' )?.addEventListener( 'click', () => this.exportData() );

            // View toggle handler
            document.getElementById( 'toggleView' )?.addEventListener( 'click', () => this.toggleView() );

            // Trash management handlers
            document.getElementById( 'showTrash' )?.addEventListener( 'click', () => {
                this.activeTab = 'trash';
                this.render();
            } );

            document.getElementById( 'emptyTrash' )?.addEventListener( 'click', () => {
                this.data.trash = [];
                this.saveData();
                this.render();
            } );

            // Tab management
            document.getElementById( 'addTab' )?.addEventListener( 'click', () => this.addTab() );

            // Tab switching and renaming
            document.querySelectorAll( '.tab' ).forEach( tab => {
                tab.addEventListener( 'click', ( e ) => {
                    const tabId = tab.dataset.tabId;
                    if ( tabId ) {
                        this.switchTab( tabId );
                    }
                } );

                tab.addEventListener( 'dblclick', ( e ) => {
                    const tabId = tab.dataset.tabId;
                    if ( tabId ) {
                        this.renameTab( tabId );
                    }
                } );
            } );

            // Main click handler for deletions and trash operations
            document.addEventListener( 'click', ( e ) => {
                const deleteTab = e.target.dataset.deleteTab;
                const deleteContainer = e.target.dataset.deleteContainer;
                const deleteLink = e.target.dataset.deleteLink;
                const moveToTrash = e.target.dataset.moveToTrash;
                const restoreLink = e.target.dataset.restoreLink;
                const permanentDelete = e.target.dataset.permanentDelete;
                const renameContainer = e.target.dataset.renameContainer;

                if ( deleteTab ) this.deleteTab( deleteTab );
                if ( deleteContainer ) this.deleteContainer( deleteContainer );
                if ( deleteLink ) this.moveToTrash( deleteLink );
                if ( moveToTrash && e.target.tagName === 'A' ) {
                    e.preventDefault();
                    this.moveToTrash( moveToTrash );
                    window.open( e.target.dataset.linkUrl, '_blank' );
                }
                if ( restoreLink ) this.restoreFromTrash( restoreLink );
                if ( permanentDelete ) this.permanentDelete( permanentDelete );
                if ( renameContainer ) this.renameContainer( renameContainer );
            } );

            // Handle links that should be moved to trash
            document.querySelectorAll( 'a[data-move-to-trash]' ).forEach( link => {
                // Remove any existing event listeners
                const newLink = link.cloneNode( true );
                link.parentNode.replaceChild( newLink, link );

                // Prevent all default behaviors
                newLink.addEventListener( 'pointerdown', ( e ) => {
                    if ( e.button !== 0 ) return; // left button action

                    e.preventDefault();
                    e.stopPropagation();

                    const moveToTrash = e.currentTarget.dataset.moveToTrash;
                    const linkUrl = e.currentTarget.dataset.linkUrl;

                    // Move to trash first
                    this.moveToTrash( moveToTrash );

                    // Open in new tab
                    window.open( linkUrl, '_blank' );
                }, { capture: true } );

                // Prevent all other events that might interfere
                [ 'click', 'dragstart', 'drag', 'mousedown' ].forEach( eventType => {
                    newLink.addEventListener( eventType, ( e ) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }, { capture: true } );
                } );

                // Disable all drag-related properties
                newLink.draggable = false;
                newLink.style.cssText = 'user-drag: none; -webkit-user-drag: none; user-select: none; -webkit-user-select: none;';
            } );

            // Handle delete buttons with a more specific approach
            document.querySelectorAll( '.link .btn-delete' ).forEach( button => {
                const link = button.closest( '.link' );

                // Remove existing listeners
                const newButton = button.cloneNode( true );
                button.parentNode.replaceChild( newButton, button );

                newButton.addEventListener( 'pointerdown', ( e ) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const deleteLink = newButton.dataset.deleteLink;
                    if ( deleteLink ) {
                        this.deleteLink( deleteLink );
                    }
                }, { capture: true } );

                // Make sure the button and its parent link don't trigger sortable
                newButton.draggable = false;
                if ( link ) {
                    link.addEventListener( 'pointerdown', ( e ) => {
                        if ( e.target.classList.contains( 'btn-delete' ) ) {
                            e.stopPropagation();
                        }
                    }, { capture: true } );
                }
            } );


            // Add rename container button event listeners
            document.querySelectorAll( '.btn-rename' ).forEach( button => {
                button.addEventListener( 'click', ( e ) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const containerId = button.dataset.renameContainer;
                    this.renameContainer( containerId );
                }, { once: true } );
            } );

            // Add delete container button event listeners
            document.querySelectorAll( '.btn-delete[data-delete-container]' ).forEach( button => {
                button.addEventListener( 'click', ( e ) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const containerId = button.dataset.deleteContainer;
                    this.deleteContainer( containerId );
                } );
            } );

            // Remove existing event listeners on buttons in container headers
            document.querySelectorAll( '.container-header .btn' ).forEach( button => {
                button.replaceWith( button.cloneNode( true ) );
            } );

            // Add event listener for the new "Trash All" button
            document.querySelectorAll( '.btn-trash-all' ).forEach( button => {
                button.addEventListener( 'click', ( e ) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const containerId = button.dataset.trashAllContainer;
                    this.trashAllLinksInContainer( containerId );
                } );
            } );

            // Add event listener for the new "Pull Tabs" button
            document.querySelectorAll( '.btn-pull-tabs' ).forEach( button => {
                button.addEventListener( 'click', ( e ) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const containerId = button.dataset.pullTabsContainer;
                    e.target.textContent = '⏳';
                    try { this.pullTabsIntoContainer( containerId ); }
                    catch ( error ) { alert( error ); }
                    e.target.textContent = '⬅️';
                } );
            } );

            document.querySelectorAll( '.btn-open-all' ).forEach( button => {
                button.addEventListener( 'click', function () {
                    const container = this.closest( '.container' );
                    const links = container.querySelectorAll( '.link a' );
                    links.forEach( link => {
                        GM_openInTab( link.href );
                    } );
                } );
            } );

            // Add event listener for the new "Import Backup" button
            document.querySelectorAll( '.btn-import-backup' ).forEach( button => {
                button.addEventListener( 'click', ( e ) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const containerId = button.dataset.importBackup;
                    this.importBackup( containerId );
                } );
            } );

        }

        trashAllLinksInContainer ( containerId ) {
            const currentTab = this.getCurrentTab();
            const container = currentTab.containers.find( c => c.id === containerId );
            if ( container ) {
                // Move all links from the container to the trash
                this.data.trash.push( ...container.links );
                container.links = [];
                this.saveData();
                this.render();
            }
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

            // Update the URL based on the active tab or trash using hash-based routing
            if ( tabId === 'trash' ) {
                window.location.hash = 'trash';
            } else {
                window.location.hash = `tab/${ tabId }`;
            }

            // Re-render the entire view when switching between normal tabs and trash
            this.render();
        }

        initSortable () {
            document.querySelectorAll( '.container-content' ).forEach( container => {
                new Sortable( container, {
                    filter: '.btn-delete', // Add this to prevent dragging from delete buttons
                    preventOnFilter: true,  // Add this to prevent default action when clicking filtered elements
                    group: 'links',
                    animation: 150,
                    ghostClass: 'sortable-ghost',
                    dragClass: 'sortable-drag',
                    forceFallback: true,
                    fallbackClass: 'sortable-fallback',
                    onStart: ( evt ) => {
                        document.body.classList.add( 'dragging-active' );
                        this.isDragging = true;
                        evt.item.classList.add( 'dragging' );
                    },
                    onEnd: ( evt ) => {
                        document.body.classList.remove( 'dragging-active' );
                        this.isDragging = false;
                        evt.item.classList.remove( 'dragging' );
                        this.handleLinkMove( evt );
                        document.querySelectorAll( '.containers' ).forEach( cont => {
                            cont.classList.remove( 'drag-hover' );
                        } );
                    },
                    onChange: ( evt ) => {
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

        initContainerSortable () {
            document.querySelectorAll( '.containers' ).forEach( containers => {
                new Sortable( containers, {
                    group: 'containers',
                    animation: 150,
                    ghostClass: 'sortable-ghost',
                    dragClass: 'sortable-drag',
                    forceFallback: true,
                    fallbackClass: 'sortable-fallback',
                    filter: '.btn',  // Ignore buttons
                    preventOnFilter: true,
                    onStart: ( evt ) => {
                        document.body.classList.add( 'dragging-active' );
                        this.isDragging = true;
                        evt.item.classList.add( 'dragging' );
                    },
                    onEnd: ( evt ) => {
                        document.body.classList.remove( 'dragging-active' );
                        this.isDragging = false;
                        evt.item.classList.remove( 'dragging' );
                        this.handleContainerMove( evt );
                        document.querySelectorAll( '.containers' ).forEach( cont => {
                            cont.classList.remove( 'drag-hover' );
                        } );
                    },
                    onChange: ( evt ) => {
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

        // Modify the handleLinkMove method to ensure link data persistence
        handleLinkMove ( evt ) {
            const linkEl = evt.item;
            const linkId = linkEl.dataset.linkId;
            const toContainerId = evt.to.dataset.containerId;
            const fromContainerId = evt.from.dataset.containerId;
            const toTabId = evt.to.dataset.tabId;
            const fromTabId = evt.from.dataset.tabId;

            if ( !linkId || !toContainerId || !fromContainerId || !toTabId || !fromTabId ) {
                console.error( 'Missing required data attributes' );
                return;
            }

            // Find source and target tabs
            const fromTab = this.data.tabs.find( tab => tab.id === fromTabId );
            const toTab = this.data.tabs.find( tab => tab.id === toTabId );

            if ( !fromTab || !toTab ) {
                console.error( 'Could not find source or target tab' );
                return;
            }

            // Find source and target containers
            const fromContainer = fromTab.containers.find( c => c.id === fromContainerId );
            const toContainer = toTab.containers.find( c => c.id === toContainerId );

            if ( !fromContainer || !toContainer ) {
                console.error( 'Could not find source or target container' );
                return;
            }

            // Find the actual link object
            const linkIndex = fromContainer.links.findIndex( link => link.id === linkId );
            if ( linkIndex === -1 ) {
                console.error( 'Could not find moved link' );
                return;
            }

            // Create a deep copy of the link object
            const movedLink = JSON.parse( JSON.stringify( fromContainer.links[ linkIndex ] ) );

            // Remove from source
            fromContainer.links.splice( linkIndex, 1 );

            // Add to target at the correct position
            if ( fromContainerId === toContainerId && fromTabId === toTabId ) {
                toContainer.links.splice( evt.newIndex, 0, movedLink );
            } else {
                const newLinks = [ ...toContainer.links ];
                newLinks.splice( evt.newIndex, 0, movedLink );
                toContainer.links = newLinks;
            }

            this.saveData();

            // Re-render the UI to update link counts
            this.render();
        }

        handleContainerMove ( evt ) {
            const toTabId = evt.to.dataset.tabId;
            const fromTabId = evt.from.dataset.tabId;

            if ( !toTabId || !fromTabId ) {
                console.error( 'Missing required data attributes' );
                return;
            }

            // Locate the source and target tabs
            const fromTab = this.data.tabs.find( tab => tab.id === fromTabId );
            const toTab = this.data.tabs.find( tab => tab.id === toTabId );

            if ( !fromTab || !toTab ) {
                console.error( 'Source or target tab not found' );
                return;
            }

            // Get the current order of containers from the DOM
            const newOrder = Array.from( evt.to.children ).map( child => child.dataset.containerId );

            // Reorder containers in `toTab` according to the new DOM order
            toTab.containers = newOrder.map( id =>
                fromTab.containers.find( container => container.id === id )
            ).filter( Boolean );

            // Save the data and re-render
            this.saveData();
            this.render();
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
            let linkDeleted = false;

            // Iterate through containers to find and delete the link
            for ( const container of currentTab.containers ) {
                const linkIndex = container.links.findIndex( link => link.id === linkId );
                if ( linkIndex !== -1 ) {
                    container.links.splice( linkIndex, 1 );
                    linkDeleted = true;
                    break; // Exit the loop once the link is deleted
                }
            }

            if ( linkDeleted ) {
                this.saveData();
                // Only re-render the current tab to avoid unnecessary re-renders
                this.renderTabs();
            }
        }

        async pullTabsIntoContainer ( containerId ) {
            const container = this.getCurrentTab().containers.find( c => c.id === containerId );
            if ( !container ) {
                console.error( 'Container not found' );
                return;
            }

            const keys = await GM.listValues();
            keys.filter( key => key.startsWith( 'tab-list-item-' ) ).forEach( key => GM_deleteValue( key ) );
            await GM.setValue( 'trigger', Date.now() );
            await asyncTimeout( 1000 );

            const allKeys = await GM.listValues();
            const tabListKeys = allKeys.filter( key => key.startsWith( 'tab-list-item-' ) );
            if ( !tabListKeys.length ) {
                alert( 'No tabs found!' );
                return;
            }

            // Use Promise.all to wait for all async operations to complete
            await Promise.all( tabListKeys.map( async tabListKey => {
                const tabListValue = await GM.getValue( tabListKey );
                const newLink = {
                    id: 'link-' + Date.now() + Math.random().toString().slice( 2 ),
                    title: tabListValue.title || tabListValue.url,
                    url: tabListValue.url
                };
                container.links.push( newLink );
            } ) );

            this.saveData();
            this.render();
        }

        importBackup ( containerId ) {
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
                        if ( !this.isValidBackupStructure( importedData ) ) {
                            alert( 'Invalid backup structure in imported file' );
                            return;
                        }

                        // Import links into the specified container
                        const container = this.getCurrentTab().containers.find( c => c.id === containerId );
                        if ( container ) {
                            importedData.lists[ 0 ].cards.forEach( card => {
                                container.links.push( {
                                    id: 'link-' + Date.now() + Math.random().toString().slice( 2 ),
                                    title: card.title,
                                    url: card.url
                                } );
                            } );
                            this.saveData();
                            this.render();
                            alert( `${ importedData.lists[ 0 ].cards.length } links imported successfully!` );
                        }
                    } catch ( error ) {
                        alert( 'Error importing backup: ' + error.message );
                    }
                };

                reader.readAsText( file );
            };

            input.click();
        }

        isValidBackupStructure ( data ) {
            // Basic structure validation
            if ( !data.lists || !Array.isArray( data.lists ) || data.lists.length === 0 ) return false;
            const list = data.lists[ 0 ];
            if ( !list.cards || !Array.isArray( list.cards ) ) return false;

            // Validate each card
            for ( const card of list.cards ) {
                if ( !card.title || !card.url ) return false;
            }

            return true;
        }

        renameTab ( tabId ) {
            const tab = this.data.tabs.find( t => t.id === tabId );
            if ( !tab ) return;

            const newName = prompt( 'Enter new tab name:', tab.name );
            if ( newName && newName.trim() !== '' ) {
                tab.name = newName.trim();
                this.saveData();  // Save the updated data
                this.render();    // Re-render the app to reflect the change
            }
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

        importFromOneTab () {
            const input = document.createElement( 'input' );
            input.type = 'file';
            input.accept = 'text/plain';

            input.onchange = ( e ) => {
                const file = e.target.files[ 0 ];
                const reader = new FileReader();

                reader.onload = ( event ) => {
                    const textContent = event.target.result;
                    const links = this.parseOneTabExport( textContent );

                    if ( links.length > 0 ) {
                        const firstTab = this.data.tabs[ 0 ];
                        if ( firstTab.containers.length === 0 ) {
                            firstTab.containers.push( {
                                id: 'container-' + Date.now(),
                                name: 'Imported from OneTab',
                                links: []
                            } );
                        }
                        const firstContainer = firstTab.containers[ 0 ];

                        // Ensure each link has a unique timestamp-based ID
                        const processedLinks = links.map( link => ( {
                            ...link,
                            id: `link-${ Date.now() }-${ Math.random().toString( 36 ).substr( 2, 9 ) }`,
                            importedAt: Date.now()
                        } ) );

                        firstContainer.links.push( ...processedLinks );
                        this.saveData();
                        this.render();
                        alert( `${ links.length } links imported successfully from OneTab!` );
                    } else {
                        alert( 'No valid links found in the OneTab export.' );
                    }
                };

                reader.readAsText( file );
            };

            input.click();
        }

        parseOneTabExport ( content ) {
            const links = [];
            const lines = content.split( '\n' ).filter( line => line.trim() !== '' );

            lines.forEach( line => {
                // More robust URL extraction
                const urlMatch = line.match( /https?:\/\/[^\s|\|]+/ );
                if ( urlMatch ) {
                    const url = urlMatch[ 0 ];
                    // Clean up the title: remove the URL and any remaining pipe characters
                    let title = line.replace( url, '' ).replace( /\|/g, '' ).trim();
                    if ( !title ) {
                        // If no title is found, use the domain name as title
                        try {
                            const domain = new URL( url ).hostname;
                            title = domain.replace( /^www\./, '' );
                        } catch ( e ) {
                            title = url;
                        }
                    }
                    links.push( {
                        id: `link-${ Date.now() }-${ Math.random().toString( 36 ).substr( 2, 9 ) }`,
                        title,
                        url,
                        importedAt: Date.now()
                    } );
                }
            } );

            return links;
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