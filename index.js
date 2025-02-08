(async function () {
  const { Intents } = require("discord.js");
  const Bot = require("./src/classes/Bot");

  const client = new Bot({
    partials: ["MESSAGE", "CHANNEL"],
    fetchAllMembers: false,
    intents: [
      Intents.FLAGS.GUILDS,
      Intents.FLAGS.GUILD_MESSAGES,
      Intents.FLAGS.GUILD_MEMBERS,
      Intents.FLAGS.GUILD_VOICE_STATES,
      Intents.FLAGS.DIRECT_MESSAGES,
    ],
  });

  const mongoose = require("mongoose");
  client.connection = await mongoose.connect(client.config.mongo.string, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const {
    registerEvents,
    registerCommands,
    registerModals, 
    registerInfoCommands,
  } = require("./src/functions/register");
  
  await registerEvents(client, "../events");
  await registerCommands(client, "../commands");
  await registerModals(client, "../modals");  
  await registerInfoCommands(client);
  
  client.Logger.info(`Registered ${client.commands.size} commands and ${client.modals.size} modals`, "COMMANDS");

  await client.login(client.config.BOT_TOKEN);

  require("./src/messageUpdateAPI.js")(client);
})();
