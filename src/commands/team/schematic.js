const {CommandInteraction, MessageAttachment} = require("discord.js");
const Command = require("../../classes/Command.js");
const axios = require("axios");
const Bot = require("../../classes/Bot.js");
const crypto = require("crypto");

class schematicCommand extends Command {
    constructor(client) {
        super(client, {
            name: "schematic", description: "Schematics command", userAvailable: false, options: [{
                name: "upload", description: "Uploads a schematic", type: 1, options: [{
                    name: "schematic",
                    description: "The schematic to upload",
                    type: 11,
                    required: true
                }, {
                    name: "terra",
                    description: "The terraserver to upload to",
                    type: 3,
                    required: true,
                    choices: client.config.status.map((s) => ({name: s.id, value: s.id})),
                }]
            }, {
                name: "list", description: "Lists all schematics on the given server", type: 1, options: [{
                    name: "terra",
                    description: "The terraserver to list schematics from",
                    type: 3,
                    required: true,
                    choices: client.config.status.map((s) => ({name: s.id, value: s.id})),
                }]
            }, {
                name: "download", description: "Downloads a schematic", type: 1, options: [{
                    name: "terra",
                    description: "The terraserver to download from",
                    type: 3,
                    required: true,
                    choices: client.config.status.map((s) => ({name: s.id, value: s.id})),
                }, {
                    name: "schematic", description: "The schematic to download", type: 3, required: true
                }]
            }],
        });
    }

    /**
     *
     * @param {CommandInteraction} interaction
     * @param {Bot} client
     */

    async run(interaction, client) {
        function chunkify(dat, size) {
            var chunks = [];
            var possiblePages = Math.ceil(dat.length / size).toString();
            dat.reduce((chuckStr, word, i, a) => {
              var pageIndex = ' ' + (chunks.length + 1) + '/';
              if ((chuckStr.length + word.length + pageIndex.length + possiblePages.length) + 1 > size) {
                chunks.push(chuckStr + pageIndex);
                chuckStr = word;
              } else if (i === a.length - 1) {
                chunks.push(chuckStr + "\n" + word + "\n" + pageIndex);
              }else {
                chuckStr += "\n" + word;
              }
              return chuckStr
            }, '');
            return chunks.map(chunk => chunk + chunks.length.toString())
          }

        const terraname = await interaction.options._hoistedOptions.find((x) => x.name === "terra").value;

        if (interaction.options.getSubcommand() === "list") {
            await axios.get(`http://cloud.bte.ger:45655/api/schematics/list?terra=${terraname.replace(" ", "-")}`).then((res) => {
                let dat = res.data
                    .filter(a => a.endsWith(".schematic") || a.endsWith(".schem"))
                    .map(a => a.replace(".schematic", "").replace(".schem", ""));
                let chunks = chunkify(dat, 1950);
                this.response(interaction, `Schematics on ${terraname}:`);
                chunks.forEach(chunk => {
                    return client.channels.cache.get(interaction.channelId).send({content: "```" + chunk + "```"});
                });
            }).catch((e) => {
                console.log(e.message);
                return this.error(interaction, `Failed to list schematics on ${terraname}!`);
            })
        }

        if (interaction.options.getSubcommand() === "upload") {
            const schemfile = await interaction.options._hoistedOptions.find((o) => o.name === "schematic").attachment;
            if (!schemfile) return this.error(interaction, "Please provide a valid schematic!");
            if (!(schemfile.name.endsWith(".schematic") || schemfile.name.endsWith(".schem"))) return this.error(interaction, "Please provide the schematic in the form of a schematic!");
            await axios.post("http://cloud.bte.ger:45655/api/schematics/upload", {
                "url": schemfile.url, "terra": terraname.replace(" ", "-"),
            }).then((res) => {
                return this.response(interaction, `Successfully uploaded the schematic to ${res.data.server} as ${res.data.fileName}.schematic`);
            }).catch((e) => {
                console.log(e.message);
                return this.error(interaction, `Failed to upload the schematic to ${terraname}!`);
            })
        }

        if (interaction.options.getSubcommand() === "download") {
            const name = await interaction.options._hoistedOptions.find((x) => x.name === "schematic").value;

            await axios.get(`http://cloud.bte.ger:45655/api/schematics/download?terra=${terraname.replace(" ", "-")}&name=${name}`, {responseType: "arraybuffer"})
                .then(async ({data: schem}) => {
                    let {data: filetype} = await axios.get(`http://cloud.bte.ger:45655/api/schematics/filetype?terra=${terraname.replace(" ", "-")}&name=${name}`);
                    const attachment = new MessageAttachment(schem, name + filetype);
                    await interaction.editReply("Here you go!");
                    return client.channels.cache.get(interaction.channelId).send({content: null, files: [attachment]});
                })
                .catch(async (e) => {
                    await this.error(interaction, "Schematic not found");
                    return console.log(e);
                });
        }
    }
}

module.exports = schematicCommand;
