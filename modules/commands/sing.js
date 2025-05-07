const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs-extra");
const path = require("path");
const moment = require("moment-timezone");
const ffmpegPath = require("ffmpeg-static");

ffmpeg.setFfmpegPath(ffmpegPath);

module.exports.handleReply = async ({ event, api, handleReply }) => {
  const { threadID, messageID, body, senderID } = event;
  const choice = parseInt(body);

  if (isNaN(choice) || choice < 1 || choice > handleReply.results.length)
    return api.sendMessage("❌ Lựa chọn không hợp lệ!", threadID, messageID);

  const video = handleReply.results[choice - 1];

  try {
    const info = await ytdl.getInfo(video.url);
    const title = info.videoDetails.title;
    const outputPath = path.join(__dirname, `/cache/${Date.now()}.mp3`);

    api.sendMessage(`⏳ Đang tải nhạc: ${title}`, threadID);

    ffmpeg(ytdl(video.url, { quality: "highestaudio" }))
      .audioBitrate(128)
      .save(outputPath)
      .on("end", () => {
        api.sendMessage(
          {
            body: `✅ Tải xong: ${title}\n🕒 ${moment.tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY || HH:mm:ss")}`,
            attachment: fs.createReadStream(outputPath),
          },
          threadID,
          () => fs.unlinkSync(outputPath)
        );
      })
      .on("error", (err) => {
        console.error(err);
        api.sendMessage("❌ Lỗi khi chuyển đổi video thành MP3.", threadID, messageID);
      });
  } catch (err) {
    console.error(err);
    api.sendMessage("❌ Lỗi khi xử lý video.", threadID, messageID);
  }
};
