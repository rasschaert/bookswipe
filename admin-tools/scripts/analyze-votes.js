#!/usr/bin/env node

/**
 * VoteAnalyzer - Comprehensive voting analysis and reporting tool
 *
 * This module provides detailed analysis of BookSwipe voting data including:
 * - Statistical summaries of voting patterns
 * - Top book rankings and controversial selections
 * - Participation analysis (named vs anonymous voters)
 * - CSV and JSON export functionality
 *
 * Key features:
 * - Interest score calculation (% of voters who liked each book)
 * - Controversy detection (books with divided opinions)
 * - Export formats: CSV for spreadsheets, JSON for raw data
 * - Colored terminal output for better readability
 *
 * Usage:
 *   npm run analyze-votes
 *
 * Outputs:
 *   - Console analysis report
 *   - CSV file in data/exports/ with detailed statistics
 *   - JSON file in data/exports/ with raw vote data
 */

import chalk from "chalk";
import { createObjectCsvWriter } from "csv-writer";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import BookManager from "./book-manager.js";

// Get current directory for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * VoteAnalyzer class handles comprehensive vote analysis and reporting
 *
 * Processes voting data to generate insights including:
 * - Book popularity rankings
 * - Controversial selections (divided opinions)
 * - Participation statistics
 * - Data export in multiple formats
 */
class VoteAnalyzer {
  constructor() {
    this.manager = new BookManager(); // BookManager instance for database access
  }

  async init() {
    await this.manager.init();
  }

  /**
   * Generate comprehensive voting analysis report
   *
   * Fetches all voting data from the database, analyzes patterns,
   * and displays formatted results with export functionality.
   *
   * @returns {Array} Analyzed voting results with book statistics
   */
  async generateReport() {
    console.log(chalk.blue.bold("📊 BookSwipe Vote Analysis Report\n"));

    try {
      // Fetch all votes and books from the database
      const votes = await this.manager.pb.collection("votes").getFullList();
      const books = await this.manager.pb.collection("books").getFullList();

      // Display high-level statistics
      console.log(chalk.blue("📈 Summary Statistics:"));
      console.log(`• Total voting sessions: ${chalk.bold(votes.length)}`);
      console.log(`• Total books: ${chalk.bold(books.length)}`);
      console.log(
        `• Average votes per book: ${chalk.bold(
          (votes.length / books.length).toFixed(1)
        )}`
      );
      console.log();

      // Process raw voting data into analyzable format
      const results = this.analyzeVotingData(votes, books);

      // Generate and display different analysis sections
      this.displayTopPicks(results);
      this.displayControversialBooks(results);
      this.displayParticipationStats(votes);

      // Export processed data for external analysis
      await this.exportToCSV(results);
      await this.exportWebResults(results, votes.length);

      return results;
    } catch (error) {
      console.error(chalk.red("❌ Failed to analyze votes:", error.message));
      return [];
    }
  }

  /**
   * Process raw voting data into analyzable statistics
   *
   * Transforms vote records and book data into structured statistics
   * including interest scores and controversy metrics.
   *
   * @param {Array} votes - Raw vote records from database
   * @param {Array} books - Book records from database
   * @returns {Array} Processed book statistics with voting metrics
   */
  analyzeVotingData(votes, books) {
    const bookStats = {};

    // Initialize statistics object for each book
    books.forEach((book) => {
      bookStats[book.id] = {
        id: book.id,
        title: book.title,
        author: book.author,
        genre_tags: book.genre_tags || [],
        page_count: book.page_count,
        interested: 0, // Count of "interested" votes
        not_interested: 0, // Count of "not interested" votes
        total: 0, // Total votes for this book
        score: 0, // Percentage of interested voters
        controversy: 0, // How divided the opinions are
      };
    });

    // Process each voting session and count individual book votes
    votes.forEach((voteRecord) => {
      // Each vote record contains a "votes" object with bookId -> vote mappings
      Object.entries(voteRecord.votes || {}).forEach(([bookId, vote]) => {
        if (bookStats[bookId]) {
          if (vote === "interested") {
            bookStats[bookId].interested++;
          } else if (vote === "not_interested") {
            bookStats[bookId].not_interested++;
          }
          bookStats[bookId].total++;
        }
      });
    });

    // Calculate derived metrics for each book
    Object.values(bookStats).forEach((book) => {
      if (book.total > 0) {
        // Interest score: percentage of voters who liked the book
        book.score = (book.interested / book.total) * 100;

        // Controversy score: books closer to 50/50 split are more controversial
        // Scale: 0 (unanimous) to 100 (perfectly split)
        book.controversy = 100 - Math.abs(50 - book.score);
      }
    });

    return Object.values(bookStats);
  }

  /**
   * Display the top-rated books with formatted output
   *
   * Shows the most popular books (highest interest percentage)
   * with visual indicators and detailed information.
   *
   * @param {Array} results - Processed book statistics
   */
  displayTopPicks(results) {
    // Sort all books by interest score and show top 10 (no minimum vote filter)
    const topBooks = results.sort((a, b) => b.score - a.score).slice(0, 10);

    console.log(chalk.green.bold("🏆 Top Book Picks (Most Liked):"));
    console.log();

    topBooks.forEach((book, index) => {
      // Display medals for top 3, numbers for the rest
      const medal =
        index === 0
          ? "🥇" // Gold medal
          : index === 1
            ? "🥈" // Silver medal
            : index === 2
              ? "🥉" // Bronze medal
              : `${index + 1}.`; // Numbered ranking

      // Color-code scores: green (70%+), yellow (50-69%), red (<50%)
      const scoreColor =
        book.score >= 70 ? "green" : book.score >= 50 ? "yellow" : "red";

      // Display book title and author
      console.log(`${medal} ${chalk.bold(book.title)} by ${book.author}`);

      // Show interest percentage with vote counts
      console.log(
        `   ${chalk[scoreColor](`${book.score.toFixed(1)}% liked`)} (${
          book.interested
        }👍 ${book.not_interested}👎)`
      );

      // Display additional book metadata
      console.log(
        `   📄 ${book.page_count} pages • 🏷️ ${book.genre_tags
          .slice(0, 3) // Show first 3 genres to avoid clutter
          .join(", ")}`
      );
      console.log();
    });
  }

