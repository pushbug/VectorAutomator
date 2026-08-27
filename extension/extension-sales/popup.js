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
  const dateHeader = `Date: ${salesData.dateStr}`;
  const tsvHeader = ['Thumb', 'Id', 'Type', 'Upload date', 'Earnings'].join('\t');
  const rows = (salesData.items || []).map((item) => {
    return ['', item.assetId, item.assetType, item.uploadDate, item.royalty].join('\t');
  });

  return [dateHeader, tsvHeader, ...rows].join('\n');
}

document.addEventListener('DOMContentLoaded', () => {
  const statusPill = document.getElementById('status-pill');
  const dateDisplay = document.getElementById('date-display');
  const countDisplay = document.getElementById('count-display');
  const revenueRow = document.getElementById('revenue-row');
  const revenueDisplay = document.getElementById('revenue-display');
  const copyBtn = document.getElementById('copy-btn');

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
              statusPill.textContent = 'Use Page Button';
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
            statusPill.textContent = 'Ready';
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
    await navigator.clipboard.writeText(tsv);

    showToast(`Copied ${currentSalesData.totalItems} items for ${currentSalesData.dateStr}!`);
    copyBtn.innerHTML = '<span>✓</span> <span>Copied to Clipboard!</span>';

    setTimeout(() => {
      copyBtn.innerHTML = '<span class="btn-icon">⚡</span> <span>Copy for VectorAutomator</span>';
    }, 2000);
  });
});
