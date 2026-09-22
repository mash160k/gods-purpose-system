import Dexie from 'dexie';

export const db = new Dexie('GPSBibleDatabase');

db.version(2).stores({
  books: '++id, name, order',
  verses: '++id, book, chapter, verse, [book+chapter], *tokens'
});

export function tokenizeText(text) {
  if (!text) return [];
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2)
    )
  );
}

export async function populateOptimizedVerses(rawBooks) {
  try {
    const count = await db.verses.count();
    if (count > 0) return;

    const flatVerses = [];
    for (const book of rawBooks) {
      if (!book.chapters) continue;
      book.chapters.forEach((chapterVerses, chIdx) => {
        const chNum = chIdx + 1;
        chapterVerses.forEach((verseItem, vIdx) => {
          const text = typeof verseItem === 'string' ? verseItem : (verseItem?.text || verseItem?.verseText || '');
          const vNum = typeof verseItem === 'object' && verseItem?.verse ? verseItem.verse : vIdx + 1;

          flatVerses.push({
            book: book.name,
            chapter: chNum,
            verse: vNum,
            text: text,
            tokens: tokenizeText(text)
          });
        });
      });
    }

    if (flatVerses.length > 0) {
      const chunkSize = 5000;
      for (let i = 0; i < flatVerses.length; i += chunkSize) {
        await db.verses.bulkAdd(flatVerses.slice(i, i + chunkSize));
      }
    }
  } catch (err) {
    console.warn("Error populating verses:", err);
  }
}