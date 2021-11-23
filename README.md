# 프리온보딩 백엔드 과정 7번째

## 개요

### 1. 배경 및 공통 요구사항

**카닥에서 실제로 사용하는 프레임워크를 토대로 타이어 API를 설계 및 구현합니다.**

- 데이터베이스 환경은 별도로 제공하지 않습니다.
  **RDB중 원하는 방식을 선택**하면 되며, sqlite3 같은 별도의 설치없이 이용 가능한 in-memory DB도 좋으며, 가능하다면 Docker로 준비하셔도 됩니다.
- 단, 결과 제출 시 README.md 파일에 실행 방법을 완벽히 서술하여 DB를 포함하여 전체적인 서버를 구동하는데 문제없도록 해야합니다.
- 데이터베이스 관련처리는 raw query가 아닌 **ORM을 이용하여 구현**합니다.
- Response Codes API를 성공적으로 호출할 경우 200번 코드를 반환하고, 그 외의 경우에는 아래의 코드로 반환합니다.
  - 200 OK: 성공
  - 400 Bad Request: Parameter가 잘못된 (범위, 값 등)
  - 401 Unauthorized: 인증을 위한 Header가 잘못됨
  - 500 Internal Server Error: 기타 서버 에러

### 2. 사용자 생성 API

- ID/Password로 사용자를 생성하는 API.
- 인증 토큰을 발급하고 이후의 API는 인증된 사용자만 호출할 수 있습니다.

```jsx
/* Request Body 예제 */

 { "id": "candycandy", "password": "ASdfdsf3232@" }
```

### 3. 사용자가 소유한 타이어 정보를 저장하는 API

- 자동차 차종 ID(trimID)를 이용하여 사용자가 소유한 자동차 정보를 저장한다.
- 한 번에 최대 5명까지의 사용자에 대한 요청을 받습니다. 즉 사용자 정보와 trimId 5쌍을 요청데이터로 하여금 API를 호출할 수 있습니다.

```jsx
/* Request Body 예제 */
[
  {
    id: 'candycandy',
    trimId: 5000,
  },
  {
    id: 'mylovewolkswagen',
    trimId: 9000,
  },
  {
    id: 'bmwwow',
    trimId: 11000,
  },
  {
    id: 'dreamcar',
    trimId: 15000,
  },
];
```

**상세구현 가이드**

- 자동차 정보 조회 API의 사용은 아래와 같이 5000, 9000부분에 trimId를 넘겨서 조회할 수 있습니다.
  - [https://dev.mycar.cardoc.co.kr/v1/trim/5000](https://dev.mycar.cardoc.co.kr/v1/trim/5000)
  - [https://dev.mycar.cardoc.co.kr/v1/trim/9000](https://dev.mycar.cardoc.co.kr/v1/trim/9000)
  - [https://dev.mycar.cardoc.co.kr/v1/trim/11000](https://dev.mycar.cardoc.co.kr/v1/trim/11000)
  - [https://dev.mycar.cardoc.co.kr/v1/trim/15000](https://dev.mycar.cardoc.co.kr/v1/trim/15000)
- 조회된 정보에서 타이어 정보는 spec → driving → frontTire/rearTire 에서 찾을 수 있습니다.
- 타이어 정보는 205/75R18의 포맷이 정상이다. 205는 타이어 폭을 의미하고 75R은 편평비, 그리고 마지막 18은 휠사이즈로써 {폭}/{편평비}R{18}과 같은 구조입니다. 위와 같은 형식의 데이터일 경우만 DB에 항목별로 나누어 서로다른 Column에 저장합니다.

### 4. 사용자가 소유한 타이어 정보 조회 API

- 사용자 ID를 통해서 2번 API에서 저장한 타이어 정보를 조회할 수 있어야 합니다.

## 특이사항(메모)

타이어 정보 저장

trimid 를 요청하면 => 카닥 api 에서 타이어 정보를 불러오고 => 폭, 편평비, 휠사이즈를 각각 따로 저장.

요청은 로그인한 사용자가 하는 게 아닌듯. 최대 5명까지의 사용자 아이디를 보낼 수 있어야한다.
