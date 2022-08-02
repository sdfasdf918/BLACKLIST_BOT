const {
  Client,
  MessageEmbed,
} = require("discord.js");
const {
  prefix,
  token,
  owners
} = require("./config");
const client = new Client({
  intents: 32767,
});

const mongoose = require("mongoose");
const User = require("./Models/User");
const Guild = require("./Models/Guild");

mongoose.connect("mongodb+srv://egteam:egteam@cluster0.lt1comu.mongodb.net/?retryWrites=true&w=majority").then(() => {

  client.on("ready", async () => {
    console.log(`Logged in as [ ${client.user.tag} ]`);
      
  });

  client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;
    const [command, ...args] = message.content.slice(prefix.length).split(" ");
    
    if (command === "search") {
      // console.log(data.info)
      // if (!owners.includes(message.author.id))return;
      if (!args[0]) return message.channel.send(`Usage: ${prefix}${command} <user_id>`);
      let data = await User.findOne({ id: args[0] }).catch(_=>false);
      if (!data || !data.blacklist) return message.channel.send(`This user is not blacklisted.`);
      let exec = await client.users.fetch(data.info.by).catch(_=>false);
      let _em = new MessageEmbed()
      .setTitle("Blacklist Info")
      .setTimestamp()
      .addField(`Blacklisted By:`,  `${(exec ? `${exec.tag} (ID: ${exec.id})` : `(ID: ${data.by})`)}`)
      .addField("Mention: ", `<@${exec.id}>`, true)
      .addField('Reason:', data.info.reason)
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .setFooter('Made By EGYPT_STORE', message.author.displayAvatarURL({ dynamic: true }));
      let more = null;
      if (Array.isArray(data.info.advice)) {
        if (data.info.advice.length === 1) {
          _em.setImage(data.info.advice[0])
        } else more = data.info.advice;
      } else _em.addField("Proofs: ", data.info.advice)
      message.channel.send ({ embeds:[ _em ] }).then(async() => {
        if (!more) return;
        for (let img of more) {
          message.channel.send (img);
        }
      })
    }
    if (command === "banned") {
      // if (message.author.id != message.guild.ownerId) return message.reply ("Only Server Ownership can use this command!");
      if (!owners.includes(message.author.id))return;
      if (!args[0] || !["on", "off"].includes(args[0]))return message.channel.send(`Usage: ${prefix}${command} on/off`);
      let guildData = await Guild.findOne({ id: message.guild.id }).catch(_=>false);
      if (!guildData) return;
      guildData.ban = (args[0] == "on" ? true : false);
      guildData.save();
      message.channel.send(`At now the scammers will ${(guildData.banned ? "" : "not")} be banned`)
    }

    if (command === "announce") {
      if (!owners.includes(message.author.id))return;
    if (!args[0]) return message.channel.send(`Usage: ${prefix}${command} <message>`);
    let embed = new MessageEmbed()
    .setTimestamp()
    .setDescription(args.join(" "))
    .setFooter('Made By EGYPT_STORE', message.author.displayAvatarURL({ dynamic: true }));

    
    sendAllGuilds(embed, undefined, undefined, message.attachments.size > 0 ? message.attachments.map(u =>u.proxyURL) : []);
    }

    
    if (command === "blacklist") {
      if (!owners.includes(message.author.id))return;

      let guildData = await Guild.findOne({ id: message.guild.id }).catch(_=>false);
      if (!guildData) {
        let ch = await message.guild.channels.create("💀 | BlackList", {
          type: "GUILD_TEXT",
          permissionOverwrites: [
            {
              id: message.guild.id,
              deny: ["SEND_MESSAGES"],
              allow: ["VIEW_CHANNEL"]
            }
          ],
          position: 0
        }).catch(_=>false);
        if (!ch) {
          message.channel.send(`I can't create the blacklist channel, so i will leave the server!`);
          message.guild.leave();
          return;
        }
        guildData = new Guild({
          id: message.guild.id,
          channel: ch.id
        });
        guildData.save();
      }
      if (!args[0] || !["add", "remove"].includes(args[0])) return message.channel.send(`Usage: ${prefix}${command} **add/remove** <user_id>`);
      if (!args[1]) return message.channel.send(`Usage: ${prefix}${command} ${args[0]} **<user_id>**`);
      let user = await client.users.fetch(args[1]);
      if (!user || user.id == client.user.id || user.id == message.author.id) return message.channel.send(`User not found!`);
      if (args[0] == "add") {
        let msg = await message.channel.send(`الرجاء كتابة السبب الأن..`);
        let collector = await message.channel.createMessageCollector({
          filter: (m) => m.author.id == message.author.id,
          max: 1
        });
        collector.on("collect", async (reason) => {
          msg = await msg.edit(`الرجاء ارسال الدلائل الأن..`);
          collector = await message.channel.createMessageCollector({
            filter: (m) => m.author.id == message.author.id,
            max: 1
          });
          collector.on("collect", async (advice) => {
            msg = await msg.edit(`الرجاء الانتظار..`);
            let parsedAdvice = advice.attachments.size > 0 ? advice.attachments.map(u => u.proxyURL) : advice.content;
            if (!parsedAdvice) return msg.edit("لم تقم بأرسال دليل صحيح..");
            let userData = await User.findOne({ id: user.id }).catch(_=>null);
            if (!userData) {
              userData = new User({ id: user.id, blacklist: true });
            } else userData.blacklist = true;
            userData.info = {
              by: message.author.id,
              reason: reason.content,
              advice: parsedAdvice,

            }

            userData.save();
            let embed = new MessageEmbed()
            .setTitle(`New User Blacklisted`)
            .setTimestamp()
            .addField("User: ", user.tag + ` (ID: ${user.id})`, true)
            .addField("Mention: ", `<@${user.id}>`, true)
            .addField("At: ", new Date().toLocaleString(), true)
            .addField("By: ", message.author.tag + ` (ID: ${message.author.id})`, true)
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
            .addField(`Reason: `, reason.content)
            .setFooter('Made By EGYPT_STORE', message.author.displayAvatarURL({ dynamic: true }));

            if (typeof parsedAdvice == "string") {
              embed.addField("Proof: ", parsedAdvice)
            }
            msg.edit("تم اعطاء العضو بلاك لست")
            sendAllGuilds(embed, user.id, true, Array.isArray(parsedAdvice) ? parsedAdvice: []);

          })
        });
      } else {
        let _user = await User.findOne({ id: user.id }).catch(_=>false);
        if (!_user ||!_user.blacklist) return message.channel.send(`This user is not blacklisted!`);
        let msg = await message.channel.send(`الرجاء كتابة السبب..`);
        let collector = msg.channel.createMessageCollector({
          filter: (m) => m.author.id == message.author.id,
          max: 1
        });
        collector.on("collect",async msg => {
          _user.blacklist = false;
          _user.save();
          let userFetch = await client.users.fetch(_user.id).catch(_=>false);
          let user = userFetch ? `${userFetch.tag} (ID: ${_user.id})` : `ID: ${_user.id}`;
          const embed = new MessageEmbed()
          .setTitle("New User Unblacklisted")
          .addField("User: ", user)
          // .addField("Mention: ", `<@${user.id}>`, true)
          .addField("By: ", `${message.author.tag} (ID: ${message.author.id})`)
          embed.setFooter('Made By EGYPT_STORE', message.author.displayAvatarURL({ dynamic: true }));
          embed.addField("Reason: ", msg.content, true)
          embed.setTimestamp()
          sendAllGuilds(embed, _user.id, false);


        })

      }
    }
  });
  client.on("guildMemberAdd", async member => {
    let _guild = await Guild.findOne({ id: member.guild.id }).catch(_=>false);
    if (!_guild.banned) return;
    let _user = await User.findOne({id: member.id}).catch(_=>false);
    if (!_user || !_user.blacklist) return;
  })
  client.on("guildCreate", async guild => {
    let guildData = await Guild.findOne({ id: guild.id }).catch(_=>null);
    if (!guildData) {
      guildData = new Guild({ id: guild.id, channel: "123" });
    }
    let channel = guild.channels.cache.get(guildData.channel);
    if (!channel) {
      let ch = await guild.channels.create("💀 | BlackList", {
        permissionOverwrites: [
          {
            id: guild.id,
            deny: ["SEND_MESSAGES"],
            allow: ["VIEW_CHANNEL"]
          }
        ],
        type: "GUILD_TEXT",
        position: 0
      }).catch(_=>false);
      if (!ch) {
      (await guild.fetchOwner())?.send(`I don't have Permissions to create channels in [ ${guild.name} ] this is why i left :)`).finally(() => {
        guild.leave();
      });
      return;
    }
    guildData.channel = ch.id;
    guildData.save();

    } else {
      guildData.save();
    }
  });

  client.on("channelDelete",async channel => {
    if (channel.type != "GUILD_TEXT") return;
    let guildData = await Guild.findOne({ id: channel.guildId }).catch(_=>false);
    if (!guildData || guildData.id != channel.id) return;
    channel.guild.fetchOwner().then((owner) => {
      owner.send(`I will leave your server [ ${channel.guild.name} ] because the blacklist channel was deleted.`);
    }).finally(() => {
      channel.guild.leave();
    })

  });
