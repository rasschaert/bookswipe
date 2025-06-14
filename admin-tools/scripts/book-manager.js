#!/usr/bin/env node

import PocketBase from "pocketbase";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, "..", "config.json");

class BookManager {
  constructor() {
    this.pb = null;
    this.config = null;
  }

  async init() {
    // Load configuration
    try {
      this.config = await fs.readJSON(CONFIG_PATH);
    } catch (error) {
      console.error(
        chalk.red(
          "❌ Config file not found. Copy config.example.json to config.json and update it."
        )
      );
      process.exit(1);
    }

    // Initialize PocketBase
    this.pb = new PocketBase(this.config.pocketbase.url);

    try {
      await this.pb
        .collection("_superusers")
        .authWithPassword(
          this.config.pocketbase.adminEmail,
          this.config.pocketbase.adminPassword
        );
      console.log(chalk.green("✅ Connected to PocketBase as admin"));
    } catch (error) {
      console.error(
        chalk.red("❌ Failed to authenticate with PocketBase:", error.message)
      );
      process.exit(1);
    }
  }

  async listBooks() {
    try {
      const books = await this.pb
        .collection(this.config.collections.books)
        .getFullList();

      console.log(chalk.blue(`\n📚 Found ${books.length} books:\n`));

      books.forEach((book, index) => {
        console.log(
          `${index + 1}. ${chalk.bold(book.title)} by ${book.author}`
        );
        console.log(
          `   📄 ${book.page_count} pages • 📅 ${book.publication_year}`
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

  async addBook(bookData) {
    try {
      const record = await this.pb
        .collection(this.config.collections.books)
        .create(bookData);
      console.log(
        chalk.green(`✅ Added book: ${bookData.title} (ID: ${record.id})`)
      );
      return record;
    } catch (error) {
      console.error(
        chalk.red(`❌ Failed to add book "${bookData.title}":`, error.message)
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
        chalk.red(`❌ Failed to delete book ${bookId}:`, error.message)
      );
      return false;
    }
  }

  async importBooksFromFile(filePath) {
    try {
      const booksData = await fs.readJSON(filePath);

      if (!Array.isArray(booksData)) {
        throw new Error("JSON file must contain an array of books");
      }

      console.log(chalk.blue(`📥 Importing ${booksData.length} books...`));

      let successCount = 0;
      let failCount = 0;

      for (const book of booksData) {
        const result = await this.addBook(book);
        if (result) {
          successCount++;
        } else {
          failCount++;
        }

        // Small delay to avoid overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log(
        chalk.green(
          `\n🎉 Import completed: ${successCount} successful, ${failCount} failed`
        )
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
        chalk.green(`✅ Exported ${books.length} books to: ${filePath}`)
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
          `${rank.toString().padStart(2)}. ${chalk.bold(book.title)} by ${
            book.author
          }`
        );
        console.log(
          `    ${chalk[scoreColor](`${book.score}% interested`)} (${
            book.interested
          }👍 ${book.not_interested}👎 of ${book.total} votes)`
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
