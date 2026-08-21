# DB 이전 가이드 (현재 → 개인 서버컴 PostgreSQL)

> 이 문서는 **미래 이전을 위한 준비 문서**다.
> 지금은 아무것도 옮기지 않는다. 현재 서비스는 기존 DB에 그대로 붙어 있다.

---

## 1. 현재 구조

```
Vercel (serverless functions, /api/*.js)
        │
        │  node-postgres (pg) 커넥션 풀 1개
        │  lib/db.js
        ▼
Prisma Postgres (db.prisma.io:5432)  ← 표준 PostgreSQL 프로토콜
```

- **DB**: Prisma Postgres. 다만 접속 방식은 **평범한 PostgreSQL TCP 연결**이다.
  전용 SDK나 HTTP 드라이버를 쓰지 않으므로 일반 PostgreSQL로 그대로 옮길 수 있다.
- **드라이버**: `pg` (node-postgres). 모든 쿼리는 생 SQL.
- **ORM**: 실질적으로 사용하지 않음. Prisma는 `prisma/seed.js` 에서만 쓰인다.
- **연결 지점**: `lib/db.js` **한 곳뿐**. 모든 API 라우트가 여기서 풀을 가져다 쓴다.

### 환경변수

| 변수 | 역할 | 비고 |
|---|---|---|
| `DATABASE_URL` | **정식 이름.** 앱과 Prisma가 함께 사용 | 앞으로 이것만 쓰면 된다 |
| `POSTGRES_URL` | 레거시 별칭 | 현재 Vercel에 설정된 값. 그대로 동작 |
| `PRISMA_DATABASE_URL` | 레거시 별칭 | 그대로 동작 |
| `DATABASE_SSL` | `no-verify`(기본) / `disable` / `require` / `verify-full` | 미설정 시 현재와 동일 |
| `DATABASE_SSL_CA` | 자체 서명 인증서 PEM | 선택 |
| `DB_POOL_MAX` | 풀 최대 커넥션 | 미설정 시 pg 기본값(10) |
| `DB_IDLE_TIMEOUT_MS` | 유휴 커넥션 정리 | 선택 |
| `DB_CONNECT_TIMEOUT_MS` | 연결 타임아웃 | 선택 |

`lib/db.js` 는 `DATABASE_URL` → `POSTGRES_URL` → `PRISMA_DATABASE_URL` 순으로 찾는다.
그래서 **Vercel 환경변수를 지금 건드리지 않아도 현재 배포가 그대로 돌아간다.**

---

## 2. 이전 절차

### 사전 준비 — 스키마 동기화 (⚠️ 반드시 먼저)

`prisma/schema.prisma` 에는 `messages`, `ticketing_practice` 두 테이블만 선언돼 있지만
실제 운영 DB에는 최소 14개 테이블이 있다.

```
AdminUsers, SuggestedQuestions, concert, difficulty, discord_channels,
goods, karaoke_number, messages, notice, pending_karaoke, questions,
quiz_ranking, site_config, ticketing_practice, waiting_group
```

**이 스키마 파일만 믿고 새 DB를 만들면 테이블 대부분이 누락된다.**
아래 둘 중 하나로 해결한다. (B안 권장)

**A안 — Prisma 기준으로 맞추기**
```bash
# .env 에 DATABASE_URL 을 현재 DB 주소로 설정한 뒤
npm run db:pull      # 실제 DB를 읽어 schema.prisma 를 채운다 (읽기 전용, 안전)
npm run db:generate
git diff prisma/schema.prisma   # 14개 테이블이 채워졌는지 확인
```

**B안 — pg_dump 기준으로 맞추기 (권장, 데이터까지 한 번에)**
Prisma를 거치지 않고 스키마·데이터를 통째로 옮긴다. 아래 3~5단계 참고.

---

### 1) 서버컴에 PostgreSQL 설치

현재 DB의 메이저 버전과 같거나 더 높은 버전을 설치한다.

```bash
psql "<현재 DATABASE_URL>" -c "SHOW server_version;"
```

### 2) DB와 사용자 생성

```sql
CREATE USER qjsgha WITH PASSWORD '<강한 비밀번호>';
CREATE DATABASE qjsgha OWNER qjsgha;
GRANT ALL PRIVILEGES ON DATABASE qjsgha TO qjsgha;
```

### 3) 현재 DB 덤프 (스키마 + 데이터)

