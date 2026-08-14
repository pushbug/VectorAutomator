export interface KeepAttachment {
  filePath: string;
  mimetype?: string;
}

export interface KeepLabel {
  name: string;
}

export interface KeepNoteJson {
  title?: string;
  textContent?: string;
  textContentHtml?: string;
  isTrashed?: boolean;
  isArchived?: boolean;
  createdTimestampUsec?: number;
  userEditedTimestampUsec?: number;
  labels?: KeepLabel[];
  attachments?: KeepAttachment[];
}

export interface ParsedKeepArtwork {
  file: string;
  title: string;
  keywords: string;
  year: number;
  month: number;
  day: number;
  dateObj: Date;
  noStr?: string;
  tags?: string;
  notes?: string;
  attachmentPath: string;
  stock?: string;
}

export interface ProcessedKeepArtwork extends ParsedKeepArtwork {
  code: string;
  seqNumber: number;
}

/**
 * Validates whether a Google Keep JSON export is a valid vector artwork portfolio note.
 * Excludes Knowledge, Pinterest, and empty tracker notes.
 */
export function isVectorArtworkNote(note: KeepNoteJson): boolean {
  if (note.isTrashed) return false;

  const labels = (note.labels || []).map((l) => l.name);

  // Blacklist non-artwork categories
  if (labels.some((l) => /^Knowledge$/i.test(l) || /^Pinterest$/i.test(l))) {
    return false;
  }

  // Must have an image attachment
  if (!note.attachments || note.attachments.length === 0 || !note.attachments[0]?.filePath) {
    return false;
  }

  const title = (note.title || '').trim();
  const text = (note.textContent || '').trim();

  // If title is dash or empty and text is empty/counter-only, exclude
  if ((!title || title === '-') && !text) {
    return false;
  }

  // Must belong to Vector label or have valid vector structure
  const hasVectorLabel = labels.some((l) => /^Vector 202\d$/i.test(l));
  const hasArtworkMetadata = /Date:\s*\d{1,2}\/\d{1,2}\/\d{4}/i.test(text) || /Keyword:/i.test(text);

  return hasVectorLabel || hasArtworkMetadata;
}

/**
 * Parses raw Google Keep JSON note content into structured artwork metadata.
 */
export function parseKeepNote(note: KeepNoteJson, filename: string): ParsedKeepArtwork | null {
  if (!isVectorArtworkNote(note)) {
    return null;
  }

  const text = note.textContent || '';
  let title = (note.title || '').trim();

  // Extract Date
  const dateMatch = text.match(/Date:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
  let year: number;
  let month: number;
  let day: number;
  let dateObj: Date;

  if (dateMatch) {
    day = parseInt(dateMatch[1], 10);
    month = parseInt(dateMatch[2], 10);
    year = parseInt(dateMatch[3], 10);
    dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  } else {
    const ts = Math.floor((note.createdTimestampUsec || note.userEditedTimestampUsec || 0) / 1000);
    dateObj = ts > 0 ? new Date(ts) : new Date('2022-01-01T12:00:00Z');
    year = dateObj.getUTCFullYear();
    month = dateObj.getUTCMonth() + 1;
    day = dateObj.getUTCDate();
  }

  // Extract Keywords
  const kwMatch = text.match(/Keyword:\s*([\s\S]*?)(?=\n\nNote:|\nNote:|$)/i);
  let rawKeywords = kwMatch ? kwMatch[1].trim() : '';

  // Clean raw keywords (normalize newlines, spaces, trailing commas)
  rawKeywords = rawKeywords
    .replace(/[\r\n]+/g, ', ')
    .replace(/,\s*,/g, ',')
    .replace(/\s+/g, ' ')
    .trim();

  // Fallback: If keywords are completely empty, derive from title
  if (!rawKeywords) {
    const titleTokens = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter((t) => t.length > 1);
    rawKeywords = Array.from(new Set(titleTokens)).join(', ');
  }

  // Fallback title if empty or dash
  if (!title || title === '-') {
    title = rawKeywords.split(',')[0]?.trim() || 'Vector Artwork';
  }

  // Extract No. #
  const noMatch = text.match(/No\.?\s*#?(\d+)/i);
  const noStr = noMatch ? noMatch[1] : undefined;

  // Extract Stock platforms
  const stockMatch = text.match(/Stock:\s*([^\n\r]+)/i);
  const stock = stockMatch ? stockMatch[1].trim() : undefined;

  // Extract Note
  const noteMatch = text.match(/Note:\s*([\s\S]*)$/i);
  const notes = noteMatch ? noteMatch[1].trim() : undefined;

  // Extract Tags from labels
  const labelNames = (note.labels || []).map((l) => l.name).filter(Boolean);
  const tags = labelNames.length > 0 ? labelNames.join(', ') : undefined;

  const attachmentPath = note.attachments![0].filePath;

  return {
    file: filename,
    title,
    keywords: rawKeywords,
    year,
    month,
    day,
    dateObj,
    noStr,
    tags,
    notes,
    attachmentPath,
    stock,
  };
}

/**
 * Assigns sequential, conflict-free YYMM-XX codes across chronological order.
 */
export function generateChronologicalCodes(artworks: ParsedKeepArtwork[]): ProcessedKeepArtwork[] {
  // Sort chronologically by dateObj, then file name for deterministic stability
  const sorted = [...artworks].sort((a, b) => {
    const diff = a.dateObj.getTime() - b.dateObj.getTime();
    if (diff !== 0) return diff;
    return a.file.localeCompare(b.file);
  });

  const monthlyCounter: Record<string, number> = {};

  return sorted.map((item) => {
    const yy = String(item.year).slice(-2);
    const mm = String(item.month).padStart(2, '0');
    const ymKey = `${yy}${mm}`;

    monthlyCounter[ymKey] = (monthlyCounter[ymKey] || 0) + 1;
    const seqNumber = monthlyCounter[ymKey];
    const code = `${ymKey}-${String(seqNumber).padStart(2, '0')}`;

    return {
      ...item,
      code,
      seqNumber,
    };
  });
}
