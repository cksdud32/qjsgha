import nacl from 'tweetnacl';
import { sql } from '@vercel/postgres';

export const config = { runtime: 'edge' };

function hexToBytes(hex) {
  return new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
}

function verifySignature(rawBody, signature, timestamp, publicKey) {
  try {
    const encoder = new TextEncoder();
    const sigBytes = hexToBytes(signature);
    const keyBytes = hexToBytes(publicKey);
    const ts = encoder.encode(timestamp);
    const body = encoder.encode(rawBody);
    const msg = new Uint8Array(ts.length + body.length);
    msg.set(ts, 0);
    msg.set(body, ts.length);
    return nacl.sign.detached.verify(msg, sigBytes, keyBytes);
  } catch {
    return false;
  }
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  const rawBody = await request.text();

  if (!verifySignature(rawBody, signature, timestamp, process.env.DISCORD_PUBLIC_KEY)) {
    return new Response('Invalid request signature', { status: 401 });
  }

  const interaction = JSON.parse(rawBody);

  // PING → PONG
  if (interaction.type === 1) {
    return Response.json({ type: 1 });
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
            return Response.json({
              type: 4,
              data: { content: '❌ 웹훅 생성 실패. 봇에게 **웹훅 관리** 권한이 있는지 확인해 주세요.', flags: 64 }
            });
          }

          const webhook = await webhookRes.json();
          const webhookUrl = `https://discord.com/api/webhooks/${webhook.id}/${webhook.token}`;

          await sql`
            INSERT INTO discord_channels (guild_id, channel_id, webhook_url)
            VALUES (${guildId}, ${channelId}, ${webhookUrl})
            ON CONFLICT (guild_id) DO UPDATE SET channel_id = ${channelId}, webhook_url = ${webhookUrl}
          `;

          return Response.json({
            type: 4,
            data: {
              content: '✅ **성공!** 앞으로 이 채널로 류현준 님의 오프라인 일정을 매일 아침 배달해 드릴게요!',
              flags: 64
            }
          });
        } catch (err) {
          console.error('등록 오류:', err);
          return Response.json({
            type: 4,
            data: { content: '❌ 등록 중 오류가 발생했습니다.', flags: 64 }
          });
        }
      }

      if (action === '취소') {
        try {
          const result = await sql`
            SELECT webhook_url FROM discord_channels WHERE guild_id = ${guildId}
          `;

          if (result.rows.length === 0) {
            return Response.json({
              type: 4,
              data: { content: '이 서버는 아직 알림을 등록하지 않았습니다.', flags: 64 }
            });
          }

          await fetch(result.rows[0].webhook_url, { method: 'DELETE' });
          await sql`DELETE FROM discord_channels WHERE guild_id = ${guildId}`;

          return Response.json({
            type: 4,
            data: { content: '🔕 알림 구독을 취소했습니다.', flags: 64 }
          });
        } catch (err) {
          console.error('취소 오류:', err);
          return Response.json({
            type: 4,
            data: { content: '❌ 취소 중 오류가 발생했습니다.', flags: 64 }
          });
        }
      }
    }
  }

  return Response.json({ error: 'Unknown interaction' }, { status: 400 });
}
