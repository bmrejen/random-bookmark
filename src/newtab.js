// Ask background script to load bookmark into this tab
chrome.runtime.sendMessage({ type: 'loadBookmark' }, (response) => {});
