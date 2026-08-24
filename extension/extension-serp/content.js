// Stock SERP Copier - Content Script with Virtual Native In-Page Navigator

const authorCache = new Map();
let isNavigating = false;
let cancelNavigation = false;
let currentProgress = { current: 0, total: 0, author: '', assetId: '', isNavigating: false };

function extractSearchQuery() {
  const urlParams = new URLSearchParams(window.location.search);
  const k = urlParams.get('k') || urlParams.get('search') || urlParams.get('keyword');
  if (k) return k.trim();

  const inputEl = document.querySelector('input[type="search"], #search-input-search-field, input[name="k"]');
  if (inputEl && inputEl.value) {
    return inputEl.value.trim();
  }

  const title = document.title;
  const match = title.match(/^(.*?)\s*ภาพถ่าย/i) || title.match(/^(.*?)\s*Stock Photos/i);
  return match ? match[1].trim() : 'untitled';
}

function extractPageNumber() {
  const urlParams = new URLSearchParams(window.location.search);
  const p = urlParams.get('search_page') || urlParams.get('page');
  if (p && !isNaN(Number(p))) {
    return parseInt(p, 10);
  }
  const activePageEl = document.querySelector('.pagination .active, [data-t="pagination-active-page"]');
  if (activePageEl && !isNaN(Number(activePageEl.textContent))) {
    return parseInt(activePageEl.textContent.trim(), 10);
  }
  return 1;
}

// Scrape live open details panel if user is viewing an item
function scrapeActiveDetailsPanel() {
  const detailsEl = document.querySelector('#details-wrapper, #details');
  const authorEl = document.querySelector('a.js-contributor-link, span[data-t="detail-panel-content-author-name"] a');
  const contentId = detailsEl?.getAttribute('data-content_id') || detailsEl?.getAttribute('data-content-id') || document.querySelector('[data-content_id]')?.getAttribute('data-content_id');

  if (contentId && authorEl && authorEl.textContent) {
    const author = authorEl.textContent.trim();
    if (author) {
      authorCache.set(String(contentId), author);
    }
  }
}

function extractSerpItems() {
  scrapeActiveDetailsPanel();

  const pageNumber = extractPageNumber();
  const query = extractSearchQuery();
  const cellEls = document.querySelectorAll('.search-result-cell, [data-content-id], [data-t="search-result-cell"]');
  const items = [];
  const seenIds = new Set();

  cellEls.forEach((cell) => {
    let assetId = cell.getAttribute('data-content-id') || cell.getAttribute('data-ingest-content-id');
    const linkEl = cell.querySelector('a.js-search-result-thumbnail, a[href*="/images/"], a[data-content-id]');

    if (!assetId && linkEl) {
      assetId = linkEl.getAttribute('data-content-id') || linkEl.getAttribute('name');
    }

    if (!assetId) {
      const match = linkEl?.href?.match(/\/(\d{6,15})(?:\?|$)/);
      if (match) assetId = match[1];
    }

    if (!assetId || seenIds.has(assetId)) {
      return;
    }
    seenIds.add(assetId);

    const metaTitle = cell.querySelector('meta[itemprop="name"]')?.getAttribute('content');
    const imgEl = cell.querySelector('img');
    const title = metaTitle || imgEl?.alt || linkEl?.title || `Asset #${assetId}`;

    const metaThumb = cell.querySelector('meta[itemprop="thumbnailUrl"]')?.getAttribute('content');
    const lazyThumb = imgEl?.getAttribute('data-lazy');
    const srcThumb = imgEl?.src;
    const thumbnailUrl = metaThumb || lazyThumb || srcThumb || '';

    const detailUrl = linkEl?.href || `https://stock.adobe.com/images/${assetId}`;

    let author = authorCache.get(String(assetId)) || '';
    if (!author) {
      const authorEl = cell.querySelector('.author-name, .contributor-name, [data-author]');
      if (authorEl && authorEl.textContent) {
        author = authorEl.textContent.trim();
        authorCache.set(String(assetId), author);
      }
    }

    const rank = (pageNumber - 1) * 100 + items.length + 1;

    items.push({
      rank,
      assetId,
      title: title.trim(),
      author,
      thumbnailUrl,
      detailUrl,
      keyword: query,
      page: pageNumber,
    });
  });

  return {
    keyword: query,
    pageNumber,
    platform: 'Adobe Stock',
    totalItems: items.length,
    items,
    url: window.location.href,
  };
}

// ─── Virtual Native In-Page Navigator ────────────────────────────────────────

const WATCHDOG_TIMEOUT_MS = 2500;

