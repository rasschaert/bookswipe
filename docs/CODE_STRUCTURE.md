# 📋 Code Structure & Architecture Reference

This document provides a comprehensive overview of how the BookSwipe codebase is organized and how the different parts work together.

## 🏗️ Overall Architecture

BookSwipe follows a **Component-Based Architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│               USER INTERFACE            │
│            (HTML + CSS)                 │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│           APPLICATION LAYER             │
│              (app.js)                   │
│  • State Management                     │
│  • Screen Transitions                   │
│  • Event Coordination                   │
└─────────────┬───────────┬───────────────┘
              │           │
    ┌─────────▼─────────┐ │
    │ INTERACTION LAYER │ │
    │ (swipe-handler.js)│ │
    │ • Touch Events    │ │
    │ • Gesture Logic   │ │
    │ • Animations      │ │
    └───────────────────┘ │
                          │
              ┌───────────▼───────────┐
              │      DATA LAYER       │
              │   (api-fetch.js)      │
              │ • API Communication   │
              │ • Data Formatting     │
              │ • Error Handling      │
              └───────────────────────┘
```

## 📁 File Structure Explained

### Frontend Application (`/docs/`)

```
docs/
├── index.html              # Single page containing all screens
├── LEARNING_GUIDE.md       # 📚 Main learning guide
├── CSS_ARCHITECTURE.md     # 🎨 CSS-specific guide
├── scripts/
│   ├── app.js             # 🧠 Main application controller
│   ├── swipe-handler.js   # 👆 Touch/mouse interaction handler
│   └── api-fetch.js       # 🌐 Backend communication
└── styles/
    ├── main.css           # 🎨 Core styles and layout
    ├── cards.css          # 📋 Book card specific styles
    └── animations.css     # ✨ Motion and transitions
```

### Backend Management (`/admin-tools/`)

```
admin-tools/
├── package.json           # Node.js dependencies
├── config.json           # PocketBase connection settings
├── scripts/
│   ├── setup.js          # 🛠️ Initial database setup
│   ├── book-manager.js   # 📚 Core book management utilities
│   ├── import-books.js   # 📥 Book import tool
│   └── analyze-votes.js  # 📊 Vote analysis and reporting
└── data/
    ├── sample-classics.json  # Example book data
    ├── exports/             # Generated reports
    └── backups/             # Data backups
```

## 🔄 Data Flow Diagram

```
User Action (swipe/click)
        ↓
SwipeHandler (detects gesture)
        ↓
BookSwipeApp.handleSwipe() (processes vote)
        ↓
Update UI + Local State
        ↓
When complete: API.submitVotes()
        ↓
