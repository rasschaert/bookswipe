/**
 * ========================================
 * SWIPE HANDLER - GESTURE RECOGNITION ENGINE
 * ========================================
 *
 * Completely refactored gesture system with:
 * - Unified Pointer Events API for touch/mouse/pen
 * - Clear interaction priorities: tap → scroll → swipe
 * - Velocity-based swipe recognition
 * - Pointer capture for reliable tracking
 * - Touch-action CSS coordination
 * - Intent detection with proper thresholds
 *
 * INTERACTION MODEL:
 * 1. Tap/click (< 10px movement) → Flip card
 * 2. Vertical swipe in content → Scroll to read
 * 3. Horizontal swipe on card → Vote (swipe left/right)
 *
 * EVENT PROCESSING ORDER:
 * - pointerdown: Record start position, capture pointer
 * - pointermove: Detect intent (tap vs scroll vs swipe)
 * - pointerup: Complete action based on detected intent
 * - pointercancel: Clean up if browser takes over
 */

class SwipeHandler {
  constructor(cardStack, callbacks = {}) {
    // DOM REFERENCES
    this.cardStack = cardStack;
    this.callbacks = callbacks; // {onSwipe, onEmpty}
    this.currentCard = null;

    // POINTER STATE
    this.activePointerId = null; // Track active pointer
    this.pointerStartX = 0;
    this.pointerStartY = 0;
    this.pointerCurrentX = 0;
    this.pointerCurrentY = 0;
    this.pointerStartTime = 0;

    // GESTURE INTENT STATE
    this.gestureIntent = null; // null | 'tap' | 'scroll' | 'swipe'
    this.isDragging = false;

    // CONFIGURATION
    this.tapThreshold = 10; // Max movement for tap
    this.intentThreshold = 15; // Movement needed to detect intent
    this.swipeThreshold = 80; // Distance needed to complete swipe
    this.velocityThreshold = 0.5; // Pixels per millisecond for flick
    this.rotationFactor = 0.1; // Card rotation during drag

    // DEBUG
    this.debug = false;

    // INITIALIZATION
    this.init();
  }

  /**
   * INITIALIZATION
   * ==============
   * Set up unified pointer event listeners and keyboard controls.
   */
  init() {
    this.bindEvents();
    this.setupKeyboardControls();

    if (this.debug) {
      console.log("🎮 SwipeHandler initialized with Pointer Events API");
    }
  }

