module.exports = {
    customID: 'changelog', 
    async execute(interaction, client) {
      const title = interaction.fields.getTextInputValue('title');
      const staff = interaction.fields.getTextInputValue('staff');
      const changes = interaction.fields.getTextInputValue('changes');
      const meetingProtocols = interaction.fields.getTextInputValue('meetingProtocols');
      const general = interaction.fields.getTextInputValue('general');
  
      await interaction.deferReply({ ephemeral: true });
  
      try {
        const fields = [];
  
        if (staff) {
          fields.push({
            name: 'Staff',
            value: staff,
          });
        }
  
        if (changes) {
          fields.push({
            name: 'Discord & Minecraft Changes',
            value: changes,
          });
        }
  
        if (meetingProtocols) {
          fields.push({
            name: 'Meeting Protocols',
            value: meetingProtocols,
          });
        }
  
        if (general) {
          fields.push({
            name: 'General & Donations',
            value: general,
          });
        }
  
        const embed = {
          color: parseInt('347aeb', 16),
          title: `**${title}**`,
          fields: fields,
          thumbnail: {
            url: 'https://cdn.discordapp.com/attachments/702235118374223912/922567410731606106/logo.gif',
          },
          timestamp: new Date(),
          footer: {
            text: 'BTE Germany',
            icon_url: client.user.displayAvatarURL({ dynamic: true }),
          },
        };
  
        await interaction.channel.send({ embeds: [embed] });
        await interaction.deleteReply();
      } catch (error) {
        console.error(error);
        await interaction.editReply('Fehler beim Senden der Nachricht – Überprüfen Sie, ob ich die Berechtigung habe, Nachrichten in diesem Kanal zu senden!');
      }
    },
  };
  
