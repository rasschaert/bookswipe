#!/usr/bin/env node

import chalk from "chalk";
import fs from "fs-extra";
import inquirer from "inquirer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function ensureCollections(pb) {
  console.log(chalk.blue("\n📚 Setting up collections..."));

  // Books collection schema
  const booksSchema = {
    name: "books",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
    fields: [
      {
        name: "title",
        type: "text",
        required: true,
      },
      {
        name: "author",
        type: "text",
        required: true,
      },
      {
        name: "synopsis",
        type: "editor",
        required: false,
      },
      {
        name: "page_count",
        type: "number",
        required: false,
      },
      {
        name: "publication_year",
        type: "number",
        required: false,
      },
      {
        name: "genre_tags",
        type: "json",
        required: false,
      },
      {
        name: "cover_image_url",
        type: "url",
        required: false,
      },
      {
        name: "average_storygraph_rating",
        type: "number",
        required: false,
      },
      {
        name: "number_of_votes",
        type: "number",
        required: false,
      },
    ],
  };

  // Votes collection schema
  const votesSchema = {
    name: "votes",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
    fields: [
      {
        name: "user_name",
        type: "text",
        required: false,
      },
      {
        name: "votes",
        type: "json",
        required: true,
      },
      {
        name: "session_id",
        type: "text",
        required: true,
      },
      {
        name: "submitted_at",
        type: "date",
        required: true,
      },
    ],
  };

  // Check and create books collection
  try {
    await pb.collection("books").getList(1, 1);
    console.log(chalk.green("✅ Books collection already exists"));
  } catch (error) {
    try {
      await pb.collections.create(booksSchema);
      console.log(chalk.green("✅ Created books collection"));
    } catch (createError) {
      console.log(
        chalk.red("❌ Failed to create books collection:", createError.message),
      );
    }
  }

  // Check and create votes collection
  try {
    await pb.collection("votes").getList(1, 1);
    console.log(chalk.green("✅ Votes collection already exists"));
  } catch (error) {
    try {
      await pb.collections.create(votesSchema);
      console.log(chalk.green("✅ Created votes collection"));
    } catch (createError) {
      console.log(
        chalk.red("❌ Failed to create votes collection:", createError.message),
      );
    }
  }
}

async function setup() {
  console.log(chalk.blue.bold("🛠️  BookSwipe Admin Tools Setup\n"));

  const configPath = path.join(__dirname, "..", "config.json");
  const exampleConfigPath = path.join(__dirname, "..", "config.example.json");

  // Check if config already exists
  const configExists = await fs.pathExists(configPath);
  let config;

  if (configExists) {
    const { overwrite } = await inquirer.prompt([
      {
        type: "confirm",
        name: "overwrite",
        message: "Config file already exists. Overwrite it?",
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log(chalk.green("✅ Using existing configuration"));
      config = await fs.readJSON(configPath);
    } else {
      // Get new configuration from user
      console.log(
        chalk.blue("📝 Let's configure your PocketBase connection:\n"),
      );

      const answers = await inquirer.prompt([
        {
          type: "input",
          name: "url",
          message: "PocketBase URL:",
          validate: (input) => {
            try {
              new URL(input);
              return true;
            } catch {
              return "Please enter a valid URL";
            }
          },
        },
        {
          type: "input",
          name: "adminEmail",
          message: "Admin email:",
          validate: (input) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(input) || "Please enter a valid email";
          },
        },
        {
          type: "password",
          name: "adminPassword",
          message: "Admin password:",
          validate: (input) => {
            return input.length > 0 || "Password cannot be empty";
          },
        },
      ]);

      // Load example config and update with user input
      const exampleConfig = await fs.readJSON(exampleConfigPath);

      config = {
        ...exampleConfig,
        pocketbase: {
          url: answers.url,
          adminEmail: answers.adminEmail,
          adminPassword: answers.adminPassword,
        },
      };

      // Save config
      await fs.writeJSON(configPath, config, { spaces: 2 });
      console.log(chalk.green("\n✅ Configuration saved!"));
    }
  } else {
    // No config exists, get configuration from user
    console.log(chalk.blue("📝 Let's configure your PocketBase connection:\n"));

    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "url",
        message: "PocketBase URL:",
        validate: (input) => {
          try {
            new URL(input);
            return true;
          } catch {
            return "Please enter a valid URL";
          }
        },
      },
      {
        type: "input",
        name: "adminEmail",
        message: "Admin email:",
        validate: (input) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(input) || "Please enter a valid email";
        },
      },
      {
        type: "password",
        name: "adminPassword",
        message: "Admin password:",
        validate: (input) => {
          return input.length > 0 || "Password cannot be empty";
        },
      },
    ]);

    // Load example config and update with user input
    const exampleConfig = await fs.readJSON(exampleConfigPath);

    config = {
      ...exampleConfig,
      pocketbase: {
        url: answers.url,
        adminEmail: answers.adminEmail,
        adminPassword: answers.adminPassword,
      },
    };

    // Save config
    await fs.writeJSON(configPath, config, { spaces: 2 });
    console.log(chalk.green("\n✅ Configuration saved!"));
  }

  // Create necessary directories
  const dataDir = path.join(__dirname, "..", "data");
  const exportsDir = path.join(dataDir, "exports");
  const backupsDir = path.join(dataDir, "backups");

  await fs.ensureDir(dataDir);
  await fs.ensureDir(exportsDir);
  await fs.ensureDir(backupsDir);

  console.log(chalk.green("✅ Created data directories"));

  // Test connection
  console.log(chalk.blue("\n🔌 Testing PocketBase connection..."));

  try {
    const PocketBase = (await import("pocketbase")).default;
    const pb = new PocketBase(config.pocketbase.url);

    await pb
      .collection("_superusers")
      .authWithPassword(
        config.pocketbase.adminEmail,
        config.pocketbase.adminPassword,
      );

    console.log(chalk.green("✅ Connection successful!"));

    // Check and create collections if needed
    await ensureCollections(pb);
  } catch (error) {
    console.log(chalk.red("❌ Connection failed:", error.message));
    console.log(chalk.yellow("Please check your credentials and try again."));
  }

  console.log(chalk.blue.bold("\n🎉 Setup complete!"));
  console.log(chalk.gray("\nNext steps:"));
  console.log(
    chalk.gray("1. Make sure your PocketBase collections are set up"),
  );
  console.log(chalk.gray("2. Run: npm run import-books"));
  console.log(chalk.gray("3. Run: npm run analyze-votes"));
}

setup().catch(console.error);
