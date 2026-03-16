#!/usr/bin/env node
import chalk from "chalk";
import inquirer from "inquirer";
import BookManager from "./book-manager.js";

const manager = new BookManager();
await manager.init();

const books = await manager.listBooks();

if (books.length === 0) {
  console.log(chalk.yellow("No books to delete."));
  process.exit(0);
}

const { confirm } = await inquirer.prompt([
  {
    type: "confirm",
    name: "confirm",
    message: chalk.red(`⚠️  Delete ALL ${books.length} books and their votes? This cannot be undone!`),
    default: false,
  },
]);

if (!confirm) {
  console.log(chalk.gray("Cancelled."));
  process.exit(0);
}

console.log(chalk.blue("🗑️  Deleting books and votes..."));

const votes = await manager.listVotes();
let deletedVotes = 0;
for (const vote of votes) {
  const success = await manager.deleteVote(vote.id);
  if (success) deletedVotes++;
}

let deletedBooks = 0;
for (const book of books) {
  const success = await manager.deleteBook(book.id);
  if (success) deletedBooks++;
}

console.log(chalk.green(`✅ Deleted ${deletedVotes} votes and ${deletedBooks} books`));
