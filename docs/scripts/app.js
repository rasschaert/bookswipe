/**
 * ========================================
 * BOOKSWIPE MAIN APPLICATION
 * ========================================
 *
 * Central application controller managing:
 * - State synchronization between gesture handler and UI
 * - Progressive card loading for performance
 * - Offline-first vote persistence
 * - Screen transition coordination
 *
 * ARCHITECTURE NOTES:
 * - No framework dependencies for minimal bundle size
 * - Direct callback binding for gesture responsiveness
 * - Object-based state management with explicit mutations
 * - Async initialization with graceful degradation
 */

// Main application class - this controls everything
class BookSwipeApp {
  constructor() {
    // APPLICATION STATE - Core data structures
    this.books = []; // Book data from PocketBase
    this.currentBookIndex = 0; // Current position in stack
    this.userVotes = {}; // Vote storage: {bookId: "interested"|"not_interested"}
    this.swipeHandler = null; // Gesture controller instance
    this.isLoading = false; // Prevents concurrent operations
    this.highestLoadedBookIndex = -1; // DOM optimization: tracks loaded cards

    // INITIALIZATION - Start the app immediately when class is created
    this.init();
  }

  /**
   * APPLICATION INITIALIZATION
   * ========================
   * Startup sequence with proper async initialization order.
   * Handles API connection, data loading, and UI setup with error recovery.
   */
  async init() {
    console.log("🚀 Initializing BookSwipe...");

    // STEP 1: Show loading screen immediately so user knows something is happening
    this.showScreen("loading-screen");

    try {
      // STEP 2: Initialize PocketBase connection
      // The 'await' keyword means "wait for this to complete before continuing"
      await bookSwipeAPI.init();

      // STEP 3: Test the connection first
      console.log("🔍 Testing PocketBase connection...");
      await bookSwipeAPI.testConnection();
      console.log("✅ PocketBase connection successful");

      // STEP 4: Load books from the database
      await this.loadBooks();

      // STEP 5: Initialize UI components (like the swipe handler)
      this.initializeUI();

      // STEP 6: Setup event listeners for buttons
      this.setupEventListeners();

      console.log("✅ BookSwipe initialized successfully");

      // STEP 7: Show welcome screen after brief loading (for good UX)
      setTimeout(() => {
        this.showScreen("welcome-screen");
      }, 1500);
    } catch (error) {
      // ERROR HANDLING: If anything goes wrong, show helpful error messages
      console.error("❌ Failed to initialize BookSwipe:", error);
      console.error("❌ Error message:", error.message);
      console.error("❌ Error stack:", error.stack);

      // Different error messages for different problems
      if (error.message.includes("No books available")) {
        this.showError("No books available to vote on.");
      } else if (
        error.message.includes("Failed to fetch") ||
        error.message.includes("404") ||
        error.message.includes("Direct fetch failed")
      ) {
        this.showError(
          'Cannot connect to PocketBase. Please check:\n\n1. PocketBase is running at https://adaptable-oxpecker.pikapod.net\n2. The "books" collection exists\n3. API rules allow public access'
        );
      } else {
        this.showError(
          "Failed to load the application. Please check the console for more details."
        );
      }
    }
  }

  /**
   * LOAD BOOKS FROM DATABASE
   * ========================
   * This fetches all available books from PocketBase and stores them in memory.
   *
   * Manages book data loading with proper error handling and fallback patterns.
   */
  async loadBooks() {
    console.log("📚 Loading books...");

    // Call the API to get all books - this returns a Promise
    this.books = await bookSwipeAPI.getBooks();
    console.log(`📖 Loaded ${this.books.length} books`);

    // Validation: Make sure we actually got some books to vote on
    if (this.books.length === 0) {
      throw new Error(
        "No books available in PocketBase. Please add some books first."
      );
    }
  }

