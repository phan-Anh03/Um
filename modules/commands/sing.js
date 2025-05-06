

module.exports.config = { name: "sing2", version: "2.8.6", hasPermission: 0, credits: "D-Jukie fix by TKDEV, optimized by Grok", description: "Nghe nhạc YouTube với yt-dlp tích hợp", commandCategory: "Tiện ích", usages: "[tên bài hát] | [chất lượng: 128 hoặc 320]", cooldowns: 5, usePrefix: true, dependencies: { "youtube-search-api": "", "moment-timezone": "", "axios": "" } };

const cacheDir = path.join(__dirname, 'cache'); if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

function checkCacheDirPermissions() { try { const testFile = path.join(cacheDir, test_${Date.now()}.txt); fs.writeFileSync(testFile, 'test'); fs.unlinkSync(testFile); return true; } catch { return false; } }

function getYtDlpPath() { return process.platform === 'win32' ? path.join(__dirname, 'yt-dlp.exe') : path.join(__dirname, 'yt-dlp'); }

function getPlatform() { if (process.platform === 'win32') return 'win'; if (process.platform === 'darwin') return 'macos'; return 'linux'; }

function getDownloadUrl(platform) { return https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp${platform === 'win' ? '.exe' : ''}; }

async function setupYtDlp() { const ytDlpPath = getYtDlpPath(); if (fs.existsSync(ytDlpPath)) return true; try { const url = getDownloadUrl(getPlatform()); const response = await axios({ url, method: 'GET', responseType: 'stream' }); const writer = fs.createWriteStream(ytDlpPath); response.data.pipe(writer); await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); }); if (process.platform !== 'win32') fs.chmodSync(ytDlpPath, 0o755); return true; } catch { return false; } }

async function downloadMusic(videoId, outputPath, audioQuality = '0') { const ytDlpPath = getYtDlpPath(); if (!fs.existsSync(ytDlpPath)) { const success = await setupYtDlp(); if (!success) throw new Error('Không thể thiết lập yt-dlp'); }

return new Promise((resolve, reject) => { const args = ['-x', '--audio-format', 'mp3', '--audio-quality', audioQuality, '-o', outputPath, https://www.youtube.com/watch?v=${videoId}]; const child = spawn(ytDlpPath, args); const timeout = setTimeout(() => { child.kill(); reject(new Error('Tải nhạc quá lâu, đã hủy!')); }, 300000);

child.on('close', (code) => {
  clearTimeout(timeout);
  if (code === 0) resolve();
  else reject(new Error('Tải nhạc thất bại'));
});

}); }

function formatDuration(duration) { if (!duration) return '00:00'; if (/^\d+:\d+:\d+$/.test(duration)) return duration; if (/^\d+:\d+$/.test(duration)) return 00:${duration}; return '00:00'; }

module.exports.run = async function({ api, event, args }) { const [songQuery, qualityArg] = args.join(" ").split("|").map(s => s.trim()); const audioQuality = qualityArg === '128' ? '5' : '0';

if (!songQuery) { return api.sendMessage("🎵 Vui lòng nhập tên bài hát!", event.threadID, event.messageID); }

if (!checkCacheDirPermissions()) { return api.sendMessage("⚠️ Bot không có quyền ghi vào thư mục cache!", event.threadID, event.messageID); }

try { const searchResults = await Youtube.GetListByKeyword(songQuery, false, 5); const videos = (searchResults.items || []).filter(v => v.type === "video").map(v => ({ id: v.id, title: v.title || Bài hát không tên (ID: ${v.id}), duration: v.length || '00:00', channelTitle: v.channelTitle || 'Nghệ sĩ không xác định' }));

if (videos.length === 0) {
  return api.sendMessage("❌ Không có video nào được tìm thấy!", event.threadID, event.messageID);
}

const message = {
  body: `📝Kết Quả Tìm Kiếm:\n────────────────────\n${videos.map((v, i) =>
    `|› ${i + 1}. ${v.title}\n|›👤 ${v.channelTitle}\n|›⏱️ ${formatDuration(v.duration)}\n────────────────────`
  ).join('\n')}📌 Reply số để nghe (chỉ bạn chọn được)\n🎧 Mặc định chất lượng: ${audioQuality === '0' ? '320kbps' : '128kbps'} (dùng |128 hoặc |320 khi gọi lệnh)`,
  attachment: null
};

api.sendMessage(message, event.threadID, (err, info) => {
  if (err) return;
  global.client.handleReply = global.client.handleReply || [];
  global.client.handleReply.push({
    name: this.config.name,
    messageID: info.messageID,
    author: event.senderID,
    videos,
    audioQuality,
    originalMessageID: event.messageID
  });
});

} catch (e) { api.sendMessage("⚠️ Có lỗi xảy ra khi tìm kiếm bài hát!", event.threadID, event.messageID); } };

module.exports.handleReply = async function({ api, event, handleReply }) { const { threadID, messageID, body, senderID } = event;

if (handleReply.author !== senderID) { return api.sendMessage("⛔ Chỉ người gửi lệnh mới được chọn!", threadID, messageID); }

const selectedIndex = parseInt(body) - 1; if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= handleReply.videos.length) { return api.sendMessage(⚠️ Vui lòng chọn số từ 1-${handleReply.videos.length}!, threadID, messageID); }

api.unsendMessage(handleReply.messageID); if (handleReply.originalMessageID) api.unsendMessage(handleReply.originalMessageID);

const video = handleReply.videos[selectedIndex]; const tempFile = path.join(cacheDir, music_${senderID}_${Date.now()}.mp3); const quality = handleReply.audioQuality || '0';

api.sendMessage("[📤]  Đang tải bài hát, vui lòng chờ...", threadID, async (err, info) => { if (err) return; const progressMsgId = info.messageID;

const startTime = Date.now();
try {
  await downloadMusic(video.id, tempFile, quality);
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  api.sendMessage({
    body: `===>《 MUSIC YOUTUBE 》<===\n────────────────────\n[🎵]→Tên nhạc: ${video.title}\n[⏱️]→Thời lượng: ${formatDuration(video.duration)}\n[👤]→Tác giả: ${video.channelTitle}\n[🗓️]→Tải lên từ: YouTube\n[⚙️]→Chất lượng: ${quality === '0' ? '320kbps' : '128kbps'}\n────────────────────\n[⏰]→Time: ${moment().tz("Asia/Ho_Chi_Minh").format("HH:mm DD/MM/YYYY")}\n[⏳]→Xử lý trong: ${durationSec} giây`,
    attachment: fs.createReadStream(tempFile)
  }, threadID, (err) => {
    api.unsendMessage(progressMsgId);
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    if (err) api.sendMessage("⚠️ Lỗi khi gửi file MP3! Vui lòng kiểm tra quyền của bot.", threadID);
  });

} catch (e) {
  api.unsendMessage(progressMsgId);
  if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  api.sendMessage(`⚠️ Lỗi: ${e.message}`, threadID);
}

}); };                                        
