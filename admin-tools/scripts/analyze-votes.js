#!/usr/bin/env node

import BookManager from "./book-manager.js";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { createObjectCsvWriter } from "csv-writer";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class VoteAnalyzer {
  constructor() {
    this.manager = new BookManager();
  }

  async init() {
    await this.manager.init();
  }

  async generateReport() {
    console.log(chalk.blue.bold("📊 BookSwipe Vote Analysis Report\n"));

    try {
      const votes = await this.manager.pb.collection("votes").getFullList();
      const books = await this.manager.pb.collection("books").getFullList();

      console.log(chalk.blue("📈 Summary Statistics:"));
      console.log(`• Total voting sessions: ${chalk.bold(votes.length)}`);
      console.log(`• Total books: ${chalk.bold(books.length)}`);
      console.log(
        `• Average votes per book: ${chalk.bold(
          (votes.length / books.length).toFixed(1),
        )}`,
      );
      console.log();

      // Analyze voting patterns
      const results = this.analyzeVotingData(votes, books);

      // Display top picks
      this.displayTopPicks(results);

      // Display controversial books
      this.displayControversialBooks(results);

      // Display participation stats
      this.displayParticipationStats(votes);

      // Export to CSV
      await this.exportToCSV(results);

      return results;
    } catch (error) {
      console.error(chalk.red("❌ Failed to analyze votes:", error.message));
      return [];
    }
  }

  analyzeVotingData(votes, books) {
    const bookStats = {};

    // Initialize book stats
    books.forEach((book) => {
      bookStats[book.id] = {
        id: book.id,
        title: book.title,
        author: book.author,
        genre_tags: book.genre_tags || [],
        page_count: book.page_count,
        interested: 0,
        not_interested: 0,
        total: 0,
        score: 0,
        controversy: 0,
      };
    });

    // Count votes
    votes.forEach((voteRecord) => {
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

    // Calculate scores and controversy
    Object.values(bookStats).forEach((book) => {
      if (book.total > 0) {
        book.score = (book.interested / book.total) * 100;
        // Controversy score: books with votes close to 50/50 are more controversial
        book.controversy = 100 - Math.abs(50 - book.score);
      }
    });

    return Object.values(bookStats);
  }

  displayTopPicks(results) {
    const topBooks = results
      .filter((book) => book.total >= 3) // At least 3 votes
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    console.log(chalk.green.bold("🏆 Top Book Picks (Most Liked):"));
    console.log();

    topBooks.forEach((book, index) => {
      const medal =
        index === 0
          ? "🥇"
          : index === 1
            ? "🥈"
            : index === 2
              ? "🥉"
              : `${index + 1}.`;
      const scoreColor =
        book.score >= 70 ? "green" : book.score >= 50 ? "yellow" : "red";

      console.log(`${medal} ${chalk.bold(book.title)} by ${book.author}`);
      console.log(
        `   ${chalk[scoreColor](`${book.score.toFixed(1)}% liked`)} (${
          book.interested
        }👍 ${book.not_interested}👎)`,
      );
      console.log(
        `   📄 ${book.page_count} pages • 🏷️ ${book.genre_tags
          .slice(0, 3)
          .join(", ")}`,
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
        chalk.yellow.bold("🔥 Most Controversial Books (Divided Opinions):"),
      );
      console.log();

      controversial.forEach((book, index) => {
        console.log(
          `${index + 1}. ${chalk.bold(book.title)} by ${book.author}`,
        );
        console.log(
          `   ${book.score.toFixed(1)}% liked (${book.interested}👍 ${
            book.not_interested
          }👎)`,
        );
        console.log(`   Controversy score: ${book.controversy.toFixed(1)}/100`);
        console.log();
      });
    }
  }

  displayParticipationStats(votes) {
    console.log(chalk.blue.bold("👥 Participation Statistics:"));
    console.log();

    const namedVotes = votes.filter((v) => v.user_name && v.user_name.trim());
    const anonymousVotes = votes.filter(
      (v) => !v.user_name || !v.user_name.trim(),
    );

    console.log(`• Named participants: ${chalk.bold(namedVotes.length)}`);
    console.log(
      `• Anonymous participants: ${chalk.bold(anonymousVotes.length)}`,
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
        chalk.red("❌ Failed to export vote details:", error.message),
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
