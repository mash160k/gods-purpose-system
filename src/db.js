import Dexie from 'dexie';

// We rename the database so it builds a fresh, correctly ordered one
export const db = new Dexie('BibleAppDB_V2'); 

db.version(1).stores({
  // ++id auto-numbers them (1, 2, 3...) so they stay in the exact JSON order
  books: '++id, name, abbrev, chapters' 
});