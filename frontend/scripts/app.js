// BookSwipe Main Application
class BookSwipeApp {
  constructor() {
    this.books = [];
    this.currentBookIndex = 0;
    this.userVotes = {};
    this.swipeHandler = null;
    this.isLoading = false;

    this.init();
  }

  async init() {
    console.log("🚀 Initializing BookSwipe...");

    // Show loading screen
    this.showScreen("loading-screen");

    try {
      // Initialize PocketBase connection
      await bookSwipeAPI.init();

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

      if (error.message.includes("No books available")) {
        this.showError("No books available to vote on.");
      } else if (
        error.message.includes("Failed to fetch") ||
        error.message.includes("404")
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

  async loadBooks() {
    console.log("📚 Loading books...");

    this.books = await bookSwipeAPI.getBooks();
    console.log(`📖 Loaded ${this.books.length} books`);

    if (this.books.length === 0) {
      throw new Error(
        "No books available in PocketBase. Please add some books first."
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

    // Synopsis toggle functionality
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("synopsis-toggle")) {
        this.toggleSynopsis(e.target);
      }
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
      book.average_storygraph_rating
    );

    // Truncate synopsis for preview
    const shortSynopsis =
      book.synopsis.length > 150
        ? book.synopsis.substring(0, 150) + "..."
        : book.synopsis;

    // Generate genre tags HTML
    const genreTags = book.genre_tags
      .slice(0, 6) // Limit to 6 tags
      .map((tag) => `<span class="genre-tag">${tag}</span>`)
      .join("");

    card.innerHTML = `
            <div class="swipe-indicator like">LIKE</div>
            <div class="swipe-indicator pass">PASS</div>

            <div class="book-cover">
                ${
                  book.cover_image_url
                    ? `<img src="${book.cover_image_url}" alt="${book.title} cover" loading="lazy" onerror="this.parentElement.classList.add('no-image'); this.style.display='none';">`
                    : `<div class="no-image">📚<br>${book.title}</div>`
                }
            </div>

            <div class="card-content">
                <h2 class="book-title">${book.title}</h2>
                <p class="book-author">by ${book.author}</p>

                <div class="book-meta">
                    <span class="meta-item">📄 ${book.page_count} pages</span>
                    <span class="meta-separator">•</span>
                    <span class="meta-item">📅 ${book.publication_year}</span>
                </div>

                <div class="genre-tags">
                    ${genreTags}
                </div>

                <div class="book-synopsis">
                    <div class="synopsis-short">${shortSynopsis}</div>
                    ${
                      book.synopsis.length > 150
                        ? `
                        <div class="synopsis-full" style="display: none;">${book.synopsis}</div>
                        <a href="#" class="synopsis-toggle">Read more</a>
                    `
                        : ""
                    }
                </div>

                <div class="book-stats">
                    <div class="rating">
                        <span class="rating-stars">${ratingStars}</span>
                        <span>${book.average_storygraph_rating}</span>
                    </div>
                    <div class="vote-count">${
                      book.number_of_votes?.toLocaleString() || "0"
                    } reviews</div>
                </div>
            </div>
        `;

    return card;
  }

  toggleSynopsis(toggleElement) {
    const cardContent = toggleElement.closest(".card-content");
    const shortSynopsis = cardContent.querySelector(".synopsis-short");
    const fullSynopsis = cardContent.querySelector(".synopsis-full");

    if (fullSynopsis.style.display === "none") {
      shortSynopsis.style.display = "none";
      fullSynopsis.style.display = "block";
      toggleElement.textContent = "Read less";
    } else {
      shortSynopsis.style.display = "block";
      fullSynopsis.style.display = "none";
      toggleElement.textContent = "Read more";
    }
  }

  handleSwipe(bookId, vote, direction) {
    console.log(`📊 Vote recorded: ${bookId} = ${vote}`);

    // Record the vote
    this.userVotes[bookId] = vote;

    // Add visual feedback to buttons
    this.animateActionButton(direction);

    // Move to next book
    this.currentBookIndex++;

    // Load more cards if needed
    if (this.currentBookIndex % 3 === 0) {
      // Load new cards every 3 swipes
      setTimeout(() => {
        this.loadMoreCards();
      }, 300);
    }

    // Update progress
    this.updateProgress();

    // Check if we've reviewed all books
    if (this.currentBookIndex >= this.books.length) {
      setTimeout(() => {
        this.handleAllBooksReviewed();
      }, 500);
    }
  }

  loadMoreCards() {
    const cardStack = document.getElementById("card-stack");
    const remainingBooks = this.books.length - this.currentBookIndex;
    const currentCards = cardStack.children.length;

    // Add more cards if we have remaining books and fewer than 3 cards
    if (remainingBooks > 0 && currentCards < 3) {
      const cardsToAdd = Math.min(2, remainingBooks);

      for (let i = 0; i < cardsToAdd; i++) {
        const bookIndex = this.currentBookIndex + currentCards + i;
        if (bookIndex < this.books.length) {
          const card = this.createBookCard(this.books[bookIndex]);
          cardStack.appendChild(card);
        }
      }

      this.swipeHandler?.updateCardStack();
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
