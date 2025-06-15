# 🔧 BookSwipe Admin Tools Troubleshooting Guide

Common issues and solutions for the BookSwipe admin tools.

## 🚨 Setup Issues

### Configuration Problems

#### "Config file not found" Error

**Problem**: `❌ Config file not found. Copy config.example.json to config.json and update it.`

**Solution**:

```bash
# Run the setup script to create config.json
npm run setup
```

**Alternative Manual Fix**:

```bash
# Copy the example config
cp config.example.json config.json

# Edit config.json with your PocketBase details
```

#### "Failed to authenticate with PocketBase" Error

**Problem**: Cannot connect to PocketBase with provided credentials.

**Solutions**:

1. **Verify PocketBase URL**:

   - Ensure URL is correct and accessible
   - Try accessing `https://your-url.com/_/` in browser
   - Check for typos in protocol (http vs https)

2. **Check Admin Credentials**:

   - Verify email and password in PocketBase admin panel
   - Ensure account has admin privileges
   - Try logging in manually at `https://your-url.com/_/`

3. **Network Issues**:
   - Check firewall settings
   - Verify PocketBase instance is running
   - Test connection: `curl -I https://your-pocketbase-url.com`

### Collection Setup Issues

#### "Failed to create collections" Error

**Problem**: Cannot create required database collections.

**Solutions**:

1. **Permission Check**:

   - Ensure admin account can create collections
   - Check PocketBase version compatibility
   - Try creating collections manually in admin panel

2. **Manual Collection Creation**:

   ```json
   // Books collection fields:
   title: Text (required)
   author: Text (required)
   synopsis: Editor (optional)
   page_count: Number (optional)
   publication_year: Number (optional)
   genre_tags: JSON (optional)
   cover_image_url: URL (optional)

   // Votes collection fields:
   user_name: Text (optional)
   votes: JSON (required)
   session_id: Text (required)
   submitted_at: Date (required)
   ```

## 📚 Import Issues

### File Format Problems

#### "JSON file must contain an array of books" Error

**Problem**: Import file is not properly formatted.

**Solution**: Ensure your JSON file contains an array:

```json
[
  {
    "title": "Book Title",
    "author": "Author Name",
    "synopsis": "Book description...",
    "page_count": 250,
    "genre_tags": ["Fiction", "Drama"]
  }
]
```

**Not this**:

```json
{
  "title": "Book Title",
  "author": "Author Name"
}
```

#### "Failed to add book" Errors During Import

**Problem**: Individual books failing to import.

**Solutions**:

1. **Check Required Fields**:

   - `title` and `author` are required
   - Verify data types match schema

2. **Fix Data Issues**:

   ```json
   // ❌ Incorrect types
   {
     "title": 123,           // Should be string
     "page_count": "250"     // Should be number
   }

   // ✅ Correct types
   {
     "title": "Book Title",
     "page_count": 250
   }
   ```

3. **Handle Special Characters**:
   - Ensure proper UTF-8 encoding
   - Escape quotes in JSON strings
   - Remove or escape problematic characters

### File Access Issues

#### "File not found" or "No JSON files found" Error

**Problem**: Cannot locate or access book data files.

**Solutions**:

1. **Check File Location**:

   ```bash
   # Files should be in admin-tools/data/
   ls admin-tools/data/*.json
   ```

2. **File Permissions**:

   ```bash
   # Ensure files are readable
   chmod 644 admin-tools/data/*.json
   ```

3. **Use Browse Option**:
   - Select "📁 Browse for file..." in import tool
   - Provide full path to your JSON file

## 📊 Analysis Issues

### No Voting Data

#### "No votes found" or Empty Reports

**Problem**: Vote analysis shows no data or empty results.

**Solutions**:

1. **Check Web App Configuration**:

   - Ensure web app is connected to same PocketBase
   - Verify votes are being submitted
   - Check votes collection in PocketBase admin

2. **Manual Vote Check**:

   ```bash
   # In PocketBase admin panel:
   # Go to Collections > votes
   # Verify records exist
   ```

3. **Collection Name Mismatch**:
   - Check `config.json` collection names
   - Ensure they match actual PocketBase collections

