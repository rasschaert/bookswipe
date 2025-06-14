// Swipe Handler for BookSwipe Cards
class SwipeHandler {
  constructor(cardStack, callbacks = {}) {
    this.cardStack = cardStack;
    this.callbacks = callbacks;
    this.currentCard = null;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.threshold = 80; // Minimum distance to trigger swipe
    this.rotationFactor = 0.1; // How much the card rotates while dragging

    this.init();
  }

  init() {
    this.bindEvents();
    this.setupKeyboardControls();
  }

  bindEvents() {
    // Touch events for mobile
    this.cardStack.addEventListener("touchstart", this.handleStart.bind(this), {
      passive: false,
    });
    this.cardStack.addEventListener("touchmove", this.handleMove.bind(this), {
      passive: false,
    });
    this.cardStack.addEventListener("touchend", this.handleEnd.bind(this), {
      passive: false,
    });

    // Mouse events for desktop
    this.cardStack.addEventListener("mousedown", this.handleStart.bind(this));
    this.cardStack.addEventListener("mousemove", this.handleMove.bind(this));
    this.cardStack.addEventListener("mouseup", this.handleEnd.bind(this));
    this.cardStack.addEventListener("mouseleave", this.handleEnd.bind(this));

    // Prevent context menu on long press
    this.cardStack.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  setupKeyboardControls() {
    document.addEventListener("keydown", (e) => {
      if (!this.currentCard) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          this.triggerSwipe("left");
          break;
        case "ArrowRight":
          e.preventDefault();
          this.triggerSwipe("right");
          break;
        case " ": // Spacebar
          e.preventDefault();
          this.triggerSwipe("right");
          break;
        case "Escape":
          e.preventDefault();
          this.triggerSwipe("left");
          break;
      }
    });
  }

  handleStart(e) {
    const card = e.target.closest(".book-card");
    if (!card || !this.isTopCard(card)) return;

    this.currentCard = card;
    this.isDragging = true;

    const point = e.touches ? e.touches[0] : e;
    this.startX = point.clientX;
    this.startY = point.clientY;

    card.classList.add("dragging");
    card.style.cursor = "grabbing";

    // Prevent text selection
    e.preventDefault();
  }

  handleMove(e) {
    if (!this.isDragging || !this.currentCard) return;

    const point = e.touches ? e.touches[0] : e;
    this.currentX = point.clientX - this.startX;
    this.currentY = point.clientY - this.startY;

    const rotation = this.currentX * this.rotationFactor;
    const opacity = Math.max(0.7, 1 - Math.abs(this.currentX) / 300);

    // Apply transform
    this.currentCard.style.transform = `translate(${this.currentX}px, ${this.currentY}px) rotate(${rotation}deg)`;
    this.currentCard.style.opacity = opacity;

    // Show swipe indicators
    this.updateSwipeIndicators();

    e.preventDefault();
  }

  handleEnd(e) {
    if (!this.isDragging || !this.currentCard) return;

    this.isDragging = false;
    const card = this.currentCard;

    card.classList.remove("dragging");
    card.style.cursor = "grab";

    // Determine if swipe threshold was met
    const distance = Math.abs(this.currentX);
    const direction = this.currentX > 0 ? "right" : "left";

    if (distance > this.threshold) {
      this.completeSwipe(direction);
    } else {
      this.resetCard();
    }

    // Hide swipe indicators
    this.hideSwipeIndicators();

    this.currentCard = null;
    this.currentX = 0;
    this.currentY = 0;
  }

  updateSwipeIndicators() {
    if (!this.currentCard) return;

    const distance = Math.abs(this.currentX);
    const direction = this.currentX > 0 ? "right" : "left";

    const likeIndicator = this.currentCard.querySelector(
      ".swipe-indicator.like",
    );
    const passIndicator = this.currentCard.querySelector(
      ".swipe-indicator.pass",
    );

    if (distance > 30) {
      // Show indicator when dragging starts
      if (direction === "right" && likeIndicator) {
        likeIndicator.classList.add("show");
        passIndicator?.classList.remove("show");
      } else if (direction === "left" && passIndicator) {
        passIndicator.classList.add("show");
        likeIndicator?.classList.remove("show");
      }
    } else {
      likeIndicator?.classList.remove("show");
      passIndicator?.classList.remove("show");
    }
  }

