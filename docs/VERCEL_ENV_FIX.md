# Vercel 환경 변수 설정 오류 수정 가이드

## 발견된 문제

브라우저 콘솔 오류: `Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.`

## 원인

Vercel 환경 변수 값에 **변수 이름이 포함**되어 있습니다.

### 잘못된 설정 예시:
```
변수 이름: NEXT_PUBLIC_SUPABASE_URL
변수 값: NEXT_PUBLIC_SUPABASE_URL=https://cvnpcqacpxcubvmyuwhh.supabase.co
```

### 올바른 설정:
```
변수 이름: NEXT_PUBLIC_SUPABASE_URL
변수 값: https://cvnpcqacpxcubvmyuwhh.supabase.co
```

## 수정 방법

1. Vercel 대시보드 → Settings → Environment Variables
2. 각 환경 변수를 클릭하여 편집
3. **Value 필드에서 변수 이름 부분을 제거**하고 값만 남기기

### 올바른 환경 변수 값:

1. **NEXT_PUBLIC_SUPABASE_URL**
   - ❌ 잘못됨: `NEXT_PUBLIC_SUPABASE_URL=https://cvnpcqacpxcubvmyuwhh.supabase.co`
   - ✅ 올바름: `https://cvnpcqacpxcubvmyuwhh.supabase.co`

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - ❌ 잘못됨: `NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_nhjy7NhirZ-3GS7P6smynA_Nu2mvmXJ`
   - ✅ 올바름: `sb_publishable_nhjy7NhirZ-3GS7P6smynA_Nu2mvmXJ`

3. **GOOGLE_GEMINI_API_KEY**
   - ❌ 잘못됨: `GOOGLE_GEMINI_API_KEY=AIzaSyA0FACsr7oqiBsJmpoJgqaALfEaXBHaayM`
   - ✅ 올바름: `AIzaSyA0FACsr7oqiBsJmpoJgqaALfEaXBHaayM`

## 확인 방법

환경 변수를 수정한 후:
1. **Save** 버튼 클릭
2. **Redeploy** 버튼 클릭하여 재배포
3. 재배포 완료 후 (1-2분) 사이트 테스트

## 예상 결과

환경 변수를 올바르게 수정하면:
- ✅ 로그인이 정상적으로 작동
- ✅ Supabase 연결 성공
- ✅ 할 일 관리 기능 정상 작동
- ✅ AI 기능 정상 작동

