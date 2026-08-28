// Adobe Stock Sales Extractor - Content Script
// 100% Passive Client-Side DOM Scraper (Zero Network Requests, Zero Bot Footprint)

let isExtracting = false;
let activePollTimer = null;

function isAutoCopyEnabled() {
  try {
    const val = localStorage.getItem('va_sales_autocopy_enabled');
    return val === null ? true : val === 'true';
  } catch (e) {
    return true;
  }
}

function setAutoCopyEnabled(enabled) {
  try {
    localStorage.setItem('va_sales_autocopy_enabled', String(enabled));
  } catch (e) {}
  updateToggleUi();
}

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
  const dateHeader = `Date: ${salesData.dateStr || ''}`;
  const tsvHeader = ['Thumb', 'Id', 'Type', 'Upload date', 'Earnings'].join('\t');
  const rows = (salesData.items || []).map((item) => {
    return ['', item.assetId, item.assetType || 'Vectors', item.uploadDate || '', item.royalty || '$0.00'].join('\t');
  });

  return [dateHeader, tsvHeader, ...rows].join('\n');
}

// 100% Reliable in-viewport clipboard copy for macOS/Chrome
async function copyToClipboardSafe(text) {
  if (!text) return false;

  // Primary: Navigator Clipboard API
  if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('[SalesExtractor] navigator.clipboard failed, attempting in-viewport textarea fallback:', err);
    }
  }

  // Fallback: In-viewport non-readonly transparent textarea
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 20px;
      height: 20px;
      padding: 0;
      border: none;
      outline: none;
      box-shadow: none;
      background: transparent;
      opacity: 0.01;
      pointer-events: none;
      z-index: -999;
    `;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return Boolean(success);
  } catch (err) {
    console.error('[SalesExtractor] Fallback execCommand copy failed:', err);
    return false;
  }
}

function showInPageToast(message, type = 'success') {
  let toast = document.getElementById('va-sales-extractor-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'va-sales-extractor-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      background: #0f172a;
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
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: none;
    `;
    document.body.appendChild(toast);
  }

  const icon = type === 'success' ? '⚡' : type === 'info' ? 'ℹ️' : '⚠️';
  const iconColor = type === 'success' ? '#10b981' : '#38bdf8';
  toast.innerHTML = `<span style="color:${iconColor};font-weight:bold;">${icon}</span> <span>${message}</span>`;
  
  requestAnimationFrame(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  });

  if (window.vaToastTimeout) clearTimeout(window.vaToastTimeout);
  window.vaToastTimeout = setTimeout(() => {
    toast.style.transform = 'translateY(20px)';
    toast.style.opacity = '0';
  }, 3200);
}

function updateToggleUi() {
  const toggleBtn = document.getElementById('va-sales-autocopy-toggle');
  if (!toggleBtn) return;

  const enabled = isAutoCopyEnabled();
  const dot = toggleBtn.querySelector('.va-toggle-dot');
  const text = toggleBtn.querySelector('.va-toggle-text');

  if (enabled) {
    toggleBtn.style.background = 'rgba(16, 185, 129, 0.16)';
    toggleBtn.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    toggleBtn.style.color = '#34d399';
    if (dot) dot.style.background = '#10b981';
    if (text) text.textContent = 'Auto: ON';
    toggleBtn.title = 'Auto-Copy is ON (Click to turn OFF)';
  } else {
    toggleBtn.style.background = 'rgba(148, 163, 184, 0.1)';
    toggleBtn.style.borderColor = 'rgba(148, 163, 184, 0.25)';
    toggleBtn.style.color = '#94a3b8';
    if (dot) dot.style.background = '#64748b';
    if (text) text.textContent = 'Auto: OFF';
    toggleBtn.title = 'Auto-Copy is OFF (Click to turn ON)';
  }
}