  hideSwipeIndicators() {
    if (!this.currentCard) return;

    const indicators = this.currentCard.querySelectorAll(".swipe-indicator");
    indicators.forEach((indicator) => indicator.classList.remove("show"));
  }

  completeSwipe(direction) {
    if (!this.currentCard) return;

    const card = this.currentCard;
    const bookId = card.dataset.bookId;

    // Add animation class
    card.classList.add(
      direction === "right" ? "animate-swipe-right" : "animate-swipe-left",
    );

    // Call callback
    if (this.callbacks.onSwipe) {
      this.callbacks.onSwipe(
        bookId,
        direction === "right" ? "interested" : "not_interested",
        direction,
      );
    }

    // Remove card after animation
    setTimeout(() => {
      if (card.parentNode) {
        card.parentNode.removeChild(card);
      }
      this.updateCardStack();
    }, 300);
  }

  resetCard() {
    if (!this.currentCard) return;

    // Reset transform with smooth transition
    this.currentCard.style.transition =
      "transform 0.3s ease, opacity 0.3s ease";
    this.currentCard.style.transform = "translate(0px, 0px) rotate(0deg)";
    this.currentCard.style.opacity = "1";

    // Remove transition after animation
    setTimeout(() => {
      if (this.currentCard) {
        this.currentCard.style.transition = "";
      }
    }, 300);
  }

  triggerSwipe(direction) {
    const topCard = this.getTopCard();
    if (!topCard) return;

    this.currentCard = topCard;
    this.completeSwipe(direction);
  }

  isTopCard(card) {
    const cards = Array.from(this.cardStack.querySelectorAll(".book-card"));
    return cards.length > 0 && cards[0] === card;
  }

  getTopCard() {
    const cards = this.cardStack.querySelectorAll(".book-card");
    return cards.length > 0 ? cards[0] : null;
  }

  updateCardStack() {
    const cards = Array.from(this.cardStack.querySelectorAll(".book-card"));

    cards.forEach((card, index) => {
      // Remove old positioning classes
      card.classList.remove("animate-stack");

      // Apply new stacking styles
      if (index === 0) {
        card.style.zIndex = 10;
        card.style.transform = "scale(1) translateY(0)";
        card.style.opacity = "1";
      } else if (index === 1) {
        card.style.zIndex = 9;
        card.style.transform = "scale(0.95) translateY(10px)";
        card.style.opacity = "0.8";
      } else if (index === 2) {
        card.style.zIndex = 8;
        card.style.transform = "scale(0.9) translateY(20px)";
        card.style.opacity = "0.6";
      } else {
        card.style.zIndex = 7;
        card.style.transform = "scale(0.85) translateY(30px)";
        card.style.opacity = "0.4";
      }
    });

    // Update the top card reference
    this.currentCard = this.getTopCard();

    // Call callback if no more cards
    if (cards.length === 0 && this.callbacks.onEmpty) {
      this.callbacks.onEmpty();
    }
  }

  // Public method to add a new card
  addCard(cardElement) {
    this.cardStack.appendChild(cardElement);
    this.updateCardStack();
  }

  // Public method to get remaining card count
  getRemainingCount() {
    return this.cardStack.querySelectorAll(".book-card").length;
  }

  // Public method to reset the handler
  reset() {
    this.currentCard = null;
    this.isDragging = false;
    this.currentX = 0;
    this.currentY = 0;
  }

  // Destroy the handler (cleanup)
  destroy() {
    // Remove event listeners
    this.cardStack.removeEventListener("touchstart", this.handleStart);
    this.cardStack.removeEventListener("touchmove", this.handleMove);
    this.cardStack.removeEventListener("touchend", this.handleEnd);
    this.cardStack.removeEventListener("mousedown", this.handleStart);
    this.cardStack.removeEventListener("mousemove", this.handleMove);
    this.cardStack.removeEventListener("mouseup", this.handleEnd);
    this.cardStack.removeEventListener("mouseleave", this.handleEnd);
  }
}
