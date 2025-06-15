# 🛠️ BookSwipe Admin Tools Setup Guide

Complete guide for setting up and configuring the BookSwipe admin tools for book club management.

## Prerequisites

- **Node.js 18+**: Required for running the admin tools
- **PocketBase Instance**: Backend database (hosted or local)
- **Admin Access**: PocketBase admin credentials

## 📦 Installation Steps

### 1. Install Dependencies

```bash
cd admin-tools
npm install
```

This installs all required packages:

- `pocketbase` - Database client
- `inquirer` - Interactive prompts
- `chalk` - Terminal styling
- `csv-writer` - Data export functionality
- `fs-extra` - File system utilities

### 2. Run Initial Setup

```bash
npm run setup
```

The setup wizard will guide you through:

#### Configuration Prompts

1. **PocketBase URL**

   - Enter your PocketBase instance URL
   - Examples: `https://yourapp.pocketbase.io` or `http://localhost:8090`

2. **Admin Email**

   - Your PocketBase admin email address
   - Must have admin privileges to create collections

3. **Admin Password**
   - Your PocketBase admin password
   - Stored locally in `config.json` (keep secure)

#### Automatic Setup

The setup script will:

- ✅ Test your PocketBase connection
- ✅ Create required database collections
- ✅ Set up directory structure
- ✅ Generate configuration file

## 🗃️ Database Collections

The setup creates two main collections:

### Books Collection

Stores book information with fields:

- `title` (text, required)
- `author` (text, required)
- `synopsis` (editor, optional)
- `page_count` (number, optional)
- `publication_year` (number, optional)
- `genre_tags` (json array, optional)
- `cover_image_url` (url, optional)
- `average_storygraph_rating` (number, optional)
- `number_of_votes` (number, optional)

### Votes Collection

Stores voting data with fields:

- `user_name` (text, optional)
- `votes` (json object, required)
- `session_id` (text, required)
- `submitted_at` (date, required)

## 📁 Directory Structure

After setup, your admin-tools directory will contain:

```
admin-tools/
├── config.json              # Your configuration (auto-generated)
├── data/
│   ├── exports/             # Generated reports go here
│   ├── backups/             # Future backup functionality
│   └── sample-classics.json # Example book data
├── scripts/                 # Admin tool scripts
└── node_modules/           # Dependencies
```

## ⚙️ Configuration File

Your `config.json` contains:

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

## 🔧 Testing Your Setup

### Verify Connection

After setup, test your configuration:

```bash
npm run import-books
```

If setup was successful, you should see:

- ✅ Connection to PocketBase
- 📚 Book import interface

### Test Data Import

1. Use the provided sample data:

   ```bash
   # The import tool will find sample-classics.json automatically
   npm run import-books
   ```

2. Select "sample-classics.json" from the list
3. Confirm the import
4. Verify books were added successfully

## 🚨 Troubleshooting Setup

### Connection Issues

**Problem**: "Failed to authenticate with PocketBase"

**Solutions**:

- Verify PocketBase URL is correct and accessible
- Check admin email and password
- Ensure PocketBase instance is running
- Try accessing PocketBase admin panel in browser

### Collection Creation Issues

**Problem**: "Failed to create collections"

**Solutions**:

- Verify admin account has collection creation permissions
- Check PocketBase version compatibility
- Try creating collections manually in PocketBase admin panel

### File Permission Issues

**Problem**: "Cannot write to directory"

**Solutions**:

- Check write permissions in admin-tools directory
- Run with appropriate user permissions
- Verify disk space availability

## 🔄 Reconfiguring

To change your configuration:

1. **Re-run setup**:

   ```bash
   npm run setup
   ```

   Choose "Yes" when asked to overwrite existing config

2. **Manual editing**:
   Edit `config.json` directly with your text editor

3. **Test changes**:
   ```bash
   npm run import-books
   ```

## 🔐 Security Considerations

- **Config File**: Keep `config.json` secure and don't commit to version control
- **Admin Credentials**: Use strong passwords for PocketBase admin
- **Network Access**: Ensure PocketBase is only accessible by authorized users
- **Backup**: Regularly backup your PocketBase data

## ➡️ Next Steps

After successful setup:

1. **Import Books**: Add your book club's reading list

   ```bash
   npm run import-books
   ```

2. **Configure Web App**: Update the web application with your PocketBase URL

3. **Start Voting**: Share the web app with book club members

4. **Analyze Results**: Use the vote analyzer to see results
   ```bash
   npm run analyze-votes
   ```

## 📞 Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Verify all prerequisites are met
3. Review PocketBase documentation for server-specific issues
4. Check the main README.md for additional context

---

**Ready to proceed?** Run `npm run import-books` to start adding books to your collection!
