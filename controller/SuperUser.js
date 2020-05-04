const generateEmbed = require('../utils/generateEmbed')
const Guilds        = require('../crud/Guilds')

class SuperUser {
    constructor (guild) { 
        this.guilds     = new Guilds() 
        this.guild      = guild 
    }
    
    async autoTweet (message, args) {
        const canDoThis = await this._checkAuthorization(message)
        if (!canDoThis)
            return 

        if (args.trim().toLowerCase() !== 'disable') {
            const channel = await this._fetchChannelFromMessage(message)
            
            if (!channel) {
                return message.channel.send(generateEmbed({
                    color       : '#ff0000',
                    description : `I was not able to find this channel; make sure my permissions are set to see it, and make sure you correctly mentioned it, then call me again by typing \`${this.guild.prefix}\`.`,
                    title       : 'Can\'t find this channel'
                }))
            }

            if (!channel.permissionsFor(message.client.user).has('SEND_MESSAGES')) {
                this.guilds.update(this.guild)
                return message.channel.send(generateEmbed({
                    color       : '#ff0000',
                    description : `I was not able to find this channel; make sure my permissions are set to see it, and make sure you correctly mentioned it, then call me again by typing \`${this.guild.prefix}\`.`,
                    title       : 'Can\'t find this channel'
                }))
            }
            this.guild.tweetsChanId = channel.id
            this.guilds.update(this.guild)

            message.channel.send(generateEmbed({
                color       : '#43b581', 
                description : `From now on, I will automatically post Halopedia\'s latest tweets in ${channel}`,
                title       : 'Auto tweets enabled!'
            }))
        } else {
            this.guild.tweetsChanId = ''
            this.guilds.update(this.guild)
            message.channel.send(generateEmbed({
                color       : '#43b581', 
                description : 'Okay, I won\'t automatically post Halopedia\'s latest tweets.',
                title       : 'Auto tweets disabled'
            }))
        }
    }

    async prefix (message, arg) {
        const canDoThis = await this._checkAuthorization(message)
        if (!canDoThis)
            return 

        const strippedContent = arg.replace(/#| |@|`/g, '')
        if (strippedContent.length < 1) {
            return message.channel.send(generateEmbed({
                color       : '#ff0000',
                description : 'Please provide the prefix you want me to be called on. \n**Warning:** make sure your prefix does **not contain** any of the following characters: ` `, `@`, `#`, `\``.', 
                title       : 'Invalid Prefix'
            }))
        }
        this.guild.prefix = strippedContent
        this.guilds.update(this.guild)
        
        message.channel.send(generateEmbed({
            color       : '#43b581', 
            title       : `From now on, I will answer you whenever you start your message with \`${strippedContent}\`!`
        }))
    }

    async uninstall (message) {
        const canDoThis = await this._checkAuthorization(message)
        if (!canDoThis)
            return 
            
        const confirm   = '✅'
        const cancel    = '❎'
        const msg = await message.channel.send(generateEmbed({
            description : `Warning! This action will delete all configuration about this server permanentely, and the bot will leave the server. React with ${confirm} to confirm, or ${cancel} to cancel.`, 
            title       : 'Uninstall'
        }))
        msg.react(confirm)
        msg.react(cancel)
        const filter = (reaction, user) => {
            const firstCheck = [confirm, cancel].includes(reaction.emoji.name)
            if (!firstCheck)
                return false 

            return user.id === message.author.id
        }
        msg.awaitReactions(filter, { 
                max     : 1, 
                time    : (5 * 60000), 
                errors  : ['time'] 
            }
        )
            .then(collected => {
                const reaction  = collected.first()

                if (reaction.emoji.name === confirm) {
                    message.channel.send('See you, space cowboy!')
                        .then(() => {
                            this.guilds.remove(this.guild.id)
                            message.guild.leave()
                        })

                } else
                    message.channel.send('Ah, you got me worried me but it\'s all good now!')

                
            })
            .catch(err => process.dLogger.log(`in controller/SuperUser/uninstall: ${err.message}`))
    }

    async _checkAuthorization (message) {
        const discordGuild  = message.guild
        const member        = await discordGuild.members.fetch(message.author)
        if (!member.hasPermission('ADMINISTRATOR')) {
            message.channel.send('Sorry, only the administrators can perform this action.')
            return false
        }
        
        return true
    }
    
    async _fetchChannelFromMessage(message) {
        const targetChannel = message.content.match(/<#(.*)>/)

        if (targetChannel) {
            const channelId = targetChannel.pop()
            const channel   = await message.client.channels.fetch(channelId)
            return channel 
        }

        return false
    }
}
module.exports = SuperUser
