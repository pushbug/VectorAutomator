// Adobe Stock Sales Extractor - Popup Controller

let currentSalesData = null;

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

function formatClipboardTsv(salesData) {
  const dateHeader = `Date: ${salesData.dateStr || ''}`;
  const tsvHeader = ['Thumb', 'Id', 'Type', 'Upload date', 'Earnings'].join('\t');
  const rows = (salesData.items || []).map((item) => {
    return ['', item.assetId, item.assetType || 'Vectors', item.uploadDate || '', item.royalty || '$0.00'].join('\t');
  });

  return [dateHeader, tsvHeader, ...rows].join('\n');
}

async function copyToClipboardSafe(text) {
  if (!text) return false;
  if (
    navigator &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function' &&
    typeof document !== 'undefined' &&
    document.hasFocus &&
    document.hasFocus()
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback silently without emitting console.warn
    }
  }

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
  } catch {
    return false;
  }
}

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
  updatePopupToggleUi();
}

function updatePopupToggleUi() {
  const toggleBtn = document.getElementById('popup-autocopy-toggle');
  if (!toggleBtn) return;
  const enabled = isAutoCopyEnabled();
  if (enabled) {
    toggleBtn.textContent = 'Auto: ON';
    toggleBtn.style.background = 'rgba(16, 185, 129, 0.15)';
    toggleBtn.style.borderColor = 'rgba(16, 185, 129, 0.35)';
    toggleBtn.style.color = '#34d399';
  } else {
    toggleBtn.textContent = 'Auto: OFF';
    toggleBtn.style.background = 'rgba(148, 163, 184, 0.1)';
    toggleBtn.style.borderColor = 'rgba(148, 163, 184, 0.25)';
    toggleBtn.style.color = '#94a3b8';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const statusPill = document.getElementById('status-pill');
  const dateDisplay = document.getElementById('date-display');
  const countDisplay = document.getElementById('count-display');
  const revenueRow = document.getElementById('revenue-row');
  const revenueDisplay = document.getElementById('revenue-display');
  const copyBtn = document.getElementById('copy-btn');
  const toggleBtn = document.getElementById('popup-autocopy-toggle');

  updatePopupToggleUi();

  toggleBtn?.addEventListener('click', () => {
    const nextState = !isAutoCopyEnabled();
    setAutoCopyEnabled(nextState);
    showToast(nextState ? 'Auto-Copy is ON' : 'Auto-Copy is OFF');
  });

  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) {
        if (statusPill) {
          statusPill.textContent = 'No Tab';
          statusPill.className = 'status-pill inactive';
        }
        return;
      }

      if (!activeTab.url || !activeTab.url.includes('contributor.stock.adobe.com')) {
        if (statusPill) {
          statusPill.textContent = 'Not Contributor';
          statusPill.className = 'status-pill inactive';
        }
        if (dateDisplay) dateDisplay.textContent = 'Open contributor site';
        return;
      }

      function querySalesData(allowInject = true) {
        chrome.tabs.sendMessage(activeTab.id, { action: 'GET_SALES_DATA' }, (response) => {
          if (chrome.runtime.lastError || !response) {
            // Auto-inject content script if tab had not received it yet
            if (allowInject && chrome.scripting && chrome.scripting.executeScript) {
              chrome.scripting.executeScript(
                {
                  target: { tabId: activeTab.id },
                  files: ['content.js'],
                },
                () => {
                  setTimeout(() => querySalesData(false), 200);
                }
              );
              return;
            }

            if (statusPill) {
              statusPill.textContent = 'Ready';
              statusPill.className = 'status-pill active';
            }
            if (dateDisplay) dateDisplay.textContent = 'Ready on screen';
            return;
          }

          if (!response.isInsightsPage) {
            if (statusPill) {
              statusPill.textContent = 'Go to Insights';
              statusPill.className = 'status-pill inactive';
            }
            if (dateDisplay) dateDisplay.textContent = 'Open Insights / Stats';
            return;
          }

          currentSalesData = response;

          if (statusPill) {
            statusPill.textContent = 'Ready ✓';
            statusPill.className = 'status-pill active';
          }

          if (dateDisplay) dateDisplay.textContent = response.dateStr || 'Today';
          if (countDisplay) countDisplay.textContent = `${response.totalItems || 0} items`;

          if (response.chartEarnings && revenueRow && revenueDisplay) {
            revenueDisplay.textContent = `$${response.chartEarnings}`;
            revenueRow.style.display = 'flex';
          }

          if (copyBtn) {
            copyBtn.disabled = !(response.items && response.items.length > 0);
            if (response.items && response.items.length > 0) {
              copyBtn.innerHTML = '<span class="btn-icon">⚡</span> <span>Copy for VectorAutomator</span>';
            }
          }
        });
      }

      querySalesData(true);
    });
  }

  copyBtn?.addEventListener('click', async () => {
    if (!currentSalesData || !currentSalesData.items || currentSalesData.items.length === 0) {
      showToast('No sales items to copy');
      return;
    }

    const tsv = formatClipboardTsv(currentSalesData);
    const success = await copyToClipboardSafe(tsv);

    if (success) {
      showToast(`Copied ${currentSalesData.totalItems} items for ${currentSalesData.dateStr}!`);
      copyBtn.innerHTML = '<span>✓</span> <span>Copied to Clipboard!</span>';

      setTimeout(() => {
        copyBtn.innerHTML = '<span class="btn-icon">⚡</span> <span>Copy for VectorAutomator</span>';
      }, 2000);
    } else {
      showToast('Failed to copy to clipboard');
    }
  });
});