PocketBase Database
```

## 🧩 Component Responsibilities

### 1. `BookSwipeApp` (Main Controller)

**Purpose**: Orchestrates the entire application

**Responsibilities**:

- ✅ Application state management
- ✅ Screen transitions
- ✅ Data loading and processing
- ✅ User vote tracking
- ✅ API coordination

**Key Methods**:

```javascript
init(); // App startup sequence
loadBooks(); // Fetch data from API
startVoting(); // Begin voting session
handleSwipe(); // Process user votes
showScreen(); // Manage screen transitions
```

### 2. `SwipeHandler` (Interaction Layer)

**Purpose**: Handles all user gestures and card animations

**Responsibilities**:

- ✅ Touch and mouse event processing
- ✅ Gesture recognition (swipe vs scroll)
- ✅ Real-time card positioning
- ✅ Animation coordination
- ✅ Keyboard controls

**Key Methods**:

```javascript
handleStart(); // Begin drag/touch
handleMove(); // Track movement
handleEnd(); // Complete gesture
completeSwipe(); // Execute swipe action
updateCardStack(); // Manage card positioning
```

### 3. `BookSwipeAPI` (Data Layer)

**Purpose**: Manages all backend communication

**Responsibilities**:

- ✅ PocketBase connection management
- ✅ Book data fetching
- ✅ Vote submission
- ✅ Error handling and retries
- ✅ Data formatting

**Key Methods**:

```javascript
init(); // Initialize connection
getBooks(); // Fetch all books
submitVotes(); // Send user votes
testConnection(); // Health check
```

## 🔗 Communication Patterns

### 1. Callback Pattern

Components communicate through callback functions:

```javascript
// SwipeHandler notifies BookSwipeApp of events
this.swipeHandler = new SwipeHandler(cardStack, {
  onSwipe: this.handleSwipe.bind(this),
  onEmpty: this.handleAllBooksReviewed.bind(this),
});
```

### 2. Event-Driven Architecture

User interactions trigger a chain of events:

```javascript
// Button click → Method call → State change → UI update
document.getElementById("start-btn")?.addEventListener("click", () => {
  this.startVoting();
});
```

### 3. Promise-Based API

Asynchronous operations use modern async/await:

```javascript
async init() {
  await bookSwipeAPI.init();
  await this.loadBooks();
  this.initializeUI();
}
```

## 📊 State Management

### Application State Structure

```javascript
class BookSwipeApp {
  constructor() {
    // Core data
    this.books = []; // All available books
    this.currentBookIndex = 0; // Current position
    this.userVotes = {}; // User's choices

    // UI state
    this.swipeHandler = null; // Interaction handler
    this.isLoading = false; // Loading indicator

    // Performance optimization
    this.highestLoadedBookIndex = -1; // DOM optimization
  }
}
```

### State Flow

1. **Initialization**: Load books from API
2. **Voting**: Track user choices in `userVotes`
3. **Progress**: Update UI based on `currentBookIndex`
4. **Completion**: Submit votes when all books reviewed

## 🎯 Performance Optimizations

### 1. Lazy Loading

```javascript
// Only load 5 cards at a time
const cardsToLoad = Math.min(5, this.books.length - this.currentBookIndex);
```

### 2. Event Delegation

```javascript
// Single listener on container vs. listener per card
this.cardStack.addEventListener("touchstart", this.handleStart.bind(this));
```

### 3. CSS Hardware Acceleration

```css
.book-card {
  transform: translateZ(0); /* Force GPU acceleration */
  will-change: transform; /* Optimize for changes */
}
```

### 4. Debounced Operations

```javascript
// Prevent too many simultaneous operations
if (this.isLoading) return;
this.isLoading = true;
```

## 🔧 Error Handling Strategy

### 1. Network Errors

```javascript
try {
  const books = await bookSwipeAPI.getBooks();
} catch (error) {
  this.showError("Cannot connect to server. Please check your connection.");
}
```

### 2. Data Validation

```javascript
if (this.books.length === 0) {
  throw new Error("No books available in database.");
}
```

### 3. User-Friendly Messages

```javascript
// Technical error → User-friendly message
if (error.message.includes("Failed to fetch")) {
  this.showError("Cannot connect to server. Please try again.");
}
```

## 🔍 Testing Strategy

### Manual Testing Checklist

- ✅ App loads without errors
- ✅ Books display correctly
- ✅ Swipe gestures work on mobile
- ✅ Button clicks work on desktop
- ✅ Votes are recorded accurately
- ✅ Network errors are handled gracefully

### Browser Developer Tools

```javascript
// Enable debug mode in SwipeHandler
this.debug = true; // Shows detailed console logs

// Check application state
console.log(window.bookSwipeApp); // Access app instance
```

## 🚀 Deployment Architecture

### Static Site Hosting

```
User Browser
     ↓
GitHub Pages (Static Files)
     ↓
PocketBase Server (Database)
```

### Separation of Concerns

- **Frontend**: Pure HTML/CSS/JS (no build process)
- **Backend**: PocketBase (separate server)
- **Admin Tools**: Node.js (local development only)

## 📈 Scalability Considerations

### Current Limitations

- Single-page application (not suitable for very large datasets)
- Client-side state management (no persistence across sessions)
- Basic error handling (no retry mechanisms)

### Potential Improvements

- Add local storage for offline capability
- Implement virtual scrolling for large book lists
- Add service worker for offline functionality
- Implement more sophisticated error recovery

## 🔧 Implementation Reference

### Core Components

1. Application structure (`index.html`) - Single page architecture
2. Styling system (`main.css`) - CSS custom properties and responsive design
3. State management (`app.js`) - Vanilla JavaScript application controller

### Advanced Features

1. Gesture recognition (`swipe-handler.js`) - Touch/mouse event processing
2. API integration (`api-fetch.js`) - PocketBase communication layer
3. Performance patterns - Progressive loading and DOM optimization

### Extension Points

1. Custom animations and transitions
2. Enhanced gesture recognition patterns
3. Advanced state management implementations

## 🔧 Configuration Files

### Frontend Configuration

**File**: `docs/scripts/api-fetch.js`
- Line 23: `this.baseURL` - PocketBase server URL
- Must be updated for production deployment

**File**: `docs/index.html`
- Lines 130-132: Cache-busting version parameters (`?v=4`)
- Increment when deploying code changes

### Backend Configuration

**File**: `admin-tools/config.json`
- PocketBase connection settings for admin tools
- Created from `config.example.json` during setup

---

This architecture demonstrates modern web development practices while remaining framework-free and maintainable. Use this reference to navigate the codebase and understand component relationships!
