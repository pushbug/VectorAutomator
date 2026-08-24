// Stock SERP Copier - Ultra-Modern Controller with Virtual Native Navigator

let currentSerpData = null;
let selectedDepth = 'none'; // 'none' | 'top10' | 'top20' | 'all'
let isFetching = false;
let includeUrls = false; // Default: OFF (clean export)
let pollTimer = null;

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2200);
  }
}

function updateAuthorCountDisplay() {
  if (!currentSerpData || !currentSerpData.items) return;
  const total = currentSerpData.items.length;
  const withAuthor = currentSerpData.items.filter((i) => Boolean(i.author)).length;
  const pill = document.getElementById('author-status-pill');
  if (pill) {
    pill.textContent = `${withAuthor}/${total} Authors`;
    if (withAuthor > 0) {
      pill.style.color = '#38bdf8';
    }
  }
}

// ─── Dynamic Column Formatters ───────────────────────────────────────────────

function formatTsv(data) {
  const headerCols = ['Keyword', 'Page', 'Rank', 'Asset ID', 'Author', 'Title'];
  if (includeUrls) headerCols.push('Thumbnail', 'Detail URL');
  const header = headerCols.join('\t');

  const rows = (data.items || []).map((item) => {
    const cols = [
      item.keyword || data.keyword,
      item.page || data.pageNumber,
      item.rank,
      item.assetId,
      (item.author || '').replace(/\t|\r?\n/g, ' '),
      (item.title || '').replace(/\t|\r?\n/g, ' '),
    ];
    if (includeUrls) {
      cols.push(item.thumbnailUrl || '', item.detailUrl || '');
    }
    return cols.join('\t');
  });
  return [header, ...rows].join('\n');
}

function formatCsv(data) {
  const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
  const headerCols = ['Keyword', 'Page', 'Rank', 'Asset ID', 'Author', 'Title'];
  if (includeUrls) headerCols.push('Thumbnail', 'Detail URL');
  const header = headerCols.map(escapeCsv).join(',');

  const rows = (data.items || []).map((item) => {
    const cols = [
      item.keyword || data.keyword,
      item.page || data.pageNumber,
      item.rank,
      item.assetId,
      item.author || '',
      item.title || '',
    ];
    if (includeUrls) {
      cols.push(item.thumbnailUrl || '', item.detailUrl || '');
    }
    return cols.map(escapeCsv).join(',');
  });
  return '\uFEFF' + [header, ...rows].join('\n');
}

