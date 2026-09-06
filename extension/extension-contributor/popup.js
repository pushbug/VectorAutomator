// Stock Contributor Portfolio Extractor - Popup Controller (Adobe Stock & Shutterstock)

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
      // Fallback silently
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

function formatTsv(data) {
  if (data?.platform === 'Shutterstock') {
    const header = ['Shutterstock ID', 'Title / Filename', 'Status', 'Media Type', 'Thumbnail URL'].join('\t');
    const rows = (data.items || []).map((item) => {
      return [
        item.ssId || item.asId || item.id || '',
        (item.title || '').replace(/\t|\r?\n/g, ' '),
        item.status || 'Approved',
        item.mediaType || 'Illustration',
        item.thumbnailUrl || '',
      ].join('\t');
    });
    return [header, ...rows].join('\n');
  }

  // Default: Adobe Stock
  const header = ['Asset ID', 'Title', 'Downloads', 'Nominate Eligible', '1 Year', 'Perpetual', 'Thumbnail'].join('\t');
  const rows = (data.items || []).map((item) => {
    return [
      item.asId || item.id || '',
      (item.title || '').replace(/\t|\r?\n/g, ' '),
      item.downloads || 0,
      item.isNominateEligible ? 'Yes' : 'No',
      item.nominate1Year ? 'ON' : 'OFF',
      item.nominatePerpetual ? 'ON' : 'OFF',
      item.thumbnailUrl || '',
    ].join('\t');
  });
  return [header, ...rows].join('\n');
}

