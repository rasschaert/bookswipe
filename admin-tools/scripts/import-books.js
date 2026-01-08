#!/usr/bin/env node

/**
 * Interactive Book Import Tool
 *
 * Provides a user-friendly command-line interface for importing books
 * into the BookSwipe database from JSON files.
 *
 * Features:
 * - Interactive file selection from data directory
 * - File browsing for custom paths
 * - Preview of book data before import
 * - Confirmation prompts for safety
 * - Bulk operations (import/delete all books)
 * - Progress feedback during operations
 *
 * Usage:
 *   npm run import-books
 *
 * The tool will guide you through:
 * 1. Selecting an action (import, list, clear, exit)
 * 2. Choosing a JSON file or browsing for one
 * 3. Previewing the data to be imported
 * 4. Confirming the import operation
 *
 * File format: JSON array of book objects with required fields:
 * - title (string): Book title
 * - author (string): Book author
 * Plus optional fields like synopsis, page_count, genre_tags, etc.
 */

import chalk from "chalk";
import fs from "fs-extra";
import inquirer from "inquirer";
import path from "path";
import { fileURLToPath } from "url";
import BookManager from "./book-manager.js";

// Get current directory for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Main function - Entry point for the interactive book import tool
 *
 * Initializes the BookManager and presents the main menu with options
 * for importing, listing, clearing books, or exiting.
 */
async function main() {
  console.log(chalk.blue.bold("📚 BookSwipe Book Importer\n"));

  // Initialize BookManager with database connection
  const manager = new BookManager();
  await manager.init();

  // Present main menu options to user
  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: "📥 Import books from JSON file", value: "import" },
        { name: "📋 List current books", value: "list" },
        { name: "🗑️  Delete all books and votes", value: "clear" },
        { name: "❌ Exit", value: "exit" },
      ],
    },
  ]);

  // Route to appropriate handler based on user selection
  switch (answers.action) {
    case "import":
      await handleImport(manager);
      break;
    case "list":
      await manager.listBooks();
      break;
    case "clear":
      await handleClear(manager);
      break;
    case "exit":
      console.log(chalk.gray("👋 Goodbye!"));
      break;
  }
}

/**
 * Handle the book import process
 *
 * Guides the user through selecting a JSON file, previewing its contents,
 * and confirming the import operation. Supports both files in the data
 * directory and custom file paths.
 *
 * @param {BookManager} manager - BookManager instance for database operations
 */
async function handleImport(manager) {
  // Ensure the data directory exists
  const dataDir = path.join(__dirname, "..", "data");
  await fs.ensureDir(dataDir);

  // Scan for JSON files in the data directory
  const files = await fs.readdir(dataDir);
  const jsonFiles = files.filter((file) => file.endsWith(".json"));

  // Check if any JSON files are available
  if (jsonFiles.length === 0) {
    console.log(chalk.yellow("⚠️  No JSON files found in admin-tools/data/"));
    console.log(
      chalk.gray("Place your book JSON files in the data/ directory first."),
    );
    return;
  }

  const { fileName } = await inquirer.prompt([
    {
      type: "list",
      name: "fileName",
      message: "Select a JSON file to import:",
      choices: [
        ...jsonFiles.map((file) => ({ name: file, value: file })),
        { name: "📁 Browse for file...", value: "browse" },
      ],
    },
  ]);

  let filePath;

  if (fileName === "browse") {
    const { customPath } = await inquirer.prompt([
      {
        type: "input",
        name: "customPath",
        message: "Enter the full path to your JSON file:",
        validate: async (input) => {
          try {
            await fs.access(input);
            return true;
          } catch {
            return "File not found. Please enter a valid path.";
          }
        },
      },
    ]);
    filePath = customPath;
  } else {
    filePath = path.join(dataDir, fileName);
  }

  // Preview the file content
  try {
    const data = await fs.readJSON(filePath);
    const count = Array.isArray(data) ? data.length : 1;

    console.log(
      chalk.blue(
        `\n📖 Preview: Found ${count} book(s) in ${path.basename(filePath)}`,
      ),
    );

    if (Array.isArray(data) && data.length > 0) {
      console.log(chalk.gray("First book:"));
      console.log(chalk.gray(`- Title: ${data[0].title}`));
      console.log(chalk.gray(`- Author: ${data[0].author}`));
    }
  } catch (error) {
    console.error(chalk.red(`❌ Invalid JSON file: ${error.message}`));
    return;
  }

  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: "Proceed with import?",
      default: true,
    },
  ]);

  if (confirm) {
    await manager.importBooksFromFile(filePath);
  } else {
    console.log(chalk.gray("Import cancelled."));
  }
}

/**
 * Handle the bulk delete operation
 *
 * Lists all current books and provides a confirmation prompt before
 * permanently deleting all books from the database. Includes progress
 * tracking and safety confirmations.
 *
 * @param {BookManager} manager - BookManager instance for database operations
 */
async function handleClear(manager) {
  // Get current books to show user what will be deleted
  const books = await manager.listBooks();

  // Early exit if no books exist
  if (books.length === 0) {
    console.log(chalk.yellow("No books to delete."));
    return;
  }

  // Safety confirmation with clear warning
  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: chalk.red(
        `⚠️  Delete ALL ${books.length} books? This cannot be undone!`,
      ),
      default: false, // Default to 'No' for safety
    },
  ]);

  if (confirm) {
    console.log(chalk.blue("🗑️  Deleting books..."));

    // Delete each book individually and track success/failure
    let deleted = 0;
    for (const book of books) {
      const success = await manager.deleteBook(book.id);
      if (success) deleted++;
    }

    console.log(chalk.green(`✅ Deleted ${deleted} books`));
  } else {
    console.log(chalk.gray("Delete cancelled."));
  }
}

main().catch(console.error);
