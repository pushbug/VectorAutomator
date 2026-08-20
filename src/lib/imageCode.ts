export interface ParsedImageCode {
  year: number;
  month: number;
  seqNumber: number;
}

export interface NextImageCodeResult {
  nextCode: string;
  year: number;
  month: number;
  seqNumber: number;
}

/**
 * Parses YYMM-Seq formatted codes (e.g. "2608-123", "2608-1") into year, month, and sequence number.
 * Returns null if the code format does not match.
 */
export function parseImageCode(code?: string | null): ParsedImageCode | null {
  if (!code) return null;
  const trimmed = code.trim();
  const match = trimmed.match(/^(\d{2})(\d{2})-(\d+)$/);
  if (!match) return null;

  return {
    year: 2000 + parseInt(match[1], 10),
    month: parseInt(match[2], 10),
    seqNumber: parseInt(match[3], 10),
  };
}

/**
 * Computes the next monthly running code (e.g. "2608-1") based on the highest seqNumber for the given date.
 */
export async function getNextImageCode(
  prismaClient: any,
  dateInput: Date | string = new Date()
): Promise<NextImageCodeResult> {
  let targetDate = new Date();
  if (dateInput) {
    const parsed = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (!isNaN(parsed.getTime())) {
      targetDate = parsed;
    }
  }

  const fullYear = targetDate.getFullYear();
  const yy = String(fullYear).slice(-2);
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const month = targetDate.getMonth() + 1;

  // Find highest seqNumber for this year and month
  const highestImage = await prismaClient.image.findFirst({
    where: {
      year: fullYear,
      month,
    },
    orderBy: { seqNumber: 'desc' },
    select: { seqNumber: true },
  });

  const nextSeq = (highestImage?.seqNumber ?? 0) + 1;
  const nextCode = `${yy}${mm}-${nextSeq}`;

  return {
    nextCode,
    year: fullYear,
    month,
    seqNumber: nextSeq,
  };
}
