const isStorageAvailable = () => {
    try {
        if (typeof window === 'undefined' || !('localStorage' in window)) return false;
        const storage = window.localStorage;
        const test = '__storage_test__';
        storage.setItem(test, test);
        storage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
};

const getLocalStorage = (): Storage | null => {
    try {
        return window.localStorage;
    } catch (e) {
        return null;
    }
};

const hasLocalStorage = isStorageAvailable();
const memoryStorage: Record<string, string> = {};

export const safeStorage = {
    getItem: (key: string): string | null => {
        if (!hasLocalStorage) return memoryStorage[key] || null;
        try {
            const storage = getLocalStorage();
            return storage ? storage.getItem(key) : memoryStorage[key] || null;
        } catch (e) {
            console.warn(`Storage access blocked for key: ${key}`, e);
            return memoryStorage[key] || null;
        }
    },
    setItem: (key: string, value: string): void => {
        if (!hasLocalStorage) {
            memoryStorage[key] = value;
            return;
        }
        try {
            const storage = getLocalStorage();
            if (storage) {
                storage.setItem(key, value);
            } else {
                memoryStorage[key] = value;
            }
        } catch (e) {
            console.warn(`Storage access blocked. Could not set key: ${key}`, e);
            memoryStorage[key] = value;
        }
    },
    removeItem: (key: string): void => {
        if (!hasLocalStorage) {
            delete memoryStorage[key];
            return;
        }
        try {
            const storage = getLocalStorage();
            if (storage) {
                storage.removeItem(key);
            } else {
                delete memoryStorage[key];
            }
        } catch (e) {
            console.warn(`Storage access blocked. Could not remove key: ${key}`, e);
            delete memoryStorage[key];
        }
    },
    clear: (): void => {
        if (!hasLocalStorage) {
            Object.keys(memoryStorage).forEach(key => delete memoryStorage[key]);
            return;
        }
        try {
            const storage = getLocalStorage();
            if (storage) {
                storage.clear();
            } else {
                Object.keys(memoryStorage).forEach(key => delete memoryStorage[key]);
            }
        } catch (e) {
            console.warn('Storage access blocked. Could not clear storage.', e);
            Object.keys(memoryStorage).forEach(key => delete memoryStorage[key]);
        }
    }
};
