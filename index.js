require('dotenv').config()

const Discord       = require('discord.js')
const Guild         = require('./schemas/Guild')
const Guilds        = require('./crud/Guilds')
const MainCommands  = require('./commands/MainCommands')
const Twitter       = require('./controller/Twitter')

const client            = new Discord.Client({
    ws: { intents: [
        'GUILDS', 
        'GUILD_MESSAGES', 
        'GUILD_MESSAGE_REACTIONS', 
        'GUILD_INVITES', 
        'GUILD_INTEGRATIONS'
    ]}
})

client.on('ready', async () => {
    await require('./utils/dLogger').init(client)

    new Twitter(client)
    client.user.setStatus('available')
    client.user.setActivity('!halopedia help', {
        type: 'PLAYING',
        url : 'https://www.halopedia.org'
    }) 
    console.log('the bot is ready')
})

client.on('message', async message => {
    if (!message.guild) // MPs
        return 

    const guilds    = new Guilds()
    let guild       = guilds.getById(message.guild.id)

    if (!guild) 
        guild = guilds.addOrOverwrite(new Guild(message.guild))
    
    if (message.content.startsWith(guild.prefix)) 
        new MainCommands().handle(message, guild)
})

client.on('guildCreate', guild => {
    process.dLogger.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!\nI'm serving ${client.guilds.cache.size} servers now.`)
})

client.on('guildDelete', guild => {
    process.dLogger.log(`${guild.name} (id: ${guild.id}) removed me.\nI'm serving ${client.guilds.size} servers now.`)
    try {
        new Guilds().remove(guild.id)
    } catch (err) {
        process.dLogger.log(`in index.js, couldn't remove the guild from database: ${err.message}`)
    }
})

console.log('Sarting the bot...')
client.login(process.env.DISCORD_TOKEN)
