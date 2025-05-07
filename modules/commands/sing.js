const fs = require('fs'); const path = require('path'); const { exec } = require('child_process'); const Youtube = require('youtube-search-api'); const moment = require('moment-timezone'); const axios = require('axios');

module.exports.config = { name: "sing2", version: "2.8.6", hasPermission: 0, credits: "D-Jukie, optimized by Grok", description: "Nghe nhạc YouTube với yt-dlp", commandCategory: "Tiện ích", usages: "[tên bài hát]", cooldowns: 5, usePrefix: true, dependencies: { "youtube-search-api": "", "moment-timezone": "", "axios": "" } };

const cacheDir = path.join(__dirname, 'cache'); if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

function checkCacheDirPermissions() { try { fs.accessSync(cacheDir, fs.constants.W_OK); return true; } catch { return false; } }

async function setupYtDlp() { const ytDlpPath = getYtDlpPath(); if (fs.existsSync(ytDlpPath)) return true; try { const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp'; const response = await axios.get(url, { responseType: 'stream' }); const writer = fs.createWriteStream(ytDlpPath); response.data.pipe(writer); await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); }); fs.chmodSync(ytDlpPath, 0o755); return true; } catch (e) { return false; } }

function getYtDlpPath() { return process.platform === 'win32' ? path.join(__dirname, 'yt-dlp.exe') : path.join(__dirname, 'yt-dlp'); }

async function downloadMusic(videoId, outputPath) { const ytDlpPath = getYtDlpPath(); if (!fs.existsSync(ytDlpPath)) await setupYtDlp(); return new Promise((resolve, reject) => { const cmd = ${ytDlpPath} -x --audio-format mp3 -o "${outputPath}" https://www.youtube.com/watch?v=${videoId}; exec(cmd, (error, stdout, stderr) => { if (error) return reject(Download error: ${stderr}); resolve(); }); }); }

module.exports.run = async ({ api, event, args }) => { if (!args[0]) return api.sendMessage("Vui lòng nhập tên bài hát!", event.threadID, event.messageID); if (!checkCacheDirPermissions()) return api.sendMessage("Không có quyền ghi vào thư mục cache!", event.threadID, event.messageID);

try { const searchResults = await Youtube.GetListByKeyword(args.join(" "), false, 5); const video = searchResults.items.find(v => v.type === "video"); if (!video) return api.sendMessage("Không tìm thấy bài hát!", event.threadID, event.messageID);

const filePath = path.join(cacheDir, `${video.id}.mp3`);
await downloadMusic(video.id, filePath);

api.sendMessage({
  body: `Đã tải xong: ${video.title}`,
  attachment: fs.createReadStream(filePath)
}, event.threadID);

} catch (e) { api.sendMessage(Lỗi: ${e}, event.threadID); } };

  
