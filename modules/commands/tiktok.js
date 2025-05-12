const { extractVideoMeta, extractUserInfo, extractSearchResult, extractTrending, extractUserPosts } = require('../scraper/tiktok');

module.exports = async (command, args, reply) => {
  const url = args[0];

  switch (command) {
    case 'video':
      return await handleDownloadVideo(url, reply);
    case 'audio':
      return await handleDownloadAudio(url, reply);
    case 'user':
      return await handleUserInfo(url, reply);
    case 'search':
      return await handleSearch(args.slice(0).join(' '), reply);
    case 'trending':
      return await handleTrending(reply);
    case 'posts':
      return await handleUserPosts(url, reply);
    default:
      return reply('Lệnh không hợp lệ. Các lệnh hợp lệ: video, audio, user, search, trending, posts.');
  }
};

async function handleDownloadVideo(url, reply) {
  try {
    const videoData = await extractVideoMeta(url);
    if (!videoData || !videoData.video?.url) {
      return reply('Không thể lấy dữ liệu video.');
    }
    return reply(videoData.video.url);
  } catch (error) {
    console.error(error);
    return reply('Đã xảy ra lỗi khi tải video.');
  }
}

async function handleDownloadAudio(url, reply) {
  try {
    const videoData = await extractVideoMeta(url);
    if (!videoData || !videoData.music?.url) {
      return reply('Không thể lấy dữ liệu âm thanh.');
    }
    return reply(videoData.music.url);
  } catch (error) {
    console.error(error);
    return reply('Đã xảy ra lỗi khi tải âm thanh.');
  }
}

async function handleUserInfo(username, reply) {
  try {
    const userInfo = await extractUserInfo(username);
    if (!userInfo) {
      return reply('Không thể lấy thông tin người dùng.');
    }
    return reply(JSON.stringify(userInfo, null, 2));
  } catch (error) {
    console.error(error);
    return reply('Đã xảy ra lỗi khi lấy thông tin người dùng.');
  }
}

async function handleSearch(query, reply) {
  try {
    const results = await extractSearchResult(query);
    if (!results || results.length === 0) {
      return reply('Không tìm thấy kết quả.');
    }
    return reply(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error(error);
    return reply('Đã xảy ra lỗi khi tìm kiếm.');
  }
}

async function handleTrending(reply) {
  try {
    const trending = await extractTrending();
    if (!trending || trending.length === 0) {
      return reply('Không tìm thấy video thịnh hành.');
    }
    return reply(JSON.stringify(trending, null, 2));
  } catch (error) {
    console.error(error);
    return reply('Đã xảy ra lỗi khi lấy video thịnh hành.');
  }
}

async function handleUserPosts(username, reply) {
  try {
    const posts = await extractUserPosts(username);
    if (!posts || posts.length === 0) {
      return reply('Không tìm thấy bài đăng của người dùng.');
    }
    return reply(JSON.stringify(posts, null, 2));
  } catch (error) {
    console.error(error);
    return reply('Đã xảy ra lỗi khi lấy bài đăng.');
  }
}
