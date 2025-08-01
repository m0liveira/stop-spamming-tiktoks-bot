const { REST, Routes, SlashCommandBuilder } = require("discord.js");
require("dotenv").config();

const commands = [
  new SlashCommandBuilder()
    .setName("addspam")
    .setDescription("Adds a user to the Spam role.")
    .addUserOption((option) =>
      option.setName("user").setDescription("User to mark").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("removespam")
    .setDescription("Removes a user from the Spam role.")
    .addUserOption((option) =>
      option.setName("user").setDescription("User to unmark").setRequired(true)
    ),
].map((cmd) => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("Registering slash commands...");
    await rest.put(Routes.applicationCommands("1400865748624216106"), {
      body: commands,
    });
    console.log("✅ Slash commands registered.");
  } catch (err) {
    console.error(err);
  }
})();