function getHumanJitter(min = 500, max = 1200) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getStealthDelay(stepIndex) {
  const base = getHumanJitter(500, 1200);
  const lingerInterval = 4 + Math.floor(Math.random() * 3);
  if (stepIndex > 0 && stepIndex % lingerInterval === 0) {
    return base + Math.floor(Math.random() * (2500 - 1500 + 1)) + 1500;
  }
  return base;
}

function getEntryDelay() {
  return Math.floor(Math.random() * (1500 - 800 + 1)) + 800;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isDetailPanelReady() {
  return Boolean(
    document.querySelector('.js-details-close-button, button.js-details-next-button, a.js-contributor-link, #details-wrapper.open, [data-t="detail-panel-content-author-name"]')
  );
}

/**
 * Robust Detail Panel Open Waiter
 */
function waitForDetailPanelOpen() {
  return new Promise((resolve) => {
    if (isDetailPanelReady()) {
      resolve(true);
      return;
    }

    let resolved = false;
    const observer = new MutationObserver(() => {
      if (isDetailPanelReady() && !resolved) {
        resolved = true;
        observer.disconnect();
        resolve(true);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        observer.disconnect();
        resolve(isDetailPanelReady());
      }
    }, WATCHDOG_TIMEOUT_MS);
  });
}

/**
 * Waits for #details[data-content_id] or active author to change from `previousId`.
 */
function waitForContentIdChange(previousId) {
  return new Promise((resolve) => {
    const getContentId = () => {
      const detailsEl = document.querySelector('#details.js-details, #details, [data-content_id]');
      return detailsEl?.getAttribute('data-content_id') || detailsEl?.getAttribute('data-content-id') || null;
    };

    const currentId = getContentId();
    if (currentId && currentId !== previousId) {
      resolve(currentId);
      return;
    }

    let resolved = false;
    const observer = new MutationObserver(() => {
      const newId = getContentId();
      if (newId && newId !== previousId && !resolved) {
        resolved = true;
        observer.disconnect();
        resolve(newId);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    // Poll fallback
    const pollInterval = setInterval(() => {
      const newId = getContentId();
      if (newId && newId !== previousId && !resolved) {
        resolved = true;
        observer.disconnect();
        clearInterval(pollInterval);
        resolve(newId);
      }
    }, 100);

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        observer.disconnect();
        clearInterval(pollInterval);
        resolve(getContentId() || null);
      }
    }, WATCHDOG_TIMEOUT_MS);
  });
}

function scrapeCurrentAuthor() {
  const detailsEl = document.querySelector('#details.js-details, #details, [data-content_id]');
  const assetId = detailsEl?.getAttribute('data-content_id') || detailsEl?.getAttribute('data-content-id') || '';
  const authorEl = document.querySelector('a.js-contributor-link, span[data-t="detail-panel-content-author-name"] a');
  const author = authorEl ? authorEl.textContent.trim() : '';

  return { assetId, author };
}

function sendProgressToPopup(current, total, assetId, author) {
  currentProgress = { current, total, assetId, author, isNavigating: true };
  try {
    chrome.runtime.sendMessage({
      action: 'NAVIGATION_PROGRESS',
      current,
      total,
      assetId,
      author,
      percent: Math.round((current / total) * 100),
    });
  } catch {
    // Popup might be closed
  }
}

function sendCompleteToPopup(collected, total) {
  currentProgress = { current: collected, total, assetId: '', author: '', isNavigating: false };
  try {
    chrome.runtime.sendMessage({
      action: 'NAVIGATION_COMPLETE',
      collected,
      total,
    });
  } catch {
    // Popup might be closed
  }
}

/**
 * Main Virtual Native Navigator loop.
 */
async function startNativeNavigation(targetCount) {
  if (isNavigating) return;
  isNavigating = true;
  cancelNavigation = false;

  let collected = 0;

  try {
    // Check if details is already open
    if (!isDetailPanelReady()) {
      // Find first thumbnail card image/link
      const firstCell = document.querySelector('.search-result-cell, [data-content-id]');
      const clickTarget =
        firstCell?.querySelector('a.js-search-result-thumbnail img') ||
        firstCell?.querySelector('img') ||
        firstCell?.querySelector('a') ||
        firstCell ||
        document.querySelector('a.js-search-result-thumbnail');

      if (!clickTarget) {
        sendCompleteToPopup(0, targetCount);
        isNavigating = false;
        return;
      }

      clickTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(200);

      // Dispatch authentic MouseEvent to bypass href redirect
      clickTarget.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      try {
        clickTarget.click();
      } catch {}

      // Wait for panel ready
      await waitForDetailPanelOpen();
    }

    // Entry delay — simulate human settling in
    await sleep(getEntryDelay());

    // Read first item
    let { assetId, author } = scrapeCurrentAuthor();
    if (assetId && author) {
      authorCache.set(String(assetId), author);
    }
    collected++;
    sendProgressToPopup(collected, targetCount, assetId, author);

    // Loop through remaining items
    for (let step = 1; step < targetCount; step++) {
      if (cancelNavigation) break;

      const previousId = assetId;

      // Stealth jitter delay
      await sleep(getStealthDelay(step));

      if (cancelNavigation) break;

      // 1. Dispatch keyboard ArrowRight on window & document
      const keyEvt = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        code: 'ArrowRight',
        keyCode: 39,
        which: 39,
        bubbles: true,
        cancelable: true,
        composed: true,
      });
      window.dispatchEvent(keyEvt);
      document.dispatchEvent(keyEvt);

      // 2. Also fallback click next button if available
      const nextBtn = document.querySelector('button.js-details-next-button');
      if (nextBtn) {
        try {
          nextBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        } catch {}
      }

      // 3. Wait for content to change
      const newId = await waitForContentIdChange(previousId);
      assetId = newId || previousId;

      // 4. Scroll matching grid item into view
      if (assetId) {
        const matchingCell = document.querySelector(`.search-result-cell[data-content-id="${assetId}"]`);
        if (matchingCell) {
          matchingCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }

      // 5. Scrape author
      await sleep(150);
      const scraped = scrapeCurrentAuthor();
      author = scraped.author;
      if (scraped.assetId && author) {
        assetId = scraped.assetId;
        authorCache.set(String(assetId), author);
      }

      collected++;
      sendProgressToPopup(collected, targetCount, assetId, author);
    }

    // Close detail panel when done
    await sleep(300);
    const closeBtn = document.querySelector('button.js-details-close-button');
    if (closeBtn) {
      closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      try {
        closeBtn.click();
      } catch {}
    }
  } catch (err) {
    // Graceful error recovery
  }

  isNavigating = false;
  sendCompleteToPopup(collected, targetCount);
}

