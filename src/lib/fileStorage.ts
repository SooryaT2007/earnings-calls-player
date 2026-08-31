// IndexedDB storage for persisting local PDF and Audio files across browser / app restarts

const DB_NAME = 'EarningsCallPlayerFiles';
const DB_VERSION = 1;
const STORE_NAME = 'files';

interface StoredFileRecord {
  key: string; // `${tabId}_${type}`
  tabId: string;
  type: 'pdf' | 'audio';
  name: string;
  blob: Blob;
  updatedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLocalFileToStorage(
  tabId: string,
  type: 'pdf' | 'audio',
  file: File | Blob
): Promise<string> {
  try {
    const db = await openDB();
    const key = `${tabId}_${type}`;
    const record: StoredFileRecord = {
      key,
      tabId,
      type,
      name: file instanceof File ? file.name : `${type}.dat`,
      blob: file,
      updatedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);

      req.onsuccess = () => {
        const objectUrl = URL.createObjectURL(file);
        resolve(objectUrl);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to save file in IndexedDB, using temporary ObjectURL:', err);
    return URL.createObjectURL(file);
  }
}

export async function getLocalFileFromStorage(
  tabId: string,
  type: 'pdf' | 'audio'
): Promise<string | null> {
  try {
    const db = await openDB();
    const key = `${tabId}_${type}`;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => {
        const result = req.result as StoredFileRecord | undefined;
        if (result && result.blob) {
          const freshUrl = URL.createObjectURL(result.blob);
          resolve(freshUrl);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Failed to retrieve file from IndexedDB:', err);
    return null;
  }
}

export async function deleteLocalFilesFromStorage(tabId: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(`${tabId}_pdf`);
    store.delete(`${tabId}_audio`);
  } catch {
    // Ignore cleanup errors
  }
}