  /**
   * BIND POINTER EVENT LISTENERS
   * ============================
   * Uses modern Pointer Events API for unified touch/mouse/pen handling.
   * Pointer capture ensures we track the pointer even outside the element.
   */
  bindEvents() {
    // Use pointer events for unified handling
    this.cardStack.addEventListener(
      "pointerdown",
      this.handlePointerDown.bind(this)
    );
    this.cardStack.addEventListener(
      "pointermove",
      this.handlePointerMove.bind(this)
    );
    this.cardStack.addEventListener(
      "pointerup",
      this.handlePointerUp.bind(this)
    );
    this.cardStack.addEventListener(
      "pointercancel",
      this.handlePointerCancel.bind(this)
    );

    // Prevent context menu on long press
    this.cardStack.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  /**
   * KEYBOARD CONTROLS
   * =================
   * Accessibility fallback for keyboard navigation.
   */
  setupKeyboardControls() {
    document.addEventListener("keydown", (e) => {
      if (!this.getTopCard()) return;

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

  /**
   * POINTER DOWN - START OF INTERACTION
   * ===================================
   * Record starting position and capture the pointer for reliable tracking.
   */
  handlePointerDown(e) {
    // Find the card being interacted with
    const card = e.target.closest(".book-card");
    if (!card || !this.isTopCard(card)) return;

    // Ignore non-primary buttons
    if (e.button !== 0) return;

    // If already tracking a pointer, ignore additional ones
    if (this.activePointerId !== null) return;

    // Check if the pointer is on the flip container (for flip functionality)
    const flipContainer = e.target.closest(".card-flip-container");
    if (!flipContainer) return;

    // Capture this pointer
    this.activePointerId = e.pointerId;
    try {
      this.cardStack.setPointerCapture(e.pointerId);
    } catch (err) {
      // setPointerCapture can fail, handle gracefully
      if (this.debug) {
        console.warn("Failed to capture pointer:", err);
      }
    }

    // Record initial state
    this.currentCard = card;
    this.pointerStartX = e.clientX;
    this.pointerStartY = e.clientY;
    this.pointerCurrentX = e.clientX;
    this.pointerCurrentY = e.clientY;
    this.pointerStartTime = Date.now();
    this.gestureIntent = null;
    this.isDragging = false;

    if (this.debug) {
      console.log("🟢 Pointer down:", {
        pointerId: e.pointerId,
        pointerType: e.pointerType,
        x: e.clientX,
        y: e.clientY
      });
    }
  }

  /**
   * POINTER MOVE - DETECT INTENT AND HANDLE DRAGGING
   * ================================================
   * Determines user intent (tap vs scroll vs swipe) and handles card dragging.
   */
  handlePointerMove(e) {
    // Only process move events for our active pointer
    if (e.pointerId !== this.activePointerId || !this.currentCard) return;

    this.pointerCurrentX = e.clientX;
    this.pointerCurrentY = e.clientY;

    const deltaX = this.pointerCurrentX - this.pointerStartX;
    const deltaY = this.pointerCurrentY - this.pointerStartY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // INTENT DETECTION - Determine what the user is trying to do
    if (this.gestureIntent === null) {
      // Check if we've moved enough to determine intent
      if (absDeltaX < this.intentThreshold && absDeltaY < this.intentThreshold) {
        // Not enough movement yet, still could be a tap
        return;
      }

      // Check if pointer started in scrollable content area
      const target = e.target;
      const cardContent = target.closest(".card-content");
      const isInScrollableArea = cardContent && cardContent.scrollHeight > cardContent.clientHeight;

      // Determine intent based on movement direction
      if (absDeltaY > absDeltaX && isInScrollableArea) {
        // Vertical movement in scrollable area → Allow scrolling
        this.gestureIntent = "scroll";
        this.releasePointer();

        if (this.debug) {
          console.log("📜 Intent: scroll (vertical in scrollable area)");
        }
        return;
      } else if (absDeltaX > absDeltaY && absDeltaX > this.intentThreshold) {
        // Horizontal movement → Start swiping
        this.gestureIntent = "swipe";
        this.isDragging = true;
        this.currentCard.classList.add("dragging");

        if (this.debug) {
          console.log("↔️ Intent: swipe (horizontal movement)");
        }
      } else {
        // Ambiguous or minimal movement → Might be a tap
        this.gestureIntent = "tap";
        return;
      }
    }

    // HANDLE SWIPE DRAGGING
    if (this.gestureIntent === "swipe" && this.isDragging) {
      e.preventDefault(); // Prevent any default behavior during swipe

      // Calculate visual feedback
      const rotation = deltaX * this.rotationFactor;
      const opacity = Math.max(0.7, 1 - absDeltaX / 300);

      // Apply transform to card
      this.currentCard.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotation}deg)`;
      this.currentCard.style.opacity = opacity;

      // Show swipe indicators
      this.updateSwipeIndicators(deltaX, absDeltaX);

      if (this.debug && absDeltaX % 20 === 0) {
        console.log("🔄 Dragging:", { deltaX, deltaY, rotation });
      }
    }
  }

  /**
   * POINTER UP - COMPLETE THE GESTURE
   * =================================
   * Determines final action based on detected intent and movement.
   */
  handlePointerUp(e) {
    // Only process events for our active pointer
    if (e.pointerId !== this.activePointerId || !this.currentCard) return;

    const deltaX = this.pointerCurrentX - this.pointerStartX;
    const deltaY = this.pointerCurrentY - this.pointerStartY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Calculate velocity for flick detection
    const duration = Date.now() - this.pointerStartTime;
    const velocity = duration > 0 ? absDeltaX / duration : 0;

    if (this.debug) {
      console.log("🏁 Pointer up:", {
        intent: this.gestureIntent,
        totalMovement,
        velocity,
        deltaX,
        deltaY
      });
    }

    // PROCESS BASED ON INTENT
    if (this.gestureIntent === "swipe" && this.isDragging) {
      // Check if swipe threshold was met (either distance or velocity)
      const distanceMet = absDeltaX > this.swipeThreshold;
      const velocityMet = velocity > this.velocityThreshold;

      if (distanceMet || velocityMet) {
        // Complete the swipe
        const direction = deltaX > 0 ? "right" : "left";
        this.completeSwipe(direction);
      } else {
        // Swipe canceled - return card to center
        this.resetCard();
      }
    } else if (totalMovement < this.tapThreshold) {
      // It's a tap/click - trigger flip
      this.handleTap(e);
    }

    // Clean up
    this.hideSwipeIndicators();
    this.releasePointer();
    this.resetState();
  }

  /**
   * POINTER CANCEL - HANDLE BROWSER TAKEOVER
   * ========================================
   * Called when browser takes over (e.g., for scrolling or zoom).
   */
  handlePointerCancel(e) {
    if (e.pointerId !== this.activePointerId) return;

    if (this.debug) {
      console.log("❌ Pointer canceled by browser");
    }

    // Clean up without completing any action
    if (this.currentCard && this.isDragging) {
      this.resetCard();
    }

    this.hideSwipeIndicators();
    this.releasePointer();
    this.resetState();
  }

  /**
   * HANDLE TAP/CLICK - FLIP THE CARD
   * ================================
   * Toggles the card flip state for reading more details.
   */
  handleTap(e) {
    if (!this.currentCard) return;

    // Don't flip if we're dragging
    if (this.isDragging) return;

    // Toggle flip state
    this.currentCard.classList.toggle("flipped");

    if (this.debug) {
      console.log("👆 Card flipped");
    }
  }

  /**
   * UPDATE SWIPE INDICATORS
   * =======================
   * Shows LIKE/PASS overlays based on swipe direction and distance.
   */
  updateSwipeIndicators(deltaX, distance) {
    if (!this.currentCard) return;

    const likeIndicator = this.currentCard.querySelector(".swipe-indicator.like");
    const passIndicator = this.currentCard.querySelector(".swipe-indicator.pass");

    if (distance > 30) {
      if (deltaX > 0) {
        // Swiping right → LIKE
        likeIndicator?.classList.add("show");
        passIndicator?.classList.remove("show");
      } else {
        // Swiping left → PASS
        passIndicator?.classList.add("show");
        likeIndicator?.classList.remove("show");
      }
    } else {
      likeIndicator?.classList.remove("show");
      passIndicator?.classList.remove("show");
    }
  }

  /**
   * HIDE SWIPE INDICATORS
   * =====================
   * Removes all indicator overlays.
   */
  hideSwipeIndicators() {
    if (!this.currentCard) return;

    const indicators = this.currentCard.querySelectorAll(".swipe-indicator");
    indicators.forEach((indicator) => indicator.classList.remove("show"));
  }

  /**
   * COMPLETE SWIPE
   * ==============
   * Animates card off screen and triggers vote callback.
   */
  completeSwipe(direction) {
    if (!this.currentCard) return;

    const card = this.currentCard;
    const bookId = card.dataset.bookId;

    // Add exit animation
    card.classList.add(
      direction === "right" ? "animate-swipe-right" : "animate-swipe-left"
    );

    // Trigger vote callback
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
      console.log(`✅ Swipe complete: ${direction}`, { bookId });
    }
  }

  /**
   * RESET CARD
   * ==========
   * Returns card to center position with smooth animation.
   */
  resetCard() {
    if (!this.currentCard) return;

    this.currentCard.classList.remove("dragging");
    this.currentCard.style.transition = "transform 0.3s ease, opacity 0.3s ease";
    this.currentCard.style.transform = "translate(0px, 0px) rotate(0deg)";
    this.currentCard.style.opacity = "1";

    setTimeout(() => {
      if (this.currentCard) {
        this.currentCard.style.transition = "";
      }
    }, 300);

    if (this.debug) {
      console.log("🔄 Card reset to center");
    }
  }

  /**
   * TRIGGER SWIPE PROGRAMMATICALLY
   * ==============================
   * Used by buttons and keyboard controls.
   */
  triggerSwipe(direction) {
    const topCard = this.getTopCard();
    if (!topCard) return;

    this.currentCard = topCard;
    this.completeSwipe(direction);

    if (this.debug) {
      console.log(`➡️ Programmatic swipe: ${direction}`);
    }
  }

  /**
   * RELEASE POINTER
   * ===============
   * Release pointer capture and clear active pointer.
   */
  releasePointer() {
    if (this.activePointerId !== null) {
      try {
        this.cardStack.releasePointerCapture(this.activePointerId);
      } catch (err) {
        // Can fail if already released, that's okay
      }
      this.activePointerId = null;
    }
  }

  /**
   * RESET STATE
   * ===========
   * Clear all interaction state variables.
   */
  resetState() {
    this.currentCard?.classList.remove("dragging");
    this.currentCard = null;
    this.gestureIntent = null;
    this.isDragging = false;
    this.pointerStartX = 0;
    this.pointerStartY = 0;
    this.pointerCurrentX = 0;
    this.pointerCurrentY = 0;
    this.pointerStartTime = 0;
  }

  /**
   * CARD STACK MANAGEMENT
   * =====================
   * Helper methods for managing the card stack.
   */

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
      // Apply stacking styles
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

    // Call empty callback if no more cards
    if (cards.length === 0 && this.callbacks.onEmpty) {
      this.callbacks.onEmpty();
    }

    if (this.debug) {
      console.log("📚 Card stack updated:", { cardCount: cards.length });
    }
  }

  /**
   * PUBLIC METHODS
   * ==============
   * Methods exposed for external control.
   */

  getRemainingCount() {
    return this.cardStack.querySelectorAll(".book-card").length;
  }

  reset() {
    this.releasePointer();
    this.resetState();

    if (this.debug) {
      console.log("🔄 Handler reset");
    }
  }

  destroy() {
    // Clean up event listeners
    this.cardStack.removeEventListener("pointerdown", this.handlePointerDown);
    this.cardStack.removeEventListener("pointermove", this.handlePointerMove);
    this.cardStack.removeEventListener("pointerup", this.handlePointerUp);
    this.cardStack.removeEventListener("pointercancel", this.handlePointerCancel);

    this.releasePointer();
    this.resetState();

    if (this.debug) {
      console.log("🛠️ Handler destroyed");
    }
  }
}