// Highlight matching contributor or asset IDs
function highlightElements(highlightName, targetAssetIds = []) {
  if (!highlightName && targetAssetIds.length === 0) return;
  const nameLower = (highlightName || '').toLowerCase();
  const idSet = new Set(targetAssetIds.map(String));

  document.querySelectorAll('.search-result-cell, [data-content-id]').forEach((cell) => {
    const assetId = cell.getAttribute('data-content-id');
    const authorEl = cell.querySelector('.author-name, .contributor-name');
    const author = (authorEl?.textContent || '').toLowerCase();

    const isMatch = idSet.has(assetId) || (nameLower && author && author.includes(nameLower));

    if (isMatch) {
      cell.style.outline = '3px solid #10b981';
      cell.style.outlineOffset = '-2px';
      cell.style.borderRadius = '8px';

      let badge = cell.querySelector('.stock-serp-my-badge');
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'stock-serp-my-badge';
        badge.style.cssText =
          'position:absolute; top:8px; left:8px; background:#10b981; color:#fff; font-size:11px; font-weight:700; padding:2px 6px; border-radius:4px; z-index:99; pointer-events:none; box-shadow:0 2px 4px rgba(0,0,0,0.3);';
        badge.textContent = '★ Match';
        cell.style.position = 'relative';
        cell.appendChild(badge);
      }
    }
  });
}

// Observe DOM mutations
const observer = new MutationObserver(() => {
  scrapeActiveDetailsPanel();
});
observer.observe(document.body, { childList: true, subtree: true });

// Listen for messages from popup
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_SERP_DATA') {
      const data = extractSerpItems();
      sendResponse(data);
    } else if (request.action === 'START_NATIVE_NAVIGATION') {
      const { targetCount } = request;
      startNativeNavigation(targetCount || 10);
      sendResponse({ started: true });
    } else if (request.action === 'CANCEL_NAVIGATION') {
      cancelNavigation = true;
      sendResponse({ cancelled: true });
    } else if (request.action === 'GET_AUTHOR_CACHE') {
      const cache = {};
      authorCache.forEach((v, k) => {
        cache[k] = v;
      });
      sendResponse({ cache, isNavigating, progress: currentProgress });
    } else if (request.action === 'HIGHLIGHT_ITEMS') {
      highlightElements(request.highlightName, request.targetAssetIds || []);
      sendResponse({ success: true });
    }
    return true;
  });
}
