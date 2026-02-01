#!/usr/bin/env node

/**
 * BookManager - Core class for managing BookSwipe book collections
 *
 * This module provides the foundational functionality for all book-related operations
 * including database connections, CRUD operations, and data import/export.
 *
 * Key features:
 * - PocketBase database integration with authentication
 * - Bulk book import/export with progress tracking
 * - Vote statistics and analysis
 * - Error handling and user feedback
 *
 * Usage:
 *   const manager = new BookManager();
 *   await manager.init();
 *   const books = await manager.listBooks();
 */

import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import PocketBase from "pocketbase";
import { fileURLToPath } from "url";

// Get current directory for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, "..", "config.json");

/**
 * BookManager class handles all book collection operations
 *
 * Provides a unified interface for:
 * - Database connection management
 * - Book CRUD operations
 * - Bulk import/export functionality
 * - Vote analysis and statistics
 */
class BookManager {
  constructor() {
    this.pb = null; // PocketBase client instance
    this.config = null; // Configuration loaded from config.json
  }

  /**
   * Initialize the BookManager instance
   *
   * Loads configuration from config.json and establishes authenticated
   * connection to PocketBase. Must be called before using other methods.
   *
   * @throws {Error} If config file is missing or PocketBase auth fails
   */
  async init() {
    // Load configuration from config.json
    try {
      this.config = await fs.readJSON(CONFIG_PATH);
    } catch (error) {
      console.error(
        chalk.red(
          "❌ Config file not found. Copy config.example.json to config.json and update it.",
        ),
      );
      process.exit(1);
    }

    // Initialize PocketBase client with configured URL
    this.pb = new PocketBase(this.config.pocketbase.url);

    // Authenticate as admin to access collections
    try {
      await this.pb
        .collection("_superusers")
        .authWithPassword(
          this.config.pocketbase.adminEmail,
          this.config.pocketbase.adminPassword,
        );
      console.log(chalk.green("✅ Connected to PocketBase as admin"));
    } catch (error) {
      console.error(
        chalk.red("❌ Failed to authenticate with PocketBase:", error.message),
      );
      console.error(chalk.red("\nDebug information:"));
      console.error(chalk.yellow("  PocketBase URL:", this.config.pocketbase.url));
      console.error(chalk.yellow("  Admin email:", this.config.pocketbase.adminEmail));
      console.error(chalk.yellow("  Error details:", JSON.stringify(error, null, 2)));
      if (error.data) {
        console.error(chalk.yellow("  Server response:", JSON.stringify(error.data, null, 2)));
      }
      if (error.status) {
        console.error(chalk.yellow("  HTTP status:", error.status));
      }
      process.exit(1);
    }
  }

  /**
   * Retrieve and display all books in the collection
   *
   * Fetches all books from the database and displays them with
   * formatted output including title, author, page count, and genres.
   *
   * @returns {Array} Array of book objects from database
   */
  async listBooks() {
    try {
      // Fetch all books from the configured books collection
      const books = await this.pb
        .collection(this.config.collections.books)
        .getFullList();

      console.log(chalk.blue(`\n📚 Found ${books.length} books:\n`));

      // Display each book with formatted information
      books.forEach((book, index) => {
        console.log(
          `${index + 1}. ${chalk.bold(book.title)} by ${book.author}`,
        );
        console.log(
          `   📄 ${book.page_count} pages • 📅 ${book.publication_year}`,
        );
        console.log(`   🏷️  ${book.genre_tags?.join(", ") || "No genres"}`);
        console.log();
      });

      return books;
    } catch (error) {
      console.error(chalk.red("❌ Failed to fetch books:", error.message));
      return [];
    }
  }

  /**
   * Add a single book to the collection
   *
   * Creates a new book record in the database with provided data.
   * Handles validation errors and provides user feedback.
   *
   * @param {Object} bookData - Book information object
   * @param {string} bookData.title - Book title (required)
   * @param {string} bookData.author - Book author (required)
   * @param {string} [bookData.country] - Author's country
   * @param {string} [bookData.suggester] - Club member who suggested the book
   * @param {string} [bookData.pitch] - Short pitch from the suggester
   * @param {string} [bookData.synopsis] - Book description
   * @param {number} [bookData.page_count] - Number of pages
   * @param {Array} [bookData.genre_tags] - Genre categories
   * @returns {Object|null} Created book record or null if failed
   */
  async addBook(bookData) {
    try {
      // Create new book record in PocketBase
      const record = await this.pb
        .collection(this.config.collections.books)
        .create(bookData);
      console.log(
        chalk.green(`✅ Added book: ${bookData.title} (ID: ${record.id})`),
      );
      return record;
    } catch (error) {
      console.error(
        chalk.red(`❌ Failed to add book "${bookData.title}":`, error.message),
      );
      return null;
    }
  }

  async deleteBook(bookId) {
    try {
      await this.pb.collection(this.config.collections.books).delete(bookId);
      console.log(chalk.green(`✅ Deleted book with ID: ${bookId}`));
      return true;
    } catch (error) {
      console.error(
        chalk.red(`❌ Failed to delete book ${bookId}:`, error.message),
      );
      return false;
    }
  }

  async deleteVote(voteId) {
    try {
      await this.pb.collection(this.config.collections.votes).delete(voteId);
      console.log(chalk.green(`✅ Deleted vote with ID: ${voteId}`));
      return true;
    } catch (error) {
      console.error(
        chalk.red(`❌ Failed to delete vote ${voteId}:`, error.message),
      );
      return false;
    }
  }

