const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const moment = require('moment-timezone');
const axios = require('axios');

module.exports.config = {
  name: "ytb",
  version: "2.8.6",
  hasPermission: 0,
  credits: "D-Jukie fix by TKDEV, optimized by Grok",
  description: "Nghe nhạc YouTube với yt-dlp tích hợp",
  commandCategory: "Tiện ích",
  usages: "[tên bài hát]",
  cooldowns: 5,
  usePrefix: true,
  dependencies: {
    "moment-timezone": "",
    "axios": ""
  }
};

const cacheDir = path.join(__dirname, 'cache');
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

function checkCacheDirPermissions() {
  try {
    const testFile = path.join(cacheDir, `test_${Date.now()}.txt`);
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return true;
  } catch (e) {
    return false;
  }
}

function getYtDlpPath() {
  return process.platform === 'win32' ? path.join(__dirname, 'yt-dlp.exe') : path.join(__dirname, 'yt-dlp');
}

function getPlatform() {
  return process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'macos' : 'linux';
}

function getDownloadUrl(platform) {
  return `https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp${ platform === 'win' ? '.exe' : '' }`;
}

async function setupYtDlp() {
  const ytDlpPath = getYtDlpPath();
  if (fs.existsSync(ytDlpPath)) return true;
  try {
    const platform = getPlatform();
    const url = getDownloadUrl(platform);
    const response = await axios({ url, method: 'GET', responseType: 'stream' });
    const writer = fs.createWriteStream(ytDlpPath);
    response.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    if (platform !== 'win') fs.chmodSync(ytDlpPath, 0o755);
    return true;
  } catch (e) {
    return false;
  }
}

// === CẬP NHẬT ===
async function searchVideos(query, maxResults = 5) {
  const ytDlpPath = getYtDlpPath();
  if (!fs.existsSync(ytDlpPath)) {
    const setupSuccess = await setupYtDlp();
    if (!setupSuccess) throw new Error('Không thể thiết lập yt-dlp');
  }

  return new Promise((resolve, reject) => {
    const args = [
      `ytsearch${maxResults}:${query}`,
      '--skip-download',
      '--print', '%id|%title|%channel|%duration_string',
    ];

    const child = spawn(ytDlpPath, args);
    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('error', (err) => reject(new Error('Lỗi khi chạy yt-dlp: ' + err.message)));

    child.on('close', (code) => {
      if (!output.trim()) {
        return reject(new Error('❌ Không tìm thấy bài hát phù hợp.\n' + (errorOutput || '')));
      }

      const lines = output.trim().split('\n').filter(Boolean);
      const videos = lines.map(line => {
        const [id, title, channelTitle, duration] = line.split('|');
        return { id, title, channelTitle, duration };
      }).filter(v => v.id && v.title);

      if (videos.length === 0) {
        return reject(new Error('❌ Không tìm thấy bài hát phù hợp.'));
      }

      resolve(videos);
    });
  });
}

async function downloadMusic(videoId, outputPath) {
  const ytDlpPath = getYtDlpPath();
  if (!fs.existsSync(ytDlpPath)) {
    const setupSuccess = await setupYtDlp();
    if (!setupSuccess) throw new Error('Không thể thiết lập yt-dlp');
  }

  return new Promise((resolve, reject) => {
    const cmd = `"${ytDlpPath}" -x --audio-format mp3 --audio-quality 0 -o "${outputPath}" "https://www.youtube.com/watch?v=${videoId}"`;
    const child = exec(cmd, (error, stdout, stderr) => {
      if (error) return reject(new Error(`Tải nhạc thất bại: ${stderr}`));
      resolve();
    });

    setTimeout(() => {
      child.kill();
      reject(new Error('Tải nhạc quá lâu, đã hủy!'));
    }, 300000);
  });
}

function formatDuration(duration) {
  try {
    if (!duration) return '00:00';
    if (duration.match(/^\d+:\d+:\d+$/)) return duration;
    else if (duration.match(/^\d+:\d+$/)) return `00:${duration}`;
    return '00:00';
  } catch {
    return '00:00';
  }
}

module.exports.run = async function({ api, event, args }) {
  if (!args[0]) {
    return api.sendMessage("🎵 Vui lòng nhập tên bài hát!", event.threadID, event.messageID);
  }

  if (!checkCacheDirPermissions()) {
    return api.sendMessage("⚠️ Bot không có quyền ghi vào thư mục cache!", event.threadID, event.messageID);
  }

  try {
    const videos = await searchVideos(args.join(" "), 5);
    if (!videos || videos.length === 0) {
      return api.sendMessage("❌ Không tìm thấy bài hát phù hợp!", event.threadID, event.messageID);
    }

    const message = {
      body: `📝Kết Quả Tìm Kiếm:\n────────────────────\n${videos.map((v, i) => 
        `|› ${i+1}. ${v.title}\n|›👤 ${v.channelTitle}\n|›⏱️${formatDuration(v.duration)}\n────────────────────`
      ).join('\n')}📌 Reply số để nghe (chỉ bạn chọn được)`,
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
        originalMessageID: event.messageID
      });
    });

  } catch (e) {
    api.sendMessage(`⚠️ Lỗi khi tìm kiếm: ${e.message}`, event.threadID, event.messageID);
  }
};

module.exports.handleReply = async function({ api, event, handleReply }) {
  const { threadID, messageID, body, senderID } = event;

  if (handleReply.author !== senderID) {
    return api.sendMessage("⛔ Chỉ người gửi lệnh mới được chọn!", threadID, messageID);
  }

  const selectedIndex = parseInt(body) - 1;
  if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= handleReply.videos.length) {
    return api.sendMessage(`⚠️ Vui lòng chọn số từ 1-${handleReply.videos.length}!`, threadID, messageID);
  }

  api.unsendMessage(handleReply.messageID);
  if (handleReply.originalMessageID) api.unsendMessage(handleReply.originalMessageID);

  const video = handleReply.videos[selectedIndex];
  const videoId = video.id;
  const tempFile = path.join(cacheDir, `music_${senderID}_${Date.now()}.mp3`);

  api.sendMessage("[📤] Đang tải bài hát, vui lòng chờ...", threadID, async (err, info) => {
    if (err) return;
    const progressMsgId = info.messageID;

    try {
      await downloadMusic(videoId, tempFile);
      api.sendMessage({
        body: `===>《 MUSIC YOUTUBE 》<===\n────────────────────\n[🎵]→Tên nhạc: ${video.title}\n[⏱️]→Thời lượng:  ${formatDuration(video.duration)}\n[👤]→Tác giả: ${video.channelTitle}\n[🗓️]→Tải lên từ: Youtube\n────────────────────\n[⏰]→Time: ${moment().tz("Asia/Ho_Chi_Minh").format("HH:mm DD/MM/YYYY")}`,
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
  });
};
