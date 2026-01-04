interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export const CacheService = {
  get: <T>(key: string): T | null => {
    try {
      const itemStr = localStorage.getItem(`trace_cache_${key}`);
      if (!itemStr) return null;

      const item: CacheItem<T> = JSON.parse(itemStr);
      if (Date.now() > item.expiresAt) {
        localStorage.removeItem(`trace_cache_${key}`);
        return null;
      }

      return item.data;
    } catch (e) {
      console.warn("Cache parse error", e);
      return null;
    }
  },

  set: <T>(key: string, data: T, ttlSeconds: number): void => {
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttlSeconds * 1000,
      };
      localStorage.setItem(`trace_cache_${key}`, JSON.stringify(item));
    } catch (e) {
      console.warn("Cache write error (quota?)", e);
    }
  },

  remove: (key: string): void => {
    localStorage.removeItem(`trace_cache_${key}`);
  },

  clearPattern: (pattern: string): void => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("trace_cache_") && key.includes(pattern)) {
        localStorage.removeItem(key);
      }
    });
  },

  clearAll: (): void => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("trace_cache_")) {
        localStorage.removeItem(key);
      }
    });
  },
};
