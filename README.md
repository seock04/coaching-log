# 코칭 일지 대시보드

Excel 코칭 일지의 핵심 필드를 웹에서 기록하고, 인증 시간을 자동 집계하는 개인용 대시보드입니다.

## 포함 기능

- 이메일/비밀번호 로그인
- 코칭 기록 추가, 수정, 삭제
- 유료·무료·받은 코치더코치·진행한 코치더코치·멘토코칭 시간 집계
- 연도·유형 필터와 고객명/마일스톤 검색
- 한국코치협회 Excel 양식 일괄 가져오기(중복 기록 갱신)
- 현재 조회 결과를 KSC 원본 Excel 양식으로 내보내기
- 현재 조회 결과 CSV 내보내기
- 모바일 대응
- Supabase Row Level Security: 로그인 사용자는 자신의 행만 조회·변경

## 로컬 실행

```bash
npm install
cp .env.example .env.local
npm run dev
```

Supabase 연결 전에는 익명화된 샘플 데이터로 데모 모드가 실행됩니다.

## Supabase 설정

1. Supabase 프로젝트를 만듭니다.
2. SQL Editor에서 `supabase/migrations/202609170001_create_coaching_sessions.sql`을 실행합니다.
3. Project Settings의 URL과 publishable/anon key를 `.env.local`에 입력합니다.
4. Authentication에서 Email provider를 활성화합니다.
5. Site URL에 로컬 주소와 실제 Vercel 주소를 등록합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

서비스 역할 키(service role key)는 브라우저 환경변수나 GitHub 저장소에 넣지 마세요.

## Vercel 배포

1. 이 디렉터리를 비공개 GitHub 저장소에 push합니다.
2. Vercel에서 해당 저장소를 Import합니다.
3. 위 두 환경변수를 Production, Preview, Development에 등록합니다.
4. 배포 후 생성된 `https://프로젝트명.vercel.app` 주소를 Supabase Auth의 Redirect URLs에 추가합니다.

## 원본 Excel 필드 매핑

| Excel | 데이터베이스 |
|---|---|
| 날짜 | `session_date` |
| 시간(시작-끝) | `start_time`, `end_time` |
| 고객명 | `client_name` |
| 유료(분) | `paid_minutes` |
| 무료(분) | `free_minutes` |
| 받은 코치더코치(분) | `received_coach_the_coach_minutes` |
| 코칭형태 | `coaching_format` |
| 코더코 | `given_coach_the_coach_minutes` |
| 멘토코칭 | `mentor_coaching_minutes` |
| 마일스톤 | `milestone` |

원본의 실제 고객명은 저장소에 포함하지 않습니다. 로그인 후 **Excel 가져오기**에서 기존 한국코치협회 파일을 선택하면 브라우저에서 내용을 확인한 뒤 본인 계정으로 저장합니다.

**Excel로 내보내기**는 현재 검색·연도·유형 필터에 표시된 기록을 첨부된 협회 양식의 시트, 열, 셀 서식과 합계 계산 구조를 유지한 `.xlsx` 파일로 저장합니다.

## 기존 Excel 기록 가져오기

가져오기 스크립트는 개인 데이터가 Git에 들어가지 않도록 로컬 Excel을 직접 읽어 Supabase로 전송합니다. 먼저 `--dry-run`으로 건수와 합계를 확인하세요.

```bash
python -m pip install openpyxl
python scripts/import_excel.py "/path/to/코칭일지.xlsx" --user-id "AUTH_USER_UUID" --dry-run
```

검증 후 로컬 셸에 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`를 잠시 설정하고 `--dry-run`을 제거합니다. 서비스 역할 키는 이 로컬 가져오기 작업에만 사용하고 `.env.local`, GitHub, Vercel에는 저장하지 않습니다.
