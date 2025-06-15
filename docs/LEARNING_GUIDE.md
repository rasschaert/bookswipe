# 📚 BookSwipe Code Guide

This guide focuses on the unique implementation details of BookSwipe - the interesting parts that aren't standard web development patterns.

## 📖 Technical References

- **📋 [CODE_STRUCTURE.md](CODE_STRUCTURE.md)** - Component relationships and data flow
- **🎨 [CSS_ARCHITECTURE.md](CSS_ARCHITECTURE.md)** - Card stacking and animation techniques
- **🛠️ [EXERCISES.md](EXERCISES.md)** - Code examples for extending functionality

## 🔍 Unique Implementation Details

### Gesture-Based Card Physics

**File: `docs/scripts/swipe-handler.js`**

The swipe detection uses real-time coordinate tracking with momentum calculations:

```javascript
// Calculates velocity based on recent movement history
const velocity = this.getSwipeVelocity(currentX, currentY);
// Determines direction even for incomplete swipes
const direction = this.getSwipeDirection(deltaX, deltaY, velocity);
```

Interesting parts:

- Cards follow finger/cursor with CSS transforms updated on every frame
- Rotation angle calculated from horizontal displacement for natural feel
- Velocity detection allows quick flicks to register even without full swipe distance

### Stack Visual Management

**File: `docs/styles/cards.css`**

Multiple cards visible simultaneously with depth illusion:

```css
.book-card:nth-child(2) {
  transform: scale(0.95) translateY(10px);
  z-index: 9;
}
.book-card:nth-child(3) {
  transform: scale(0.9) translateY(20px);
  z-index: 8;
}
```

The stack rebuilds after each swipe rather than pre-rendering all cards.

### PocketBase Integration Pattern

**File: `docs/scripts/api-fetch.js`**

Handles the PocketBase realtime database with automatic retry and connection management:

```javascript
// Auto-discovery of PocketBase endpoint
async init() {
  const endpoints = ['/api', 'http://localhost:8090'];
  // Tests each endpoint for availability
}
```

Notable: The app works offline and queues votes until connection is restored.

### Progressive Enhancement Strategy

**File: `docs/scripts/app.js`**

The app degrades gracefully:

- Works without backend (votes stored locally)
- Touch events with mouse fallbacks
- Keyboard navigation as alternative input method

### Custom Animation Timing

Cards use custom easing curves for natural feel:

```javascript
// Non-linear timing for authentic card physics
const progress = this.easeOutBack(normalizedProgress);
```

The `easeOutBack` function creates a slight overshoot effect mimicking real card behavior.

## 🛠️ Architecture Decisions

### Why No Framework?

- Keeps bundle size minimal for mobile
- Direct DOM manipulation for gesture responsiveness
- Easier to understand implementation details

### State Management Approach

```javascript
// Simple object-based state instead of complex state management
this.userVotes = {}; // Direct property access
this.books = []; // No getters/setters needed
```

### Event Flow Pattern

Components communicate through bound callbacks rather than event bubbling:

```javascript
// Direct callback binding for performance
this.swipeHandler = new SwipeHandler(cardStack, {
  onSwipe: this.handleSwipe.bind(this),
});
```

## 🔧 Implementation Notes

### Performance Optimizations

- CSS transforms instead of changing position properties (GPU acceleration)
- `will-change` hints for smooth animations
- Event delegation to minimize listeners
- Throttled gesture updates during drag

### Mobile-Specific Considerations

- Touch-action CSS to prevent browser interference
- Minimum 44px touch targets for accessibility
- Prevents zoom on double-tap
- Handles iOS Safari quirks with viewport units

## 🔍 Debugging Features

### Debug Mode

Enable detailed logging in `swipe-handler.js`:

```javascript
this.debug = true; // Shows gesture calculations in console
```

### Global Access

App instance available globally for debugging:

```javascript
window.bookSwipeApp.userVotes; // Current votes
window.bookSwipeApp.books; // Loaded books
```
