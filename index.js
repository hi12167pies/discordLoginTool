// Imports
const config = require('./config.json')
const fs = require('fs')
const express = require('express')
const app = express()
const discord = require('discord.js')
const client = new discord.Client()

let allow = 0
let cache = {}

client.login(config.token)

app.use('*', (req,res,next) => {
  if (allow == 1) {
    next()
  } else {
    res.send("Please wait for bot to connect")
  }
})

client.once('ready', () => {
  allow = 1
  console.log("Your bot has connected")
})

// Setting up express
app.use(express.urlencoded({ extended: false }))
app.use(express.static('./public'))
app.set('view engine', 'ejs')

// Routes
app.get('/', (req,res) => {
  let servers = getAllServers()

  res.render(`index`, {
    // Varibles
    serverList: servers,
    botinfo: client.user,
    token: require('./config.json').token
  })
})

app.get('/server/', async (req,res) => {
  let server = req.query.id
  let scope = req.query.scope
  let channel = req.query.channel

  let guild = client.guilds.cache.get(server)

  if (!guild) return res.send("invaild server")

  let servers = getAllServers()

  if (scope == "home") {
    let channelname = null

    if (!channel) channel = null
    if (channel != null) channelname = client.guilds.cache.get(server).channels.cache.get(channel).name

    res.render(`interface`, {
      // Varibles
      disable: req.query.d,
      serverList: servers,
      botinfo: client.user,
      channels: getChanenlsByGuildId(server),
      guild: {
        id: server,
        name: guild.name,
        icon: guild.iconURL()
      },
      channel: {
        id: channel,
        name: channelname
      }
    })
  } else {
    res.send("no vaild scope")
  }
})

app.get('/msgs', async (req,res) => {
  const channelid = req.query.id

  if (!client.channels.cache.get(channelid)) return res.send("Invaild channel")

  let msg = []

  await getChannelMsg(channelid, e => {
    res.json(e)
  })

})

app.post("/", async (req,res) => {
  if (!client.channels.cache.get(req.query.channel)) return res.redirect(`/server?id=${req.query.id}&channel=${req.query.channel}&scope=home`)

  client.channels.cache.get(req.query.channel).send(req.body.message)

  res.redirect(`/server?id=${req.query.id}&channel=${req.query.channel}&scope=home`)
})

app.listen(config.port, (err) => {
  if (err) throw err

  console.log("The website started on http://127.0.0.1:" + config.port)
})

// Functions to get stuff working
function getChanenlsByGuildId(guild) {
  let cat = [],
    text = [],
    voice = [],
    other = [],
    news = []

  let channels = client.guilds.cache.get(guild).channels

  channels.cache.forEach(cur => {
    if (!cur.deleted) {
      let pushdata = { name: cur.name, id: cur.id, type: cur.type }
      if (cur.type == "category") {
        cat.push(pushdata)
      } else if (cur.type == "voice") {
        voice.push(pushdata)
      } else if (cur.type == "text") {
        text.push(pushdata)
      } else if (cur.type == "news") {
        news.push(pushdata)
      } else {
        other.push(pushdata)
      }
    }
  })

  return {
    "category": cat,
    "text": text,
    "voice": voice,
    "news": news,
    "other": other
  }
}

function getAllServers() {
  let servers = []

  client.guilds.cache.forEach(guild => {
    servers.push({
      name: guild.name,
      id: guild.id
    })
  })

  return servers
}

client.on('message', async message => {
  const channel = message.channel.id
  if (cache[channel]) {
    cache[channel].unshift({ name: message.author.tag, content: message.content, icon: message.author.avatarURL() })
  }
})

async function getChannelMsg(channel, callback) {
  let msg = []

  if (!cache[channel]) {
    await client.channels.cache.get(channel).messages.fetch({ limit: config.messageLimit }).then(messages => {
      messages.forEach(message => msg.push({ name: message.author.tag, content: message.content, icon: message.author.avatarURL() }))
    })
    cache[channel] = msg
  } else {
    msg = cache[channel]
  }

  callback(msg)
}