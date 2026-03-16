# BookSwipe 📚

A "Tinder for Books" voting application for book clubs. Users swipe through book suggestions to indicate their reading preferences using intuitive touch gestures.

## Features

### 🎯 Core Functionality
- **Intuitive Card Interactions** - Modern gesture-based interface with:
  - 👆 **Tap/Click to Flip** - View detailed synopsis and genre tags
  - 📜 **Vertical Scroll** - Read long descriptions within cards
  - 👈👉 **Swipe/Drag to Vote** - Swipe left to pass, right to like
- **Smart Gesture Detection** - Uses modern Pointer Events API for unified touch/mouse/pen support
- **Responsive Design** - Works seamlessly on phones, tablets, and desktops
- **Keyboard Support** - Arrow keys and shortcuts for accessibility
- **Progress Tracking** - Real-time voting progress display

### 🎭 Mock Mode for Testing
- **Quick Testing** - No PocketBase required for development
- **URL Parameter** - Add `?mock=true` to use local mock data
- **Sample Data** - Pre-loaded with 8 diverse book examples
- **Full Feature Set** - All interactions work in mock mode

### 🔐 Authentication (Optional)
- **Automatic User Identification** - Via Pomerium JWT authentication
- **Graceful Fallback** - Manual name entry when not authenticated
- **Enhanced Privacy** - Uses email for attribution, shows display name

### 📊 Admin Tools
- **Book Management** - Import and manage book collections
- **Vote Analysis** - Detailed reports and visualizations
- **Web Results** - Beautiful, shareable voting results
- **CSV Export** - Data export for further analysis

## Quick Start

### Option 1: Mock Mode (No Setup Required)

Perfect for testing or demos without a backend:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/bookswipe.git
   cd bookswipe
   ```

2. **Start a local server:**
   ```bash
   cd docs
   python3 -m http.server 8000
   ```

3. **Open in browser with mock mode:**
   ```
   http://localhost:8000/?mock=true
   ```

That's it! The app will load with 8 sample books from `docs/scripts/mock.json`.

### Option 2: Full Setup with PocketBase

For production use with data persistence:

See [Complete Setup Guide](#complete-setup-guide) below.

## Project Structure

```
bookswipe/
├── docs/                        # 🌐 Deployable web application
│   ├── index.html               # Main application
│   ├── styles/                  # CSS files
│   │   ├── main.css            # Core styles
│   │   ├── cards.css           # Card and interaction styles
│   │   └── animations.css      # Animation effects
│   └── scripts/                 # JavaScript files
│       ├── app.js              # Main application controller
│       ├── swipe-handler.js    # Gesture recognition engine
│       ├── api-fetch.js        # PocketBase API integration
│       └── mock.json           # Sample data for mock mode
│
├── admin-tools/                 # 🛠️ Admin utilities (local only)
│   ├── package.json            # Node.js dependencies
│   ├── config.example.json     # Configuration template
│   ├── scripts/                # Admin tools
│   │   ├── setup.js           # Initial setup
│   │   ├── import-books.js    # Book import tool
│   │   ├── analyze-votes.js   # Vote analysis
│   │   └── book-manager.js    # Core utilities
│   └── data/                   # JSON files and exports
│       ├── sample-classics.json
│       ├── exports/           # Generated reports
│       └── backups/           # Data backups
│
└── secrets.env                 # PocketBase credentials (gitignored)
```

## Prerequisites

Before you start with full setup, you need:

1. **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
2. **A running PocketBase instance** with admin access
3. **Basic terminal/command line knowledge**

### Optional: Enhanced Authentication

For automatic user identification (instead of manual name entry), you can use the custom PocketBase variant with Pomerium JWT authentication support:

- **Custom PocketBase**: [pocketbase-pomerium-jwt-auth](https://github.com/rasschaert/pocketbase-pomerium-jwt-auth)
- Enables automatic user lookup via `/api/pomerium/me` endpoint
- Displays user's display name while using email for vote attribution
- Falls back to manual name entry if authentication is unavailable

## Complete Setup Guide

Follow these steps in order. If you get stuck, see the [Troubleshooting](#troubleshooting) section below.

### Step 1: Set Up Your PocketBase Database

**If you don't have PocketBase set up yet:**

1. Download PocketBase from [pocketbase.io](https://pocketbase.io/docs/)
2. Run it locally: `./pocketbase serve`
3. Visit the admin UI (usually `http://127.0.0.1:8090/_/`)
4. Create an admin account

