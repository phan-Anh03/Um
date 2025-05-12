module.exports.config = {
  name: "say",
  version: "1.2.0",
  hasPermssion: 0,
  credits: "Mirai Team - Mod by ChatGPT",
  description: "Chuyển văn bản thành giọng nói từ FPT.AI (cho phép chọn giọng)",
  commandCategory: "Tìm kiếm",
  usages: "[giọng] [văn bản] (ví dụ: say myan Xin chào)",
  cooldowns: 5,
  dependencies: {
    "axios": "",
    "fs-extra": "",
    "path": ""
  }
};

module.exports.run = async function ({ api, event, args }) {
  const fs = require("fs-extra");
  const axios = require("axios");
  const path = require("path");

  const FPT_API_KEY = "jhXzT4c0NSm4VrD3wYLL7FbcXqGpJcb1"; // API Key của bạn

  if (args.length === 0) return api.sendMessage("Bạn cần nhập nội dung để bot nói.", event.threadID, event.messageID);

  // Danh sách các giọng hợp lệ
  const allowedVoices = ["banmai", "myan", "thuminh"];
  let voice = "banmai";
  let text = args.join(" ");

  if (allowedVoices.includes(args[0].toLowerCase())) {
    voice = args[0].toLowerCase();
    text = args.slice(1).join(" ");
  }

  if (!text) return api.sendMessage("Bạn chưa nhập nội dung để nói.", event.threadID, event.messageID);

  const fileName = `${event.threadID}_${event.senderID}.mp3`;
  const filePath = path.resolve(__dirname, 'cache', fileName);

  try {
    const response = await axios({
      method: 'post',
      url: 'https://api.fpt.ai/hmi/tts/v5',
      headers: {
        'api-key': FPT_API_KEY,
        'voice': voice
      },
      data: text,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    writer.on('finish', () => {
      api.sendMessage({ attachment: fs.createReadStream(filePath) }, event.threadID, () => fs.unlinkSync(filePath));
    });

    writer.on('error', (err) => {
      console.error(err);
      api.sendMessage("Đã xảy ra lỗi khi xử lý âm thanh.", event.threadID);
    });

  } catch (e) {
    console.error(e);
    api.sendMessage("Lỗi kết nối đến FPT.AI hoặc API Key không hợp lệ.", event.threadID);
  }
};
