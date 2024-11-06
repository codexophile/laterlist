// styles.js

const POPUP_STYLES = `
    .laterlist-popup {
        position: fixed;
        background: linear-gradient(to bottom, #3b4252, #2e3440);
        border: 1px solid #4c566a;
        border-radius: 12px;
        padding: 20px;
        z-index: 999999;
        color: #eceff4;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15),
                    0 2px 6px rgba(0, 0, 0, 0.1);
        max-width: 320px;
        width: 100%;
        transition: opacity 0.2s ease-in-out;
        opacity: 0;
    }

    .laterlist-popup__title {
        font-weight: 600;
        font-size: 1.1em;
        margin-bottom: 8px;
        color: #eceff4;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .laterlist-popup__url {
        font-size: 0.9em;
        color: #88c0d0;
        margin-bottom: 20px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        opacity: 0.9;
    }

    .laterlist-popup__select-wrapper {
        display: grid;
        gap: 12px;
        margin-bottom: 20px;
    }

    .laterlist-popup__select {
        width: 100%;
        padding: 8px 12px;
        background: #4c566a;
        border: 1px solid #6c7a96;
        border-radius: 6px;
        color: #eceff4;
        font-size: 0.95em;
        cursor: pointer;
        outline: none;
        transition: border-color 0.2s ease;
    }

    .laterlist-popup__select:hover {
        border-color: #88c0d0;
    }

    .laterlist-popup__select:focus {
        border-color: #88c0d0;
        box-shadow: 0 0 0 2px rgba(136, 192, 208, 0.2);
    }

    .laterlist-popup__select option {
        padding: 8px;
        background: #4c566a;
    }

    .laterlist-popup__button-container {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
    }

    .laterlist-popup__button {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 0.95em;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        background: #434c5e;
        color: #e5e9f0;
    }

    .laterlist-popup__button:hover {
        background: #4c566a;
    }

    .laterlist-popup__button--primary {
        background: #88c0d0;
        color: #2e3440;
    }

    .laterlist-popup__button--primary:hover {
        background: #8fcfdf;
    }
`;

// Add styles to the document
GM_addStyle(POPUP_STYLES);