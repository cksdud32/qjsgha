import nacl from 'tweetnacl';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

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

  if (!verifySignature(rawBody, signature, timestamp, process.env.DISCORD_PUBLIC_KEY)) {
    return response.status(401).send('Invalid request signature');
  }

  const interaction = JSON.parse(rawBody);

  // PING → PONG
  if (interaction.type === 1) {
    return response.status(200).json({ type: 1 });
  }

  // APPLICATION_COMMAND
  if (interaction.type === 2) {
    const { name, options } = interaction.data;
    const guildId = interaction.guild_id;
    const channelId = interaction.channel_id;
    const action = options?.[0]?.value;

    if (name === '현준알림') {

      if (action === '등록') {
        try {
          const webhookRes = await fetch(
            `https://discord.com/api/v10/channels/${channelId}/webhooks`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`
              },
              body: JSON.stringify({ name: '류현준 알리미' })
            }
          );

          if (!webhookRes.ok) {
            const err = await webhookRes.text();
            console.error('웹훅 생성 실패:', err);
            return response.status(200).json({
              type: 4,
              data: {
                content: '❌ 웹훅 생성에 실패했습니다. 봇에게 **웹훅 관리** 권한이 있는지 확인해 주세요.',
                flags: 64
              }
            });
          }

          const webhook = await webhookRes.json();
          const webhookUrl = `https://discord.com/api/webhooks/${webhook.id}/${webhook.token}`;

          await pool.query(
            `INSERT INTO discord_channels (guild_id, channel_id, webhook_url)
             VALUES ($1, $2, $3)
             ON CONFLICT (guild_id) DO UPDATE SET channel_id = $2, webhook_url = $3`,
            [guildId, channelId, webhookUrl]
          );

          return response.status(200).json({
            type: 4,
            data: {
              content: '✅ **성공!** 앞으로 이 채널로 류현준 님의 오프라인 일정을 매일 아침 배달해 드릴게요!',
              flags: 64
            }
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
            `SELECT webhook_url FROM discord_channels WHERE guild_id = $1`,
            [guildId]
          );

          if (existing.rows.length === 0) {
            return response.status(200).json({
              type: 4,
              data: { content: '이 서버는 아직 알림을 등록하지 않았습니다.', flags: 64 }
            });
          }

          await fetch(existing.rows[0].webhook_url, { method: 'DELETE' });
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

  return response.status(400).json({ error: 'Unknown interaction' });
}
