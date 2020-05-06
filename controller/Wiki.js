const axios         = require('axios')
const generateEmbed = require('../utils/generateEmbed')
const striptags     = require('striptags') 

module.exports = {
    async fetchArticle (message, args) {
        const tmpMessage = await message.channel.send(generateEmbed({
            title       : 'Search in progress...', 
            description : `I'm searching for an article corresponding to "${args}" on Halopedia.org...`,
            thumbnail   : 'https://i.imgur.com/vLTtGRJ.gif'
        }))
        try {
            const { data } = await axios.get(`https://www.halopedia.org/api.php?action=query&generator=search&gsrsearch=${args}&gsrlimit=20&prop=info&format=json&formatversion=2`)
            if (!data.query || !data.query.pages || data.query.pages.length < 1) 
                return this._noResult(tmpMessage)

            let properResult = null
            for (const p in data.query.pages) {
                if (typeof data.query.pages[p].redirect === 'undefined') {
                    properResult = data.query.pages[p]
                    break
                }
            }
            if (!properResult)
                return this._noResult(tmpMessage)

            try {
                const page = await axios.get(`https://www.halopedia.org/api.php?action=query&revids=${properResult.lastrevid}&prop=extracts|cirrusbuilddoc|images|revisions&format=json&formatversion=2`)
                if (!page || !page.data || !page.data.query.pages || page.data.query.pages.length < 1) 
                    return this._noResult(tmpMessage)
                
                const pageMetadata  = await require('url-metadata')(`https://www.halopedia.org/${page.data.query.pages[0].title.replace(/ /g, '_')}`)
                const thumbnail     = pageMetadata.image || pageMetadata['og:image']
                let embed           = await this._generateWikiEmbed(page.data.query.pages[0], thumbnail)
                tmpMessage.delete()
                message.channel.send(embed)
                    .then(msg => this._paginating(msg, page.data.query.pages[0], thumbnail, 0))
            } catch (err) {
                tmpMessage.edit({
                    color       : '#ff0000',
                    description : 'Oops, it seems I encountered an error on my end 😔. I\'ve notified the devs about it; please try again later.', 
                    title       : 'Error'
                })
                .catch((error) => process.dLogger.log(`in controller/Wiki/fetchArticle: ${error.message}`))
                process.dLogger.log(`in controller/Wiki/fetchArticle: ${err.message}`)
            }
        } catch (err) {
            process.dLogger.log(`in controller/Wiki/fetchArticle: ${err.message}`)
        }
    }, 

    async _generateWikiEmbed (data, thumbnail = null, page = 0) {
        let strippedExtract     = ''
        let image               = null

        if (data.extract) 
            strippedExtract = striptags(data.extract)
        else if (data.cirrusbuilddoc)
            strippedExtract = data.cirrusbuilddoc.text

        if (data.images && data.images.length > 0) {
            const imageData = await axios.get(`https://www.halopedia.org/api.php?action=query&titles=Image:${data.images[0].title.replace('File:', '')}&prop=imageinfo&iiprop=url&format=json&formatversion=2`)
            if (imageData && imageData.data && imageData.data.query && imageData.data.query.pages && imageData.data.query.pages[0].imageinfo) 
                image = imageData.data.query.pages[0].imageinfo[0].url
        }
        const url               = `https://www.halopedia.org/${data.title.replace(/ /g, '_')}`
        const prevLimit         = page < 2 ? page < 1 ? 0 : 247 : 700 * page 
        const limit             = page < 1 ? 247 : 700 * (page + 1)
        const fields            = [{ name: 'Source', value: url}]
        const shouldShowNext    = limit < strippedExtract.length
        if (page > 0)
            fields.push({ name: 'Previous page', value: 'click on ⬅️ to go back', inline: true})
        if (shouldShowNext)
            fields.push({ name: 'Next page', value: 'click on ➡️ to read more', inline: true})

        const embedParams   = { 
            author      : {
                name    : 'Halopedia.org', 
                iconURL : 'https://www.halopedia.org/images/apple-touch-icon.png', 
                url     :'https://www.halopedia.org'
            },
            color       : '#d4dfd7',
            description : `${page > 0 ? '...' : ''}${strippedExtract.substring(prevLimit, Math.min(limit, strippedExtract.length)) + '...'}`,
            fields,
            title       : data.title + (page > 0 ? ` (page ${page + 1 })` : ''),
            url
        }
        const footer = `Last revision by ${data.revisions[0].user} on ${(new Date(data.revisions[0].timestamp)).toLocaleDateString('en-US')} at ${(new Date(data.revisions[0].timestamp)).toLocaleTimeString('en-US')}.`
        if (page < 1) 
            embedParams.footer = footer

        if (image && page < 1)
            embedParams.image = image 

        if (thumbnail)
            embedParams.thumbnail = thumbnail
    
        return generateEmbed(embedParams)
    }, 

    _getImage (wiki, imageName) {
        return axios.get(`${wiki.baseUrl}/api.php?action=query&titles=Image:${imageName}&prop=imageinfo&iiprop=url&format=json&formatversion=2`)
    },

    _noResult (tmpMessage) {
        console.log('no result')
        tmpMessage.edit(generateEmbed({
            color       : '#ff0000',
            description : 'Sorry, I was unable to find an article related to this search 😔. Are you sure you didn\'t make any typo in your search terms?', 
            title       : 'No result'
        }))
        .catch((err) => process.dLogger.log(`in controller/Wiki/_noResult: ${err.message}`))
    },

    async _paginating (msg, page, thumbnail, pageNb) {
        const prev = '⬅️'
        const next = '➡️'
        if (pageNb > 0)
            await msg.react(prev)

        const strippedExtract   = striptags(page.extract)
        const limit             = pageNb < 1 ? 247 : 700 * (pageNb + 1)
        const shouldShowNext    = limit < strippedExtract.length
        if (shouldShowNext)
            msg.react(next)

        msg.awaitReactions((reaction, user) => [prev, next].includes(reaction.emoji.name) && user.id !== msg.author.id, { 
                max     : 1, 
                time    : (5 * 60000), 
                errors  : ['time'] 
            }
        )
            .then(async collected => {
                const reaction  = collected.first()
                if (reaction.emoji.name === prev && pageNb > 0) {
                    embed = await this._generateWikiEmbed(page, thumbnail, pageNb - 1)
                    msg.edit(embed)
                        .then(() => this._paginating(msg, page, thumbnail, pageNb - 1))
                        .catch(err => process.dLogger.log(`in controller/Wiki/_paginating, failed to edit embed: ${err.message}`))
                } else if (reaction.emoji.name === next && shouldShowNext) {
                    embed = await this._generateWikiEmbed(page, thumbnail, pageNb + 1)
                    msg.edit(embed)
                        .then(() => this._paginating(msg, page, thumbnail, pageNb + 1))
                        .catch(err => process.dLogger.log(`in controller/Wiki/_paginating, failed to edit embed: ${err.message}`))
                }
                msg.reactions.removeAll().catch(err => process.dLogger.log(`in controller/Wiki/_paginating, failed to clear reactions: ${err.message}`))
            })
            .catch((err) => {
                // nothing, just a timeout on pagination
            })
    }
}
