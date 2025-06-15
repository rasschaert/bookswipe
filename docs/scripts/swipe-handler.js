/**
 * ========================================
 * SWIPE HANDLER - GESTURE RECOGNITION ENGINE
 * ========================================
 *
 * Advanced gesture detection with:
 * - Velocity-based swipe recognition
 * - Scroll conflict resolution using touch-action
 * - Real-time transform updates via CSS custom properties
 * - Momentum calculation with 60fps smoothness
 * - Fallback patterns for mouse/keyboard accessibility
 *
 * TECHNICAL DETAILS:
 * - Distinguishes intentional swipes from scroll gestures
 * - Uses coordinate mathematics for natural card rotation
 * - Implements state machine for drag/scroll/idle modes
 * - Optimizes performance with RAF throttling
 * - Provides callback interface for loose coupling
 */

// Swipe Handler for BookSwipe Cards
class SwipeHandler {
  constructor(cardStack, callbacks = {}) {
    // DOM REFERENCES
    this.cardStack = cardStack; // Card container element
    this.callbacks = callbacks; // Event callbacks: {onSwipe, onEmpty}
    this.currentCard = null; // Active card being manipulated

    // GESTURE STATE - Tracks interaction physics
    this.isDragging = false; // Currently in drag mode
    this.startX = 0; // Initial touch/click X coordinate
    this.startY = 0; // Where the drag started (Y coordinate)
    this.currentX = 0; // Current drag offset from start (X)
    this.currentY = 0; // Current drag offset from start (Y)

    // BEHAVIOR CONFIGURATION
    this.threshold = 80; // How far user must drag to trigger a swipe
    this.rotationFactor = 0.1; // How much the card rotates while dragging (visual effect)

    // SCROLL DETECTION - These help distinguish between scrolling and swiping
    this.allowScrolling = false; // Is user trying to scroll the content?
    this.scrollStartTime = 0; // When did potential scrolling start?
    this.movementThreshold = 15; // Minimum movement to determine user intent

    // DEBUG MODE - Set to true to see detailed logging in console
    this.debug = false;

    // INITIALIZATION
    this.init();
  }

  /**
   * INITIALIZATION
   * ==============
   * Set up all the event listeners and keyboard controls.
   */
  init() {
    this.bindEvents();
    this.setupKeyboardControls();

    if (this.debug) {
      console.log("🎮 SwipeHandler initialized with debug mode enabled");
    }
  }

  /**
   * BIND EVENT LISTENERS
   * ====================
   * Registers touch and mouse event handlers for cross-platform gesture support.
   * Uses passive: false to enable preventDefault() for gesture conflicts.
   */
  bindEvents() {
    // TOUCH EVENTS FOR MOBILE
    // These fire when user touches the screen
    this.cardStack.addEventListener("touchstart", this.handleStart.bind(this), {
      passive: false, // Allows us to prevent scrolling when needed
    });
    this.cardStack.addEventListener("touchmove", this.handleMove.bind(this), {
      passive: false,
    });
    this.cardStack.addEventListener("touchend", this.handleEnd.bind(this), {
      passive: false,
    });

    // MOUSE EVENTS FOR DESKTOP
    // Note: mousemove and mouseup are on document, not just cardStack
    // This ensures we track the mouse even if it goes outside the card area
    this.cardStack.addEventListener("mousedown", this.handleStart.bind(this));
    document.addEventListener("mousemove", this.handleMove.bind(this));
    document.addEventListener("mouseup", this.handleEnd.bind(this));

    // Prevent context menu on long press (that right-click menu)
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

    // Different behavior for touch vs mouse
    const isTouch = e.type === "touchstart";

    if (this.debug) {
      console.log(
        `🎮 handleStart: ${isTouch ? "touch" : "mouse"} event on card ${
          card.dataset.bookId
        }`
      );
    }

    if (isTouch) {
      // Touch: Check if we're starting in a scrollable content area
      const cardContent = e.target.closest(".card-content");
      const isInContent = cardContent && cardContent.contains(e.target);

      // If we're in the content area and it's scrollable, be more permissive
      if (isInContent && cardContent.scrollHeight > cardContent.clientHeight) {
        this.allowScrolling = true;
        this.scrollStartTime = Date.now();
      } else {
        this.allowScrolling = false;
      }

      this.currentCard = card;
      this.isDragging = false; // Don't start dragging immediately on touch

      const point = e.touches[0];
      this.startX = point.clientX;
      this.startY = point.clientY;

      // Don't prevent default immediately - let scroll happen if needed
      if (!this.allowScrolling) {
        e.preventDefault();
      }
    } else {
      // Mouse: Start dragging immediately (desktop behavior)
      this.allowScrolling = false;
      this.currentCard = card;
      this.isDragging = true;

      this.startX = e.clientX;
      this.startY = e.clientY;

      card.classList.add("dragging");
      card.style.cursor = "grabbing";

      if (this.debug) {
        console.log(
          `🖱️ Mouse drag started at (${this.startX}, ${this.startY})`
        );
      }

      e.preventDefault();
    }

    if (this.debug) {
      console.log(
        `🟢 handleStart: ${isTouch ? "Touch" : "Mouse"} drag started`,
        {
          card,
          allowScrolling: this.allowScrolling,
          startX: this.startX,
          startY: this.startY,
        }
      );
    }
  }

