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

      // Check if we're in mock mode
      const urlParams = new URLSearchParams(window.location.search);
      const isMockMode = urlParams.get("mock") === "true";

      // Different error messages for different problems
      if (error.message.includes("No books available")) {
        this.showError("No books available to vote on.");
      } else if (isMockMode && error.message.includes("mock.json")) {
        this.showError(
          'Failed to load mock data.\n\nPlease check:\n1. mock.json exists at scripts/mock.json\n2. The file is valid JSON\n3. You are using a web server (not file:// protocol)\n\nActual error: ' + error.message
        );
      } else if (
        error.message.includes("Failed to fetch") ||
        error.message.includes("404") ||
        error.message.includes("Direct fetch failed")
      ) {
        if (isMockMode) {
          this.showError(
            'Mock mode is enabled but failed to load data.\n\nPlease check:\n1. The web server is running\n2. mock.json is accessible at scripts/mock.json\n\nActual error: ' + error.message
          );
        } else {
          this.showError(
            'Cannot connect to PocketBase. Please check:\n\n1. PocketBase is running at https://bookswipe.modest-moray-8349.pomerium.app\n2. The "books" collection exists\n3. API rules allow public access'
          );
        }
      } else {
        this.showError(
          "Failed to load the application. Please check the console for more details.\n\nError: " + error.message
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
        "No books available in PocketBase. Please add some books first.",
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
          bookIndex,
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
      book.average_storygraph_rating,
    );

    // Use full synopsis without truncation
    const synopsis = book.synopsis || "No synopsis available.";

    // Generate genre tags HTML - handle potential null/undefined
    const genreTags = (book.genre_tags || [])
      .map((tag) => `<span class="genre-tag">${tag}</span>`)
      .join("");

    // Get new fields with defaults
    const country = book.country || "";
    const suggester = book.suggester || "";
    const pitch = book.pitch || "";

    // Helper function to escape HTML but preserve newlines
    const escapeHtml = (text) => {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    };

    card.innerHTML = `
            <div class="swipe-indicator like">LIKE</div>
            <div class="swipe-indicator pass">PASS</div>

            <div class="card-flip-container">
                <!-- FRONT FACE -->
                <div class="card-face card-face-front">
                    <div class="book-header">
                        <div class="book-cover">
                            ${
                              book.cover_image_url
                                ? `<img src="${book.cover_image_url}" alt="${book.title} cover" loading="lazy" onerror="this.parentElement.classList.add('no-image'); this.style.display='none';">`
                                : `<div class="no-image">📚<br>${book.title.substring(
                                    0,
                                    20,
                                  )}</div>`
                            }
                        </div>

                        <div class="book-header-info">
                            <h2 class="book-title">${book.title}</h2>
                            <p class="book-author">by ${book.author}${
                              country ? ` • ${country}` : ""
                            }</p>

                            <div class="book-meta">
                                <span class="meta-item">📅 ${
                                  book.publication_year || "Unknown"
                                }</span>
                                <span class="meta-separator">•</span>
                                <span class="meta-item">📄 ${
                                  book.page_count || "Unknown"
                                } pages</span>
                            </div>

                            <div class="book-stats">
                                <div class="rating">
                                    <span class="rating-stars">${ratingStars}</span>
                                    <span>${
                                      book.average_storygraph_rating
                                    }</span>
                                </div>
                                <div class="vote-count">${
                                  book.number_of_votes?.toLocaleString() || "0"
                                } ratings</div>
                            </div>
                        </div>
                    </div>

                    <div class="card-content">
                        ${
                          suggester
                            ? `
                            <div class="book-suggester">
                                <div class="suggester-label">💡 Suggested by:</div>
                                <div class="suggester-name">${suggester}</div>
                            </div>
                        `
                            : ""
                        }
                        ${
                          pitch
                            ? `
                            <div class="book-pitch">
                                <div class="pitch-label">📣 Pitch:</div>
                                <div class="pitch-text"></div>
                            </div>
                        `
                            : ""
                        }
                        <div class="flip-hint">👆 Tap card to see more details</div>
                    </div>
                </div>

                <!-- BACK FACE -->
                <div class="card-face card-face-back">
                    <div class="book-header">
                        <div class="book-cover">
                            ${
                              book.cover_image_url
                                ? `<img src="${book.cover_image_url}" alt="${book.title} cover" loading="lazy" onerror="this.parentElement.classList.add('no-image'); this.style.display='none';">`
                                : `<div class="no-image">📚<br>${book.title.substring(
                                    0,
                                    20,
                                  )}</div>`
                            }
                        </div>

                        <div class="book-header-info">
                            <h2 class="book-title">${book.title}</h2>
                            <p class="book-author">by ${book.author}${
                              country ? ` • ${country}` : ""
                            }</p>

                            <div class="genre-tags">
                                ${genreTags}
                            </div>
                        </div>
                    </div>

                    <div class="card-content">
                        <div class="book-synopsis"></div>
                        <div class="flip-hint">👆 Tap to flip back</div>
                    </div>
                </div>
            </div>
        `;

    // Set text content to preserve newlines properly
    const synopsisEl = card.querySelector(".book-synopsis");
    if (synopsisEl) {
      synopsisEl.textContent = synopsis;
    }

    const pitchTextEl = card.querySelector(".pitch-text");
    if (pitchTextEl && pitch) {
      pitchTextEl.textContent = `"${pitch}"`;
    }

    // Note: Card flipping is now handled by SwipeHandler
    // No need for separate flip logic here

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
      }, votes recorded=${Object.keys(this.userVotes).length}`,
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
        } out of ${this.books.length} books`,
      );
      setTimeout(async () => {
        await this.handleAllBooksReviewed();
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
      `🔄 loadMoreCards: currentBookIndex=${this.currentBookIndex}, currentCards=${currentCards}, nextBookIndex=${nextBookIndex}, remainingBooks=${remainingBooks}`,
    );

    // Add more cards if we have remaining books and fewer than 3 cards visible
    if (remainingBooks > 0 && currentCards < 3) {
      const cardsToAdd = Math.min(3 - currentCards, remainingBooks);
      console.log(`➕ Adding ${cardsToAdd} cards`);

      for (let i = 0; i < cardsToAdd; i++) {
        const bookIndex = nextBookIndex + i;
        if (bookIndex < this.books.length) {
          console.log(
            `📖 Loading book ${bookIndex}: ${this.books[bookIndex].title}`,
          );
          const card = this.createBookCard(this.books[bookIndex]);
          cardStack.appendChild(card);
          this.highestLoadedBookIndex = Math.max(
            this.highestLoadedBookIndex,
            bookIndex,
          );
        }
      }

      this.swipeHandler?.updateCardStack();
    } else {
      console.log(
        `⏹️ Not loading cards: remainingBooks=${remainingBooks}, currentCards=${currentCards}`,
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
        direction === "right" ? "success-feedback" : "reject-feedback",
      );

      setTimeout(() => {
        button.classList.remove(
          "pressed",
          "success-feedback",
          "reject-feedback",
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

  async handleAllBooksReviewed() {
    console.log("🎉 All books reviewed!");

    // Calculate stats
    const likedBooks = Object.values(this.userVotes).filter(
      (vote) => vote === "interested",
    ).length;
    const passedBooks = Object.values(this.userVotes).filter(
      (vote) => vote === "not_interested",
    ).length;

    // Update results screen
    const likedCount = document.getElementById("liked-count");
    const passedCount = document.getElementById("passed-count");

    if (likedCount) likedCount.textContent = likedBooks;
    if (passedCount) passedCount.textContent = passedBooks;

    // Check if user is authenticated and update UI accordingly
    try {
      const currentUser = await bookSwipeAPI.getCurrentUser();
      this.updateResultsScreenForAuth(currentUser);
    } catch (error) {
      console.log("Could not check authentication:", error);
      // Continue with default behavior (show name input)
    }

    // Show results screen
    setTimeout(() => {
      this.showScreen("results-screen");
    }, 1000);
  }

  async submitVotes() {
    const submitBtn = document.getElementById("submit-votes-btn");

    // Try to get the user identifier from authenticated user or input field
    let userName = "";
    try {
      const currentUser = await bookSwipeAPI.getCurrentUser();
      if (currentUser && currentUser.email) {
        // Use email as the identifier for authenticated users
        userName = currentUser.email;
      } else {
        // Fall back to manual input for non-authenticated users
        userName = document.getElementById("user-name")?.value?.trim() || "";
      }
    } catch (error) {
      // If auth check fails, fall back to input field
      userName = document.getElementById("user-name")?.value?.trim() || "";
    }

    // Validate that we have a user identifier
    if (!userName) {
      alert("Please enter your name before submitting your votes.");
      return;
    }

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

  /**
   * UPDATE RESULTS SCREEN BASED ON AUTHENTICATION STATUS
   * ===================================================
   * If user is authenticated, show their display name and hide name input.
   * If not authenticated, show the name input field.
   */
  updateResultsScreenForAuth(currentUser) {
    const userInputSection = document.querySelector(".user-input-section");
    const resultsActions = document.querySelector(".results-actions");

    if (currentUser && currentUser.email) {
      // User is authenticated - show their display name and hide input
      console.log(
        "✅ User authenticated:",
        currentUser.displayName || currentUser.email,
      );

      // Hide the name input section
      if (userInputSection) {
        userInputSection.style.display = "none";
      }

      // Create or update the user display
      let userDisplay = document.getElementById("authenticated-user-display");
      if (!userDisplay) {
        userDisplay = document.createElement("div");
        userDisplay.id = "authenticated-user-display";
        userDisplay.className = "authenticated-user-info";

        // Insert before the results actions (submit/start over buttons)
        if (resultsActions) {
          resultsActions.parentNode.insertBefore(userDisplay, resultsActions);
        }
      }

      // Show display name to user, but we'll use email for submission
      const displayText = currentUser.displayName || currentUser.email;
      userDisplay.innerHTML = `
        <p class="user-label">Submitting as:</p>
        <p class="user-display-name">${displayText}</p>
      `;
    } else {
      // User is not authenticated - show name input
      console.log("ℹ️ User not authenticated - showing name input");

      // Show the name input section
      if (userInputSection) {
        userInputSection.style.display = "block";
      }

      // Hide any existing user display
      const userDisplay = document.getElementById("authenticated-user-display");
      if (userDisplay) {
        userDisplay.style.display = "none";
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
