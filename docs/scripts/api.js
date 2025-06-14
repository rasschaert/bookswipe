// PocketBase API Integration for BookSwipe
class BookSwipeAPI {
  constructor() {
    this.baseURL = "https://adaptable-oxpecker.pikapod.net";
    this.pb = null;
    this.initialized = false;
    // Don't call init() in constructor - it's async and should be called explicitly
  }

  async init() {
    if (this.initialized) return;

    try {
      // Import PocketBase SDK dynamically
      if (typeof PocketBase === "undefined") {
        await this.loadPocketBaseSDK();
      }
      this.pb = new PocketBase(this.baseURL);
      this.initialized = true;
      console.log("✅ PocketBase API initialized");
    } catch (error) {
      console.error("❌ Failed to initialize PocketBase API:", error);
      throw error;
    }
  }

  async loadPocketBaseSDK() {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/pocketbase@0.21.3/dist/pocketbase.umd.js";
      script.onload = () => {
        console.log("✅ PocketBase SDK loaded from CDN");
        resolve();
      };
      script.onerror = (error) => {
        console.error("❌ Failed to load PocketBase SDK:", error);
        reject(error);
      };
      document.head.appendChild(script);
    });
  }

  // Fetch all books from the database
  async getBooks() {
    if (!this.initialized || !this.pb) {
      throw new Error("PocketBase API not initialized. Call init() first.");
    }

    try {
      const records = await this.pb.collection("books").getFullList({
        sort: "+created",
      });
      console.log(`📚 Fetched ${records.length} books from PocketBase`);
      return records;
    } catch (error) {
      console.error("❌ Failed to fetch books:", error);
      throw new Error(`Failed to fetch books: ${error.message}`);
    }
  }

  // Submit user votes
  async submitVotes(votes, userName = "") {
    try {
      const sessionId = this.generateSessionId();
      const data = {
        user_name: userName || "Anonymous",
        votes: votes,
        session_id: sessionId,
        submitted_at: new Date().toISOString(),
      };

      const record = await this.pb.collection("votes").create(data);
      return { success: true, record };
    } catch (error) {
      console.error("Error submitting votes:", error);
      return { success: false, error: error.message };
    }
  }

  // Generate a unique session ID
  generateSessionId() {
    return (
      "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }

  // Check if PocketBase is accessible
  async testConnection() {
    try {
      console.log("🔍 Testing PocketBase health endpoint...");
      const health = await this.pb.health.check();
      console.log("✅ PocketBase health check successful:", health);
      return true;
    } catch (error) {
      console.error("❌ PocketBase health check failed:", error);
      console.error("Error details:", {
        message: error.message,
        status: error.status,
        data: error.data,
      });
      throw error;
    }
  }

  // Calculate reading time based on page count
  calculateReadingTime(pageCount) {
    // Average reading speed: 250 words per minute, ~250 words per page
    const estimatedMinutes = Math.ceil(pageCount * 1); // 1 minute per page (conservative estimate)
    if (estimatedMinutes < 60) {
      return `${estimatedMinutes} min`;
    } else {
      const hours = Math.floor(estimatedMinutes / 60);
      const remainingMinutes = estimatedMinutes % 60;
      return remainingMinutes > 0
        ? `${hours}h ${remainingMinutes}m`
        : `${hours}h`;
    }
  }

  // Format rating with stars
  formatRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let stars = "★".repeat(fullStars);
    if (hasHalfStar) stars += "☆";
    return stars;
  }
}

// Initialize API instance
const bookSwipeAPI = new BookSwipeAPI();