  /**
   * INITIALIZE USER INTERFACE COMPONENTS
   * ===================================
   * This creates and configures the SwipeHandler which manages touch/mouse interactions.
   *
   * Establishes callback communication pattern for loose component coupling.
   * The SwipeHandler doesn't know about the app, but it calls our methods when things happen.
   */
  initializeUI() {
    // Initialize swipe handler
    const cardStack = document.getElementById("card-stack");

    // Create SwipeHandler instance with callback functions
    // When user swipes, it will call our handleSwipe method
    // When no cards are left, it will call our handleAllBooksReviewed method
    this.swipeHandler = new SwipeHandler(cardStack, {
      onSwipe: this.handleSwipe.bind(this), // .bind(this) ensures 'this' refers to BookSwipeApp
      onEmpty: this.handleAllBooksReviewed.bind(this),
    });
  }

  /**
   * SETUP EVENT LISTENERS
   * =====================
   * Connects UI elements to application logic with event delegation.
   * Uses optional chaining (?.) for safe DOM element access.
   */
  setupEventListeners() {
    // Welcome screen - "Start Swiping" button
    document.getElementById("start-btn")?.addEventListener("click", () => {
      this.startVoting();
    });

    // Action buttons in voting screen
    document.getElementById("reject-btn")?.addEventListener("click", () => {
      // Trigger a left swipe programmatically (same as swiping left)
      this.swipeHandler?.triggerSwipe("left");
    });

    document.getElementById("accept-btn")?.addEventListener("click", () => {
      // Trigger a right swipe programmatically (same as swiping right)
      this.swipeHandler?.triggerSwipe("right");
    });

    // Results screen - "Submit My Votes" button
    document
      .getElementById("submit-votes-btn")
      ?.addEventListener("click", () => {
        this.submitVotes();
      });

    // Results screen - "Start Over" button
    document.getElementById("restart-btn")?.addEventListener("click", () => {
      this.restart();
    });

    // Success screen - "Close" button
    document.getElementById("done-btn")?.addEventListener("click", () => {
      this.showScreen("welcome-screen");
    });
  }

  /**
   * START THE VOTING SESSION
   * ========================
   * This transitions from the welcome screen to the voting screen and prepares everything.
   *
   * Resets application state and initializes new voting session.
   */
  startVoting() {
    console.log("🗳️ Starting voting session...");

    // Reset voting state for a fresh start
    this.currentBookIndex = 0; // Start from the first book
    this.userVotes = {}; // Clear any previous votes

    // Switch to voting screen
    this.showScreen("voting-screen");

    // Load the first set of book cards into the DOM
    this.loadCards();

    // Update the progress bar to show current position
    this.updateProgress();
  }

  /**
   * LOAD INITIAL CARDS INTO THE DOM
   * ===============================
   * This creates the HTML elements for book cards and adds them to the page.
   * We only load a few cards at a time for better performance.
   *
   * Progressive card loading for optimal DOM performance.
   * Limits concurrent cards to prevent memory issues.
   */
  loadCards() {
    // Get the container where cards will be placed
    const cardStack = document.getElementById("card-stack");
    cardStack.innerHTML = ""; // Clear any existing cards

    // Performance optimization: Load up to 5 cards at a time
    // This prevents the browser from having to handle too many DOM elements
    const cardsToLoad = Math.min(5, this.books.length - this.currentBookIndex);

    // Create cards for the next few books
    for (let i = 0; i < cardsToLoad; i++) {
      const bookIndex = this.currentBookIndex + i;

      // Make sure we don't go beyond the available books
      if (bookIndex < this.books.length) {
        // Create HTML element for this book
        const card = this.createBookCard(this.books[bookIndex]);

        // Add the card to the page
        cardStack.appendChild(card);

        // Track which book index we've loaded (for performance optimization later)
        this.highestLoadedBookIndex = Math.max(
          this.highestLoadedBookIndex,
          bookIndex
        );
      }
    }

    // Tell the swipe handler to update card positioning (stacking effect)
    this.swipeHandler?.updateCardStack();
  }