  async listVotes() {
    try {
      const votes = await this.pb
        .collection(this.config.collections.votes)
        .getFullList();
      return votes;
    } catch (error) {
      console.error(chalk.red("❌ Failed to fetch votes:", error.message));
      return [];
    }
  }

  /**
   * Import multiple books from individual JSON files in a folder
   *
   * Reads individual JSON files from the books folder and imports
   * each one to the database. Provides progress tracking and error handling.
   *
   * @param {string} folderPath - Path to folder containing individual book JSON files
   * @param {Array<string>} fileNames - Array of filenames to import
   */
  async importBooksFromFolder(folderPath, fileNames) {
    try {
      console.log(chalk.blue(`📥 Importing ${fileNames.length} books...`));

      let successCount = 0;
      let failCount = 0;

      // Import each book individually to handle partial failures gracefully
      for (const fileName of fileNames) {
        const filePath = path.join(folderPath, fileName);
        try {
          const bookData = await fs.readJSON(filePath);
          const result = await this.addBook(bookData);
          if (result) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(
            chalk.red(`❌ Failed to read ${fileName}:`, error.message),
          );
          failCount++;
        }

        // Small delay to avoid overwhelming the PocketBase server
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log(
        chalk.green(
          `\n🎉 Import completed: ${successCount} successful, ${failCount} failed`,
        ),
      );
    } catch (error) {
      console.error(chalk.red("❌ Failed to import books:", error.message));
    }
  }

  /**
   * Import multiple books from a JSON file (Legacy support)
   *
   * Reads a JSON file containing an array of book objects and imports
   * each one to the database. Provides progress tracking and error handling
   * for individual book imports.
   *
   * @param {string} filePath - Path to JSON file containing book array
   */
  async importBooksFromFile(filePath) {
    try {
      // Read and parse the JSON file
      const booksData = await fs.readJSON(filePath);

      // Validate that the file contains an array
      if (!Array.isArray(booksData)) {
        throw new Error("JSON file must contain an array of books");
      }

      console.log(chalk.blue(`📥 Importing ${booksData.length} books...`));

      let successCount = 0;
      let failCount = 0;

      // Import each book individually to handle partial failures gracefully
      for (const book of booksData) {
        const result = await this.addBook(book);
        if (result) {
          successCount++;
        } else {
          failCount++;
        }

        // Small delay to avoid overwhelming the PocketBase server
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log(
        chalk.green(
          `\n🎉 Import completed: ${successCount} successful, ${failCount} failed`,
        ),
      );
    } catch (error) {
      console.error(chalk.red("❌ Failed to import books:", error.message));
    }
  }

  async exportBooksToFile(filePath) {
    try {
      const books = await this.pb
        .collection(this.config.collections.books)
        .getFullList();

      // Clean up the data for export (remove PocketBase metadata)
      const cleanBooks = books.map((book) => {
        const {
          id,
          created,
          updated,
          collectionId,
          collectionName,
          ...cleanBook
        } = book;
        return cleanBook;
      });

      await fs.ensureDir(path.dirname(filePath));
      await fs.writeJSON(filePath, cleanBooks, { spaces: 2 });

      console.log(
        chalk.green(`✅ Exported ${books.length} books to: ${filePath}`),
      );
    } catch (error) {
      console.error(chalk.red("❌ Failed to export books:", error.message));
    }
  }

  async getVotingStats() {
    try {
      const votes = await this.pb
        .collection(this.config.collections.votes)
        .getFullList();
      const books = await this.pb
        .collection(this.config.collections.books)
        .getFullList();

      console.log(chalk.blue("\n📊 Voting Statistics:\n"));
      console.log(`Total voting sessions: ${votes.length}`);
      console.log(`Total books available: ${books.length}`);

      // Analyze vote data
      const bookStats = {};

      votes.forEach((voteRecord) => {
        Object.entries(voteRecord.votes || {}).forEach(([bookId, vote]) => {
          if (!bookStats[bookId]) {
            bookStats[bookId] = { interested: 0, not_interested: 0 };
          }
          bookStats[bookId][vote] = (bookStats[bookId][vote] || 0) + 1;
        });
      });

      // Create results with book titles
      const results = books
        .map((book) => {
          const stats = bookStats[book.id] || {
            interested: 0,
            not_interested: 0,
          };
          const total = stats.interested + stats.not_interested;
          const score =
            total > 0 ? ((stats.interested / total) * 100).toFixed(1) : 0;

          return {
            title: book.title,
            author: book.author,
            interested: stats.interested,
            not_interested: stats.not_interested,
            total: total,
            score: parseFloat(score),
          };
        })
        .sort((a, b) => b.score - a.score);

      console.log(chalk.bold("📈 Book Rankings (by % interested):\n"));

      results.forEach((book, index) => {
        const rank = index + 1;
        const scoreColor =
          book.score >= 70 ? "green" : book.score >= 50 ? "yellow" : "red";

        console.log(
          `${rank.toString().padStart(2)}. ${chalk.bold(book.title)} by ${book.author}`,
        );
        console.log(
          `    ${chalk[scoreColor](
            `${book.score}% interested`,
          )} (${book.interested}👍 ${book.not_interested}👎 of ${book.total} votes)`,
        );
        console.log();
      });

      return results;
    } catch (error) {
      console.error(chalk.red("❌ Failed to get voting stats:", error.message));
      return [];
    }
  }
}

export default BookManager;
