import { describe, it, expect } from 'vitest';
import {
  isVectorArtworkNote,
  parseKeepNote,
  generateChronologicalCodes,
  KeepNoteJson,
  ParsedKeepArtwork,
} from '@/lib/keepParser';

describe('Google Keep Parser & Filtering Unit Tests', () => {
  it('UT-KEEP-FILTER-03: should whitelist Vector labels with attachments and exclude Knowledge / Pinterest / empty trackers', () => {
    const validArtworkNote: KeepNoteJson = {
      title: 'Business Infographic 4 Steps',
      textContent: 'No. #101\nDate: 15/05/2023\nStock: Shutter, Adobe\nKeyword: business, infographic, chart\nNote: test',
      labels: [{ name: 'Vector 2023' }],
      attachments: [{ filePath: '1684152000000.jpg', mimetype: 'image/jpeg' }],
      isTrashed: false,
    };
    expect(isVectorArtworkNote(validArtworkNote)).toBe(true);

    const knowledgeNote: KeepNoteJson = {
      title: 'Prompt Create Name',
      textContent: 'Prompt instructions for stock photography',
      labels: [{ name: 'Knowledge' }],
      attachments: [],
      isTrashed: false,
    };
    expect(isVectorArtworkNote(knowledgeNote)).toBe(false);

    const pinterestNote: KeepNoteJson = {
      title: 'Inspiration Board',
      textContent: 'Pins to check',
      labels: [{ name: 'Pinterest' }],
      attachments: [{ filePath: 'pin.jpg' }],
      isTrashed: false,
    };
    expect(isVectorArtworkNote(pinterestNote)).toBe(false);

    const emptyTrackerNote: KeepNoteJson = {
      title: '-',
      textContent: 'No. #474\nDate: 28/11/2025\nTarget 900',
      labels: [{ name: 'Vector 2025' }],
      attachments: [],
      isTrashed: false,
    };
    expect(isVectorArtworkNote(emptyTrackerNote)).toBe(false);

    const trashedNote: KeepNoteJson = {
      ...validArtworkNote,
      isTrashed: true,
    };
    expect(isVectorArtworkNote(trashedNote)).toBe(false);
  });

  it('UT-KEEP-INGEST-01: should accurately parse Keep note text and extract metadata', () => {
    const note: KeepNoteJson = {
      title: '10 Business Process Data Infographic Design Templates.',
      textContent:
        'No. #248\nDate: 22/08/2024\nStock: Shutter, Adobe, Vecteezy\nCollection:\nKeyword: \nfinance, development, roadmap, technology, goal\n\nNote: Vector AI file',
      labels: [{ name: 'Vector 2024' }],
      attachments: [{ filePath: '1724307606516.1829618489.jpg', mimetype: 'image/jpeg' }],
    };

    const parsed = parseKeepNote(note, 'test.json');
    expect(parsed).not.toBeNull();
    expect(parsed!.title).toBe('10 Business Process Data Infographic Design Templates.');
    expect(parsed!.year).toBe(2024);
    expect(parsed!.month).toBe(8);
    expect(parsed!.day).toBe(22);
    expect(parsed!.noStr).toBe('248');
    expect(parsed!.stock).toBe('Shutter, Adobe, Vecteezy');
    expect(parsed!.keywords).toBe('finance, development, roadmap, technology, goal');
    expect(parsed!.notes).toBe('Vector AI file');
    expect(parsed!.tags).toBe('Vector 2024');
    expect(parsed!.attachmentPath).toBe('1724307606516.1829618489.jpg');
  });

  it('UT-KEEP-INGEST-01: should fallback keywords to title tokens if keywords text is empty', () => {
    const note: KeepNoteJson = {
      title: 'Christmas tree with star and gift boxes',
      textContent: '',
      labels: [{ name: 'Vector 2023' }],
      attachments: [{ filePath: 'xmas.jpg' }],
      createdTimestampUsec: 1703462400000000, // 2023-12-25
    };

    const parsed = parseKeepNote(note, 'xmas.json');
    expect(parsed).not.toBeNull();
    expect(parsed!.keywords).toBe('christmas, tree, with, star, and, gift, boxes');
    expect(parsed!.year).toBe(2023);
    expect(parsed!.month).toBe(12);
  });

  it('UT-KEEP-DEDUP-02: should generate sequential YYMM-XX codes without duplicates', () => {
    const rawArtworks: ParsedKeepArtwork[] = [
      {
        file: 'art2.json',
        title: 'Artwork 2',
        keywords: 'kw2',
        year: 2024,
        month: 8,
        day: 20,
        dateObj: new Date('2024-08-20T12:00:00Z'),
        attachmentPath: 'img2.jpg',
      },
      {
        file: 'art1.json',
        title: 'Artwork 1',
        keywords: 'kw1',
        year: 2024,
        month: 8,
        day: 10,
        dateObj: new Date('2024-08-10T12:00:00Z'),
        attachmentPath: 'img1.jpg',
      },
      {
        file: 'art3.json',
        title: 'Artwork 3',
        keywords: 'kw3',
        year: 2024,
        month: 9,
        day: 1,
        dateObj: new Date('2024-09-01T12:00:00Z'),
        attachmentPath: 'img3.jpg',
      },
    ];

    const processed = generateChronologicalCodes(rawArtworks);

    expect(processed).toHaveLength(3);
    expect(processed[0].title).toBe('Artwork 1');
    expect(processed[0].code).toBe('2408-01');
    expect(processed[0].seqNumber).toBe(1);

    expect(processed[1].title).toBe('Artwork 2');
    expect(processed[1].code).toBe('2408-02');
    expect(processed[1].seqNumber).toBe(2);

    expect(processed[2].title).toBe('Artwork 3');
    expect(processed[2].code).toBe('2409-01');
    expect(processed[2].seqNumber).toBe(1);
  });
});
