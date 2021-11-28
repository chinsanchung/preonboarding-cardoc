import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return "원티드 프리온보딩 백엔드 코스의 7번째 과제 '카닥 API'의 메인 페이지입니다. 자세한 안내는 https://github.com/chinsanchung/preonboarding_cardoc 레포지토리에서 얻으실 수 있습니다.";
  }
}