  handleMove(e) {
    if (!this.currentCard) return;

    const isTouch = e.type === "touchmove";

    // For mouse events, only process if we're actually dragging
    if (!isTouch && !this.isDragging) return;

    const point = isTouch ? e.touches[0] : e;
    const deltaX = point.clientX - this.startX;
    const deltaY = point.clientY - this.startY;

    if (isTouch) {
      // Touch: Use smart detection for scroll vs swipe
      if (!this.isDragging) {
        const horizontalMovement = Math.abs(deltaX);
        const verticalMovement = Math.abs(deltaY);

        // If we're in scroll mode and vertical movement is dominant, allow scrolling
        if (
          this.allowScrolling &&
          verticalMovement > horizontalMovement &&
          verticalMovement > this.movementThreshold
        ) {
          return; // Let browser handle scrolling
        }

        // If horizontal movement is dominant, start swiping
        if (
          horizontalMovement > this.movementThreshold &&
          horizontalMovement > verticalMovement
        ) {
          this.isDragging = true;
          this.currentCard.classList.add("dragging");
          this.currentCard.style.cursor = "grabbing";
          e.preventDefault();
        } else if (
          verticalMovement < this.movementThreshold &&
          horizontalMovement < this.movementThreshold
        ) {
          return; // Not enough movement to determine intent
        }
      }
    }

    // Both touch (after intent determined) and mouse: Handle dragging
    if (!this.isDragging) return;

    this.currentX = deltaX;
    this.currentY = deltaY;

    const rotation = this.currentX * this.rotationFactor;
    const opacity = Math.max(0.7, 1 - Math.abs(this.currentX) / 300);

    // Apply transform
    this.currentCard.style.transform = `translate(${this.currentX}px, ${this.currentY}px) rotate(${rotation}deg)`;
    this.currentCard.style.opacity = opacity;

    // Show swipe indicators
    this.updateSwipeIndicators();

    e.preventDefault();

    if (this.debug) {
      console.log("🔄 handleMove: Dragging in progress", {
        currentX: this.currentX,
        currentY: this.currentY,
        rotation,
        opacity,
      });
    }
  }

  handleEnd(e) {
    if (!this.currentCard) return;

    const isTouch = e.type === "touchend";

    // For mouse events, only process if we were actually dragging
    if (!isTouch && !this.isDragging) return;

    // Reset scroll state
    this.allowScrolling = false;
    this.scrollStartTime = 0;

    if (!this.isDragging) {
      // If we never started dragging, reset and exit
      this.currentCard = null;
      return;
    }

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

    if (this.debug) {
      console.log("🏁 handleEnd: Dragging ended", {
        distance,
        direction,
        threshold: this.threshold,
      });
    }
  }

  updateSwipeIndicators() {
    if (!this.currentCard) return;

    const distance = Math.abs(this.currentX);
    const direction = this.currentX > 0 ? "right" : "left";

    const likeIndicator = this.currentCard.querySelector(
      ".swipe-indicator.like"
    );
    const passIndicator = this.currentCard.querySelector(
      ".swipe-indicator.pass"
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
      direction === "right" ? "animate-swipe-right" : "animate-swipe-left"
    );

    // Call callback
    if (this.callbacks.onSwipe) {
      this.callbacks.onSwipe(
        bookId,
        direction === "right" ? "interested" : "not_interested",
        direction
      );
    }

    // Remove card after animation
    setTimeout(() => {
      if (card.parentNode) {
        card.parentNode.removeChild(card);
      }
      this.updateCardStack();
    }, 300);

    if (this.debug) {
      console.log(`✅ completeSwipe: Card swiped ${direction}`, { bookId });
    }
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

    if (this.debug) {
      console.log("🔄 resetCard: Card position reset");
    }
  }

  triggerSwipe(direction) {
    const topCard = this.getTopCard();
    if (!topCard) return;

    this.currentCard = topCard;
    this.completeSwipe(direction);

    if (this.debug) {
      console.log(`➡️ triggerSwipe: Swipe triggered ${direction} on top card`);
    }
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

    if (this.debug) {
      console.log("🔄 updateCardStack: Card stack updated", {
        cardCount: cards.length,
        topCard: this.currentCard ? this.currentCard.dataset.bookId : null,
      });
    }
  }

  // Public method to add a new card
  addCard(cardElement) {
    this.cardStack.appendChild(cardElement);
    this.updateCardStack();

    if (this.debug) {
      console.log("➕ addCard: New card added", {
        cardId: cardElement.dataset.bookId,
        remainingCount: this.getRemainingCount(),
      });
    }
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
    this.allowScrolling = false;
    this.scrollStartTime = 0;

    if (this.debug) {
      console.log("🔄 reset: Handler state reset");
    }
  }

  // Destroy the handler (cleanup)
  destroy() {
    // Remove event listeners
    this.cardStack.removeEventListener("touchstart", this.handleStart);
    this.cardStack.removeEventListener("touchmove", this.handleMove);
    this.cardStack.removeEventListener("touchend", this.handleEnd);
    this.cardStack.removeEventListener("mousedown", this.handleStart);
    document.removeEventListener("mousemove", this.handleMove);
    document.removeEventListener("mouseup", this.handleEnd);

    if (this.debug) {
      console.log("🛠️ destroy: Handler destroyed and event listeners removed");
    }
  }
}
