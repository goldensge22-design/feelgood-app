(function(window){
'use strict';

/*
 * 개발자 연동 설정
 * - 공개 데모 기본값: 샘플 데이터
 * - 실사용 배포: dataMode를 'live'로 변경
 * - 서버 경로가 확정되면 endpoints만 변경하거나 endpointBuilder를 주입합니다.
 */
window.KPASS_DASHBOARD_CONFIG=Object.assign({
  dataMode:'sample',
  apiBase:'/api/v1/kpass',
  credentials:'include',
  requestTimeoutMs:15000,
  allowSampleFallback:false,
  endpoints:{
    homeroom:'/dashboard/classes/{classId}',
    school:'/dashboard/schools/{schoolId}',
    track:'/dashboard/departments/{departmentId}'
  }
},window.KPASS_DASHBOARD_CONFIG||{});
})(window);
