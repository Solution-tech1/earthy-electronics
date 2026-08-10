class GeminiKeyManager {
  constructor() {
    this.keys = [];
    this.cooldowns = new Map();
    this.currentKeyIndex = 0;

    // Load keys from .env
    for (let i = 1; i <= 10; i++) {
      const key = process.env[`GEMINI_API_KEY_${i}`];
      if (key) {
        this.keys.push(key);
      }
    }
    
    // Fallback if the original name is still used somewhere without indexing
    if (this.keys.length === 0 && process.env.GEMINI_API_KEY) {
      this.keys.push(process.env.GEMINI_API_KEY);
    }
  }

  getAvailableKey() {
    if (this.keys.length === 0) {
      throw new Error("No_Keys_Configured");
    }

    const now = Date.now();
    let startingIndex = this.currentKeyIndex;

    do {
      const key = this.keys[this.currentKeyIndex];
      const cooldownUntil = this.cooldowns.get(key) || 0;

      if (now > cooldownUntil) {
        // Key is available, clear cooldown if it existed
        if (cooldownUntil > 0) {
           this.cooldowns.delete(key);
           console.log(`[KeyRotation] Key ${this.currentKeyIndex + 1} has recovered from cooldown.`);
        }
        return { key, index: this.currentKeyIndex + 1 };
      }

      // Move to next key
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
    } while (this.currentKeyIndex !== startingIndex);

    // If we reach here, all keys are in cooldown
    throw new Error("All_Keys_Exhausted");
  }

  markKeyAsExhausted(keyIndex, errorMsg = "") {
    const key = this.keys[keyIndex - 1];
    if (!key) return;

    let cooldownDuration = 60 * 1000; // Default: 60 seconds (for per-minute limits)

    // Check if it's a daily quota limit
    if (errorMsg.includes("generativelanguage.googleapis.com/generate_content_free_tier_requests") || 
        errorMsg.includes("Quota exceeded for metric")) {
       // Daily limit reached. Cooldown for 24 hours (or at least long enough for the day to roll over)
       // A safer bet is 12 hours or 24 hours. We'll set 24 hours.
       cooldownDuration = 24 * 60 * 60 * 1000; 
       console.log(`[KeyRotation] 🚨 Key ${keyIndex} hit DAILY quota limit! Cooldown set for 24 hours.`);
    } else {
       console.log(`[KeyRotation] ⚠️ Key ${keyIndex} hit rate limit (429). Cooldown set for 60 seconds.`);
    }

    this.cooldowns.set(key, Date.now() + cooldownDuration);
    
    // Immediately advance to next key so next request gets a fresh key
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
  }
}

// Export a singleton instance
module.exports = new GeminiKeyManager();
