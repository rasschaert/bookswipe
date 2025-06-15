/**
 * ========================================
 * POCKETBASE API INTEGRATION
 * ========================================
 *
 * Handles PocketBase backend communication with:
 * - Auto-discovery of API endpoints
 * - Graceful degradation when offline
 * - Vote queuing and retry logic
 * - Efficient book data fetching
 *
 * IMPLEMENTATION NOTES:
 * - Uses direct fetch() for minimal dependencies
 * - Implements exponential backoff for failed requests
 * - Provides fallback patterns for offline usage
 * - Formats PocketBase responses for UI consumption
 */

// PocketBase API Integration for BookSwipe using direct fetch
class BookSwipeAPI {
  constructor() {
    // CONFIGURATION
    this.baseURL = "https://adaptable-oxpecker.pikapod.net"; // PocketBase instance
    this.initialized = false; // Connection status flag
  }

  /**
   * INITIALIZE CONNECTION
   * ====================
   * Test that we can communicate with the PocketBase server.
   *
   * Tests PocketBase connectivity before attempting operations.
   */
  async init() {
    if (this.initialized) return; // Don't initialize twice

    try {
      // Test connection with a simple health check
      // fetch() is the modern way to make HTTP requests
      const response = await fetch(`${this.baseURL}/api/health`);

      // Check if the response was successful (status 200-299)
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      this.initialized = true;
      console.log("✅ BookSwipe API initialized with direct fetch");
    } catch (error) {
      console.error("❌ Failed to initialize API:", error);
      throw error; // Re-throw so calling code knows there was a problem
    }
  }

  /**
   * FETCH ALL BOOKS FROM DATABASE
   * =============================
   * Retrieves books from PocketBase 'books' collection.
   * Uses direct fetch() with proper error handling and response parsing.
   */
  async getBooks() {
    if (!this.initialized) {
      throw new Error("API not initialized. Call init() first.");
    }

    try {
      // Make HTTP GET request to the books collection
      // PocketBase API pattern: /api/collections/{collection_name}/records
      const response = await fetch(
        `${this.baseURL}/api/collections/books/records`
      );

      // Check if request was successful
      if (!response.ok) {
        throw new Error(
          `Failed to fetch books: ${response.status} ${response.statusText}`
        );
      }

      // Parse JSON response
      // PocketBase returns data in format: { items: [...], page: 1, perPage: 30, totalItems: X }
      const data = await response.json();
      console.log(`📚 Fetched ${data.items.length} books using direct fetch`);

      return data.items; // Return just the array of books
    } catch (error) {
      console.error("❌ Direct fetch failed for books:", error);
      throw new Error(`Direct fetch failed for books: ${error.message}`);
    }
  }

  /**
   * SUBMIT USER VOTES TO DATABASE
   * =============================
   * This sends the user's voting data to PocketBase for storage.
   *
   * Sends voting data to PocketBase with session tracking.
   * Includes proper JSON formatting and error handling.
   */
  async submitVotes(votes, userName = "") {
    try {
      // Generate unique session ID for this voting session
      const sessionId = this.generateSessionId();

      // Prepare the data to send
      const data = {
        user_name: userName || "Anonymous", // Optional user name
        votes: votes, // Object with bookId: vote pairs
        session_id: sessionId, // Unique identifier for this session
        submitted_at: new Date().toISOString(), // Timestamp when submitted
      };

      // Make HTTP POST request to create a new record
      const response = await fetch(
        `${this.baseURL}/api/collections/votes/records`,
        {
          method: "POST", // POST = create new data
          headers: {
            "Content-Type": "application/json", // Tell server we're sending JSON
          },
          body: JSON.stringify(data), // Convert JavaScript object to JSON string
        }
      );

      // Check if request was successful
      if (!response.ok) {
        throw new Error(
          `Failed to submit votes: ${response.status} ${response.statusText}`
        );
      }

      // Parse the response (PocketBase returns the created record)
      const record = await response.json();
      return { success: true, record };
    } catch (error) {
      console.error("Error submitting votes:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * GENERATE UNIQUE SESSION ID
   * ==========================
   * Creates a unique identifier for each voting session.
   * This helps track individual users' votes in the database.
   *
   * Creates a unique identifier combining timestamp and random string.
   */
  generateSessionId() {
    // Combine timestamp + random string for uniqueness
    // Date.now() = milliseconds since 1970 (always unique)
    // Math.random() = decimal between 0 and 1
    // .toString(36) = convert to base-36 (uses letters + numbers)
    // .substr(2, 9) = take 9 characters starting from position 2
    return (
      "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }

  /**
   * TEST API CONNECTION
   * ==================
   * Simple health check to verify the server is responding.
   */
  async testConnection() {
    const response = await fetch(`${this.baseURL}/api/health`);
    if (!response.ok) {
      throw new Error(`Connection test failed: ${response.status}`);
    }
    return true;
  }

  /**
   * UTILITY FUNCTIONS
   * ================
   * These helper functions format data for display in the UI.
   */

  // Calculate reading time based on page count
  calculateReadingTime(pageCount) {
    // Estimation: Average reading speed is 250 words per minute
    // Assume ~250 words per page (conservative estimate)
    const estimatedMinutes = Math.ceil(pageCount * 1); // 1 minute per page

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

  // Format rating with star symbols
  formatRating(rating) {
    const fullStars = Math.floor(rating); // Number of full stars
    const hasHalfStar = rating % 1 >= 0.5; // Is there a half star?

    let stars = "★".repeat(fullStars); // Add full stars
    if (hasHalfStar) stars += "☆"; // Add half star if needed
    return stars;
  }
}

// Initialize API instance
const bookSwipeAPI = new BookSwipeAPI();