  createBookCard(book) {
    const card = document.createElement("div");
    card.className = "book-card";
    card.dataset.bookId = book.id;

    // Format rating
    const ratingStars = bookSwipeAPI.formatRating(
      book.average_storygraph_rating
    );

    // Use full synopsis without truncation
    const synopsis = book.synopsis || "No synopsis available.";

    // Generate genre tags HTML - handle potential null/undefined
    const genreTags = (book.genre_tags || [])
      .slice(0, 6) // Limit to 6 tags
      .map((tag) => `<span class="genre-tag">${tag}</span>`)
      .join("");

    card.innerHTML = `
            <div class="swipe-indicator like">LIKE</div>
            <div class="swipe-indicator pass">PASS</div>

            <div class="book-header">
                <div class="book-cover">
                    ${
                      book.cover_image_url
                        ? `<img src="${book.cover_image_url}" alt="${book.title} cover" loading="lazy" onerror="this.parentElement.classList.add('no-image'); this.style.display='none';">`
                        : `<div class="no-image">📚<br>${book.title.substring(
                            0,
                            20
                          )}</div>`
                    }
                </div>

                <div class="book-header-info">
                    <h2 class="book-title">${book.title}</h2>
                    <p class="book-author">by ${book.author}</p>

                    <div class="book-meta">
                        <span class="meta-item">📄 ${
                          book.page_count || "Unknown"
                        } pages</span>
                        <span class="meta-separator">•</span>
                        <span class="meta-item">📅 ${
                          book.publication_year || "Unknown"
                        }</span>
                    </div>

                    <div class="book-stats">
                        <div class="rating">
                            <span class="rating-stars">${ratingStars}</span>
                            <span>${book.average_storygraph_rating}</span>
                        </div>
                        <div class="vote-count">${
                          book.number_of_votes?.toLocaleString() || "0"
                        } ratings</div>
                    </div>

                    <div class="genre-tags">
                        ${genreTags}
                    </div>
                </div>
            </div>

            <div class="card-content">
                <div class="book-synopsis">
                    ${synopsis}
                </div>
            </div>
        `;

    // Check if content overflows and add scroll indicator
    setTimeout(() => {
      const cardContent = card.querySelector(".card-content");
      if (cardContent && cardContent.scrollHeight > cardContent.clientHeight) {
        cardContent.classList.add("has-overflow");
        card.classList.add("has-scrollable-content");

        // Remove indicators after user scrolls
        const handleScroll = () => {
          cardContent.classList.remove("has-overflow");
          card.classList.remove("has-scrollable-content");
          cardContent.removeEventListener("scroll", handleScroll);
        };
        cardContent.addEventListener("scroll", handleScroll, { once: true });

        // Auto-remove indicators after 5 seconds
        setTimeout(() => {
          cardContent.classList.remove("has-overflow");
          card.classList.remove("has-scrollable-content");
        }, 5000);
      }
    }, 100);

    return card;
  }

  handleSwipe(bookId, vote, direction) {
    console.log(`📊 Vote recorded: ${bookId} = ${vote}`);

    // Record the vote
    this.userVotes[bookId] = vote;

    // Add visual feedback to buttons
    this.animateActionButton(direction);

    // Move to next book
    this.currentBookIndex++;

    // Debug logging
    console.log(
      `🔍 Debug: currentBookIndex=${this.currentBookIndex}, total books=${
        this.books.length
      }, votes recorded=${Object.keys(this.userVotes).length}`
    );

    // Load more cards if needed - check after every swipe
    setTimeout(() => {
      this.loadMoreCards();
    }, 300);

    // Update progress
    this.updateProgress();

    // Check if we've reviewed all books
    // We're done when we've voted on all books (not just when currentBookIndex >= books.length)
    if (Object.keys(this.userVotes).length >= this.books.length) {
      console.log(
        `🏁 Triggering end: voted on ${
          Object.keys(this.userVotes).length
        } out of ${this.books.length} books`
      );
      setTimeout(() => {
        this.handleAllBooksReviewed();
      }, 500);
    }
  }

