const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  EmbedBuilder,
} = require("discord.js");
require("dotenv").config();

const SPAM_ROLE_NAME = "Spam";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Command Handler
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, guild, member } = interaction;

  const isMod = member.permissions.has([
    PermissionsBitField.Flags.ManageRoles,
    PermissionsBitField.Flags.Administrator,
  ]);

  if (!isMod) {
    return interaction.reply({
      content: "❌ You do not have permission to use this command.",
      ephemeral: true,
    });
  }

  if (commandName === "addspam") {
    const target = options.getMember("user");
    let role = guild.roles.cache.find((r) => r.name === SPAM_ROLE_NAME);

    if (!role) {
      role = await guild.roles.create({
        name: SPAM_ROLE_NAME,
        color: "Red",
        reason: "Spam role created by bot",
      });
    }

    await target.roles.add(role);
    await interaction.reply({
      content: `✅ Added ${target.user.tag} to the Spam role.`,
      ephemeral: true,
    });
  }

  if (commandName === "removespam") {
    const target = options.getMember("user");
    const role = guild.roles.cache.find((r) => r.name === SPAM_ROLE_NAME);

    if (!role) {
      return interaction.reply({
        content: `⚠️ Spam role does not exist.`,
        ephemeral: true,
      });
    }

    await target.roles.remove(role);
    await interaction.reply({
      content: `✅ Removed ${target.user.tag} from the Spam role.`,
      ephemeral: true,
    });
  }
});

// Message Handler
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const spamRole = message.guild.roles.cache.find(
    (r) => r.name === SPAM_ROLE_NAME
  );
  const member = message.guild.members.cache.get(message.author.id);

  if (!spamRole || !member.roles.cache.has(spamRole.id)) return;

  const linkRegex =
    /(https?:\/\/)?(www\.)?(tiktok\.com|youtube\.com|youtu\.be|instagram\.com\/reel)/i;

  if (!linkRegex.test(message.content)) return;

  const voiceChannel = member.voice?.channel;
  if (!voiceChannel) return;

  const membersInVC = voiceChannel.members.filter((m) => !m.user.bot);
  if (membersInVC.size === 0) return;

  await message.delete();

  const durationSeconds = 60;
  let timeLeft = durationSeconds;

  const poll = await message.channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("🔗 Link Approval Needed")
        .setDescription(
          `${message.author.username} sent a link.\nVote to approve it:`
        )
        .addFields(
          { name: "Link", value: message.content },
          { name: "Time", value: `${timeLeft} seconds remaining` }
        )
        .setColor("Orange"),
    ],
  });

  const interval = setInterval(async () => {
    timeLeft--;

    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    const updatedEmbed = EmbedBuilder.from(poll.embeds[0]).spliceFields(1, 1, {
      name: "Time",
      value: `${timeLeft} seconds remaining`,
    });

    await poll.edit({ embeds: [updatedEmbed] });
  }, 1000);

  await poll.react("✅");
  await poll.react("❌");

  const filter = (reaction, user) =>
    ["✅", "❌"].includes(reaction.emoji.name) &&
    membersInVC.has(user.id) &&
    user.id !== message.author.id;

  const collected = await poll.awaitReactions({
    filter,
    time: durationSeconds * 1000,
  });
  const yes = collected.get("✅")?.users.cache.filter((u) => !u.bot).size || 0;
  const no = collected.get("❌")?.users.cache.filter((u) => !u.bot).size || 0;

  clearInterval(interval);

  await poll.delete();

  if (yes > no) {
    message.channel.send(`✅ Approved: ${message.content}`);
  } else {
    message.channel.send("❌ Link was not approved.");
  }
});

client.once("ready", () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
