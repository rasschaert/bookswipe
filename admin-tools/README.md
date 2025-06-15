# 🛠️ BookSwipe Admin Tools

Administrative tools for managing BookSwipe book collections and analyzing voting data. This toolkit provides a command-line interface for book management, vote analysis, and data export functionality.

## 🚀 Quick Start

1. **Setup**: Run `npm run setup` to configure your PocketBase connection
2. **Import books**: Use `npm run import-books` to add books from JSON files
3. **Analyze votes**: Run `npm run analyze-votes` to generate voting reports

## 📦 Installation

```bash
cd admin-tools
npm install
npm run setup
```

## 🔧 Configuration

### Initial Setup

The setup script (`npm run setup`) will guide you through:

- **PocketBase Connection**: URL, admin email, and password
- **Collection Setup**: Automatically creates required database collections
- **Directory Structure**: Creates necessary data directories

### Configuration File

After setup, your `config.json` will contain:

```json
{
  "pocketbase": {
    "url": "https://your-pocketbase-instance.com",
    "adminEmail": "admin@example.com",
    "adminPassword": "your-admin-password"
  },
  "collections": {
    "books": "books",
    "votes": "votes"
  },
  "backup": {
    "directory": "./data/backups",
    "format": "json"
  },
  "export": {
    "directory": "./data/exports",
    "includeImages": true
  }
}
```

## 📚 Available Scripts

| Command                 | Purpose               | Description                                           |
| ----------------------- | --------------------- | ----------------------------------------------------- |
| `npm run setup`         | Initial configuration | Set up PocketBase connection and create collections   |
| `npm run import-books`  | Book management       | Interactive tool to import books from JSON files      |
| `npm run analyze-votes` | Vote analysis         | Generate comprehensive voting reports and export data |

## 🗂️ File Structure

```
admin-tools/
├── config.json              # Configuration (created by setup)
├── config.example.json      # Configuration template
├── package.json             # Dependencies and scripts
├── scripts/
│   ├── book-manager.js      # Core book management functionality
│   ├── import-books.js      # Interactive book import tool
│   ├── analyze-votes.js     # Vote analysis and reporting
│   └── setup.js            # Initial setup and configuration
└── data/
    ├── exports/            # Generated reports and data exports
    ├── backups/            # Database backups
    └── *.json             # Book data files for import
```

## 📖 Book Management

### Importing Books

The import tool (`npm run import-books`) provides an interactive interface for:

- **File Selection**: Choose from JSON files in the `data/` directory
- **Preview**: Review book data before importing
- **Batch Import**: Add multiple books with progress feedback
- **Error Handling**: Graceful handling of invalid data

### Book Data Format

Books should be formatted as JSON arrays:

```json
[
  {
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald",
    "synopsis": "A story of decadence and excess...",
    "page_count": 180,
    "publication_year": 1925,
    "genre_tags": ["Classic", "Drama", "American Literature"],
    "cover_image_url": "https://example.com/cover.jpg",
    "average_storygraph_rating": 4.2,
    "number_of_votes": 1250
  }
]
```

### Required Fields

- `title` (string): Book title
- `author` (string): Author name

### Optional Fields

- `synopsis` (string): Book description
- `page_count` (number): Number of pages
- `publication_year` (number): Year published
- `genre_tags` (array): List of genre strings
- `cover_image_url` (string): URL to cover image
- `average_storygraph_rating` (number): Average rating
- `number_of_votes` (number): Number of ratings

## 📊 Vote Analysis

### Analysis Reports

The vote analyzer (`npm run analyze-votes`) generates:

- **Summary Statistics**: Total votes, books, and participation rates
- **Top Picks**: Most liked books with percentage scores
- **Controversial Books**: Books with divided opinions
- **Participation Stats**: Named vs anonymous voters

### Export Formats

1. **CSV Export**: Detailed spreadsheet with all book statistics
2. **JSON Export**: Raw vote data for further analysis

### Analysis Metrics

- **Interest Score**: Percentage of voters who liked the book
- **Controversy Score**: Measure of divided opinions (closer to 50/50 = more controversial)
- **Vote Distribution**: Breakdown of interested vs not interested votes

## 🔍 Understanding the Tools

### BookManager Class

Core functionality for database operations:

- **Connection Management**: PocketBase authentication and error handling
- **CRUD Operations**: Create, read, update, delete books
- **Data Import/Export**: Bulk operations with progress tracking
- **Statistics**: Vote analysis and reporting

### Interactive Features

- **Colored Output**: Visual feedback with chalk styling
- **Progress Indicators**: Real-time import/export feedback
- **Input Validation**: Robust error checking and user guidance
- **Confirmation Prompts**: Safety checks for destructive operations

## 🛡️ Error Handling

The tools include comprehensive error handling for:

- **Network Issues**: PocketBase connection failures
- **Authentication**: Invalid credentials or permissions
- **Data Validation**: Malformed JSON or missing required fields
- **File Operations**: Missing files or permission issues

## 📈 Data Flow

1. **Setup**: Configure PocketBase connection and create collections
2. **Import**: Load book data from JSON files into database
3. **Voting**: Users vote through the web interface
4. **Analysis**: Generate reports and export voting statistics

## 🔧 Development

### Adding New Features

The codebase follows modern JavaScript patterns:

- **ES6 Modules**: Clean import/export syntax
- **Async/Await**: Promise-based database operations
- **Class-based Architecture**: Organized, reusable code structure
- **Error-first Design**: Comprehensive error handling throughout

### Dependencies

- **PocketBase**: Database client for backend operations
- **Inquirer**: Interactive command-line prompts
- **Chalk**: Terminal styling and colors
- **CSV-Writer**: Export functionality for spreadsheets
- **fs-extra**: Enhanced file system operations

### Code Style

- Descriptive variable names and function signatures
- Comprehensive error messages with actionable guidance
- Progress feedback for long-running operations
- Consistent formatting and structure across scripts

---

**Note**: These admin tools are designed to work seamlessly with the BookSwipe web application, providing a complete book club voting system with robust data management capabilities.
