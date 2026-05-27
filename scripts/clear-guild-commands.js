const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
const GUILD_ID = process.argv[2];

if (!BOT_TOKEN || !APPLICATION_ID) {
  console.error('DISCORD_BOT_TOKEN과 DISCORD_APPLICATION_ID 환경변수를 설정하세요.');
  process.exit(1);
}

if (!GUILD_ID) {
  console.error('사용법: node scripts/clear-guild-commands.js <GUILD_ID>');
  process.exit(1);
}

const res = await fetch(
  `https://discord.com/api/v10/applications/${APPLICATION_ID}/guilds/${GUILD_ID}/commands`,
  {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bot ${BOT_TOKEN}`
    },
    body: '[]'
  }
);

if (res.ok) {
  console.log(`길드(${GUILD_ID}) 커맨드 전체 삭제 완료`);
} else {
  console.error('삭제 실패:', await res.json());
}