### Export Failures

#### "Failed to export CSV" Error

**Problem**: Cannot create analysis reports.

**Solutions**:

1. **Directory Permissions**:

   ```bash
   # Ensure exports directory is writable
   chmod 755 admin-tools/data/exports/
   ```

2. **Disk Space**:

   - Check available disk space
   - Clear old export files if needed

3. **Data Issues**:
   - Verify voting data integrity
   - Check for null/undefined values in analysis

## 🔌 Connection Issues

### Intermittent Connection Failures

#### "Connection timeout" or "Network error" Messages

**Problem**: Sporadic connection issues with PocketBase.

**Solutions**:

1. **Retry Logic**:

   - Tools automatically retry failed operations
   - Wait and try again if operations fail

2. **Network Stability**:

   - Check internet connection
   - Consider local PocketBase instance for development

3. **PocketBase Instance Health**:
   - Monitor PocketBase server logs
   - Check server resource usage
   - Restart PocketBase if needed

### SSL/TLS Issues

#### "Certificate" or "SSL" Errors

**Problem**: HTTPS connection issues.

**Solutions**:

1. **Certificate Problems**:

   - Verify SSL certificate is valid
   - Try HTTP URL for local development
   - Check certificate expiration

2. **Local Development**:
   ```json
   // For local PocketBase, use HTTP:
   {
     "pocketbase": {
       "url": "http://localhost:8090"
     }
   }
   ```

## 🗃️ Database Issues

### Performance Problems

#### Slow Import or Analysis Operations

**Problem**: Operations taking unusually long time.

**Solutions**:

1. **Batch Size Optimization**:

   - Import includes automatic delays between operations
   - Consider smaller JSON files for large imports

2. **PocketBase Performance**:
   - Check PocketBase server resources
   - Consider database indexing for large datasets
   - Monitor server response times

### Data Integrity Issues

#### Duplicate Books or Inconsistent Data

**Problem**: Books appearing multiple times or with incorrect data.

**Solutions**:

1. **Clean Import**:

   ```bash
   # Use the clear option to start fresh
   npm run import-books
   # Select "🗑️ Delete all books"
   ```

2. **Data Validation**:
   - Review JSON files for duplicates
   - Validate data before import
   - Use unique identifiers where possible

## 🛠️ Development Issues

### Node.js Problems

#### "Module not found" or "Import" Errors

**Problem**: Node.js or dependency issues.

**Solutions**:

1. **Reinstall Dependencies**:

   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Node Version**:

   ```bash
   # Ensure Node.js 18+
   node --version

   # Update if needed
   nvm install 18
   nvm use 18
   ```

3. **ES Modules**:
   - Ensure `"type": "module"` in package.json
   - Use `.js` extensions in import statements

### Script Execution Issues

#### "Permission denied" Errors

**Problem**: Cannot execute npm scripts.

**Solutions**:

```bash
# Make scripts executable
chmod +x scripts/*.js

# Or use node directly
node scripts/setup.js
node scripts/import-books.js
node scripts/analyze-votes.js
```

## 📞 Getting Additional Help

### Diagnostic Information

When reporting issues, include:

1. **System Information**:

   ```bash
   node --version
   npm --version
   cat package.json | grep version
   ```

2. **Configuration** (without passwords):

   ```bash
   cat config.json | sed 's/"adminPassword.*/"adminPassword": "***"/'
   ```

3. **Error Messages**:
   - Full error output
   - Steps to reproduce
   - Expected vs actual behavior

### Common Solutions Checklist

Before seeking help, try:

- [ ] Re-run `npm run setup`
- [ ] Verify PocketBase is accessible in browser
- [ ] Check file permissions and paths
- [ ] Review configuration for typos
- [ ] Test with sample data files
- [ ] Clear and reimport data
- [ ] Restart PocketBase instance

### Resources

- **PocketBase Documentation**: [pocketbase.io/docs](https://pocketbase.io/docs)
- **Node.js Troubleshooting**: Check Node.js official documentation
- **JSON Validation**: Use online JSON validators for file format issues

---

**Still having issues?** Review the main README.md and SETUP_GUIDE.md for additional context and step-by-step instructions.
