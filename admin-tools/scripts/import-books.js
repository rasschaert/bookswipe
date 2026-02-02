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
 * Guides the user through selecting books to import from the books folder.
 * Each book is stored as an individual JSON file in admin-tools/data/books/.
 *
 * @param {BookManager} manager - BookManager instance for database operations
 */
async function handleImport(manager) {
  // Ensure the books directory exists
  const booksDir = path.join(__dirname, "..", "data", "books");
  await fs.ensureDir(booksDir);

  // Scan for JSON files in the books directory
  const files = await fs.readdir(booksDir);
  const jsonFiles = files.filter((file) => file.endsWith(".json"));

  // Check if any JSON files are available
  if (jsonFiles.length === 0) {
    console.log(
      chalk.yellow("⚠️  No book JSON files found in admin-tools/data/books/"),
    );
    console.log(
      chalk.gray(
        "Place individual book JSON files in the data/books/ directory first.",
      ),
    );
    return;
  }

  console.log(
    chalk.blue(`\n📖 Found ${jsonFiles.length} book(s) in books folder\n`),
  );

  const { importChoice } = await inquirer.prompt([
    {
      type: "list",
      name: "importChoice",
      message: "What would you like to import?",
      choices: [
        { name: "📚 Import all books", value: "all" },
        { name: "📖 Select specific books", value: "select" },
        { name: "❌ Cancel", value: "cancel" },
      ],
    },
  ]);

  if (importChoice === "cancel") {
    console.log(chalk.gray("Import cancelled."));
    return;
  }

  let booksToImport = [];

  if (importChoice === "all") {
    booksToImport = jsonFiles;
  } else {
    // Let user select which books to import
    const { selectedBooks } = await inquirer.prompt([
      {
        type: "checkbox",
        name: "selectedBooks",
        message: "Select books to import:",
        choices: jsonFiles.map((file) => ({
          name: file.replace(".json", ""),
          value: file,
        })),
      },
    ]);

    if (selectedBooks.length === 0) {
      console.log(chalk.yellow("No books selected."));
      return;
    }

    booksToImport = selectedBooks;
  }

  // Preview the books to be imported
  console.log(
    chalk.blue(`\n📖 Preview: Importing ${booksToImport.length} book(s)`),
  );

  try {
    const firstBookPath = path.join(booksDir, booksToImport[0]);
    const firstBook = await fs.readJSON(firstBookPath);
    console.log(chalk.gray("First book:"));
    console.log(chalk.gray(`- Title: ${firstBook.title}`));
    console.log(chalk.gray(`- Author: ${firstBook.author}`));
    console.log(chalk.gray(`- Country: ${firstBook.country || "N/A"}`));
    console.log(chalk.gray(`- Suggester: ${firstBook.suggester || "N/A"}`));
  } catch (error) {
    console.error(chalk.red(`❌ Error reading first book: ${error.message}`));
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
    await manager.importBooksFromFolder(booksDir, booksToImport);
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
