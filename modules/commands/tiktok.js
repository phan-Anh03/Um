const { extractSearchResult, extractTrending, extractUserPosts } = require('./tiktok');
const bot = require('./messenger');

// Xử lý lệnh tìm kiếm TikTok
async function handleSearch(query, send) {
  try {
    const results = await extractSearchResult(query);
    if (!results || results.length === 0) return send('Không tìm thấy video nào.');

    let message = `Kết quả cho "${query}":\n\n`;
    results.slice(0, 5).forEach((item, i) => {
      message += `#${i + 1}\n`;
      message += `User: @${item.author.uniqueId}\n`;
      message += `Caption: ${item.desc || 'Không có mô tả'}\n`;
      message += `Link: https://www.tiktok.com/@${item.author.uniqueId}/video/${item.id}\n\n`;
    });
    send(message);
  } catch (err) {
    console.error(err);
    send('Đã xảy ra lỗi khi tìm kiếm.');
  }
}

// Xử lý lệnh trending
async function handleTrending(send) {
  try {
    const trending = await extractTrending();
    if (!trending || trending.length === 0) return send('Không tìm thấy video trending.');

    let message = `Top video trending:\n\n`;
    trending.slice(0, 5).forEach((item, i) => {
      message += `#${i + 1}\n`;
      message += `User: @${item.author.uniqueId}\n`;
      message += `Caption: ${item.desc || 'Không có mô tả'}\n`;
      message += `Link: https://www.tiktok.com/@${item.author.uniqueId}/video/${item.id}\n\n`;
    });
    send(message);
  } catch (err) {
    console.error(err);
    send('Đã xảy ra lỗi khi tải trending.');
  }
}

// Xử lý lệnh lấy bài đăng người dùng
async function handleUserPosts(username, send) {
  try {
    const posts = await extractUserPosts(username);
    if (!posts || posts.length === 0) return send(`Không tìm thấy bài đăng từ @${username}`);

    let message = `Bài đăng từ @${username}:\n\n`;
    posts.slice(0, 5).forEach((item, i) => {
      message += `#${i + 1}\n`;
      message += `Caption: ${item.desc || 'Không có mô tả'}\n`;
      message += `Link: https://www.tiktok.com/@${username}/video/${item.id}\n\n`;
    });
    send(message);
  } catch (err) {
    console.error(err);
    send('Đã xảy ra lỗi khi lấy bài đăng.');
  }
}

// Lắng nghe tin nhắn
bot.on('message', async (msg) => {
  const text = msg.body.trim();

  if (text.startsWith('ttsearch ')) {
    const query = text.slice(9);
    return handleSearch(query, (reply) => bot.sendMessage(msg.from, { body: reply }));
  }

  if (text === 'tttrending') {
    return handleTrending((reply) => bot.sendMessage(msg.from, { body: reply }));
  }

  if (text.startsWith('ttposts ')) {
    const username = text.slice(8);
    return handleUserPosts(username, (reply) => bot.sendMessage(msg.from, { body: reply }));
  }

  // Lệnh trợ giúp
  if (text === 'tthelp') {
    const help = `Các lệnh TikTok hỗ trợ:\n- ttsearch từ khóa\n- tttrending\n- ttposts username\nVí dụ: ttsearch con mèo`;
    return bot.sendMessage(msg.from, { body: help });
  }
});
