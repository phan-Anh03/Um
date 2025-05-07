const axios = require("axios");
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs-extra");
const path = require("path");
const moment = require("moment-timezone");
const ffmpegPath = require("ffmpeg-static");

ffmpeg.setFfmpegPath(ffmpegPath);

module.exports.config = {
  name: "ytb",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "ChatGPT",
  description: "Tìm kiếm và tải nhạc MP3 từ YouTube",
  commandCategory: "Tìm kiếm",
  usages: "[từ khóa]",
  cooldowns: 5,
};

module.exports.run = async ({ api, event, args }) => {
  const query = args.join(" ");
  const { threadID, messageID } = event;

  if (!query) return api.sendMessage("❌ Vui lòng nhập từ khóa tìm kiếm.", threadID, messageID);

  try {
    const res = await axios.get(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
    const videoIds = [...res.data.matchAll(/"videoId":"(.*?)"/g)];
    const titles = [...res.data.matchAll(/"title":{"runs":
