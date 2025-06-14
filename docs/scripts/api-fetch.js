// PocketBase API Integration for BookSwipe using direct fetch
class BookSwipeAPI {
  constructor() {
    this.baseURL = "https://adaptable-oxpecker.pikapod.net";
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      // Test connection with a simple health check
      const response = await fetch(`${this.baseURL}/api/health`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      this.initialized = true;
      console.log("✅ BookSwipe API initialized with direct fetch");
    } catch (error) {
      console.error("❌ Failed to initialize API:", error);
      throw error;
    }
  }

  // Fetch all books from the database using direct fetch
  async getBooks() {
    if (!this.initialized) {
      throw new Error("API not initialized. Call init() first.");
    }

    try {
      const response = await fetch(
        `${this.baseURL}/api/collections/books/records`,
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch books: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      console.log(`📚 Fetched ${data.items.length} books using direct fetch`);
      return data.items;
    } catch (error) {
      console.error("❌ Direct fetch failed for books:", error);
      throw new Error(`Direct fetch failed for books: ${error.message}`);
    }
  }

  // Submit user votes using direct fetch
  async submitVotes(votes, userName = "") {
    try {
      const sessionId = this.generateSessionId();
      const data = {
        user_name: userName || "Anonymous",
        votes: votes,
        session_id: sessionId,
        submitted_at: new Date().toISOString(),
      };

      const response = await fetch(
        `${this.baseURL}/api/collections/votes/records`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to submit votes: ${response.status} ${response.statusText}`,
        );
      }

      const record = await response.json();
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

  // Check if API is accessible
  async testConnection() {
    const response = await fetch(`${this.baseURL}/api/health`);
    if (!response.ok) {
      throw new Error(`Connection test failed: ${response.status}`);
    }
    return true;
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
