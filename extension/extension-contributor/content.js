// Adobe Contributor Portfolio Extractor - In-Memory DOM Scraper

function extractContributorPortfolio() {
  const cardEls = document.querySelectorAll(
    'div[data-t="portfolio-page-assets-list"] > div[title], div[data-t="portfolio-single-asset-wrapper"], div[title]'
  );

  const items = [];
  const seenIds = new Set();

  cardEls.forEach((card) => {
    let title = card.getAttribute('title')?.trim();
    if (!title) {
      const parentTitle = card.closest('div[title]');
      title = parentTitle?.getAttribute('title')?.trim();
    }

    const imgEl = card.querySelector('img[src*="_F_"]') || card.querySelector('img');
    const imgSrc = imgEl?.src || '';

    let asId = '';
    const match = imgSrc.match(/_F_(\d+)_/);
    if (match) {
      asId = match[1];
    } else {
      const altMatch = card.innerHTML.match(/_F_(\d+)_/);
      if (altMatch) asId = altMatch[1];
    }

    if (!asId || !title || seenIds.has(asId)) {
      return;
    }
    seenIds.add(asId);

    let downloads = 0;
    const dlEl = card.querySelector('.text-medium.light, span.text-medium');
    if (dlEl && dlEl.textContent) {
      const parsed = parseInt(dlEl.textContent.replace(/,/g, '').trim(), 10);
      if (!isNaN(parsed)) downloads = parsed;
    }

    items.push({
      asId,
      title,
      downloads,
      thumbnailUrl: imgSrc,
    });
  });

  return {
    isContributorPage: true,
    totalItems: items.length,
    items,
    url: window.location.href,
  };
}

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_CONTRIBUTOR_DATA') {
      const data = extractContributorPortfolio();
      sendResponse(data);
    }
    return true;
  });
}