function formatCsv(data) {
  const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""')}"`;

  if (data?.platform === 'Shutterstock') {
    const header = ['Shutterstock ID', 'Title / Filename', 'Status', 'Media Type', 'Thumbnail URL'].map(escapeCsv).join(',');
    const rows = (data.items || []).map((item) => {
      return [
        item.ssId || item.asId || item.id || '',
        item.title || '',
        item.status || 'Approved',
        item.mediaType || 'Illustration',
        item.thumbnailUrl || '',
      ].map(escapeCsv).join(',');
    });
    return '\uFEFF' + [header, ...rows].join('\n');
  }

  // Default: Adobe Stock
  const header = ['Asset ID', 'Title', 'Downloads', 'Nominate Eligible', '1 Year', 'Perpetual', 'Thumbnail'].map(escapeCsv).join(',');
  const rows = (data.items || []).map((item) => {
    return [
      item.asId || item.id || '',
      item.title || '',
      item.downloads || 0,
      item.isNominateEligible ? 'Yes' : 'No',
      item.nominate1Year ? 'ON' : 'OFF',
      item.nominatePerpetual ? 'ON' : 'OFF',
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
  const platformPrefix = data?.platform === 'Shutterstock' ? 'shutterstock_catalog' : 'adobe_contributor_portfolio';
  a.download = `${platformPrefix}_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Scraper function executed directly in tab context if content script is unavailable
function scrapeContributorPageInTab() {
  const isShutterstock = window.location.hostname.includes('shutterstock.com');

  if (isShutterstock) {
    const cards = Array.from(document.querySelectorAll('div[data-testid="asset-card"]'));
    const items = [];
    const seenIds = new Set();

    cards.forEach((card) => {
      let ssId = '';
      const typographyEl = card.querySelector('.MuiTypography-bodyStaticMd, .MuiCardContent-root .MuiTypography-root');
      if (typographyEl && typographyEl.textContent) {
        const match = typographyEl.textContent.trim().match(/^(\d{7,12})\b/);
        if (match) ssId = match[1];
      }

      const imgEl = card.querySelector('img.MuiCardMedia-media') || card.querySelector('img');
      const imgSrc = imgEl?.src || imgEl?.getAttribute('src') || '';
      if (!ssId && imgSrc) {
        const imgMatch = imgSrc.match(/-(\d{7,12})\.jpg/i);
        if (imgMatch) ssId = imgMatch[1];
      }

      if (!ssId || seenIds.has(ssId)) return;
      seenIds.add(ssId);

      let title = '';
      const checkboxInput = card.querySelector('input[data-testid="asset-checkbox"], input[type="checkbox"]');
      if (checkboxInput) {
        const ariaLabel = checkboxInput.getAttribute('aria-label') || '';
        if (ariaLabel) title = ariaLabel.replace(/^select\s+asset\s+/i, '').trim();
      }

      if (!title && imgEl) {
        const dataTestId = imgEl.getAttribute('data-testid') || '';
        if (dataTestId.startsWith('card-media-')) {
          title = dataTestId.replace(/^card-media-/, '').trim();
        } else {
          title = imgEl.getAttribute('alt')?.trim() || '';
        }
      }

      if (!title && typographyEl) {
        title = typographyEl.textContent?.replace(/^\d+\s*-\s*/, '').trim() || `Asset ${ssId}`;
      }

      let status = 'Approved';
      let mediaType = 'Illustration';
      const badges = Array.from(card.querySelectorAll('.MuiCardContent-root p.MuiTypography-bodyStaticXs, .MuiCardContent-root p'));
      if (badges.length > 0) {
        const badgeTexts = badges.map((b) => (b.textContent || '').trim()).filter(Boolean);
        if (badgeTexts.length >= 1) status = badgeTexts[0];
        if (badgeTexts.length >= 2) mediaType = badgeTexts[1];
      }

      items.push({
        asId: ssId,
        ssId,
        id: ssId,
        title,
        status,
        mediaType,
        downloads: 0,
        thumbnailUrl: imgSrc,
        isNominateEligible: false,
        nominate1Year: false,
        nominatePerpetual: false,
      });
    });

    return {
      isContributorPage: true,
      platform: 'Shutterstock',
      totalItems: items.length,
      nominateItemsCount: 0,
      items,
      url: window.location.href,
    };
  }

  // Adobe Stock scraper
  const imgEls = Array.from(document.querySelectorAll('img[src*="_F_"]'));
  const cardSet = new Set();

  imgEls.forEach((img) => {
    const card =
      img.closest('div[title].left') ||
      img.closest('div[title]') ||
      img.closest('div[data-t="portfolio-single-asset-wrapper"]') ||
      img.closest('div.bon-jour-border') ||
      img.closest('.cursor-pointer')?.parentElement;
    if (card) cardSet.add(card);
  });

  if (cardSet.size === 0) {
    const directCards = document.querySelectorAll(
      'div[data-t="portfolio-page-assets-list"] > div, div[data-t="portfolio-single-asset-wrapper"], div.bon-jour-border'
    );
    directCards.forEach((c) => cardSet.add(c));
  }

  const items = [];
  const seenIds = new Set();

  cardSet.forEach((card) => {
    const imgEl = card.querySelector('img[src*="_F_"]') || card.querySelector('img');
    const imgSrc = imgEl?.src || imgEl?.getAttribute('src') || '';

    let asId = '';
    const match = imgSrc.match(/_F_(\d+)_/);
    if (match) {
      asId = match[1];
    } else {
      const altMatch = card.innerHTML.match(/_F_(\d+)_/);
      if (altMatch) asId = altMatch[1];
    }

    if (!asId || seenIds.has(asId)) return;
    seenIds.add(asId);

    let title =
      card.getAttribute('title')?.trim() ||
      card.closest('[title]')?.getAttribute('title')?.trim() ||
      imgEl?.closest('[title]')?.getAttribute('title')?.trim() ||
      card.querySelector('[title]')?.getAttribute('title')?.trim() ||
      imgEl?.getAttribute('alt')?.trim() ||
      `Asset ${asId}`;

    let downloads = 0;
    const dlEl = card.querySelector('.text-medium.light, span.text-medium, .downloads-count');
    if (dlEl && dlEl.textContent) {
      const parsed = parseInt(dlEl.textContent.replace(/,/g, '').trim(), 10);
      if (!isNaN(parsed)) downloads = parsed;
    }

    const toggleInputs = Array.from(
      card.querySelectorAll(
        'input[data-t="portfolio-single-asset-buyout-toggle"], input[aria-label*="Year"], input[aria-label*="Perpetual"], input[role="switch"]'
      )
    );

    const activeBuyoutToggle = card.querySelector('.buyout_toggle:not(.buyout_toggle__hidden)');

    const nominationLabels = Array.from(
      card.querySelectorAll('.CampaignNominationToggle__StyledText-sc-8olflh-0, .buyout_toggle div, .buyout_toggle span')
    ).filter((el) => {
      const txt = (el.textContent || '').trim().toLowerCase();
      return txt === '1 year' || txt === 'perpetual';
    });

    const isNominateEligible = toggleInputs.length > 0 || Boolean(activeBuyoutToggle) || nominationLabels.length > 0;

    let nominate1Year = false;
    let nominatePerpetual = false;

    if (toggleInputs.length > 0) {
      toggleInputs.forEach((inp) => {
        const label = (inp.getAttribute('aria-label') || '').toLowerCase();
        const isChecked = Boolean(inp.checked);
        if (label.includes('1 year') || label.includes('annual')) {
          nominate1Year = isChecked;
        } else if (label.includes('perpetual') || label.includes('forever')) {
          nominatePerpetual = isChecked;
        }
      });

      if (toggleInputs.length >= 2 && !nominate1Year && !nominatePerpetual) {
        nominate1Year = Boolean(toggleInputs[0].checked);
        nominatePerpetual = Boolean(toggleInputs[1].checked);
      }
    } else if (isNominateEligible) {
      nominate1Year = true;
      nominatePerpetual = true;
    }

    items.push({
      asId,
      id: asId,
      title,
      downloads,
      thumbnailUrl: imgSrc,
      isNominateEligible,
      nominate1Year,
      nominatePerpetual,
    });
  });

  const nominateItemsCount = items.filter((it) => it.isNominateEligible).length;

  return {
    isContributorPage: true,
    platform: 'Adobe Stock',
    totalItems: items.length,
    nominateItemsCount,
    items,
    url: window.location.href,
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const queryDisplay = document.getElementById('query-display');
  const countPill = document.getElementById('count-pill');
  const nominatePill = document.getElementById('nominate-pill');
  const platformCapsule = document.getElementById('platform-capsule');

  const copyNominateIdsBtn = document.getElementById('copy-nominate-ids-btn');
  const nominateBtnTitle = document.getElementById('nominate-btn-title');
  const copyAllIdsBtn = document.getElementById('copy-all-ids-btn');
  const allBtnTitle = document.getElementById('all-btn-title');

  const copyTsvBtn = document.getElementById('copy-tsv-btn');
  const downloadCsvBtn = document.getElementById('download-csv-btn');
  const copyJsonBtn = document.getElementById('copy-json-btn');

  function updateUi(data) {
    currentData = data;
    const total = data?.totalItems || 0;
    const nominateCount = data?.nominateItemsCount || 0;
    const isShutterstock = data?.platform === 'Shutterstock';

    if (platformCapsule) {
      platformCapsule.textContent = isShutterstock ? 'Shutterstock' : 'Adobe Stock';
    }

    if (queryDisplay) {
      queryDisplay.textContent = isShutterstock ? 'Shutterstock Catalog' : 'Adobe Contributor';
    }

    if (countPill) {
      countPill.textContent = `${total} Artworks`;
    }

    if (isShutterstock) {
      if (nominatePill) nominatePill.style.display = 'none';
      if (copyNominateIdsBtn) copyNominateIdsBtn.style.display = 'none';
    } else {
      if (copyNominateIdsBtn) copyNominateIdsBtn.style.display = 'flex';
      if (nominatePill) {
        if (nominateCount > 0) {
          nominatePill.textContent = `⭐ ${nominateCount} Nominate`;
          nominatePill.style.display = 'inline-block';
        } else {
          nominatePill.style.display = 'none';
        }
      }
      if (copyNominateIdsBtn) {
        copyNominateIdsBtn.disabled = nominateCount === 0;
        if (nominateBtnTitle) nominateBtnTitle.textContent = `Copy Nominate IDs (${nominateCount})`;
      }
    }

    if (copyAllIdsBtn) {
      copyAllIdsBtn.disabled = total === 0;
      if (allBtnTitle) allBtnTitle.textContent = `Copy All Asset IDs (${total})`;
    }
  }

  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) {
        if (queryDisplay) queryDisplay.textContent = 'No Active Tab';
        return;
      }

      const url = activeTab.url || '';
      const isAdobe = url.includes('contributor.stock.adobe.com');
      const isShutterstock = url.includes('submit.shutterstock.com');

      if (!isAdobe && !isShutterstock) {
        if (queryDisplay) queryDisplay.textContent = 'Open Adobe or Shutterstock';
        if (countPill) countPill.textContent = '0 Assets';
        return;
      }

      function queryContributorData() {
        if (chrome.scripting && chrome.scripting.executeScript) {
          chrome.scripting.executeScript(
            {
              target: { tabId: activeTab.id },
              func: scrapeContributorPageInTab,
            },
            (results) => {
              if (chrome.runtime.lastError || !results || !results[0] || !results[0].result) {
                chrome.tabs.sendMessage(activeTab.id, { action: 'GET_CONTRIBUTOR_DATA' }, (response) => {
                  if (response) {
                    updateUi(response);
                  } else {
                    if (queryDisplay) queryDisplay.textContent = 'No Assets Detected';
                    if (countPill) countPill.textContent = '0 Assets';
                  }
                });
                return;
              }

              const data = results[0].result;
              updateUi(data);
            }
          );
        } else {
          chrome.tabs.sendMessage(activeTab.id, { action: 'GET_CONTRIBUTOR_DATA' }, (response) => {
            if (response) updateUi(response);
          });
        }
      }

      queryContributorData();
    });
  }

  // 1. Copy Nominate IDs Only
  copyNominateIdsBtn?.addEventListener('click', async () => {
    if (!currentData || !currentData.items || currentData.items.length === 0) {
      showToast('No assets found');
      return;
    }
    const nominateIds = currentData.items
      .filter((it) => it.isNominateEligible)
      .map((it) => it.asId || it.id);

    if (nominateIds.length === 0) {
      showToast('No nominate-eligible assets on page');
      return;
    }

    const text = nominateIds.join('\n');
    const success = await copyToClipboardSafe(text);
    if (success) {
      showToast(`Copied ${nominateIds.length} Nominate IDs!`);
    } else {
      showToast('Failed to copy to clipboard');
    }
  });

  // 2. Copy All Asset IDs
  copyAllIdsBtn?.addEventListener('click', async () => {
    if (!currentData || !currentData.items || currentData.items.length === 0) {
      showToast('No assets found');
      return;
    }
    const allIds = currentData.items.map((it) => it.ssId || it.asId || it.id);
    const text = allIds.join('\n');
    const success = await copyToClipboardSafe(text);
    if (success) {
      showToast(`Copied ${allIds.length} Asset IDs!`);
    } else {
      showToast('Failed to copy to clipboard');
    }
  });

  // 3. Copy TSV
  copyTsvBtn?.addEventListener('click', async () => {
    if (!currentData || !currentData.items || currentData.items.length === 0) {
      showToast('No portfolio items to copy');
      return;
    }
    const tsv = formatTsv(currentData);
    const success = await copyToClipboardSafe(tsv);
    if (success) {
      showToast(`Copied ${currentData.totalItems} artworks (TSV)!`);
    } else {
      showToast('Failed to copy to clipboard');
    }
  });

  // 4. Download CSV
  downloadCsvBtn?.addEventListener('click', () => {
    if (!currentData || !currentData.items || currentData.items.length === 0) {
      showToast('No portfolio items to export');
      return;
    }
    downloadCsv(currentData);
    showToast('Downloaded CSV!');
  });

  // 5. Copy JSON
  copyJsonBtn?.addEventListener('click', async () => {
    if (!currentData || !currentData.items || currentData.items.length === 0) {
      showToast('No portfolio items to copy');
      return;
    }
    const success = await copyToClipboardSafe(JSON.stringify(currentData, null, 2));
    if (success) {
      showToast('Copied JSON!');
    } else {
      showToast('Failed to copy to clipboard');
    }
  });
});
