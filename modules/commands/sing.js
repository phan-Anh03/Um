const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const moment = require('moment-timezone');

async function ytb_download(videoUrl) {
  const { data } = await axios.get(`https://y2mate.guru/en/youtube-mp3/${encodeURIComponent(videoUrl)}`);
  const $ = cheerio.load(data);

  const title = $('div.caption > h1').text().trim();
  const url = $('a[href*="/file/"]').attr('href');
  const quality = $('span.bitrate').first().text().trim();
  const duration = $('div.caption > p').eq(1).text().trim();
  const thumb = $('div.video-thumbnail > img').attr('src');

  return { title, url, quality, duration, thumb };
}

module.exports.config = {
  name: 'ytb',
  version: '1.0.0',
  hasPermssion: 0,
  credits: 'Converted by ChatGPT',
  description: 'Tìm kiếm nhạc trên YouTube và tải MP3',
  commandCategory: 'Tìm kiếm',
  usages: '[từ khóa]',
  cooldowns: 5,
  images: [],
};

module.exports.run = async function ({ api, event, args }) {
  const query = args.join(" ").trim();
  const { threadID, messageID } = event;

  if (!query) {
    api.sendMessage("⚠️ Vui lòng nhập từ khóa tìm kiếm", threadID, messageID);
    return;
  }

  try {
    const { data } = await axios.get(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
    const videoIds = [...data.matchAll(/"videoId":"(.*?)"/g)].map(m => m[1]);
    const seen = new Set();
    const uniqueVideoIds = videoIds.filter(id => !seen.has(id) && seen.add(id)).slice(0, 5);

    if (uniqueVideoIds.length === 0) {
      return api.sendMessage(`❎ Không tìm thấy kết quả cho từ khóa "${query}"`, threadID, messageID);
    }

    const results = uniqueVideoIds.map((id, index) => ({
      title: `https://www.youtube.com/watch?v=${id}`,
      url: `https://www.youtube.com/watch?v=${id}`,
      index: index + 1,
    }));

    const msg = results.map((item, i) => `${i + 1}. https://www.youtube.com/watch?v=${uniqueVideoIds[i]}`).join("\n");

    api.sendMessage(`📝 Danh sách kết quả cho từ khóa: "${query}"\n${msg}\n\n📌 Reply theo STT để tải nhạc MP3`, threadID, (err, info) => {
      global.client.handleReply.push({
        name: module.exports.config.name,
        type: "ytb-choose",
        author: info.senderID,
        messageID: info.messageID,
        results,
      });
    });
  } catch (error) {
    console.error(error);
    api.sendMessage(`❎ Đã xảy ra lỗi khi tìm kiếm`, threadID, messageID);
  }
};

module.exports.handleReply = async function ({ event, api, handleReply }) {
  const { threadID: tid, messageID: mid, body } = event;
  const choose = parseInt(body);

  if (isNaN(choose) || choose < 1 || choose > handleReply.results.length) {
    return api.sendMessage('⚠️ Vui lòng nhập một số hợp lệ từ danh sách.', tid, mid);
  }

  const chosen = handleReply.results[choose - 1];
  api.unsendMessage(handleReply.messageID);

  try {
    const data = await ytb_download(chosen.url);
    const audio = (await axios.get(data.url, { responseType: 'arraybuffer' })).data;
    const path = `${__dirname}/cache/${Date.now()}.mp3`;

    fs.writeFileSync(path, Buffer.from(audio, 'binary'));

    api.sendMessage({
      body: `[ YOUTUBE ] - MP3\n────────────────────\n[📝] → Tiêu đề: ${data.title}\n[⏳] → Thời lượng: ${data.duration}\n[📶] → Bitrate: ${data.quality}\n────────────────────\n[⏰] → Time: ${moment.tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY || HH:mm:ss")}`,
      attachment: fs.createReadStream(path)
    }, tid, () => {
      setTimeout(() => fs.unlinkSync(path), 2 * 60 * 1000);
    });
  } catch (err) {
    console.error(err);
    api.sendMessage("❌ Đã xảy ra lỗi khi tải MP3 từ YouTube.", tid, mid);
  }
};
