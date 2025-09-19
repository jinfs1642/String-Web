# Vercel PostgreSQL 설정 가이드

## 1. Vercel Postgres 데이터베이스 생성

1. Vercel 대시보드 (https://vercel.com)에 로그인
2. 프로젝트 선택
3. Settings → Storage 탭으로 이동
4. "Create Database" → "Postgres" 선택
5. 데이터베이스 이름 입력 (예: `string-manager-db`)
6. 지역 선택 (가장 가까운 지역)

## 2. 환경 변수 설정

Vercel 대시보드에서 다음 환경 변수들을 설정:

```
POSTGRES_URL=postgres://username:password@host:port/database
POSTGRES_PRISMA_URL=postgres://username:password@host:port/database?pgbouncer=true&connect_timeout=15
POSTGRES_URL_NON_POOLING=postgres://username:password@host:port/database
POSTGRES_USER=username
POSTGRES_HOST=host
POSTGRES_PASSWORD=password
POSTGRES_DATABASE=database
```

## 3. 데이터베이스 스키마 생성

Vercel 대시보드의 Storage 탭에서:
1. 생성한 Postgres 데이터베이스 선택
2. "Query" 탭으로 이동
3. `lib/db-schema.sql` 파일의 내용을 복사하여 실행

## 4. 배포

```bash
git add .
git commit -m "Add PostgreSQL support"
git push origin main
```

## 5. 테스트

배포 후 다음 기능들이 정상 작동하는지 확인:
- 프로젝트 생성/조회
- 앱 생성/조회
- 스트링 생성/수정/삭제
- **버전 발행 (Publish)**
- **히스토리 조회**

## 문제 해결

### Publish가 작동하지 않는 경우:
1. 데이터베이스 연결 확인
2. 환경 변수 설정 확인
3. Vercel 함수 로그 확인 (Functions 탭)

### History 페이지가 비어있는 경우:
1. `versions` 테이블이 생성되었는지 확인
2. `publishVersion` 함수가 정상 실행되는지 확인
3. 데이터베이스에 실제 데이터가 저장되는지 확인

## 로컬 개발

로컬에서 테스트하려면:

1. `.env.local` 파일 생성:
```
POSTGRES_URL=your_postgres_url_here
```

2. 개발 서버 실행:
```bash
npm run dev
```

## 주의사항

- Vercel Postgres는 무료 플랜에서 월 500MB 제한
- 프로덕션 환경에서는 더 큰 데이터베이스 고려
- 데이터 백업 정책 수립 권장
