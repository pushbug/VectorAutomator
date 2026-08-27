// Adobe Stock Sales Extractor - Content Script
// Scrapes Insights / Statistics Top Sellers table and date picker in real time

function extractSalesData() {
  const isInsightsPage = Boolean(
    document.querySelector('div[data-t="insights-my-statistics-page"]') ||
    document.querySelector('table[data-t="insights-top-sellers-table"]')
  );

  if (!isInsightsPage) {
    return {
      isInsightsPage: false,
      dateStr: '',
      totalItems: 0,
      items: [],
      error: 'Not on Adobe Contributor Insights/Statistics page',
    };
  }

  // 1. Extract Period Date
  let dateStr = '';
  // Try hidden input inside start-date
  const hiddenDateInput = document.querySelector('span[data-testid="start-date"] input[type="hidden"]');
  if (hiddenDateInput && hiddenDateInput.value) {
    dateStr = hiddenDateInput.value.trim();
  }

  // Fallback to date segments: month, day, year
  if (!dateStr) {
    const startDateEl = document.querySelector('span[data-testid="start-date"]');
    if (startDateEl) {
      const mEl = startDateEl.querySelector('[data-testid="month"]');
      const dEl = startDateEl.querySelector('[data-testid="day"]');
      const yEl = startDateEl.querySelector('[data-testid="year"]');
      if (mEl && dEl && yEl) {
        const m = mEl.textContent.trim().padStart(2, '0');
        const d = dEl.textContent.trim().padStart(2, '0');
        const y = yEl.textContent.trim();
        if (y && m && d) {
          dateStr = `${y}-${m}-${d}`;
        }
      }
    }
  }

  // Fallback to today if not detected
  if (!dateStr) {
    dateStr = new Date().toISOString().split('T')[0];
  }

  // 2. Extract Summary Legends (if available)
  let chartEarnings = '';
  let chartDownloads = '';
  const legendsEl = document.querySelector('[data-t="chart-legends"]');
  if (legendsEl) {
    const text = legendsEl.textContent || '';
    const earningsMatch = text.match(/Earnings:\s*\$?([\d,]+\.?\d*)/i);
    const downloadsMatch = text.match(/Downloads:\s*([\d,]+)/i);
    if (earningsMatch) chartEarnings = earningsMatch[1];
    if (downloadsMatch) chartDownloads = downloadsMatch[1];
  }

  // 3. Extract Table Rows
  const rowEls = document.querySelectorAll('tr[data-t="insights-top-sellers-table-row"]');
  const items = [];
  const seenIds = new Set();

  rowEls.forEach((tr) => {
    // Asset ID
    let assetId = '';
    const idAnchor = tr.querySelector('a[data-t="insights-top-sellers-table-row-file-id"]');
    if (idAnchor) {
      assetId = idAnchor.textContent.trim();
    }
    if (!assetId) {
      const anyAnchor = tr.querySelector('a[href*="/id/"]');
      if (anyAnchor) {
        const m = anyAnchor.href.match(/\/id\/(\d+)/);
        if (m) assetId = m[1];
      }
    }

    if (!assetId || seenIds.has(assetId)) return;
    seenIds.add(assetId);

    // Asset Type
    const typeEl = tr.querySelector('[data-t="insights-top-sellers-table-row-asset-type"]');
    const assetType = typeEl ? typeEl.textContent.trim() : 'Vectors';

    // Upload Date (column 4)
    const tdCells = tr.querySelectorAll('td');
    let uploadDate = '';
    if (tdCells.length >= 4) {
      uploadDate = tdCells[3].textContent.trim();
    }

    // Royalty / Earnings (column 5)
    let royalty = '$0.00';
    const royaltyEl = tr.querySelector('[data-t="insights-top-sellers-table-row-royalty"]');
    if (royaltyEl) {
      royalty = royaltyEl.textContent.trim();
    } else if (tdCells.length >= 5) {
      royalty = tdCells[4].textContent.trim();
    }

    // Thumbnail URL
    const imgEl = tr.querySelector('img');
    const thumbnailUrl = imgEl ? imgEl.src : '';

    items.push({
      assetId,
      assetType,
      uploadDate,
      royalty,
      thumbnailUrl,
    });
  });

  return {
    isInsightsPage: true,
    dateStr,
    totalItems: items.length,
    items,
    chartEarnings,
    chartDownloads,
    url: window.location.href,
  };
}

function formatClipboardTsv(salesData) {
  const dateHeader = `Date: ${salesData.dateStr}`;
  const tsvHeader = ['Thumb', 'Id', 'Type', 'Upload date', 'Earnings'].join('\t');
  const rows = (salesData.items || []).map((item) => {
    return ['', item.assetId, item.assetType, item.uploadDate, item.royalty].join('\t');
  });

  return [dateHeader, tsvHeader, ...rows].join('\n');
}

function showInPageToast(message) {
  let toast = document.getElementById('va-sales-extractor-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'va-sales-extractor-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      background: #18181b;
      color: #ffffff;
      padding: 12px 18px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      gap: 10px;
      transform: translateY(20px);
      opacity: 0;
      transition: all 0.25s ease-out;
      pointer-events: none;
    `;
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<span style="color:#38bdf8;">⚡</span> ${message}`;
  requestAnimationFrame(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  });

  setTimeout(() => {
    toast.style.transform = 'translateY(20px)';
    toast.style.opacity = '0';
  }, 2600);
}

