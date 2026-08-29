// Adobe Contributor Portfolio Extractor - Resilient DOM Scraper

function extractContributorPortfolio() {
  // Find all asset cards via multiple potential selectors in Adobe Contributor React SPA
  const imgEls = Array.from(document.querySelectorAll('img[src*="_F_"]'));
  const cardSet = new Set();

  imgEls.forEach((img) => {
    // Traverse upwards to the outer card wrapper containing both thumbnail and nomination buyout controls
    const card =
      img.closest('div[data-t="portfolio-single-asset-wrapper"]') ||
      img.closest('div[title].left') ||
      img.closest('div[title]') ||
      img.closest('div.bon-jour-border') ||
      img.closest('.cursor-pointer')?.parentElement;
    if (card) {
      cardSet.add(card);
    }
  });

  // Fallback: If no cards found via img, search direct container wrappers
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

    if (!asId || seenIds.has(asId)) {
      return;
    }
    seenIds.add(asId);

    let title = card.getAttribute('title')?.trim() || '';
    if (!title) {
      const titleEl = card.querySelector('[title]');
      title = titleEl?.getAttribute('title')?.trim() || '';
    }
    if (!title) {
      title = imgEl?.getAttribute('alt')?.trim() || `Asset ${asId}`;
    }

    let downloads = 0;
    const dlEl = card.querySelector('.text-medium.light, span.text-medium, .downloads-count');
    if (dlEl && dlEl.textContent) {
      const parsed = parseInt(dlEl.textContent.replace(/,/g, '').trim(), 10);
      if (!isNaN(parsed)) downloads = parsed;
    }

    // Detect Free Collection Nomination Toggles
    // 1. Check for switch toggle inputs
    const toggleInputs = Array.from(
      card.querySelectorAll(
        'input[data-t="portfolio-single-asset-buyout-toggle"], input[aria-label*="Year"], input[aria-label*="Perpetual"], input[role="switch"]'
      )
    );

    // 2. Check for active buyout_toggle container (not hidden)
    const activeBuyoutToggle = card.querySelector('.buyout_toggle:not(.buyout_toggle__hidden)');

    // 3. Check for nomination labels text (1 Year / Perpetual)
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

      // Positional fallback if aria-labels are missing
      if (toggleInputs.length >= 2 && !nominate1Year && !nominatePerpetual) {
        nominate1Year = Boolean(toggleInputs[0].checked);
        nominatePerpetual = Boolean(toggleInputs[1].checked);
      }
    } else if (isNominateEligible) {
      // Default to ON if eligible
      nominate1Year = true;
      nominatePerpetual = true;
    }

    items.push({
      asId,
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
    totalItems: items.length,
    nominateItemsCount,
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
