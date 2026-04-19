/* --- Masry Brain: Categorized Local Memory (IndexedDB) --- */

const DB_NAME = 'MasryBrain';
const DB_VERSION = 1;
const ROOMS = ['Identity', 'Knowledge', 'Emotion', 'Work', 'General'];

class MasryBrain {
    constructor() {
        this.db = null;
        this.initPromise = this.init();
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                ROOMS.forEach(room => {
                    if (!db.objectStoreNames.contains(room)) {
                        db.createObjectStore(room, { keyPath: 'id', autoIncrement: true });
                    }
                });
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error('Brain initialization error:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async save(text, category = 'General') {
        await this.initPromise;
        if (!ROOMS.includes(category)) category = 'General';

        return new Promise((resolve) => {
            const transaction = this.db.transaction([category], 'readwrite');
            const store = transaction.objectStore(category);
            const entry = {
                text,
                date: new Date().toISOString(),
                keywords: text.split(' ').filter(w => w.length > 3)
            };
            store.add(entry);
            transaction.oncomplete = () => resolve(true);
        });
    }

    async search(query) {
        await this.initPromise;
        const results = [];
        const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 2);

        for (const room of ROOMS) {
            const roomResults = await this._searchInRoom(room, queryWords);
            results.push(...roomResults.map(r => ({ ...r, room })));
        }

        // Sort by relevance (number of word matches)
        return results.sort((a, b) => b.score - a.score).slice(0, 3);
    }

    async _searchInRoom(room, queryWords) {
        return new Promise((resolve) => {
            const transaction = this.db.transaction([room], 'readonly');
            const store = transaction.objectStore(room);
            const request = store.getAll();

            request.onsuccess = () => {
                const all = request.result;
                const matches = all.map(item => {
                    let score = 0;
                    queryWords.forEach(word => {
                        if (item.text.toLowerCase().includes(word)) score += 1;
                    });
                    return { ...item, score };
                }).filter(item => item.score > 0);
                resolve(matches);
            };
        });
    }
}

// Global instance
window.masryBrain = new MasryBrain();
