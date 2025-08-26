#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

function findGitRoot() {
  try {
    const gitRoot = execSync("git rev-parse --show-toplevel", {
      encoding: "utf8",
      cwd: process.cwd(),
    }).trim();
    return gitRoot;
  } catch (error) {
    // Fallback: assume we're in admin-tools and go up one level
    return path.join(process.cwd(), "..");
  }
}

function csvToResultsJson(csvFilePath, outputPath = null) {
  try {
    // Read CSV file
    const csvContent = fs.readFileSync(csvFilePath, "utf8");
    const lines = csvContent.trim().split("\n");
    const headers = lines[0].split(",");

    // Parse CSV data
    const books = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]);
      const book = {};

      // Map CSV columns to JSON structure
      book.title = values[0];
      book.author = values[1];
      book.score = parseFloat(values[2]);
      book.interested = parseInt(values[3]);
      book.not_interested = parseInt(values[4]);
      book.total = parseInt(values[5]);
      book.controversy = parseFloat(values[6]);
      book.page_count = parseInt(values[7]);

      // Parse genres from comma-separated string
      const genresString = values[8] || "";
      book.genres = genresString
        .replace(/"/g, "") // Remove quotes
        .split(",")
        .map((g) => g.trim())
        .filter((g) => g.length > 0);

      books.push(book);
    }

    // Create results JSON structure
    const resultsJson = {
      timestamp: "2025-07-25T14:30:41.000Z", // Use the date from filename
      total_sessions: books.length > 0 ? books[0].total : 0, // Use total votes as session count
      books: books,
    };

    // Determine output path
    const gitRoot = findGitRoot();
    const outputFile = outputPath || path.join(gitRoot, "docs/results.json");

    // Write JSON file
    fs.writeFileSync(outputFile, JSON.stringify(resultsJson, null, 2));

    console.log(`✅ Converted CSV to results.json`);
    console.log(`📊 ${books.length} books processed`);
    console.log(`📁 Output: ${outputFile}`);

    return outputFile;
  } catch (error) {
    console.error("❌ Error converting CSV to JSON:", error.message);
    process.exit(1);
  }
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current); // Add the last field
  return result;
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const csvFile = process.argv[2];
  if (!csvFile) {
    console.error("Usage: node csv-to-json.js <csv-file>");
    process.exit(1);
  }

  csvToResultsJson(csvFile);
}

export { csvToResultsJson };
