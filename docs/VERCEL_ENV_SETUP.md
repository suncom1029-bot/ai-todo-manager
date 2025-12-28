# Vercel 환경 변수 설정 가이드

## 필수 환경 변수

Vercel 대시보드에서 다음 환경 변수를 설정해야 합니다:

### 1. Supabase 설정
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Anon/Public Key

### 2. Google Gemini API 설정
- `GOOGLE_GEMINI_API_KEY`: Google Gemini API 키

## 설정 방법

1. Vercel 대시보드 접속: https://vercel.com
2. 프로젝트 선택: `ai-todo-manager`
3. Settings → Environment Variables
4. 다음 변수들을 추가:

```
NEXT_PUBLIC_SUPABASE_URL=https://cvnpcqacpxcubvmyuwhh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_nhjy7NhirZ-3GS7P6smynA_Nu2mvmXJ
GOOGLE_GEMINI_API_KEY=AIzaSyA0FACsr7oqiBsJmpoJgqaALfEaXBHaayM
```

## 환경 변수 확인

환경 변수를 추가한 후:
1. **Redeploy** 버튼 클릭하여 재배포
2. 배포 완료 후 사이트 테스트

## 문제 해결

### 로그인 오류가 발생하는 경우
- 환경 변수가 올바르게 설정되었는지 확인
- 환경 변수 이름이 정확한지 확인 (대소문자 구분)
- 재배포가 완료되었는지 확인

### API 오류가 발생하는 경우
- `GOOGLE_GEMINI_API_KEY`가 올바르게 설정되었는지 확인
- API 키에 특수 문자가 포함되지 않았는지 확인