### Step 2: Configure Admin Tools

1. **Install dependencies:**

   ```bash
   cd admin-tools
   npm install
   ```

2. **Create your config file:**

   ```bash
   cp config.example.json config.json
   ```

3. **Edit `config.json` with your PocketBase details:**

   ```json
   {
     "pocketbase": {
       "url": "http://127.0.0.1:8090",
       "adminEmail": "your-admin@email.com",
       "adminPassword": "your-admin-password"
     }
   }
   ```

4. **Run the setup script:**

   ```bash
   npm run setup
   ```

   This will:
   - Connect to your PocketBase instance
   - Automatically create the `books` and `votes` collections with proper schemas
   - Set up the correct API permissions
   - Create necessary data directories

### Step 3: Import Your First Books

**Option A: Use the sample books (recommended for testing):**

```bash
npm run import-books
```

Select "Sample classics" when prompted.

**Option B: Import your own books:**

1. Create a JSON file in `admin-tools/data/books/` (see [Book Data Format](#book-data-format) below)
2. Run `npm run import-books`
3. Select your file when prompted

### Step 4: Set Up the Frontend

1. **Update the frontend configuration:**
   Edit `docs/scripts/api-fetch.js` and update the PocketBase URL:

   ```javascript
   this.baseURL = "http://127.0.0.1:8090"; // Your PocketBase URL (line 23)
   ```

2. **Test locally:**

   ```bash
   cd docs
   python3 -m http.server 8000
   # Visit http://localhost:8000
   ```

3. **Try voting on some books** to make sure everything works!

4. **Test mock mode (optional):**

   Visit `http://localhost:8000/?mock=true` to test without PocketBase connection.

### Step 5: Analyze Voting Results (After People Vote)

Once you have some votes, analyze the results:

```bash
cd admin-tools
npm run analyze-votes
```

This generates:

- Console report with rankings
- CSV export in `data/exports/`
- Web-based results at `docs/results.html`
- Dramatic results page at `docs/dramatic-results.html`
- Raw vote data for further analysis

## Interaction System

### Modern Gesture Recognition

BookSwipe uses the **Pointer Events API** for unified cross-platform gesture handling:

- **Single Event Model** - One handler for touch, mouse, and pen input
- **Pointer Capture** - Reliable tracking even when pointer leaves element
- **Intent Detection** - Smart distinction between tap, scroll, and swipe gestures
- **Touch-action CSS** - Prevents browser gesture conflicts

### Event Processing Order

The system prioritizes interactions in this order:

1. **Tap Detection** (< 10px movement) → Flip card
2. **Scroll Detection** (vertical in scrollable area) → Allow native scroll
3. **Swipe Detection** (horizontal movement) → Vote on book

### Gesture Thresholds

- **Tap Threshold:** 10px - Maximum movement for tap
- **Intent Threshold:** 15px - Movement needed to detect gesture intent
- **Swipe Threshold:** 80px - Distance needed to complete swipe
- **Velocity Threshold:** 0.5px/ms - Speed for "flick" gestures

### CSS Touch Actions

Strategic use of `touch-action` property:

```css
.card-flip-container {
  touch-action: none; /* Full custom control */
}

.card-content {
  touch-action: pan-y; /* Vertical scroll only */
}

.book-header {
  touch-action: none; /* Allow card drag from header */
}
```

## Admin Tools Usage

### Available Commands

```bash
npm run setup           # Initial configuration
npm run import-books    # Interactive book importer
npm run analyze-votes   # Generate voting reports and web results
```

### Book Data Format

Create JSON files in `admin-tools/data/books/` with this structure:

```json
[
  {
    "title": "Book Title",
    "author": "Author Name",
    "country": "Country (optional)",
    "synopsis": "Book description...",
    "page_count": 250,
    "publication_year": 2023,
    "genre_tags": ["fiction", "mystery", "thriller"],
    "cover_image_url": "https://example.com/cover.jpg",
    "average_storygraph_rating": 4.2,
    "number_of_votes": 1234,
    "suggester": "Person who suggested this book (optional)",
    "pitch": "Why you should read this (optional)"
  }
]
```

**Required fields:** `title`, `author`
**Optional fields:** All others (will use defaults)

### Vote Analysis Features

The analysis tool provides:

**📊 Summary Statistics**
- Total voting sessions
- Participation rates
- Average votes per book

**🏆 Top Picks**
- Ranked by percentage of "interested" votes
- Minimum vote threshold filtering
- Medal rankings for top 3

**🔥 Controversial Books**
- Books with most divided opinions
- Controversy scoring algorithm
- Helps identify discussion-worthy picks

**👥 Participation Tracking**
- Named vs anonymous voters
- Individual voting patterns
- Engagement metrics

**📈 Export Options**
- Detailed CSV reports
- Raw JSON vote data
- Timestamped exports

### Web Results Dashboard

Beautiful web-based presentation of voting results:

**🌐 Web Results Features**
- Responsive design that works on all devices
- Interactive results presentation
- Dramatic winner reveal with confetti animation
- Vote visualizations with progress bars
- Automatic tie detection and handling
- Real-time data updates

**📊 Accessible Results Sharing**
- Shareable web link for all participants
- No additional software needed - just a web browser!
- Works on phones, tablets, and computers
- Perfect for remote book club members
- Automatic generation with every vote analysis

**🎯 Auto-Generated Content**
- Results automatically published to `docs/results.html`
- Dramatic reveal version available at `docs/dramatic-results.html`
- Data updates with every `npm run analyze-votes` command
- Beautiful styling with CSS animations
- JSON data source for easy customization

**🎭 Dramatic Results Page**
- Scroll-triggered reveal of results in reverse order (worst to best)
- Books grouped into dramatic tiers: "Struggling Tales" → "Underdogs" → "Rising Stars" → "The Champion(s)"
- Winner gets confetti celebration and special styling
- Perfect for building suspense during book club meetings

## Frontend Features

- **📱 Mobile-First Design** - Works great on phones and tablets
- **👆 Modern Gesture System** - Pointer Events API for unified input handling
- **🎯 Smart Intent Detection** - Distinguishes tap, scroll, and swipe
- **⌨️ Keyboard Support** - Arrow keys and shortcuts
- **🎨 Beautiful Book Cards** - Rich metadata display with flip animation
- **🔄 Card Flip** - Tap to see synopsis and genre tags
- **📜 Scrollable Content** - Read long descriptions within cards
- **🚀 Fast Performance** - Optimized loading and animations
- **📊 Real-time Progress** - See voting progress
- **✅ Vote Submission** - Secure PocketBase integration
- **🎭 Mock Mode** - Test without backend (`?mock=true`)
- **🔐 Smart Authentication** - Automatic user identification via Pomerium JWT (optional)
  - Shows user's display name when authenticated
  - Uses email address for vote attribution
  - Graceful fallback to manual name entry
  - Requires [custom PocketBase variant](https://github.com/rasschaert/pocketbase-pomerium-jwt-auth)

## PocketBase Setup

Collections are automatically created when you run `npm run setup` in the admin-tools directory. The setup script creates:

**books** collection with fields:
- `title` (Text, required)
- `author` (Text, required)
- `country` (Text, optional)
- `synopsis` (Editor)
- `page_count` (Number)
- `publication_year` (Number)
- `genre_tags` (JSON)
- `cover_image_url` (URL)
- `average_storygraph_rating` (Number)
- `number_of_votes` (Number)
- `suggester` (Text, optional)
- `pitch` (Text, optional)

**votes** collection with fields:
- `user_name` (Text)
- `votes` (JSON)
- `session_id` (Text)
- `submitted_at` (Date)

### API Rules

Both collections are configured with:
- **List/Search/View/Create:** Public access (empty)
- **Update/Delete:** Admin only (`@request.auth.id != ""`)

## Deployment Guide

### Frontend Deployment

**GitHub Pages:**

1. Push your repo to GitHub
2. Go to Settings → Pages
3. Set source to "Deploy from a folder"
4. Select `/docs` as the folder
5. Your app will be available at `username.github.io/bookswipe`

**Any Static Host:**

- Upload contents of `docs/` folder
- Ensure `index.html` is served at root

### Pre-Deployment Checklist

Before deploying to production:

- [ ] Update PocketBase URL in `docs/scripts/api-fetch.js` (line 23)
- [ ] Test with production PocketBase instance
- [ ] Verify CORS settings on PocketBase allow your domain
- [ ] Increment cache-busting version in `docs/index.html` (e.g. `?v=5` → `?v=6`)
- [ ] Test all functionality on target deployment platform
- [ ] Ensure PocketBase collections have correct API rules for production
- [ ] Test mock mode with `?mock=true` parameter

### Production Configuration

**Important**: Before deploying to production, update the PocketBase URL in `docs/scripts/api-fetch.js`:

```javascript
// Line 23 in constructor - change from:
this.baseURL = "https://bookswipe.modest-moray-8349.pomerium.app";
// To your production PocketBase URL:
this.baseURL = "https://your-pocketbase-url.com";
```

**Security Note**: Ensure your production PocketBase instance has proper CORS settings and API rules configured.

## Development Workflow

### Testing Locally

```bash
# Standard mode (requires PocketBase)
cd docs
python3 -m http.server 8000
# Visit http://localhost:8000

# Mock mode (no backend required)
# Visit http://localhost:8000/?mock=true
```

### Adding Books

1. Create JSON file in `admin-tools/data/books/`
2. Run `npm run import-books`
3. Select your file and import

### Analyzing Results

1. Wait for voting sessions to accumulate
2. Run `npm run analyze-votes`
3. Check `data/exports/` for detailed reports
4. Share `docs/results.html` with participants

### Updating Frontend

1. Modify files in `docs/`
2. Test locally (both standard and mock mode)
3. Deploy updated folder to your host

## Testing & Debugging

### Manual Testing Checklist

- ✅ App loads without errors in browser console
- ✅ Books display correctly with proper data
- ✅ **Tap to flip** - Card flips to show synopsis
- ✅ **Vertical scroll** - Text scrolls within card content
- ✅ **Horizontal swipe** - Card swipes left/right to vote
- ✅ Swipe gestures work on mobile devices
- ✅ Button clicks work on desktop
- ✅ Keyboard shortcuts (arrow keys) work
- ✅ Votes are recorded and submitted successfully
- ✅ **Mock mode works** - `?mock=true` loads sample data
- ✅ Network errors display user-friendly messages

### Debug Mode

Enable detailed logging in the browser console:

```javascript
// In browser console, enable debug mode:
window.bookSwipeApp.swipeHandler.debug = true;

// Check application state:
console.log(window.bookSwipeApp.userVotes);      // Current votes
console.log(window.bookSwipeApp.books);          // Loaded books
console.log(window.bookSwipeApp.currentBookIndex); // Current position

// Check if mock mode is active:
console.log(bookSwipeAPI.mockMode);              // true/false
console.log(bookSwipeAPI.mockData);              // Mock data if loaded
```

### Browser Developer Tools

1. **Network Tab**: Monitor API calls to PocketBase (or lack thereof in mock mode)
2. **Console Tab**: Check for JavaScript errors and logs
3. **Application Tab**: Inspect local storage for offline votes
4. **Performance Tab**: Analyze gesture smoothness

### Common Issues

- **Books not loading**: Check PocketBase URL and collection permissions
- **Mock mode not working**: Ensure `mock.json` exists at `docs/scripts/mock.json`
- **Swipe not working**: Verify touch-action CSS properties
- **Flip interfering with swipe**: Check gesture thresholds in `swipe-handler.js`
- **Votes not submitting**: Check network connectivity and API endpoints
- **Cards not flipping**: Verify pointer event handlers are bound

## Architecture

### Gesture Recognition System

The SwipeHandler class implements a state machine for gesture recognition:

```
pointerdown → Record position & capture pointer
     ↓
pointermove → Detect intent (tap vs scroll vs swipe)
     ↓
  Intent = tap? → No movement, flip card on pointerup
  Intent = scroll? → Release control, allow browser scroll
  Intent = swipe? → Track drag, show indicators
     ↓
pointerup → Complete action based on detected intent
```

### Mock Mode Architecture

When `?mock=true` is present:

1. API layer (`api-fetch.js`) detects URL parameter
2. `init()` fetches `scripts/mock.json` instead of PocketBase
3. All API methods return mock data or simulate success
4. Frontend works identically to production mode
5. Perfect for development, testing, and demos

## Technical Details

### Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **Mobile**: iOS Safari, Chrome Mobile, Samsung Internet
- **Pointer Events**: All major browsers (IE11+)
- **Touch-action**: All major browsers (IE10+)

### Performance Optimizations

- Progressive card loading (5 cards at a time)
- CSS transforms for smooth animations
- Pointer capture for reliable tracking
- Debounced scroll detection
- Lazy image loading

## License

MIT License

## Contributing

Contributions welcome! Please open an issue or PR on GitHub.

## Support

For issues or questions:
- Open an issue on GitHub
- Check the [Troubleshooting](#troubleshooting) section
- Test with mock mode first to isolate issues
