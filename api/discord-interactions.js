import nacl from 'tweetnacl';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

const CHOSUNG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const CHOSUNG_GROUP1 = new Set(['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ']);

function firstConsonant(text) {
  for (const ch of text) {
    if (/\d/.test(ch)) return 'digit';
    if (/[A-Za-z]/.test(ch)) return 'alpha';
    const code = ch.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) {
      return CHOSUNG[Math.floor((code - 0xAC00) / 28 / 21)];
    }
  }
  return '';
}

function determineSongType(trackTitle, natType, isCover) {
  if (!isCover) return '오리지널 곡';
  if (natType === 1) return '한국 커버곡';
  const first = firstConsonant(trackTitle);
  if (first === 'digit' || first === 'alpha' || CHOSUNG_GROUP1.has(first)) return '일본 커버곡1';
  return '일본 커버곡2';
}

const ADMIN_ID = '847104232326955078';

function getRawBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

function verifySignature(rawBody, signature, timestamp, publicKey) {
  try {
    const sigBytes = Buffer.from(signature, 'hex');
    const keyBytes = Buffer.from(publicKey, 'hex');
    const msg = Buffer.concat([
      Buffer.from(timestamp, 'utf8'),
      Buffer.from(rawBody, 'utf8')
    ]);
    return nacl.sign.detached.verify(msg, sigBytes, keyBytes);
  } catch {
    return false;
  }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).send('Method Not Allowed');
  }

  const signature = request.headers['x-signature-ed25519'];
  const timestamp = request.headers['x-signature-timestamp'];
  const rawBody = await getRawBody(request);

  console.log('rawBody length:', rawBody.length);
  console.log('signature:', signature?.slice(0, 20));
  console.log('DISCORD_PUBLIC_KEY set:', !!process.env.DISCORD_PUBLIC_KEY);

  if (!verifySignature(rawBody, signature, timestamp, process.env.DISCORD_PUBLIC_KEY)) {
    console.log('signature verification failed');
    return response.status(401).send('Invalid request signature');
  }

  const interaction = JSON.parse(rawBody);

  if (interaction.type === 1) {
    return response.status(200).json({ type: 1 });
  }

  if (interaction.type === 5) {
    if (interaction.data.custom_id === 'announcement_modal') {
      const content = interaction.data.components[0].components[0].value;
      const botToken = process.env.DISCORD_BOT_TOKEN;

      try {
        const channelsResult = await pool.query(`SELECT channel_id FROM discord_channels`);

        if (channelsResult.rows.length === 0) {
          return response.status(200).json({
            type: 4,
            data: { content: '📭 구독 중인 채널이 없습니다.', flags: 64 }
          });
        }

        const messageBody = JSON.stringify({
          embeds: [{
            title: '📢 류현준 팬사이트 공지사항',
            description: content,
            color: 0xCCA6E8,
            footer: { text: '류현준 비공식 팬사이트' },
            timestamp: new Date().toISOString()
          }]
        });

        const sendResults = await Promise.allSettled(
          channelsResult.rows.map(row =>
            fetch(`https://discord.com/api/v10/channels/${row.channel_id}/messages`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bot ${botToken}`
              },
              body: messageBody
            }).then(async r => {
              if (!r.ok) throw new Error(await r.text());
              return row.channel_id;
            })
          )
        );

        const succeeded = sendResults.filter(r => r.status === 'fulfilled').length;
        const failed = sendResults.filter(r => r.status === 'rejected').length;

        return response.status(200).json({
          type: 4,
          data: {
            content: `✅ 공지 전송 완료 — ${succeeded}개 채널 성공${failed > 0 ? `, ${failed}개 실패` : ''}`,
            flags: 64
          }
        });
      } catch (err) {
        console.error('공지사항 모달 오류:', err);
        return response.status(200).json({
          type: 4,
          data: { content: '❌ 전송 중 오류가 발생했습니다.', flags: 64 }
        });
      }
    }
  }

  if (interaction.type === 2) {
    const { name, options } = interaction.data;
    const guildId = interaction.guild_id;
    const channelId = interaction.channel_id;
    const action = options?.[0]?.value;

    const userId = interaction.member?.user?.id ?? interaction.user?.id;

    if (name === '공지사항') {
      if (userId !== ADMIN_ID) {
        return response.status(200).json({
          type: 4,
          data: { content: '❌ 이 명령어를 사용할 권한이 없습니다.', flags: 64 }
        });
      }

      return response.status(200).json({
        type: 9,
        data: {
          custom_id: 'announcement_modal',
          title: '공지사항 전송',
          components: [{
            type: 1,
            components: [{
              type: 4,
              custom_id: 'announcement_content',
              label: '공지 내용',
              style: 2,
              placeholder: '전송할 공지 내용을 입력하세요',
              required: true,
              min_length: 1,
              max_length: 2000
            }]
          }]
        }
      });
    }

    if (name === '도움말') {
      return response.status(200).json({
        type: 4,
        data: {
          embeds: [{
            title: '📖 명령어 도움말',
            color: 0xCCA6E8,
            fields: [
              { name: '/현준알림 등록', value: '이 채널에 류현준 님의 오프라인 일정 알림을 등록합니다.', inline: false },
              { name: '/현준알림 취소', value: '이 채널의 알림 구독을 취소합니다.', inline: false },
              { name: '/오프라인', value: '류현준 님의 예정된 오프라인 일정을 확인합니다.', inline: false },
              { name: '/노래방 검색:제목', value: '류현준 님의 TJ 노래방 번호를 검색합니다.', inline: false }
            ],
            footer: { text: '류현준 비공식 팬사이트' }
          }],
          flags: 64
        }
      });
    }

    if (name === '오프라인') {
      try {
        const now = new Date();
        const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
        const todayStr = kst.toISOString().slice(0, 10);

        const result = await pool.query(
          `SELECT name, date_label, event_date, status FROM concert WHERE event_date >= $1 ORDER BY event_date ASC LIMIT 5`,
          [todayStr]
        );

        if (result.rows.length === 0) {
          return response.status(200).json({
            type: 4,
            data: { content: '📭 현재 예정된 오프라인 일정이 없습니다.', flags: 64 }
          });
        }

        const fields = result.rows.map(c => {
          const dateStr = c.date_label || String(c.event_date).slice(0, 10);
          const diffMs = new Date(c.event_date) - new Date(todayStr);
          const dDay = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          const dLabel = dDay === 0 ? 'D-Day' : `D-${dDay}`;
          return {
            name: `${c.name} (${dLabel})`,
            value: `📅 ${dateStr}${c.status ? `\n🎫 ${c.status}` : ''}`,
            inline: false
          };
        });

        return response.status(200).json({
          type: 4,
          data: {
            embeds: [{
              title: '📋 류현준 오프라인 일정',
              color: 0xCCA6E8,
              fields,
              description: '[자세한 정보 보기](https://dear-hyeonjun.vercel.app/html/inf.html)',
              footer: { text: '류현준 비공식 팬사이트' },
              timestamp: new Date().toISOString()
            }]
          }
        });
      } catch (err) {
        console.error('오프라인 조회 오류:', err);
        return response.status(200).json({
          type: 4,
          data: { content: '❌ 조회 중 오류가 발생했습니다.', flags: 64 }
        });
      }
    }

    if (name === '노래방') {
      const query = options?.[0]?.value || '';
      try {
        const result = await pool.query(
          `SELECT song_title, song_type, number1, number2 FROM karaoke_number WHERE song_title ILIKE $1 ORDER BY song_type, id LIMIT 5`,
          [`%${query}%`]
        );

        if (result.rows.length === 0) {
          return response.status(200).json({
            type: 4,
            data: { content: `❌ **"${query}"** 에 해당하는 곡을 찾지 못했습니다.`, flags: 64 }
          });
        }

        const SITE_BASE = 'https://dear-hyeonjun.vercel.app/html/ins.html';
        const fields = result.rows.map(song => {
          const numText = song.number2 ? `${song.number1} / ${song.number2}` : String(song.number1);
          const link = `${SITE_BASE}?num=${song.number1}`;
          const typeLabel = song.song_type.replace(/^일본 커버곡[12]$/, '일본 커버곡');
          return {
            name: song.song_title,
            value: `종류 : ${typeLabel}\n번호 : ${numText}\n[사이트에서 보기](${link})`,
            inline: false
          };
        });

        return response.status(200).json({
          type: 4,
          data: {
            embeds: [{
              title: `🎤 노래방 검색 결과 — "${query}"`,
              color: 0xCCA6E8,
              fields,
              description: '[노래방 페이지 바로가기](https://dear-hyeonjun.vercel.app/html/ins.html)',
              footer: { text: '류현준 비공식 팬사이트' }
            }]
          }
        });
      } catch (err) {
        console.error('노래방 검색 오류:', err);
        return response.status(200).json({
          type: 4,
          data: { content: '❌ 검색 중 오류가 발생했습니다.', flags: 64 }
        });
      }
    }

    if (name === '현준알림') {

      if (action === '등록') {
        try {
          await pool.query(
            `INSERT INTO discord_channels (guild_id, channel_id)
             VALUES ($1, $2)
             ON CONFLICT (guild_id) DO UPDATE SET channel_id = $2`,
            [guildId, channelId]
          );

          return response.status(200).json({
            type: 4,
            data: { content: '✅ **성공!** 앞으로 이 채널로 류현준 님의 오프라인 일정을 매일 아침 배달해 드릴게요!', flags: 64 }
          });
        } catch (err) {
          console.error('등록 오류:', err);
          return response.status(200).json({
            type: 4,
            data: { content: '❌ 등록 중 오류가 발생했습니다.', flags: 64 }
          });
        }
      }

      if (action === '취소') {
        try {
          const existing = await pool.query(
            `SELECT webhook_url FROM discord_channels WHERE guild_id = $1`, [guildId]
          );

          if (existing.rows.length === 0) {
            return response.status(200).json({
              type: 4,
              data: { content: '이 서버는 아직 알림을 등록하지 않았습니다.', flags: 64 }
            });
          }

          await pool.query(`DELETE FROM discord_channels WHERE guild_id = $1`, [guildId]);

          return response.status(200).json({
            type: 4,
            data: { content: '🔕 알림 구독을 취소했습니다.', flags: 64 }
          });
        } catch (err) {
          console.error('취소 오류:', err);
          return response.status(200).json({
            type: 4,
            data: { content: '❌ 취소 중 오류가 발생했습니다.', flags: 64 }
          });
        }
      }
    }
  }

  if (interaction.type === 3) {
    const customId = interaction.data?.custom_id ?? '';
    if (!customId.startsWith('reg:') && !customId.startsWith('rej:')) {
      return response.status(400).json({ error: 'Unknown component' });
    }

    const userId = interaction.member?.user?.id ?? interaction.user?.id;
    if (userId !== ADMIN_ID) {
      return response.status(200).json({
        type: 4,
        data: { content: '❌ 이 버튼을 사용할 권한이 없습니다.', flags: 64 }
      });
    }

    const [action, pendingIdStr] = customId.split(':', 2);
    const pendingId = parseInt(pendingIdStr, 10);

    try {
      const { rows } = await pool.query(
        'SELECT id, track_title, tj_number, nat_type, is_cover FROM pending_karaoke WHERE id = $1',
        [pendingId]
      );

      if (rows.length === 0) {
        return response.status(200).json({
          type: 4,
          data: { content: '이미 처리된 항목이야.', flags: 64 }
        });
      }

      const pending = rows[0];

      if (action === 'reg') {
        const songType = determineSongType(pending.track_title, pending.nat_type, pending.is_cover);
        await pool.query(
          `INSERT INTO karaoke_number (song_title, song_type, number1)
           VALUES ($1, $2, $3)
           ON CONFLICT (song_title) DO NOTHING`,
          [pending.track_title, songType, pending.tj_number]
        );
        await pool.query('DELETE FROM pending_karaoke WHERE id = $1', [pendingId]);

        return response.status(200).json({
          type: 7,
          data: {
            content: `✅ 등록 완료: \`${pending.track_title}\` → ${pending.tj_number} (${songType})`,
            embeds: [],
            components: []
          }
        });
      }

      if (action === 'rej') {
        await pool.query('DELETE FROM pending_karaoke WHERE id = $1', [pendingId]);

        return response.status(200).json({
          type: 7,
          data: {
            content: `❌ 기각: \`${pending.track_title}\``,
            embeds: [],
            components: []
          }
        });
      }
    } catch (err) {
      console.error('버튼 인터랙션 오류:', err);
      return response.status(200).json({
        type: 4,
        data: { content: '❌ 처리 중 오류가 발생했습니다.', flags: 64 }
      });
    }
  }

  return response.status(400).json({ error: 'Unknown interaction' });
}