  displayControversialBooks(results) {
    const controversial = results
      .filter((book) => book.total >= 5) // Need enough votes to be meaningful
      .sort((a, b) => b.controversy - a.controversy)
      .slice(0, 5);

    if (controversial.length > 0) {
      console.log(
        chalk.yellow.bold("🔥 Most Controversial Books (Divided Opinions):")
      );
      console.log();

      controversial.forEach((book, index) => {
        console.log(
          `${index + 1}. ${chalk.bold(book.title)} by ${book.author}`
        );
        console.log(
          `   ${book.score.toFixed(1)}% liked (${book.interested}👍 ${
            book.not_interested
          }👎)`
        );
        console.log(`   Controversy score: ${book.controversy.toFixed(1)}/100`);
        console.log();
      });
    }
  }

  displayParticipationStats(votes) {
    console.log(chalk.blue.bold("👥 Participation Statistics:"));
    console.log();

    const namedVotes = votes.filter(
      (v) =>
        v.user_name &&
        v.user_name.trim() &&
        v.user_name.trim().toLowerCase() !== "anonymous"
    );
    const anonymousVotes = votes.filter(
      (v) =>
        !v.user_name ||
        !v.user_name.trim() ||
        v.user_name.trim().toLowerCase() === "anonymous"
    );

    console.log(`• Named participants: ${chalk.bold(namedVotes.length)}`);
    console.log(
      `• Anonymous participants: ${chalk.bold(anonymousVotes.length)}`
    );

    if (namedVotes.length > 0) {
      console.log("\n📝 Named Participants:");
      namedVotes.forEach((vote) => {
        const voteCount = Object.keys(vote.votes || {}).length;
        console.log(`   • ${vote.user_name} (${voteCount} books rated)`);
      });
    }

    console.log();
  }

  async exportToCSV(results) {
    try {
      const exportDir = path.join(__dirname, "..", "data", "exports");
      await fs.ensureDir(exportDir);

      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-");
      const csvPath = path.join(exportDir, `vote-analysis-${timestamp}.csv`);

      const csvWriter = createObjectCsvWriter({
        path: csvPath,
        header: [
          { id: "title", title: "Title" },
          { id: "author", title: "Author" },
          { id: "score", title: "Score (%)" },
          { id: "interested", title: "Interested Votes" },
          { id: "not_interested", title: "Not Interested Votes" },
          { id: "total", title: "Total Votes" },
          { id: "controversy", title: "Controversy Score" },
          { id: "page_count", title: "Page Count" },
          { id: "genres", title: "Genres" },
        ],
      });

      const csvData = results
        .sort((a, b) => b.score - a.score)
        .map((book) => ({
          ...book,
          score: book.score.toFixed(2),
          controversy: book.controversy.toFixed(2),
          genres: book.genre_tags.join(", "),
        }));

      await csvWriter.writeRecords(csvData);

      console.log(chalk.green(`✅ Results exported to: ${csvPath}`));
    } catch (error) {
      console.error(chalk.red("❌ Failed to export CSV:", error.message));
    }
  }

  async exportVoteDetails() {
    try {
      const votes = await this.manager.pb.collection("votes").getFullList();
      const exportDir = path.join(__dirname, "..", "data", "exports");
      await fs.ensureDir(exportDir);

      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-");
      const jsonPath = path.join(exportDir, `raw-votes-${timestamp}.json`);

      await fs.writeJSON(jsonPath, votes, { spaces: 2 });

      console.log(chalk.green(`✅ Raw vote data exported to: ${jsonPath}`));
    } catch (error) {
      console.error(
        chalk.red("❌ Failed to export vote details:", error.message)
      );
    }
  }

  async exportWebResults(results, totalSessions) {
    try {
      // Path to the docs directory (web results)
      const webPath = path.join(__dirname, "..", "..", "docs", "results.json");

      // Sort results by score (highest first)
      const sortedResults = results.sort((a, b) => b.score - a.score);

      // Create web-friendly format
      const webData = {
        timestamp: new Date().toISOString(),
        total_sessions: totalSessions,
        books: sortedResults.map((book) => ({
          title: book.title,
          author: book.author,
          score: book.score,
          interested: book.interested,
          not_interested: book.not_interested,
          total: book.total,
          controversy: book.controversy || 0,
          page_count: book.page_count || 0,
          genres: book.genre_tags || [],
        })),
      };

      await fs.writeJSON(webPath, webData, { spaces: 2 });

      console.log(chalk.green(`✅ Web results exported to: ${webPath}`));
      console.log(chalk.blue(`🌐 View results at: docs/results.html`));
    } catch (error) {
      console.error(
        chalk.red("❌ Failed to export web results:", error.message)
      );
    }
  }
}

async function main() {
  const analyzer = new VoteAnalyzer();
  await analyzer.init();

  await analyzer.generateReport();
  await analyzer.exportVoteDetails();
}

main().catch(console.error);
