// BookSwipe Main Application
class BookSwipeApp {
  constructor() {
    this.books = [];
    this.currentBookIndex = 0;
    this.userVotes = {};
    this.swipeHandler = null;
    this.isLoading = false;
    this.highestLoadedBookIndex = -1; // Track the highest book index that has been loaded

    this.init();
  }

  async init() {
    console.log("🚀 Initializing BookSwipe...");

    // Show loading screen
    this.showScreen("loading-screen");

    try {
      // Initialize PocketBase connection
      await bookSwipeAPI.init();

      // Test the connection first
      console.log("🔍 Testing PocketBase connection...");
      await bookSwipeAPI.testConnection();
      console.log("✅ PocketBase connection successful");

      // Load books
      await this.loadBooks();

      // Initialize UI
      this.initializeUI();

      // Setup event listeners
      this.setupEventListeners();

      console.log("✅ BookSwipe initialized successfully");

      // Show welcome screen after brief loading
      setTimeout(() => {
        this.showScreen("welcome-screen");
      }, 1500);
    } catch (error) {
      console.error("❌ Failed to initialize BookSwipe:", error);
      console.error("❌ Error message:", error.message);
      console.error("❌ Error stack:", error.stack);

      if (error.message.includes("No books available")) {
        this.showError("No books available to vote on.");
      } else if (
        error.message.includes("Failed to fetch") ||
        error.message.includes("404") ||
        error.message.includes("Direct fetch failed")
      ) {
        this.showError(
          'Cannot connect to PocketBase. Please check:\n\n1. PocketBase is running at https://adaptable-oxpecker.pikapod.net\n2. The "books" collection exists\n3. API rules allow public access',
        );
      } else {
        this.showError(
          "Failed to load the application. Please check the console for more details.",
        );
      }
    }
  }

  async loadBooks() {
    console.log("📚 Loading books...");

    this.books = await bookSwipeAPI.getBooks();
    console.log(`📖 Loaded ${this.books.length} books`);

    if (this.books.length === 0) {
      throw new Error(
        "No books available in PocketBase. Please add some books first.",
      );
    }
  }

  initializeUI() {
    // Initialize swipe handler
    const cardStack = document.getElementById("card-stack");
    this.swipeHandler = new SwipeHandler(cardStack, {
      onSwipe: this.handleSwipe.bind(this),
      onEmpty: this.handleAllBooksReviewed.bind(this),
    });
  }

  setupEventListeners() {
    // Welcome screen
    document.getElementById("start-btn")?.addEventListener("click", () => {
      this.startVoting();
    });

    // Action buttons
    document.getElementById("reject-btn")?.addEventListener("click", () => {
      this.swipeHandler?.triggerSwipe("left");
    });

    document.getElementById("accept-btn")?.addEventListener("click", () => {
      this.swipeHandler?.triggerSwipe("right");
    });

    // Results screen
    document
      .getElementById("submit-votes-btn")
      ?.addEventListener("click", () => {
        this.submitVotes();
      });

    document.getElementById("restart-btn")?.addEventListener("click", () => {
      this.restart();
    });

    // Success screen
    document.getElementById("done-btn")?.addEventListener("click", () => {
      this.showScreen("welcome-screen");
    });
  }

  startVoting() {
    console.log("🗳️ Starting voting session...");

    this.currentBookIndex = 0;
    this.userVotes = {};

    this.showScreen("voting-screen");
    this.loadCards();
    this.updateProgress();
  }

  loadCards() {
    const cardStack = document.getElementById("card-stack");
    cardStack.innerHTML = "";

    // Load up to 5 cards at a time for performance
    const cardsToLoad = Math.min(5, this.books.length - this.currentBookIndex);

    for (let i = 0; i < cardsToLoad; i++) {
      const bookIndex = this.currentBookIndex + i;
      if (bookIndex < this.books.length) {
        const card = this.createBookCard(this.books[bookIndex]);
        cardStack.appendChild(card);
        this.highestLoadedBookIndex = Math.max(
          this.highestLoadedBookIndex,
          bookIndex,
        );
      }
    }

    // Update card stack positioning
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
                            20,
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

  handleAllBooksReviewed() {
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

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("📱 DOM loaded, starting BookSwipe...");
  new BookSwipeApp();
});

// Handle page visibility changes (pause/resume)
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    console.log("📱 App paused");
  } else {
    console.log("📱 App resumed");
  }
});
