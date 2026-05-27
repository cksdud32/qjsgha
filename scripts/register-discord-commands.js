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
  },
  {
    name: '노래방',
    description: '노래방 번호 검색 및 등록',
    options: [
      {
        name: '검색',
        description: '곡 제목으로 노래방 번호를 검색합니다.',
        type: 1,
        options: [
          {
            name: '제목',
            description: '검색할 곡 제목',
            type: 3,
            required: true
          }
        ]
      },
      {
        name: '번호추가',
        description: '(관리자) 노래방 번호를 직접 추가합니다.',
        type: 1,
        options: [
          {
            name: '곡제목',
            description: '등록할 곡 제목',
            type: 3,
            required: true
          },
          {
            name: 'number1',
            description: 'TJ 노래방 번호 (첫 번째)',
            type: 3,
            required: true
          },
          {
            name: '종류',
            description: '곡 종류',
            type: 3,
            required: true,
            choices: [
              { name: '오리지널 곡', value: '오리지널 곡' },
              { name: '한국 커버곡', value: '한국 커버곡' },
              { name: '일본 커버곡1', value: '일본 커버곡1' },
              { name: '일본 커버곡2', value: '일본 커버곡2' }
            ]
          },
          {
            name: 'number2',
            description: 'TJ 노래방 번호 (두 번째, 선택)',
            type: 3,
            required: false
          }
        ]
      }
    ]
  },
  {
    name: '오프라인',
    description: '류현준 님의 오프라인 일정 정보를 확인합니다.'
  },
  {
    name: '공지사항',
    description: '알림을 구독한 모든 채널에 공지를 전송합니다.'
  },
  {
    name: '도움말',
    description: '사용 가능한 명령어 목록을 확인합니다.'
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