  loadMoreCards() {
    const cardStack = document.getElementById("card-stack");
    const currentCards = cardStack.children.length;

    // Calculate next book index to load (one after the highest loaded)
    const nextBookIndex = this.highestLoadedBookIndex + 1;
    const remainingBooks = this.books.length - nextBookIndex;

    console.log(
      `🔄 loadMoreCards: currentBookIndex=${this.currentBookIndex}, currentCards=${currentCards}, nextBookIndex=${nextBookIndex}, remainingBooks=${remainingBooks}`
    );

    // Add more cards if we have remaining books and fewer than 3 cards visible
    if (remainingBooks > 0 && currentCards < 3) {
      const cardsToAdd = Math.min(3 - currentCards, remainingBooks);
      console.log(`➕ Adding ${cardsToAdd} cards`);

      for (let i = 0; i < cardsToAdd; i++) {
        const bookIndex = nextBookIndex + i;
        if (bookIndex < this.books.length) {
          console.log(
            `📖 Loading book ${bookIndex}: ${this.books[bookIndex].title}`
          );
          const card = this.createBookCard(this.books[bookIndex]);
          cardStack.appendChild(card);
          this.highestLoadedBookIndex = Math.max(
            this.highestLoadedBookIndex,
            bookIndex
          );
        }
      }

      this.swipeHandler?.updateCardStack();
    } else {
      console.log(
        `⏹️ Not loading cards: remainingBooks=${remainingBooks}, currentCards=${currentCards}`
      );
    }
  }

  animateActionButton(direction) {
    const button =
      direction === "right"
        ? document.getElementById("accept-btn")
        : document.getElementById("reject-btn");

    if (button) {
      button.classList.add("pressed");
      button.classList.add(
        direction === "right" ? "success-feedback" : "reject-feedback"
      );

      setTimeout(() => {
        button.classList.remove(
          "pressed",
          "success-feedback",
          "reject-feedback"
        );
      }, 400);
    }
  }

  updateProgress() {
    const progressFill = document.getElementById("progress-fill");
    const progressText = document.getElementById("progress-text");

    const progress = (this.currentBookIndex / this.books.length) * 100;

    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }

    if (progressText) {
      progressText.textContent = `${this.currentBookIndex} of ${this.books.length}`;
    }
  }

  handleAllBooksReviewed() {
    console.log("🎉 All books reviewed!");

    // Calculate stats
    const likedBooks = Object.values(this.userVotes).filter(
      (vote) => vote === "interested"
    ).length;
    const passedBooks = Object.values(this.userVotes).filter(
      (vote) => vote === "not_interested"
    ).length;

    // Update results screen
    const likedCount = document.getElementById("liked-count");
    const passedCount = document.getElementById("passed-count");

    if (likedCount) likedCount.textContent = likedBooks;
    if (passedCount) passedCount.textContent = passedBooks;

    // Show results screen
    setTimeout(() => {
      this.showScreen("results-screen");
    }, 1000);
  }

  async submitVotes() {
    const submitBtn = document.getElementById("submit-votes-btn");
    const userName = document.getElementById("user-name")?.value || "";

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";
    }

    try {
      console.log("📤 Submitting votes...", this.userVotes);

      const result = await bookSwipeAPI.submitVotes(this.userVotes, userName);

      if (result.success) {
        console.log("✅ Votes submitted successfully");
        this.showScreen("success-screen");
      } else {
        throw new Error(result.error || "Failed to submit votes");
      }
    } catch (error) {
      console.error("❌ Failed to submit votes:", error);

      // Show error but allow user to continue
      alert("Unable to submit votes right now. Please try again later.");

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit My Votes";
      }
    }
  }

  restart() {
    console.log("🔄 Restarting BookSwipe...");

    // Reset state
    this.currentBookIndex = 0;
    this.userVotes = {};
    this.highestLoadedBookIndex = -1;

    // Clear card stack
    const cardStack = document.getElementById("card-stack");
    if (cardStack) {
      cardStack.innerHTML = "";
    }

    // Reset swipe handler
    this.swipeHandler?.reset();

    // Show welcome screen
    this.showScreen("welcome-screen");
  }

  showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.remove("active");
    });

    // Show target screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
      targetScreen.classList.add("active");
    }
  }

  showError(message) {
    console.error(message);
    alert(message); // Simple error display for now
  }
}

/**
 * ========================================
 * APPLICATION INITIALIZATION
 * ========================================
 *
 * Bootstrap sequence: Creates app instance after DOM is ready.
 * Exposes global reference for debugging and development.
 */

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("📱 DOM loaded, starting BookSwipe...");
  window.bookSwipeApp = new BookSwipeApp(); // Make it globally accessible for debugging
});

// Handle page visibility changes (pause/resume)
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    console.log("📱 App paused");
  } else {
    console.log("📱 App resumed");
  }
});