/**
 * 
 * @param {MessageEmbed} embed 
 * @param {*} userID 
 * @param {*} ban 
 * @param {*} arr 
 */
  function sendAllGuilds(embed, userID, ban, arr=[]) {
    Guild.find({}, (err, guilds) => {
      if (err) throw err;
      guilds.forEach(async guildData => {
        
        try {
          if (typeof userID != "undefined") {
            let guild = await client.guilds.fetch(guildData.id);
            if (guildData.ban) {
              if (!ban) {
                guild.bans.remove(userID, "Unblacklisted!").catch(_ => false);
              } else {
                channel.send({ embeds: [ new MessageEmbed()
                  .setDescription(`
                  احزر من الشخص ذا 
                  نصاب لاتتعامل معه 
                  <@${userID}>
                  `)]})
              }
            }
          }
        let channel = await client.channels.fetch(guildData.channel);
        if (arr.length == 1 && !embed.image) {
          embed.setImage(arr[0]);
          arr.shift();

        }
        channel.send ({ embeds: [ embed ] }).then(async() => {
          
          for (let a of arr) {
            await channel.send({ embeds: [ new MessageEmbed().setImage(a) ] }).catch(_=>true);
            await (new Promise((r, j) => setTimeout(() => {
              r();
            }, 500)))
          }
        })
        }catch(e) {}
      })
    })
  }

  client.login(token);
});