// Updates floating button with distinct UI states: 'normal' | 'loading' | 'auto_copied' | 'manual_copied'
function updateFloatingButton(state = 'normal') {
  const isInsightsPage = document.querySelector('div[data-t="insights-my-statistics-page"]');
  const btnContainer = document.getElementById('va-sales-copy-btn-container');

  if (!isInsightsPage) {
    if (btnContainer) btnContainer.style.display = 'none';
    return;
  }

  if (btnContainer) {
    btnContainer.style.display = 'flex';
  } else {
    injectFloatingButton();
    return;
  }

  const btn = document.getElementById('va-sales-copy-btn');
  if (!btn) return;

  // If currently extracting and a periodic poll calls normal, do not overwrite loading state
  if (isExtracting && state === 'normal') return;

  const data = extractSalesData();
  const iconEl = btn.querySelector('.va-icon');
  const btnText = btn.querySelector('.va-btn-text');

  if (state === 'loading') {
    if (iconEl) iconEl.textContent = '⏳';
    if (btnText) btnText.textContent = `Extracting (${data.dateStr || '...'})`;
    btn.style.borderColor = '#f59e0b';
    btn.style.boxShadow = '0 0 14px rgba(245, 158, 11, 0.4)';
    btn.style.opacity = '0.85';
    return;
  }

  if (state === 'auto_copied') {
    btn.dataset.locked = 'true';
    if (iconEl) iconEl.textContent = '✓';
    if (btnText) btnText.textContent = `Auto-Copied (${data.dateStr || 'Daily'}) [${data.totalItems}]`;
    btn.style.borderColor = '#10b981';
    btn.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.7)';
    btn.style.transform = 'scale(1.03)';
    btn.style.opacity = '1';

    setTimeout(() => {
      btn.style.transform = 'none';
      btn.style.boxShadow = '0 4px 14px 0 rgba(16, 185, 129, 0.4)';
    }, 1000);

    setTimeout(() => {
      btn.dataset.locked = 'false';
      if (btn && btn.querySelector('.va-btn-text') && btn.dataset.state !== 'manual_copied') {
        if (iconEl) iconEl.textContent = '⚡';
        btn.querySelector('.va-btn-text').textContent = `Copy Sales (${data.dateStr || 'Daily'}) [${data.totalItems}]`;
        btn.style.borderColor = '#3b82f6';
        btn.style.boxShadow = '0 4px 14px 0 rgba(37, 99, 235, 0.39)';
      }
    }, 4000);
    return;
  }

  if (state === 'manual_copied') {
    btn.dataset.state = 'manual_copied';
    if (iconEl) iconEl.textContent = '✓';
    if (btnText) btnText.textContent = 'Copied to Clipboard!';
    btn.style.borderColor = '#10b981';
    btn.style.boxShadow = '0 0 18px rgba(16, 185, 129, 0.6)';
    btn.style.transform = 'scale(1.03)';
    btn.style.opacity = '1';

    setTimeout(() => {
      btn.style.transform = 'none';
    }, 300);

    setTimeout(() => {
      btn.dataset.state = 'normal';
      if (btn && btn.querySelector('.va-btn-text')) {
        if (iconEl) iconEl.textContent = '⚡';
        btn.querySelector('.va-btn-text').textContent = `Copy Sales (${data.dateStr || 'Daily'}) [${data.totalItems}]`;
        btn.style.borderColor = '#3b82f6';
        btn.style.boxShadow = '0 4px 14px 0 rgba(37, 99, 235, 0.39)';
      }
    }, 2200);
    return;
  }

  // Normal state
  if (btn.dataset.locked === 'true' || btn.dataset.state === 'manual_copied') return;

  if (iconEl) iconEl.textContent = '⚡';
  if (btnText) {
    btnText.textContent = `Copy Sales (${data.dateStr || 'Daily'}) [${data.totalItems}]`;
  }
  btn.style.borderColor = '#3b82f6';
  btn.style.boxShadow = '0 4px 14px 0 rgba(37, 99, 235, 0.39)';
  btn.style.opacity = '1';
}

