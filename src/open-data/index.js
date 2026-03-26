/**
 * Open data context for friend leaderboard
 * Runs in a sandboxed environment with access to friend cloud storage
 */

const sharedCanvas = wx.getSharedCanvas();
const ctx = sharedCanvas.getContext("2d");

const COLORS = {
  bg: "#FFFFFF",
  headerBg: "#FFD700",
  text: "#333333",
  subText: "#999999",
  selfBg: "#FFF8DC",
  border: "#F0F0F0",
  empty: "#666666",
};

const MEDALS = ["🥇", "🥈", "🥉"];

/**
 * Draw the leaderboard on sharedCanvas
 * @param {Array} data - sorted friend data
 */
const drawLeaderboard = (data) => {
  const w = sharedCanvas.width;
  const h = sharedCanvas.height;
  const rowH = 80;
  const headerH = 60;

  // Clear
  ctx.clearRect(0, 0, w, h);

  // Background
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, w, h);

  if (!data || data.length === 0) {
    ctx.fillStyle = COLORS.empty;
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("暂无好友数据", w / 2, h / 2);
    return;
  }

  // Header
  ctx.fillStyle = COLORS.headerBg;
  ctx.fillRect(0, 0, w, headerH);
  ctx.fillStyle = COLORS.text;
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("好友排行榜", w / 2, headerH / 2 + 7);

  // Rows
  data.forEach((item, i) => {
    const y = headerH + i * rowH;

    // Row background
    ctx.fillStyle = i % 2 === 0 ? COLORS.bg : "#FAFAFA";
    ctx.fillRect(0, y, w, rowH);

    // Border
    ctx.strokeStyle = COLORS.border;
    ctx.beginPath();
    ctx.moveTo(0, y + rowH);
    ctx.lineTo(w, y + rowH);
    ctx.stroke();

    // Rank
    ctx.fillStyle = COLORS.text;
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    if (i < 3) {
      ctx.font = "22px sans-serif";
      ctx.fillText(MEDALS[i], 30, y + rowH / 2 + 8);
    } else {
      ctx.fillText(`${i + 1}`, 30, y + rowH / 2 + 6);
    }

    // Avatar placeholder
    const avatarX = 60;
    const avatarY = y + (rowH - 40) / 2;
    const avatarR = 20;
    if (item.avatarUrl) {
      // Draw avatar circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarR, avatarY + avatarR, avatarR, 0, Math.PI * 2);
      ctx.clip();
      try {
        const img = wx.createImage();
        img.src = item.avatarUrl;
        img.onload = () => {
          ctx.drawImage(img, avatarX, avatarY, 40, 40);
          ctx.restore();
        };
      } catch (_e) {
        ctx.restore();
      }
    } else {
      ctx.fillStyle = "#4A90D9";
      ctx.beginPath();
      ctx.arc(avatarX + avatarR, avatarY + avatarR, avatarR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFF";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        (item.nickname || "?")[0],
        avatarX + avatarR,
        avatarY + avatarR + 6,
      );
    }

    // Nickname
    ctx.fillStyle = COLORS.text;
    ctx.font = "14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(item.nickname || "微信用户", 110, y + rowH / 2 - 4);

    // Score
    ctx.fillStyle = COLORS.subText;
    ctx.font = "12px sans-serif";
    ctx.fillText(`过了 ${item.score || 0} 关`, 110, y + rowH / 2 + 16);

    // Score on right
    ctx.fillStyle = COLORS.text;
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${item.score || 0}`, w - 20, y + rowH / 2 + 7);
  });
};

/**
 * Listen for messages from main context
 */
wx.onMessage((msg) => {
  if (msg.type === "render") {
    wx.getFriendCloudStorage({
      keyList: ["score"],
      success: (res) => {
        const friends = (res.data || [])
          .map((d) => ({
            nickname: d.nickname,
            avatarUrl: d.avatarUrl,
            score: parseInt(d.KVDataList?.[0]?.value || "0", 10),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 20);
        drawLeaderboard(friends);
      },
      fail: () => {
        drawLeaderboard([]);
      },
    });
  }
});
