#!/usr/bin/env node

/**
 * Debug script to test PocketBase connection and list collections
 */

import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import PocketBase from "pocketbase";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, "..", "config.json");

async function debug() {
  console.log(chalk.blue.bold("🔍 PocketBase Connection Debugger\n"));

  // Load config
  const config = await fs.readJSON(CONFIG_PATH);
  console.log(chalk.blue("Configuration:"));
  console.log(chalk.gray(`  URL: ${config.pocketbase.url}`));
  console.log(chalk.gray(`  Admin Email: ${config.pocketbase.adminEmail}`));
  console.log(chalk.gray(`  Books Collection: ${config.collections.books}`));
  console.log(chalk.gray(`  Votes Collection: ${config.collections.votes}\n`));

  // Initialize PocketBase
  const pb = new PocketBase(config.pocketbase.url);
  console.log(chalk.blue("PocketBase client created\n"));

  // Try authentication
  try {
    console.log(chalk.blue("Attempting authentication..."));
    const authData = await pb
      .collection("_superusers")
      .authWithPassword(
        config.pocketbase.adminEmail,
        config.pocketbase.adminPassword
      );
    console.log(chalk.green("✅ Authentication successful!"));
    console.log(chalk.gray("Full auth response:"));
    console.log(chalk.gray(JSON.stringify(authData, null, 2)));
    console.log(chalk.gray(`\nToken: ${pb.authStore.token ? "Present" : "Missing"}`));
    console.log(chalk.gray(`Is Valid: ${pb.authStore.isValid}`));
    console.log();
  } catch (error) {
    console.error(chalk.red("❌ Authentication failed:"), error.message);
    if (error.response) {
      console.error(chalk.gray("Response:"), JSON.stringify(error.response, null, 2));
    }
    if (error.data) {
      console.error(chalk.gray("Error data:"), JSON.stringify(error.data, null, 2));
    }
    console.error(chalk.gray("Full error:"), JSON.stringify(error, null, 2));
    process.exit(1);
  }

  // Try to list collections
  try {
    console.log(chalk.blue("Fetching available collections..."));
    const collections = await pb.collections.getFullList();
    console.log(chalk.green(`✅ Found ${collections.length} collections:`));
    collections.forEach((col) => {
      console.log(chalk.gray(`  - ${col.name} (${col.type})`));
    });
    console.log();
  } catch (error) {
    console.error(chalk.red("❌ Failed to list collections:"), error.message);
  }

  // Try to fetch books
  try {
    console.log(chalk.blue(`Fetching books from "${config.collections.books}" collection...`));
    const books = await pb.collection(config.collections.books).getFullList();
    console.log(chalk.green(`✅ Found ${books.length} books\n`));

    if (books.length > 0) {
      console.log(chalk.blue("First 3 books:"));
      books.slice(0, 3).forEach((book, i) => {
        console.log(chalk.gray(`  ${i + 1}. ${book.title} by ${book.author}`));
      });
    } else {
      console.log(chalk.yellow("⚠️  Books collection is empty"));
    }
  } catch (error) {
    console.error(chalk.red("❌ Failed to fetch books:"), error.message);
    if (error.response) {
      console.error(chalk.gray("Response:"), JSON.stringify(error.response, null, 2));
    }
  }

  // Try to fetch votes
  try {
    console.log(chalk.blue(`\nFetching votes from "${config.collections.votes}" collection...`));
    const votes = await pb.collection(config.collections.votes).getFullList();
    console.log(chalk.green(`✅ Found ${votes.length} votes\n`));
  } catch (error) {
    console.error(chalk.red("❌ Failed to fetch votes:"), error.message);
  }
}

debug().catch(console.error);
