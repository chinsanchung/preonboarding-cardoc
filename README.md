# 프리온보딩 백엔드 과정 7번째

카닥에서 제공해주신 API 설계 과제입니다. 헤로쿠를 이용해 배포했으며, 주소는 []()입니다.

## 과제에 대한 안내

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

## 개발 환경

- 언어: TypeScript
- 데이터베이스: SQLite3
- 사용 도구: NestJs, axios, bcrypt, class-validator, passport, passport-jwt, passport-local, sqlite3, typeorm

## 데이터베이스 ERD

![카닥 API ERD](https://user-images.githubusercontent.com/33484830/143776318-0b1692bc-3fcf-4b7f-86c3-1c60f30e689f.PNG)

## 서버 구조 및 디자인 패턴

### 서버 구조

대략적인 서버의 구성은 아래와 같습니다.

1. 컨트롤러

컨트롤러는 클라이언트로부터 요청을 받습니다. 그에 필요한 정보들을 전달하며 서비스를 호출합니다.

2. 서비스

서비스에서는 비즈니스 로직을 수행합니다. TypeOrm 으로 레포지토리를 가져와 데이터베이스와의 연결을 주고받으며 요청에 맞게 작업을 진행합니다.

모든 서비스는 아래의 인터페이스 중에서 하나의 타입대로 값을 리턴합니다. 성공과 실패를 같은 타입으로 리턴한 이유는 우선 서비스의 예측 결과가 무엇일지를 쉽게 파악할 수 있는 점, 그리고 모든 실패에 대한 결과를 통제하는 데 있어서 `throw Error`보다 수월한 점이 있습니다.

```typescript
export interface IOutput {
  ok: boolean;
  httpStatus?: number;
  error?: string;
}

export interface IOutputWithData<DataType> extends IOutput {
  data?: DataType;
}
```

- 성공했을 때는 `ok: true` 를 리턴합니다. 만약 데이터가 존재한다면 `data: DataType`으로 데이터를 리턴합니다. 제네릭을 이용해 타입을 설정할 수 있습니다.
- 원하는 결과가 없을 때, 로그인 등 특정 로직을 실패했을 때, 에러가 발생했을 때는 `ok: false, httpStatus: http 상태 코드, error: "에러 메시지"`를 리턴합니다. 참고로 NestJs 에서는 `throw new InternalServerErrorException` 와 같이 곧바로 HTTP 에러 상태 코드를 응답으로 보내는 기능이 있습니다. 이것을 서비스에서 사용하지 않은 이유는 요청과 응답은 컨트롤러에서 관리하는 것이 옳다고 생각하기 때문입니다.

3. 컨트롤러

서비스에서 얻은 결과에서 `ok`값이 true 이면 요청에 맞는 응답을, false 이면 결과값에서 가져온 HTTP 에러 상태 코드와 에러 메시지를 응답으로 보냅니다.

### 디자인 페턴

NestJs 의 종속성 주입(Dependency Injection) 디자인 패턴을 기반으로 프로젝트를 제작했습니다.

## API 문서

포스트맨으로 작성한 [API 문서](https://documenter.getpostman.com/view/18317278/UVJcjwDA)에서 상세한 내용을 확인하실 수 있습니다.

## 실행 및 테스트 수행 방법

1. `git clone` 으로 프로젝트를 가져온 후, `npm install` 으로 필요한 패키지를 설치합니다.
2. 루트 디렉토리에 .env 파일을 생성하고, 임의의 문자열 값을 가진 JWT_SECRET_KEY 를 작성합니다.
3. `npm run start:dev`으로 로컬 환경에서 실행합니다.
4. POST `localhost:3000/users`으로 계정을 생성합니다. id 는 5 ~ 12 글자, password 는 5 ~ 20 글자까지만 작성하실 수 있습니다.
5. POST `localhost:3000/auth/login`으로 로그인을 수행하고, 토큰을 받습니다. 토큰의 유효 기간은 1일이며, 소유주의 특정 타이어를 조회하는 GET `localhost:3000/properties/아이디` API 에서 사용합니다.
6. POST `localhost:3000/properties`에서 카닥 API 를 이용해 특정 소유주의 타이어를 property 테이블에 저장합니다.

## 폴더 구조

```
├── Procfile
├── README.md
├── nest-cli.json
├── package-lock.json
├── package.json
├── src
│   ├── app.controller.ts
│   ├── app.module.ts
│   ├── app.service.ts
│   ├── auth
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   ├── auth.service.spec.ts
│   │   ├── auth.service.ts
│   │   ├── dto
│   │   │   └── auth-user.dto.ts
│   │   ├── guards
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── local-auth.guard.ts
│   │   └── strategies
│   │       ├── jwt.strategy.ts
│   │       └── local.strategy.ts
│   ├── common
│   │   └── interfaces
│   │       └── output.interface.ts
│   ├── entities
│   │   ├── property.entity.ts
│   │   ├── tire.entity.ts
│   │   └── user.entity.ts
│   ├── main.ts
│   ├── properties
│   │   ├── dto
│   │   │   ├── create-properties.dto.ts
│   │   │   ├── get-properties.dto.ts
│   │   │   └── tire-info.dto.ts
│   │   ├── properties.controller.ts
│   │   ├── properties.module.ts
│   │   ├── properties.service.spec.ts
│   │   └── properties.service.ts
│   └── users
│       ├── dto
│       │   └── create-user.dto.ts
│       ├── users.controller.ts
│       ├── users.module.ts
│       ├── users.service.spec.ts
│       └── users.service.ts
├── test
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── tsconfig.build.json
└── tsconfig.json
```
