#!/usr/bin/env node

import BookManager from "./book-manager.js";
import inquirer from "inquirer";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log(chalk.blue.bold("📚 BookSwipe Book Importer\n"));

  const manager = new BookManager();
  await manager.init();

  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: "📥 Import books from JSON file", value: "import" },
        { name: "📋 List current books", value: "list" },
        { name: "🗑️  Delete all books", value: "clear" },
        { name: "❌ Exit", value: "exit" },
      ],
    },
  ]);

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

async function handleImport(manager) {
  const dataDir = path.join(__dirname, "..", "data");
  await fs.ensureDir(dataDir);

  // Check for JSON files in data directory
  const files = await fs.readdir(dataDir);
  const jsonFiles = files.filter((file) => file.endsWith(".json"));

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

async function handleClear(manager) {
  const books = await manager.listBooks();

  if (books.length === 0) {
    console.log(chalk.yellow("No books to delete."));
    return;
  }

  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: chalk.red(
        `⚠️  Delete ALL ${books.length} books? This cannot be undone!`,
      ),
      default: false,
    },
  ]);

  if (confirm) {
    console.log(chalk.blue("🗑️  Deleting books..."));

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
