# BookSwipe 📚

A "Tinder for Books" voting application for book clubs. Users swipe through book suggestions to indicate their reading preferences.

## Project Structure

```
bookswipe/
├── docs/                     # 🌐 Deployable web application
│   ├3. Go to Settings → Pages
4. Set source to "Deploy from a folder"
5. Select `/docs` as the folder
6. Your app will be available at `username.github.io/bookswipe`ndex.html            # Main application
│   ├── styles/               # CSS files
│   └── scripts/              # JavaScript files
│
├── admin-tools/              # 🛠️ Admin utilities (local only)
│   ├── package.json          # Node.js dependencies
│   ├── config.example.json   # Configuration template
│   ├── scripts/              # Admin tools
│   │   ├── setup.js          # Initial setup
│   │   ├── import-books.js   # Book import tool
│   │   ├── analyze-votes.js  # Vote analysis
│   │   └── book-manager.js   # Core utilities
│   └── data/                 # JSON files and exports
│       ├── sample-classics.json
│       ├── exports/          # Generated reports
│       └── backups/          # Data backups
│
└── secrets.env              # PocketBase credentials (gitignored)
```

## Prerequisites

Before you start, you need:

1. **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
2. **A running PocketBase instance** with admin access
3. **Basic terminal/command line knowledge**

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

1. Create a JSON file in `admin-tools/data/` (see [Book Data Format](#book-data-format) below)
2. Run `npm run import-books`
3. Select your file when prompted

### Step 4: Set Up the Frontend

1. **Update the frontend configuration:**
   Edit `docs/scripts/api.js` and update the PocketBase URL:

   ```javascript
   const POCKETBASE_URL = "http://127.0.0.1:8090"; // Your PocketBase URL
   ```

2. **Test locally:**

   ```bash
   cd docs
   python -m http.server 8000
   # Visit http://localhost:8000
   ```

3. **Try voting on some books** to make sure everything works!

### Step 5: Analyze Voting Results (After People Vote)

Once you have some votes, analyze the results:

```bash
cd admin-tools
npm run analyze-votes
```

This generates:

- Console report with rankings
- CSV export in `data/exports/`
- Raw vote data for further analysis

## Admin Tools Usage

### Available Commands

```bash
npm run setup          # Initial configuration
npm run import-books    # Interactive book importer
npm run analyze-votes   # Generate voting reports
```

### Book Data Format

Create JSON files in `admin-tools/data/` with this structure:

```json
[
  {
    "title": "Book Title",
    "author": "Author Name",
    "synopsis": "Book description...",
    "page_count": 250,
    "publication_year": 2023,
    "genre_tags": ["fiction", "mystery", "thriller"],
    "cover_image_url": "https://example.com/cover.jpg",
    "average_storygraph_rating": 4.2,
    "number_of_votes": 1234
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

## Frontend Features

- **📱 Mobile-First Design** - Works great on phones and tablets
- **👆 Intuitive Swipe Interface** - Natural Tinder-like gestures
- **⌨️ Keyboard Support** - Arrow keys and shortcuts
- **🎨 Beautiful Book Cards** - Rich metadata display
- **🚀 Fast Performance** - Optimized loading and animations
- **🔄 Real-time Progress** - See voting progress
- **✅ Vote Submission** - Secure PocketBase integration

## PocketBase Setup

Collections are automatically created when you run `npm run setup` in the admin-tools directory. The setup script creates:

**books** collection with fields:

- `title` (Text, required)
- `author` (Text, required)
- `synopsis` (Editor)
- `page_count` (Number)
- `publication_year` (Number)
- `genre_tags` (JSON)
- `cover_image_url` (URL)
- `average_storygraph_rating` (Number)
- `number_of_votes` (Number)

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
4. Select `/frontend` as the folder
5. Your app will be available at `username.github.io/bookswipe`

**Any Static Host:**

- Upload contents of `docs/` folder
- Ensure `index.html` is served at root

### Environment Variables

Update `docs/scripts/api.js` if your PocketBase URL changes:

```javascript
const POCKETBASE_URL = "https://your-pocketbase-url.com";
```

## Development Workflow

### Adding Books

1. Create JSON file in `admin-tools/data/`
2. Run `npm run import-books`
3. Select your file and import

### Analyzing Results

1. Wait for voting sessions to accumulate
2. Run `npm run analyze-votes`
3. Check `data/exports/` for detailed reports

### Updating Frontend

1. Modify files in `docs/`
2. Test locally
3. Deploy updated folder to your host

### Data Management

```bash
cd admin-tools
# Manage your book data and analyze votes
```

## Troubleshooting

### "I have PocketBase running but the admin tools won't connect"

1. **Check your PocketBase URL:** Make sure it matches what you see in your browser
2. **Verify admin credentials:** Try logging into the PocketBase admin UI manually
3. **Check your config.json:** Make sure you copied and edited it correctly
4. **Look for error messages:** Run `npm run setup` and read any error output carefully

### "The frontend shows 'Failed to fetch books'"

1. **Update the frontend config:** Edit `docs/scripts/api.js` with your PocketBase URL
2. **Check PocketBase is running:** Visit your PocketBase URL in a browser
3. **Verify collections exist:** Run `npm run setup` in admin-tools to ensure collections are created
4. **Check API permissions:** The setup script configures proper permissions automatically

### "npm run import-books says 'No books found'"

1. **Install dependencies first:** Run `npm install` in the admin-tools directory
2. **Check your JSON format:** Make sure your book files match the expected format
3. **Verify PocketBase connection:** Run `npm run setup` first to test connectivity

### "I imported books but they don't show up in the frontend"

1. **Check PocketBase admin UI:** Look at your `books` collection - are the books there?
2. **Verify frontend configuration:** Make sure `docs/scripts/api.js` has the right URL
3. **Check browser console:** Open browser dev tools and look for error messages

### "Vote analysis shows no data"

1. **Make sure people have voted:** The frontend needs to submit votes first
2. **Check the votes collection:** Look in PocketBase admin to see if votes are being saved
3. **Verify collection permissions:** The `votes` collection needs public create access

### Still having issues?

1. **Check the browser console:** Error messages often appear in the developer tools
2. **Look at PocketBase logs:** PocketBase usually shows helpful error messages
3. **Verify Node.js version:** Make sure you have Node.js v16 or higher
4. **Try the sample data first:** Use the included sample books to test everything works

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## License

MIT License
