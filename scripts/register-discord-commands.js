const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
const mode = process.argv[2]; // 'guild' or undefined (global)
const GUILD_ID = process.argv[3];

if (!BOT_TOKEN || !APPLICATION_ID) {
  console.error('DISCORD_BOT_TOKEN과 DISCORD_APPLICATION_ID 환경변수를 설정하세요.');
  process.exit(1);
}

const commands = [
  {
    name: '현준알림',
    description: '류현준 오프라인 일정 알림을 이 채널에 등록하거나 취소합니다.',
    options: [
      {
        name: 'action',
        description: '등록 또는 취소',
        type: 3,
        required: true,
        choices: [
          { name: '등록', value: '등록' },
          { name: '취소', value: '취소' }
        ]
      }
    ]
  }
];

const url = mode === 'guild' && GUILD_ID
  ? `https://discord.com/api/v10/applications/${APPLICATION_ID}/guilds/${GUILD_ID}/commands`
  : `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`;

const res = await fetch(url, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bot ${BOT_TOKEN}`
  },
  body: JSON.stringify(commands)
});

const data = await res.json();
if (res.ok) {
  console.log(`슬래시 커맨드 등록 완료 (${mode === 'guild' ? '길드' : '글로벌'}):`, data.map(c => c.name));
} else {
  console.error('등록 실패:', data);
}
