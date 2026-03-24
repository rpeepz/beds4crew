// Simple in-memory cache for frequently accessed data
class Cache {
  constructor() {
    this.store = new Map();
  }

  set(key, value, ttlSeconds = 300) {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.store.set(key, { value, expiresAt });
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    
    return item.value;
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (now > item.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

const cache = new Cache();

// Run cleanup every 5 minutes
const cleanupInterval = setInterval(() => cache.cleanup(), 5 * 60 * 1000);
if (typeof cleanupInterval.unref === "function") {
  cleanupInterval.unref();
}

module.exports = cache;