function downloadCsv(data) {
  const csvContent = formatCsv(data);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeKeyword = (data.keyword || 'serp').replace(/[^a-zA-Z0-9_\u0E00-\u0E7F]/g, '_');
  a.href = url;
  a.download = `stock_serp_${safeKeyword}_p${data.pageNumber || 1}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Navigation Progress Handling ────────────────────────────────────────────

function showProgress(current, total, author) {
  const progressContainer = document.getElementById('progress-container');
  const progressStatusText = document.getElementById('progress-status-text');
  const progressFill = document.getElementById('progress-fill');
  const fetchActionRow = document.getElementById('fetch-action-row');

  fetchActionRow?.classList.add('hidden');
  progressContainer?.classList.remove('hidden');

  const safeTotal = total || 10;
  const percent = Math.min(100, Math.round((current / safeTotal) * 100));
  if (progressFill) progressFill.style.width = `${percent}%`;
  if (progressStatusText) {
    progressStatusText.textContent = author
      ? `[${current}/${safeTotal}] by ${author}`
      : `[${current}/${safeTotal}] Navigating...`;
  }
}

function hideProgress() {
  const progressContainer = document.getElementById('progress-container');
  const fetchActionRow = document.getElementById('fetch-action-row');
  progressContainer?.classList.add('hidden');
  if (selectedDepth !== 'none') {
    fetchActionRow?.classList.remove('hidden');
  }
  isFetching = false;
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

// ─── Sync Author Cache from Content Script ───────────────────────────────────

function syncAuthorsFromCache(tabId) {
  chrome.tabs.sendMessage(tabId, { action: 'GET_AUTHOR_CACHE' }, (response) => {
    if (chrome.runtime.lastError || !response) return;
    const cache = response.cache || {};
    if (currentSerpData && currentSerpData.items) {
      for (const item of currentSerpData.items) {
        if (!item.author && cache[item.assetId]) {
          item.author = cache[item.assetId];
        }
      }
      updateAuthorCountDisplay();
    }

    if (response.isNavigating && response.progress) {
      isFetching = true;
      showProgress(response.progress.current, response.progress.total, response.progress.author);
    } else if (!response.isNavigating && isFetching) {
      hideProgress();
    }
  });
}

function startPollingSync(tabId) {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    if (!activeTabIdGlobal) return;
    syncAuthorsFromCache(activeTabIdGlobal);
  }, 400);
}

let activeTabIdGlobal = null;

// ─── Main Init ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const queryDisplay = document.getElementById('query-display');
  const pagePill = document.getElementById('page-pill');
  const countPill = document.getElementById('count-pill');
  const copyTsvBtn = document.getElementById('copy-tsv-btn');
  const downloadCsvBtn = document.getElementById('download-csv-btn');
  const copyJsonBtn = document.getElementById('copy-json-btn');
  const contributorInput = document.getElementById('contributor-input');
  const saveHighlightBtn = document.getElementById('save-highlight-btn');
  const toggleUrlsCheckbox = document.getElementById('toggle-urls');

  const depthButtons = document.querySelectorAll('.depth-btn');
  const fetchActionRow = document.getElementById('fetch-action-row');
  const fetchAuthorsBtn = document.getElementById('fetch-authors-btn');
  const fetchBtnLabel = document.getElementById('fetch-btn-label');
  const cancelFetchBtn = document.getElementById('cancel-fetch-btn');

  // Load saved settings
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['highlightContributor', 'serp_include_urls'], (res) => {
      if (res.highlightContributor && contributorInput) {
        contributorInput.value = res.highlightContributor;
      }
      if (res.serp_include_urls === true && toggleUrlsCheckbox) {
        toggleUrlsCheckbox.checked = true;
        includeUrls = true;
      }
    });
  }

  // Toggle URLs checkbox
  toggleUrlsCheckbox?.addEventListener('change', () => {
    includeUrls = toggleUrlsCheckbox.checked;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ serp_include_urls: includeUrls });
    }
  });

  // Segmented depth controls
  depthButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (isFetching) return;
      depthButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      selectedDepth = btn.getAttribute('data-depth') || 'none';

      if (selectedDepth === 'none') {
        fetchActionRow?.classList.add('hidden');
      } else {
        fetchActionRow?.classList.remove('hidden');
        if (selectedDepth === 'top10') {
          if (fetchBtnLabel) fetchBtnLabel.textContent = '⚡ Fetch Top 10 Authors (Jitter ~7s)';
        } else if (selectedDepth === 'top20') {
          if (fetchBtnLabel) fetchBtnLabel.textContent = '⚡ Fetch Top 20 Authors (Jitter ~15s)';
        } else if (selectedDepth === 'all') {
          if (fetchBtnLabel) fetchBtnLabel.textContent = '⚡ Fetch All 100 Authors (Jitter ~60s)';
        }
      }
    });
  });

  // Cancel button
  cancelFetchBtn?.addEventListener('click', () => {
    if (activeTabIdGlobal) {
      chrome.tabs.sendMessage(activeTabIdGlobal, { action: 'CANCEL_NAVIGATION' });
    }
    hideProgress();
    showToast('Stopped!');
  });

  // Fetch Authors button — sends START_NATIVE_NAVIGATION to content script
  fetchAuthorsBtn?.addEventListener('click', () => {
    if (isFetching || !activeTabIdGlobal) return;
    isFetching = true;

    let targetCount = 10;
    if (selectedDepth === 'top20') targetCount = 20;
    if (selectedDepth === 'all') targetCount = (currentSerpData?.items || []).length;

    showProgress(0, targetCount, '');
    startPollingSync(activeTabIdGlobal);

    chrome.tabs.sendMessage(activeTabIdGlobal, {
      action: 'START_NATIVE_NAVIGATION',
      targetCount,
    });
  });

  // Listen for progress & completion from content script
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.action === 'NAVIGATION_PROGRESS') {
        showProgress(msg.current, msg.total, msg.author);

        // Update author in local SERP data
        if (currentSerpData && currentSerpData.items && msg.assetId && msg.author) {
          const item = currentSerpData.items.find((i) => i.assetId === msg.assetId);
          if (item) {
            item.author = msg.author;
          }
          updateAuthorCountDisplay();
        }
      } else if (msg.action === 'NAVIGATION_COMPLETE') {
        hideProgress();
        showToast(`Done! ${msg.collected}/${msg.total} authors collected`);

        // Final sync
        if (activeTabIdGlobal) {
          syncAuthorsFromCache(activeTabIdGlobal);
        }
      }
    });
  }

  // Fetch active tab SERP data
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) {
        if (queryDisplay) queryDisplay.textContent = 'Please open Adobe Stock';
        return;
      }

      activeTabIdGlobal = activeTab.id;

      if (!activeTab.url || !activeTab.url.includes('stock.adobe.com')) {
        if (queryDisplay) queryDisplay.textContent = 'Open stock.adobe.com search';
        return;
      }

      chrome.tabs.sendMessage(activeTab.id, { action: 'GET_SERP_DATA' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          if (queryDisplay) queryDisplay.textContent = 'Refresh page & retry';
          return;
        }

        currentSerpData = response;
        if (queryDisplay) queryDisplay.textContent = response.keyword || 'Search Results';
        if (pagePill) pagePill.textContent = `Page ${response.pageNumber || 1}`;
        if (countPill) countPill.textContent = `${response.totalItems || 0} Assets`;
        updateAuthorCountDisplay();

        // Re-sync any previously cached authors
        syncAuthorsFromCache(activeTab.id);
      });
    });
  }

  // Copy TSV
  copyTsvBtn?.addEventListener('click', async () => {
    if (!currentSerpData || !currentSerpData.items || currentSerpData.items.length === 0) {
      showToast('No search data to copy');
      return;
    }
    const tsv = formatTsv(currentSerpData);
    await navigator.clipboard.writeText(tsv);
    showToast(`Copied ${currentSerpData.totalItems} items (TSV)!`);
  });

  // Download CSV
  downloadCsvBtn?.addEventListener('click', () => {
    if (!currentSerpData || !currentSerpData.items || currentSerpData.items.length === 0) {
      showToast('No search data to export');
      return;
    }
    downloadCsv(currentSerpData);
    showToast('Downloaded CSV!');
  });

  // Copy JSON
  copyJsonBtn?.addEventListener('click', async () => {
    if (!currentSerpData || !currentSerpData.items || currentSerpData.items.length === 0) {
      showToast('No search data to copy');
      return;
    }
    await navigator.clipboard.writeText(JSON.stringify(currentSerpData, null, 2));
    showToast('Copied JSON!');
  });

  // Save Highlight
  saveHighlightBtn?.addEventListener('click', () => {
    const val = (contributorInput?.value || '').trim();
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ highlightContributor: val }, () => {
        showToast('Saved setting!');
        if (activeTabIdGlobal) {
          chrome.tabs.sendMessage(activeTabIdGlobal, { action: 'HIGHLIGHT_ITEMS', highlightName: val });
        }
      });
    }
  });
});
