// Stock Contributor Portfolio Extractor - Dual Platform DOM Scraper (Adobe Stock & Shutterstock)

function extractAdobeContributor() {
  // Find all asset cards via multiple potential selectors in Adobe Contributor React SPA
  const imgEls = Array.from(document.querySelectorAll('img[src*="_F_"]'));
  const cardSet = new Set();

  imgEls.forEach((img) => {
    // Traverse upwards to the outer card wrapper containing both thumbnail and nomination buyout controls
    const card =
      img.closest('div[title].left') ||
      img.closest('div[title]') ||
      img.closest('div[data-t="portfolio-single-asset-wrapper"]') ||
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

    // Detect Free Collection Nomination Toggles
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

function extractShutterstockCatalog() {
  const cards = Array.from(document.querySelectorAll('div[data-testid="asset-card"]'));
  const items = [];
  const seenIds = new Set();

  cards.forEach((card) => {
    // 1. Extract Asset ID (ssId)
    let ssId = '';
    const typographyEl = card.querySelector('.MuiTypography-bodyStaticMd, .MuiCardContent-root .MuiTypography-root');
    if (typographyEl && typographyEl.textContent) {
      const match = typographyEl.textContent.trim().match(/^(\d{7,12})\b/);
      if (match) {
        ssId = match[1];
      }
    }

    // Fallback: extract from image src (e.g. "...-250nw-2837128969.jpg")
    const imgEl = card.querySelector('img.MuiCardMedia-media') || card.querySelector('img');
    const imgSrc = imgEl?.src || imgEl?.getAttribute('src') || '';
    if (!ssId && imgSrc) {
      const imgMatch = imgSrc.match(/-(\d{7,12})\.jpg/i);
      if (imgMatch) {
        ssId = imgMatch[1];
      }
    }

    if (!ssId || seenIds.has(ssId)) return;
    seenIds.add(ssId);

    // 2. Extract Full un-truncated Filename / Title
    let title = '';
    const checkboxInput = card.querySelector('input[data-testid="asset-checkbox"], input[type="checkbox"]');
    if (checkboxInput) {
      const ariaLabel = checkboxInput.getAttribute('aria-label') || '';
      if (ariaLabel) {
        title = ariaLabel.replace(/^select\s+asset\s+/i, '').trim();
      }
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

    // 3. Status and Media Type badges
    let status = 'Approved';
    let mediaType = 'Illustration';
    const badges = Array.from(card.querySelectorAll('.MuiCardContent-root p.MuiTypography-bodyStaticXs, .MuiCardContent-root p'));
    if (badges.length > 0) {
      const badgeTexts = badges.map((b) => (b.textContent || '').trim()).filter(Boolean);
      if (badgeTexts.length >= 1) status = badgeTexts[0];
      if (badgeTexts.length >= 2) mediaType = badgeTexts[1];
    }

    items.push({
      asId: ssId, // For common id accessor
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

function extractContributorPortfolio() {
  if (typeof window !== 'undefined' && window.location && window.location.hostname.includes('shutterstock.com')) {
    return extractShutterstockCatalog();
  }
  return extractAdobeContributor();
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
