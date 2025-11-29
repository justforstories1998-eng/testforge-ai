// Rate limiter for Groq API
// Free tier: 30 requests/minute, 14,400 requests/day

class RateLimiter {
  constructor() {
    this.minuteRequests = 0;
    this.dayRequests = 0;
    this.lastMinuteReset = Date.now();
    this.lastDayReset = Date.now();
    
    // Limits (keeping buffer below actual limits)
    this.MAX_PER_MINUTE = 25; // Actual: 30
    this.MAX_PER_DAY = 14000; // Actual: 14,400
  }

  checkLimit() {
    const now = Date.now();
    
    // Reset minute counter
    if (now - this.lastMinuteReset > 60000) {
      this.minuteRequests = 0;
      this.lastMinuteReset = now;
    }
    
    // Reset day counter (24 hours)
    if (now - this.lastDayReset > 86400000) {
      this.dayRequests = 0;
      this.lastDayReset = now;
    }
    
    // Check limits
    if (this.minuteRequests >= this.MAX_PER_MINUTE) {
      const waitTime = Math.ceil((60000 - (now - this.lastMinuteReset)) / 1000);
      throw new Error(`Rate limit reached. Please wait ${waitTime} seconds and try again.`);
    }
    
    if (this.dayRequests >= this.MAX_PER_DAY) {
      throw new Error('Daily API limit reached. Please try again tomorrow.');
    }
    
    // Increment counters
    this.minuteRequests++;
    this.dayRequests++;
    
    return true;
  }

  getStatus() {
    const now = Date.now();
    const minuteRemaining = Math.max(0, this.MAX_PER_MINUTE - this.minuteRequests);
    const dayRemaining = Math.max(0, this.MAX_PER_DAY - this.dayRequests);
    const resetIn = Math.ceil((60000 - (now - this.lastMinuteReset)) / 1000);
    
    return {
      minuteRequests: this.minuteRequests,
      dayRequests: this.dayRequests,
      minuteRemaining,
      dayRemaining,
      resetInSeconds: resetIn > 0 ? resetIn : 0,
      minuteLimit: this.MAX_PER_MINUTE,
      dayLimit: this.MAX_PER_DAY
    };
  }

  // Wait for rate limit to reset
  async waitForReset() {
    const now = Date.now();
    const waitTime = 60000 - (now - this.lastMinuteReset) + 1000; // Add 1 second buffer
    
    if (waitTime > 0 && this.minuteRequests >= this.MAX_PER_MINUTE) {
      console.log(`⏳ Waiting ${Math.ceil(waitTime / 1000)} seconds for rate limit reset...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.minuteRequests = 0;
      this.lastMinuteReset = Date.now();
    }
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

module.exports = rateLimiter;