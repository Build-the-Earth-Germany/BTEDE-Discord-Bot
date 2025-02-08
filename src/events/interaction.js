const {
  MessageEmbed,
  AutocompleteInteraction,
  CommandInteraction,
  MessageActionRow,
  MessageButton,
} = require("discord.js");
const BaseEvent = require("../classes/Event.js");
const Bot = require("../classes/Bot.js");
const googleBuilder = require("../functions/googleBuilder.js");
const changelogModal = require("../modals/changelog.js");


module.exports = class extends BaseEvent {
  constructor() {
    super("interactionCreate");
  }

  /**
   *
   * @param {Bot} client
   * @param {CommandInteraction} interaction
   */

  async run(client, interaction) {
    await interaction.member.fetch()
    if (interaction.type === "APPLICATION_COMMAND") {
      let command = client.commands.get(interaction.commandName);
      if (!command)
        return await interaction.reply({
          ephemeral: true,
          content: ":x: This command wasn't found.",
        });


      if (interaction.commandName === "changelog") {
       
        await interaction.showModal(changelogModal); 
      }  

      if (
        !command.config.userAvailable &&
        !(
          interaction.member.roles.cache.get(client.config.roles.team) ||
          interaction.member.roles.cache.get("849965829789450250")
        )
      )
        return await interaction.reply({
          ephemeral: true,
          embeds: [
            new MessageEmbed()
              .setColor("#ff0000")
              .setDescription(
                ":x: You don't have the required permissions to use this command."
              ),
          ],
        });

      await interaction.deferReply().catch((e) => {
        return client.Logger.error(e);
      });

      return command.run(interaction, client);
    } else if (interaction.type === "APPLICATION_COMMAND_AUTOCOMPLETE") {
      let command = client.commands.get(interaction.commandName);
      if (!command) return;

      let query = interaction.options._hoistedOptions.find(
        (x) => x.focused === true
      )?.value;
      let queries = command.queryHandler(query);
      while (queries.length > 25) queries.pop();

      return await client.api
        .interactions(interaction.id, interaction.token)
        .callback.post({
          data: {
            type: 8,
            data: {
              choices: queries,
            },
          },
        });
    } else if (interaction.isSelectMenu()) {
      if (interaction.customId === "fdrl_selector") {
        let states = interaction.values;
        let roles = interaction.guild.roles.cache;

        let rroles = [];
        for (let role in client.config.federalSelect) {
          rroles.push(role);
        }

        states.forEach((state) => {
          rroles = rroles.filter((x) => x != state);
          if (!client.config.federalSelect[state])
            return client.Logger.warn(
              `No State Role ID for: "${state}"`,
              "FEDERAL"
            );
          if (!roles.get(client.config.federalSelect[state])) return;
          interaction.member.roles
            .add(client.config.federalSelect[state])
            .catch(client.Logger.error);
        });

        rroles.forEach((bl) => {
          let role = client.config.federalSelect[bl];
          if (role && interaction.member.roles.cache.get(role)) {
            interaction.member.roles.remove(role);
          }
        });

        return await interaction.deferUpdate();
      }
    } else if (
      interaction.isButton() &&
      interaction.customId.startsWith("cp_")
    ) {
      if (!interaction.member.roles.cache.get(client.config.roles.team))
        return await interaction.deferUpdate().catch(client.Logger.warn);
      let data = client.usersInCreateProcess.find(
        (x) => interaction.message.id === x.msg
      );
      if (!data)
        return await interaction.deferUpdate().catch(client.Logger.warn);
      if (data.mod != interaction.user.id)
        return await interaction
          .reply({
            content: `Only the person that started the registration can use this button.`,
            ephemeral: true,
          })
          .catch(client.Logger.warn);

      let buttonName = interaction.customId.replace("cp_", "");

      if (buttonName === "cancel") {
        client.usersInCreateProcess.delete(data.id);
        await interaction
          .reply({ content: `:x: Canceled.`, ephemeral: true })
          .catch(client.Logger.warn);
        console.log(1);
        return await interaction.message.delete().catch(client.Logger.warn);
      }

      if (buttonName === "onward") {
        if (data.onward === true) data.onward = false;
        else data.onward = true;
      }

      if (buttonName === "finish") {
        for (var d in data) {
          if (!data[d]) {
            return interaction
              .reply({ content: `:x: \`${d}\` is empty.`, ephemeral: true })
              .catch(client.Logger.warn);
          }
        }

        if (data.role === "builder") {
          let channel =
            client.channels.cache.get(
              client.config.channels.usersRegistrationPings
            ) ||
            (await client.channels
              .fetch(client.config.channels.usersRegistrationPings)
              .catch(client.Logger.warn));
          if (channel) {
            channel.send({
              embeds: [
                new MessageEmbed()
                  .setTitle("Neuer Builder")
                  .setDescription(
                    `**Discordname:**\n<@!${data.id}> (${data.tag})\n**Minecraftname:**\n${data.minecraft}\n**Bauort:**\n${data.city}\n**Bundesland:**\n${data.federalState}\n**Koordinaten:**\n${data.coordinates}`
                  )
                  .setTimestamp(),
              ],
              content:
                "<@!" +
                client.config.federalPings[data.federalState].join("> <@!") +
                ">",
            });
          }
        }

        // spreadsheet
        await googleBuilder(
          client.config.spreadsheets.applications.id,
          client.config.spreadsheets.applications.range,
          client.config.spreadsheets.applications.sheetID,

          data.platform,
          data.minecraft,
          data.tag,
          data.creationImages,
          data.referenceImages,
          data.city,
          data.role === "trial" ? "TR" : data.federalState,
          data.coordinates,
          interaction.user.username
        );

        if (data.role === "builder" || data.role === "trial") {
          // removed because current RCON integration is broken
          /*
          await client.RCON.Lobby.connect();
          if(data.platform === "Java") {
          client.RCON.Lobby.run(`whitelist add ${data.uuid}`, true);
          } else if(data.platform = "Bedrock") {
            client.RCON.Lobby.run(`fwhitelist add ${data.minecraft}`)
          }
          client.RCON.Lobby.run(`lp user ${data.uuid} parent set ${data.role}`);
          */
          

          let member =
            interaction.guild.members.cache.get(data.id) ||
            (await interaction.guild.members
              .fetch(data.id)
              .catch(client.Logger.warn));
          member
            .setNickname(
              `${data.minecraft} [${data.city}, ${data.federalState}]`
            )
            .catch(client.Logger.warn);
          member.roles.add("697198852507435070").catch(client.Logger.warn);
          if (data.role === "builder") {
            member.roles.add("692841045901312081").catch(client.Logger.warn);
            if (member.roles.cache.get("703172621792968775"))
              member.roles.add("703172621792968775").catch(client.Logger.warn);
          } else if (data.role === "trial") {
            member.roles.add("703172621792968775").catch(client.Logger.warn);
          }
        }

        client.usersInCreateProcess.delete(data.id);

        await interaction
          .reply({ content: "✅ Succesfull.", ephemeral: true })
          .catch(client.Logger.warn);
        if (data.role === "trial")
          await interaction.channel.send({
            content:
              "```\n:flag_gb: Congratulations, you've been whitelisted as a Trial on the BTE Germany Minecraftserver! You can build on our server now. Apply again with your two new buildings to receive the builder role. You have two weeks until the Trial rank expires. The server IP and all important information about server navigation can be found in <#732589455256322069> and instructions and tips for building in <#781642142174019594>. If you have any other questions or problems, feel free to contact us on the server in <#719875693340655616>! Good Luck!\n\n:flag_de: Glückwunsch, du wurdest als Trial auf dem BTE-Germany Minecraftserver gewhitelisted. Jetzt kannst du auf unserem Server vorbauen. Bewirb dich erneut mit deinen zwei Bewerbungsgebäuden, um die Builder-Rolle zu erhalten. Du hast zwei Wochen Zeit, bis der Trial-Rang abläuft. Die Server-IP und alle wichtigen Informationen zur Servernavigation findest du in <#732589455256322069> und eine Anleitung und Tipps zum bauen in <#801917466137591899>. Falls Du noch weitere Fragen oder Probleme hast, melde dich gerne bei uns auf dem Server in <#719875693340655616>! Viel Erfolg!```",
          });
        if (data.role === "rejected")
          await interaction.channel.send({
            content:
              "```\n:flag_gb: Unfortunetly, we have to reject you, because ... Tips for building are in <#781642142174019594>. If you have any other questions or problems, feel free to contact us on the server in <#719875693340655616>! Good Luck!\n\n:flag_de: Leider müssen wir dich ablehnen, da ... Außerdem findest du eine Anleitung und Tipps zum Bauen in <#801917466137591899>. Falls Du noch weitere Fragen oder Probleme hast, melde dich gerne bei uns auf dem Server in <#719875693340655616>! Viel Erfolg!```",
          });
        console.log(2);
        interaction.channel.send({
          embeds: [
            new MessageEmbed()
              .setTitle("Überblick")
              .setDescription(
                `**Discordname:**\n<@!${data.id}> (${data.tag})\n**Minecraftname:**\n${data.minecraft}\n**Bauort:**\n${data.city}\n**Bundesland:**\n${data.federalState}\n**Koordinaten:**\n${data.coordinates}`
              )
              .setTimestamp(),
          ],
        });
        return await interaction.message.delete().catch(client.Logger.warn);
      }

      data.step = buttonName;
      client.usersInCreateProcess.delete(data.id);
      client.usersInCreateProcess.set(data.id, data);

      let selectRow = [
        new MessageActionRow().addComponents([
          new MessageButton()
            .setDisabled(false)
            .setLabel("Java / Bedrock")
            .setCustomId("cp_platform")
            .setStyle("SECONDARY"),

          new MessageButton()
            .setDisabled(false)
            .setLabel("Minecraft Name")
            .setCustomId("cp_minecraft")
            .setStyle("SECONDARY"),

          new MessageButton()
            .setDisabled(false)
            .setLabel("City")
            .setCustomId("cp_city")
            .setStyle("SECONDARY"),

          new MessageButton()
            .setDisabled(false)
            .setLabel("Federal State")
            .setCustomId("cp_federalState")
            .setStyle("SECONDARY"),
        ]),

        new MessageActionRow().addComponents([
          new MessageButton()
            .setDisabled(false)
            .setLabel("Creation Images")
            .setCustomId("cp_creationImages")
            .setStyle("SECONDARY"),

          new MessageButton()
            .setDisabled(false)
            .setLabel("Reference Images")
            .setCustomId("cp_referenceImages")
            .setStyle("SECONDARY"),

          new MessageButton()
            .setDisabled(false)
            .setLabel("Coordinates")
            .setEmoji(":x:")
            .setCustomId("cp_coordinates")
            .setStyle("SECONDARY"),
        ]),

        new MessageActionRow().addComponents([
          new MessageButton()
            .setDisabled(false)
            .setLabel("FINISH")
            .setCustomId("cp_finish")
            .setStyle("DANGER"),

          new MessageButton()
            .setDisabled(false)
            .setLabel("CANCEL")
            .setCustomId("cp_cancel")
            .setStyle("DANGER"),

          new MessageButton()
            .setDisabled(false)
            .setLabel("AUTO-ONWARD")
            .setEmoji("⏱")
            .setCustomId("cp_onward")
            .setStyle("SUCCESS"),
        ]),
      ];

        selectRow.forEach(async (row) => {
          row.components.forEach((component) => {
            // pressed button turns blue
            if (component.customId === `cp_${buttonName}`) {
              if (buttonName === "onward") {
                if (data.onward) {
                  component.setStyle("SUCCESS");
                } else {
                  component.setStyle("DANGER");
                }
              } else component.setStyle("PRIMARY");

              // other buttons turn gray
            } else if (component.style === "PRIMARY")
              component.setStyle("SECONDARY");
          });
        });

      //   await interaction.reply({ content: `Write the value for \`${buttonName}\` now.`, ephemeral: false }).catch(client.Logger.warn);
      await interaction.deferUpdate().catch(client.Logger.warn);

      await interaction.message.edit({ components: selectRow });
    } else if (
      interaction.isButton() &&
      interaction.customId === "btede_socials_ping"
    ) {
      if (interaction.member.roles.cache.get(roleId))
        interaction.member.roles.remove(client.config.roles.news);
      else interaction.member.roles.add(client.config.roles.news);

      interaction.deferUpdate().catch((e) => {});
    }
  }
};
