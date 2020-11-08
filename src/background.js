import cp from 'chrome-promise';

import * as bookmarks from './bookmarks';
import * as blacklist from './blacklist';

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.method === 'GET' && details.type === 'main_frame') {
      if (blacklist.mode() !== blacklist.MODES.DISABLED && blacklist.isBlocked(details.url)) {
        if (blacklist.mode() === blacklist.MODES.ADDRESS_BAR) {
          // We don't know navigation type at this point, since webNavigation.onCommitted can be
          // fired after webRequest.onBeforeRequest, so we just ignore this request, redirection
          // will happen in onCommitted if it's necessary
          return;
        }

        return { cancel: true };
      }
    }
  },
  { urls: ['<all_urls>'] },
  ['blocking'],
);

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (blacklist.mode() === blacklist.MODES.ALL && blacklist.isBlocked(details.url)) {
    const bookmark = bookmarks.pick();
    if (bookmark && !blacklist.isBlocked(bookmark.url)) {
      await cp.tabs.update(details.tabId, {
        url: bookmark.url,
      });
    }
  }
});

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) {
    return;
  }

  if (blacklist.mode() !== blacklist.MODES.ADDRESS_BAR) {
    return;
  }

  if (!details.transitionQualifiers.includes('from_address_bar')) {
    return;
  }

  if (blacklist.isBlocked(details.url)) {
    const bookmark = bookmarks.pick();
    if (bookmark) {
      cp.tabs.update(details.tabId, {
        url: bookmark.url,
      });
    }
  }
});

chrome.browserAction.onClicked.addListener(async (tab) => {
  chrome.runtime.openOptionsPage();
});

// Update list for all bookmarks changes
chrome.bookmarks.onCreated.addListener(bookmarks.load);
chrome.bookmarks.onChanged.addListener(bookmarks.load);
chrome.bookmarks.onMoved.addListener(bookmarks.load);
chrome.bookmarks.onRemoved.addListener(bookmarks.load);

chrome.storage.onChanged.addListener(async (changes) => {
  if (changes.bookmarks) {
    await bookmarks.load();
  }

  if (changes.blacklist || changes.blacklistMode) {
    await blacklist.load();
  }
});

blacklist.load();
bookmarks.load();

chrome.runtime.onMessage.addListener(async (request, sender, reply) => {
  if (request.type === 'loadBookmark') {
    reply();

    const bookmark = bookmarks.pick();
    if (bookmark) {
      await cp.tabs.update(sender.tab.id, {
        url: bookmark.url,
      });
    } else {
      // In case we don't have a bookmark to use, we redirect to default newtab page
      await cp.tabs.update(sender.tab.id, { url: 'chrome-search://local-ntp/local-ntp.html' });
    }
  }
});
