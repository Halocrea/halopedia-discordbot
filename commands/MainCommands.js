require('dotenv').config()

const generateEmbed = require('../utils/generateEmbed')
const SuperUser     = require('../controller/SuperUser')
const Twitter       = require('../controller/Twitter')
const Wiki          = require('../controller/Wiki')

class MainCommands {
    async handle (message, guild) {
        this.prefix         = guild.prefix
        const cmdAndArgs    = message.content.replace(this.prefix, '').trim().split(' ')
        const cmd           = cmdAndArgs[0]
        let args            = ''

        for (let i = 1; i < cmdAndArgs.length; i++) 
            args += cmdAndArgs[i] + ' '
        args = args.trim().toLowerCase()
        switch (cmd) {
            case 'auto-tweet': 
                new SuperUser(guild).autoTweet(message, args)
                break
            case 'help': 
                this.help(message, guild)
                break 
            case 'invite':
                this.inviteBot(message)
                break 
            case 'latest':
                if (args.toLowerCase() === 'tweet')
                    Twitter.getLatestTweet(message)
                else 
                    message.channel.send(`I didn't understand what you expected from me. Use \`${this.prefix} search your search terms\` to search something, or \`${this.prefix} help\` to get the full list of available commands.`)
                break
            case 'prefix': 
                new SuperUser(guild).prefix(message, args)
                break
            case 'search':
                Wiki.fetchArticle(message, args)
                break 
            case 'uninstall': 
                new SuperUser(guild).uninstall(message, args)
                break
            default: 
                message.channel.send(`I didn't understand what you expected from me. Use \`${this.prefix} search your search terms\` to search something, or \`${this.prefix} help\` to get the full list of available commands.`)
                break
        }
    }

    async help (message, guild) {
        const description = `\n**General commands**\n• \`${guild.prefix} help\` : Displays this message.\n• \`${guild.prefix} search your search terms\`: I will look for a page on Halopedia.org that matches best your search terms.\n• \`${guild.prefix} latest tweet\`: I will reply with the latest tweet from Halopedia's Twitter account.\n• \`${guild.prefix} invite\`: get an link to invite this bot to your own servers.\n\n**Admin commands**\n• \`${guild.prefix} auto-tweet #channel\`: I will automatically post Halopedia's latest tweets in the given channel.\n• \`${guild.prefix} auto-tweet disable\`: Use this command to stop me from automatically posting Halopedia's tweets.\n• \`${guild.prefix} prefix your-prefix-for-me\`: I will answer to you-prefix-for-me instead of the default \`${process.env.DISCORD_PREFIX}\`.\n• \`${guild.prefix} uninstall\`: the bot will delete everything it stored about this Discord server and will leave it.\n\nTo ask questions to the developpers of this bot, feel free to contact us at https://discord.gg/74UAq84!`

        message.channel.send(generateEmbed({
            color       : '#43b581',
            description, 
            footer      : 'made with ♥️ by Halo Création',
            thumbnail   : 'https://cdn.discordapp.com/icons/258355019781242883/ddce7a70e763f63d1c30b26d1f272ada.webp?size=512',
            title       : 'Help for Halopedia\'s unofficial bot!'
        }))
    }

    inviteBot (message) {
        message.channel.send(`You can add the Halopedia bot to your own Discord server by using this link: https://discordapp.com/oauth2/authorize?client_id=${message.client.user.id}&scope=bot&permissions=125952`)
    }

    async isSuperUser (message) {
        const member = await message.guild.members.fetch(message.author)
        return !!member.hasPermission('ADMINISTRATOR')
    }
}

module.exports = MainCommands