```bash
# 스키마만
pg_dump --schema-only --no-owner --no-privileges \
  "<현재 DATABASE_URL>" > backup/schema.sql

# 데이터만
pg_dump --data-only --no-owner --no-privileges \
  "<현재 DATABASE_URL>" > backup/data.sql

# 또는 한 번에 (권장)
pg_dump --no-owner --no-privileges -Fc \
  "<현재 DATABASE_URL>" > backup/qjsgha.dump
```

> 읽기 전용 작업이다. 기존 DB는 전혀 변경되지 않는다.

### 4) 서버컴 DB로 복원

```bash
pg_restore --no-owner --no-privileges \
  -d "postgres://qjsgha:<비밀번호>@<서버IP>:5432/qjsgha" \
  backup/qjsgha.dump
```

### 5) 검증

```bash
# 테이블 개수 비교
psql "<현재 DATABASE_URL>"  -c "\dt"
psql "<서버컴 DATABASE_URL>" -c "\dt"

# 주요 테이블 행 수 비교
for t in messages karaoke_number questions quiz_ranking concert; do
  echo "== $t"
  psql "<현재 DATABASE_URL>"  -tAc "SELECT count(*) FROM \"$t\";"
  psql "<서버컴 DATABASE_URL>" -tAc "SELECT count(*) FROM \"$t\";"
done
```

시퀀스(자동증가 id)가 따라왔는지도 확인한다.

```sql
SELECT last_value FROM messages_id_seq;
```

### 6) 환경변수 변경 — **코드 수정 없음**

Vercel → Project → Settings → Environment Variables:

```
DATABASE_URL = postgres://qjsgha:<비밀번호>@<서버IP>:5432/qjsgha
DATABASE_SSL = disable        # 서버컴에 TLS를 안 붙였다면
```

- `DATABASE_URL` 이 있으면 레거시 `POSTGRES_URL` / `PRISMA_DATABASE_URL` 은 무시된다.
- 서버컴에 TLS를 붙였다면 `DATABASE_SSL=require`, 자체 서명이면 `verify-full` + `DATABASE_SSL_CA`.
- serverless에서 계속 돌린다면 `DB_POOL_MAX=3` 정도로 잡아 커넥션 폭주를 막는다.

### 7) 재배포 / 재시작

Vercel은 환경변수를 바꾼 뒤 **재배포해야** 반영된다.

### 8) 동작 확인

```
/api/get-inf?section=karaoke
/api/quiz?difficulty=easy
/api/ranking
/api/ticketing
/api/admin
```

Discord 크론(`/api/discord-notify`)도 확인한다.

### 9) 문제 없으면 기존 DB 종료

최소 1~2주는 기존 DB를 살려두고 롤백 경로를 유지한다.
롤백은 `DATABASE_URL` 을 원래 값으로 되돌리고 재배포하면 끝이다.

---

## 3. 서버컴 운영 시 주의점

- **네트워크 노출**: Vercel에서 접속하려면 서버컴 PostgreSQL이 인터넷에 열려야 한다.
  `postgresql.conf` 의 `listen_addresses`, `pg_hba.conf`, 방화벽/포트포워딩 설정 필요.
  가능하면 5432를 그대로 열지 말고 VPN(WireGuard/Tailscale)이나 SSH 터널을 쓴다.
- **고정 IP / DDNS**: 가정용 회선은 IP가 바뀐다. DDNS 또는 VPN 오버레이 주소를 쓴다.
- **커넥션 수**: serverless는 인스턴스마다 풀을 만든다.
  서버컴 `max_connections` 와 `DB_POOL_MAX` 를 함께 계산하고,
  필요하면 PgBouncer를 앞에 둔다. (PgBouncer를 쓰면 `DATABASE_URL` 만 그쪽으로 돌리면 된다.)
- **백업**: 이전 후에는 백업 주체가 본인이 된다. `pg_dump` 정기 실행 + 오프사이트 보관.

---

## 4. 앱을 서버컴에서 직접 돌릴 경우

지금 구조 그대로 옮겨갈 수 있다.

- API 파일은 `export default function handler(req, res)` 형태 —
  Express 등으로 감싸려면 얇은 어댑터 한 겹만 있으면 된다.
- DB 접근은 `lib/db.js` 하나뿐이라 바꿀 것이 없다.
- 이때 `DATABASE_URL` 은 `localhost` 로, `DATABASE_SSL=disable`, `DB_POOL_MAX` 는 크게 잡는다.
