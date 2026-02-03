// PocketBase API Integration for BookSwipe
class BookSwipeAPI {
  constructor() {
    this.baseURL = "https://bookswipe.modest-moray-8349.pomerium.app";
    this.pb = null;
    this.initialized = false;
    this.mockMode = false;
    this.mockData = null;
    // Don't call init() in constructor - it's async and should be called explicitly
  }

  async init() {
    if (this.initialized) return;

    // Check for mock mode URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    this.mockMode = urlParams.get("mock") === "true";

    if (this.mockMode) {
      console.log("🎭 Mock mode enabled - loading from mock.json");
      try {
        const response = await fetch("scripts/mock.json");
        if (!response.ok) {
          throw new Error(`Failed to load mock.json: ${response.statusText}`);
        }
        this.mockData = await response.json();
        this.initialized = true;
        console.log("✅ Mock data loaded successfully");
        return;
      } catch (error) {
        console.error("❌ Failed to load mock data:", error);
        throw error;
      }
    }

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
      script.src =
        "https://cdn.jsdelivr.net/npm/pocketbase@0.21.3/dist/pocketbase.umd.js";
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
    if (!this.initialized) {
      throw new Error("API not initialized. Call init() first.");
    }

    // Mock mode: return mock data
    if (this.mockMode) {
      console.log(`📚 Returning ${this.mockData.length} books from mock data`);
      return this.mockData;
    }

    // Real mode: fetch from PocketBase
    if (!this.pb) {
      throw new Error("PocketBase not initialized.");
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
    // Mock mode: simulate successful submission
    if (this.mockMode) {
      console.log("🎭 Mock mode: Simulating vote submission", { votes, userName });
      return {
        success: true,
        record: {
          id: "mock_vote_" + Date.now(),
          user_name: userName || "Anonymous",
          votes: votes,
          session_id: this.generateSessionId(),
          submitted_at: new Date().toISOString()
        }
      };
    }

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
      "session_" + Date.now() + "_" + Math.random().toString(36).substring(2, 11)
    );
  }

  // Check if PocketBase is accessible
  async testConnection() {
    // Mock mode: simulate successful connection
    if (this.mockMode) {
      console.log("🎭 Mock mode: Simulating connection test");
      return true;
    }

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