// Injects the floating control bar (Button + Auto-Copy Toggle Switch)
function injectFloatingButton() {
  const isInsightsPage = document.querySelector('div[data-t="insights-my-statistics-page"]');
  if (!isInsightsPage) return;

  if (document.getElementById('va-sales-copy-btn-container')) {
    updateFloatingButton('normal');
    updateToggleUi();
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
    display: flex;
    align-items: center;
    gap: 8px;
  `;

  // 1. Main Action Button (Single Decoupled Icon)
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
    user-select: none;
  `;

  btn.innerHTML = `
    <span class="va-icon" style="color:#60a5fa;">⚡</span>
    <span class="va-btn-text">Copy Sales (${data.dateStr || 'Daily'}) [${data.totalItems}]</span>
  `;

  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'translateY(-2px) scale(1.02)';
  });

  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'none';
  });

  // 100% Guaranteed Manual Click Copy Handler
  btn.addEventListener('click', async () => {
    const currentData = extractSalesData();
    if (!currentData.items || currentData.items.length === 0) {
      showInPageToast(`No sales items found for ${currentData.dateStr || 'selected period'}.`, 'info');
      return;
    }

    const tsv = formatClipboardTsv(currentData);
    const copied = await copyToClipboardSafe(tsv);

    if (copied) {
      updateFloatingButton('manual_copied');
      showInPageToast(`Copied ${currentData.totalItems} sales items for ${currentData.dateStr}!`, 'success');
    } else {
      showInPageToast('Could not access clipboard. Please check browser permissions.', 'warning');
    }
  });

  // 2. Persistent Auto-Copy Toggle Switch (ON / OFF)
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'va-sales-autocopy-toggle';
  toggleBtn.type = 'button';
  toggleBtn.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 9999px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.2s ease;
    user-select: none;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  `;

  toggleBtn.innerHTML = `
    <span class="va-toggle-dot" style="width: 7px; height: 7px; border-radius: 9999px; display: inline-block;"></span>
    <span class="va-toggle-text">Auto: ON</span>
  `;

  toggleBtn.addEventListener('click', () => {
    const nextState = !isAutoCopyEnabled();
    setAutoCopyEnabled(nextState);
    showInPageToast(
      nextState ? 'Auto-Copy enabled (will copy on Display statistics)' : 'Auto-Copy disabled (use manual Copy button)',
      'info'
    );
  });

  btnContainer.appendChild(btn);
  btnContainer.appendChild(toggleBtn);
  document.body.appendChild(btnContainer);

  updateToggleUi();
}

// Hook into Adobe's "Display statistics" button to capture updates seamlessly
function hookDisplayStatsCta() {
  const ctaBtn = document.querySelector('button[data-t="insights-sidebar-cta"]');
  if (!ctaBtn || ctaBtn.dataset.vaHooked === 'true') return;
  ctaBtn.dataset.vaHooked = 'true';

  ctaBtn.addEventListener('click', () => {
    if (activePollTimer) {
      clearInterval(activePollTimer);
      activePollTimer = null;
    }

    const autoEnabled = isAutoCopyEnabled();
    if (autoEnabled) {
      updateFloatingButton('loading');
    }
    isExtracting = true;

    // Initial 400ms stabilization delay before polling spinner disappearance
    setTimeout(() => {
      let pollCount = 0;
      const maxPolls = 20; // 10s max timeout (500ms * 20)
      activePollTimer = setInterval(async () => {
        pollCount++;
        const spinner = document.querySelector('div[data-t="content-spinner-wrapper"]');
        const isSpinning = Boolean(spinner && spinner.style.display !== 'none' && window.getComputedStyle(spinner).display !== 'none');

        if (!isSpinning || pollCount >= maxPolls) {
          clearInterval(activePollTimer);
          activePollTimer = null;

          // Wait 300ms for DOM table render stabilization
          setTimeout(async () => {
            isExtracting = false;
            const data = extractSalesData();

            if (autoEnabled) {
              if (data.items && data.items.length > 0) {
                const tsv = formatClipboardTsv(data);
                const copied = await copyToClipboardSafe(tsv);
                if (copied) {
                  updateFloatingButton('auto_copied');
                  showInPageToast(`Auto-copied ${data.totalItems} sales items (${data.dateStr})! Ready to paste in VectorAutomator`, 'success');
                } else {
                  updateFloatingButton('normal');
                  showInPageToast(`Extracted ${data.totalItems} items (${data.dateStr}). Click button to copy.`, 'info');
                }
              } else {
                updateFloatingButton('normal');
                showInPageToast(`No sales records found for ${data.dateStr}`, 'info');
              }
            } else {
              // Auto-Copy is OFF: only passively update item counts on button
              updateFloatingButton('normal');
              showInPageToast(`Updated statistics: ${data.totalItems} items (${data.dateStr}). Ready to copy.`, 'info');
            }
          }, 300);
        }
      }, 500);
    }, 400);
  });
}

// Periodic check (runs gently every 2s, 100% passive, 0 network requests)
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
      copyToClipboardSafe(tsv).then((success) => {
        sendResponse({ success, count: data.totalItems, dateStr: data.dateStr });
      });
      return true;
    }
    return true;
  });
}