function updateFloatingButton(pulse = false) {
  const isInsightsPage = document.querySelector('div[data-t="insights-my-statistics-page"]');
  const btnContainer = document.getElementById('va-sales-copy-btn-container');

  if (!isInsightsPage) {
    if (btnContainer) btnContainer.style.display = 'none';
    return;
  }

  if (btnContainer) {
    btnContainer.style.display = 'block';
  } else {
    injectFloatingButton();
    return;
  }

  const btn = document.getElementById('va-sales-copy-btn');
  if (!btn) return;

  const data = extractSalesData();
  const btnText = btn.querySelector('.va-btn-text');
  if (btnText) {
    btnText.textContent = `Copy Sales (${data.dateStr || 'Daily'}) [${data.totalItems}]`;
  }
  btn.style.opacity = '1';
  btn.disabled = false;

  if (pulse) {
    btn.style.transform = 'scale(1.05)';
    btn.style.borderColor = '#60a5fa';
    btn.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.8)';
    setTimeout(() => {
      btn.style.transform = 'none';
      btn.style.borderColor = '#3b82f6';
      btn.style.boxShadow = '0 4px 14px 0 rgba(37, 99, 235, 0.39)';
    }, 700);
  }
}

// Injects the floating button cleanly (without recursive MutationObserver)
function injectFloatingButton() {
  const isInsightsPage = document.querySelector('div[data-t="insights-my-statistics-page"]');
  if (!isInsightsPage) return;

  if (document.getElementById('va-sales-copy-btn-container')) {
    updateFloatingButton();
    return;
  }

  const data = extractSalesData();

  const btnContainer = document.createElement('div');
  btnContainer.id = 'va-sales-copy-btn-container';
  btnContainer.style.cssText = `
    position: fixed;
    bottom: 28px;
    left: 28px;
    z-index: 99999;
  `;

  const btn = document.createElement('button');
  btn.id = 'va-sales-copy-btn';
  btn.type = 'button';
  btn.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #0f172a;
    color: #f8fafc;
    border: 1px solid #3b82f6;
    box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.39);
    padding: 10px 16px;
    border-radius: 9999px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  `;

  btn.innerHTML = `
    <span style="color:#60a5fa;">⚡</span>
    <span class="va-btn-text">Copy Sales (${data.dateStr || 'Daily'}) [${data.totalItems}]</span>
  `;

  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'translateY(-2px) scale(1.02)';
    btn.style.boxShadow = '0 6px 20px 0 rgba(37, 99, 235, 0.5)';
  });

  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'none';
    btn.style.boxShadow = '0 4px 14px 0 rgba(37, 99, 235, 0.39)';
  });

  btn.addEventListener('click', async () => {
    const currentData = extractSalesData();
    if (!currentData.items || currentData.items.length === 0) {
      showInPageToast('No sales items found on this page.');
      return;
    }

    const tsv = formatClipboardTsv(currentData);
    await navigator.clipboard.writeText(tsv);

    const originalText = btn.querySelector('.va-btn-text').textContent;
    btn.querySelector('.va-btn-text').textContent = '✓ Copied to Clipboard!';
    showInPageToast(`Copied ${currentData.totalItems} sales items for ${currentData.dateStr}!`);

    setTimeout(() => {
      if (btn && btn.querySelector('.va-btn-text')) {
        btn.querySelector('.va-btn-text').textContent = originalText;
      }
    }, 2000);
  });

  btnContainer.appendChild(btn);
  document.body.appendChild(btnContainer);
}

// Hook into Adobe's "Display statistics" button to capture updates seamlessly
function hookDisplayStatsCta() {
  const ctaBtn = document.querySelector('button[data-t="insights-sidebar-cta"]');
  if (!ctaBtn || ctaBtn.dataset.vaHooked === 'true') return;
  ctaBtn.dataset.vaHooked = 'true';

  ctaBtn.addEventListener('click', () => {
    const copyBtn = document.getElementById('va-sales-copy-btn');
    if (copyBtn) {
      const btnText = copyBtn.querySelector('.va-btn-text');
      if (btnText) btnText.textContent = 'Loading statistics...';
      copyBtn.style.opacity = '0.7';
    }

    // Poll until Adobe's loading spinner finishes
    let pollCount = 0;
    const maxPolls = 40; // 20 seconds max
    const interval = setInterval(() => {
      pollCount++;
      const spinner = document.querySelector('div[data-t="content-spinner-wrapper"]');
      const isSpinning = spinner && spinner.style.display !== 'none' && window.getComputedStyle(spinner).display !== 'none';

      if (!isSpinning || pollCount >= maxPolls) {
        clearInterval(interval);
        setTimeout(() => {
          updateFloatingButton(true);
        }, 400);
      }
    }, 500);
  });
}

// Periodic check (runs gently every 2s, using 0% CPU, safe from infinite loops)
function initCycle() {
  injectFloatingButton();
  hookDisplayStatsCta();
}

setInterval(initCycle, 2000);
initCycle();

// Runtime message listener for popup communication
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_SALES_DATA') {
      const data = extractSalesData();
      sendResponse(data);
    } else if (request.action === 'COPY_SALES_DATA') {
      const data = extractSalesData();
      const tsv = formatClipboardTsv(data);
      navigator.clipboard.writeText(tsv).then(() => {
        sendResponse({ success: true, count: data.totalItems, dateStr: data.dateStr });
      });
      return true;
    }
    return true;
  });
}
