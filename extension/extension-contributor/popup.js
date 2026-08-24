// Adobe Contributor Portfolio Extractor - Popup Controller

let currentData = null;

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

function formatTsv(data) {
  const header = ['Asset ID', 'Title', 'Downloads', 'Thumbnail'].join('\t');
  const rows = (data.items || []).map((item) => {
    return [
      item.asId || '',
      (item.title || '').replace(/\t|\r?\n/g, ' '),
      item.downloads || 0,
      item.thumbnailUrl || '',
    ].join('\t');
  });
  return [header, ...rows].join('\n');
}

function formatCsv(data) {
  const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
  const header = ['Asset ID', 'Title', 'Downloads', 'Thumbnail'].map(escapeCsv).join(',');
  const rows = (data.items || []).map((item) => {
    return [
      item.asId || '',
      item.title || '',
      item.downloads || 0,
      item.thumbnailUrl || '',
    ].map(escapeCsv).join(',');
  });
  return '\uFEFF' + [header, ...rows].join('\n');
}

function downloadCsv(data) {
  const csvContent = formatCsv(data);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `adobe_contributor_portfolio_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
  const queryDisplay = document.getElementById('query-display');
  const countPill = document.getElementById('count-pill');
  const copyTsvBtn = document.getElementById('copy-tsv-btn');
  const downloadCsvBtn = document.getElementById('download-csv-btn');
  const copyJsonBtn = document.getElementById('copy-json-btn');

  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) {
        if (queryDisplay) queryDisplay.textContent = 'Please open Adobe Contributor';
        return;
      }

      if (!activeTab.url || !activeTab.url.includes('contributor.stock.adobe.com')) {
        if (queryDisplay) queryDisplay.textContent = 'Open contributor.stock.adobe.com';
        if (countPill) countPill.textContent = '0 Assets';
        return;
      }

      chrome.tabs.sendMessage(activeTab.id, { action: 'GET_CONTRIBUTOR_DATA' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          if (queryDisplay) queryDisplay.textContent = 'Refresh page & retry';
          if (countPill) countPill.textContent = '0 Assets';
          return;
        }

        currentData = response;
        if (queryDisplay) queryDisplay.textContent = 'My Portfolio Catalog';
        if (countPill) countPill.textContent = `${response.totalItems || 0} Assets`;
      });
    });
  }

  // Copy TSV
  copyTsvBtn?.addEventListener('click', async () => {
    if (!currentData || !currentData.items || currentData.items.length === 0) {
      showToast('No portfolio items to copy');
      return;
    }
    const tsv = formatTsv(currentData);
    await navigator.clipboard.writeText(tsv);
    showToast(`Copied ${currentData.totalItems} artworks (TSV)!`);
  });

  // Download CSV
  downloadCsvBtn?.addEventListener('click', () => {
    if (!currentData || !currentData.items || currentData.items.length === 0) {
      showToast('No portfolio items to export');
      return;
    }
    downloadCsv(currentData);
    showToast('Downloaded CSV!');
  });

  // Copy JSON
  copyJsonBtn?.addEventListener('click', async () => {
    if (!currentData || !currentData.items || currentData.items.length === 0) {
      showToast('No portfolio items to copy');
      return;
    }
    await navigator.clipboard.writeText(JSON.stringify(currentData, null, 2));
    showToast('Copied JSON!');
  });
});
