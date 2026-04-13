import 'dotenv/config'; // 이 줄을 맨 위에 추가하세요!
import pkg from '@prisma/client';
const { PrismaClient } = pkg;


const prisma = new PrismaClient();

async function main() {
  await prisma.messages.create({
    data: {
      name: '관리자🍒',
      content: '류현준 팬 사이트 방명록에 오신 것을 환영합니다!',
    },
  });
  console.log('초기 데이터 저장 완료! 🍒');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });