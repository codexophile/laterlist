This is a browser userscript called "Later-List" developed using JavaScript. This script will function as a "read later" app with the following features:

### View page features

-   the app is in dark mode.

-   The interface consists of multiple tabs, where each tab contains containers that store links.

-   There is a dedicated page that displays all saved links.

-   Users can drag and drop links between different containers and between different tabs.

-   The containers are also draggable. They can be reordered and can be dropped in to any tab.

-   There are controls to create, delete and rename containers and tabs.

-   the view page/main interface should only be initialized and displayed when the current location.href is 'file:///D:/Mega/IDEs/JavaScript/[tm]%20laterList-view.html'

-   There are example links, tabs and containers for the first use.

-   The interface is pretty with css effects and animations.

-   There are controls to add, delete and rename both tabs and containers. by dragging and dropping it should be possible to move the links among containers and tabs.

-   Functionality to switch between views. views include 'list view' and 'favicon only view'

-   Functionality to import and export all the data. the import function is able to import from onetab too.

-   Trash functionality. each link displayed in the main interface has a button to send the link to trash.

-   When the user clicks on a link, the link automatically gets opened in a new tab and the link is sent to the archive container.

-   From either the archive container or the trash container, the user is able to restore links to their original container

### Add links features

-   From any webpage, the user can save a link to a specific tab and container of their choice.

-   When the user is on a webpage, they can right-click on a link while holding the Ctrl key. this will display a small popup. In this popup, the user can select the destination tab and container for the link.

-   If the mouse cursor is not over a link element, the current page's 'location.href' should be stored in the app.

-   The script works across all websites.

### Library/framework suggestions

-   you can use any framework/library that would reduce the complexity in managing DOM and state, make the app easier to maintain and expand. here are some ideas: jQuery for concise DOM manipulation, Alpine.js for reactive state management, Tailwind CSS for styling, and localForage for data persistence.
