# 프리온보딩 백엔드 과정 7번째 과제: 카닥

[카닥](https://www.cardoc.co.kr/)에서 제공해주신 API 설계 과제입니다. 헤로쿠를 이용해 배포했으며, 주소는 [https://preonboarding-cardoc-api.herokuapp.com](https://preonboarding-cardoc-api.herokuapp.com)입니다.

## 과제에 대한 안내

카닥에서 실제로 사용하는 프레임워크를 토대로 타이어 API를 설계 및 구현합니다.

### 1. 필수 요구 사항

- 사용자 생성 API

  - ID/Password로 사용자를 생성하는 API.
  - 인증 토큰을 발급하고 이후의 API는 인증된 사용자만 호출할 수 있습니다.

  ```jsx
  /* Request Body 예제 */

  { "id": "candycandy", "password": "ASdfdsf3232@" }
  ```

- 사용자가 소유한 타이어 정보를 저장하는 API
  - 자동차 차종 ID(trimID)를 이용하여 사용자가 소유한 자동차 정보를 저장한다.
  - 한 번에 최대 5명까지의 사용자에 대한 요청을 받습니다. 즉 사용자 정보와 trimId 5쌍을 요청데이터로 하여금 API를 호출할 수 있습니다.
  - 자동차 정보 조회 API의 사용은 5000부분에 trimId를 넘겨서 조회할 수 있습니다. 예: [https://dev.mycar.cardoc.co.kr/v1/trim/5000](https://dev.mycar.cardoc.co.kr/v1/trim/5000)
    - 조회된 정보에서 타이어 정보는 spec → driving → frontTire/rearTire 에서 찾을 수 있습니다.
    - 타이어 정보는 205/75R18의 포맷이 정상입니다. 205는 타이어 폭을 의미하고 75R은 편평비, 그리고 마지막 18은 휠사이즈로써 {폭}/{편평비}R{18}과 같은 구조입니다. 위와 같은 형식의 데이터일 경우만 DB에 항목별로 나누어 서로다른 Column에 저장합니다.
- 사용자가 소유한 타이어 정보 조회 API
  - 사용자 ID를 통해서 2번 API에서 저장한 타이어 정보를 조회할 수 있어야 합니다.

### 2. 개발 요구 사항

- 데이터베이스 환경은 별도로 제공하지 않습니다.
  **RDB중 원하는 방식을 선택**하면 되며, sqlite3 같은 별도의 설치없이 이용 가능한 in-memory DB도 좋으며, 가능하다면 Docker로 준비하셔도 됩니다.
- 단, 결과 제출 시 README.md 파일에 실행 방법을 완벽히 서술하여 DB를 포함하여 전체적인 서버를 구동하는데 문제없도록 해야합니다.
- 데이터베이스 관련처리는 raw query가 아닌 **ORM을 이용하여 구현**합니다.
- Response Codes API를 성공적으로 호출할 경우 200번 코드를 반환하고, 그 외의 경우에는 아래의 코드로 반환합니다.
  - 200 OK: 성공
  - 400 Bad Request: Parameter가 잘못된 (범위, 값 등)
  - 401 Unauthorized: 인증을 위한 Header가 잘못됨
  - 500 Internal Server Error: 기타 서버 에러

---

## 개발 환경

- 언어: TypeScript
- 데이터베이스: SQLite3
- 사용 도구: NestJs, axios, bcrypt, class-validator, passport, passport-jwt, passport-local, sqlite3, typeorm

---

## 데이터베이스 ERD

![카닥 API ERD](https://user-images.githubusercontent.com/33484830/143776318-0b1692bc-3fcf-4b7f-86c3-1c60f30e689f.PNG)

---

## 서버 구조 및 디자인 패턴

### 서버 구조 및 절차

| 이름       | 기능                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| auth       | 로그인과 로그인 인증을 수행합니다.                                                                     |
| properties | 사용자의 타이어 목록 조회, 특정 타이어 조회, 자동차 정보에서 타이어 정보를 저장하는 기능을 수행합니다. |
| users      | 회원 가입을 수행합니다.                                                                                |

각 API 마다 컨트롤러, 서비스를 가집니다. 컨트롤러에서 요청을 받아 서비스로 보내 로직을 수행하고, 다시 컨트롤러로 돌아와 요청에 따른 응답을 전달합니다.

#### 1. 컨트롤러

컨트롤러는 클라이언트로부터 요청을 받습니다. 그에 필요한 정보들을 전달하며 서비스를 호출합니다.

#### 2. 서비스

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

#### 3. 컨트롤러

서비스에서 얻은 결과에서 `ok`값이 true 이면 요청에 맞는 응답을, false 이면 결과값에서 가져온 HTTP 에러 상태 코드와 에러 메시지를 응답으로 보냅니다.

### 디자인 페턴

NestJs 의 종속성 주입(Dependency Injection) 디자인 패턴을 기반으로 프로젝트를 제작했습니다.

#### 종속성 주입(Dependency Injection)

[stack overflow 의 "What is dependency injection?"](https://stackoverflow.com/a/130862), [NestJs 공식 문서](https://docs.nestjs.kr), [위키 백과](https://url.kr/tp6v7z)를 참고했습니다.

- 종속성을 객체나 프레임워크에 주입합니다. 주입한 항목을 클래스의 생성자를 통해 불러올 수 있습니다.
- 장점
  - 객체의 생성과 사용의 관심을 분리하여 가독성과 코드 재사용을 높입니다.
  - 모의 객체를 이용해 단위 테스트를 편리하게 수행할 수 있습니다.
- NestJs 의 컨트롤러는 HTTP 요청을 처리하고 더 복잡한 작업을 서비스, 리포지토리같은 프로바이더에게 위임하고 있습니다.

---

## API 문서

포스트맨으로 작성한 [API 문서](https://documenter.getpostman.com/view/18317278/UVJcjwDA)에서 상세한 내용을 확인하실 수 있습니다.

---

## 실행 및 테스트 수행 방법

1. `git clone` 으로 프로젝트를 가져온 후, `npm install` 으로 필요한 패키지를 설치합니다.
2. 루트 디렉토리에 .env 파일을 생성하고, 임의의 문자열 값을 가진 JWT_SECRET_KEY 를 작성합니다.
3. `npm run start:dev`으로 로컬 환경에서 실행합니다.
4. POST `localhost:3000/users`으로 계정을 생성합니다. id 는 5 ~ 12 글자, password 는 5 ~ 20 글자까지만 작성하실 수 있습니다.
5. POST `localhost:3000/auth/login`으로 로그인을 수행하고, 토큰을 받습니다. 토큰의 유효 기간은 1일이며, 소유주의 특정 타이어를 조회하는 GET `localhost:3000/properties/아이디` API 에서 사용합니다.
6. POST `localhost:3000/properties`에서 카닥 API 를 이용해 특정 소유주의 타이어를 property 테이블에 저장합니다.

---

## 수행한 작업

### 회원 가입

[유저 서비스](https://github.com/chinsanchung/preonboarding-cardoc/blob/main/src/users/users.service.ts)의 메소드 `createUser`입니다. 아이디의 중복을 확인한 후, 유저를 생성합니다.

```typescript
export class UsersService {
  async createUser({ id, password }: CreateUserDto): Promise<IOutput> {
    try {
      // 1. 아이디 중복 체크
      const existUser = await this.users.findOne({ id });
      if (existUser) {
        return {
          ok: false,
          httpStatus: 400,
          error: '이미 존재하는 아이디입니다.',
        };
      }
      // 2. 유저 생성
      await this.users.save(this.users.create({ id, password }));
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        httpStatus: 500,
        error: '유저 생성에 에러가 발생했습니다.',
      };
    }
  }
}
```

유저를 데이터베이스에 생성하기 전에 [유저 엔티티](https://github.com/chinsanchung/preonboarding-cardoc/blob/main/src/entities/user.entity.ts) `@BeforeInsert()` 데코레이터로 비밀번호를 암호화합니다.

```typescript
export class User {
  // ...
  @BeforeInsert()
  async hashPassword(): Promise<void> {
    try {
      this.password = await bcrypt.hash(this.password, 10);
      return;
    } catch (error) {
      throw new InternalServerErrorException(
        '비밀번호 암호화에 오류가 발생했습니다.'
      );
    }
  }
}
```

### 로그인, 로그인 인증

#### 로그인

passport, passport-local 를 이용해 로그인을 위해 로컬 전략이 담긴 `LocalAuthGuard` 데코레이터를 만들어 [유저 컨트롤러](https://github.com/chinsanchung/preonboarding-cardoc/blob/main/src/users/users.controller.ts)의 login 메소드에 붙입니다.

```typescript
export class AuthController {
  // ...
  @UseGuards(LocalAuthGuard)
  @Post('/login')
  login(@Request() req): { access_token: string } {
    return this.authService.login(req.user);
  }
}
```

[로컬 전략](https://github.com/chinsanchung/preonboarding-cardoc/blob/main/src/auth/strategies/local.strategy.ts)에서 유저 서비스의 `validateUser`메소드로 아이디와 비밀번호를 검증하고, 검증이 성공하면 [auth 서비스](https://github.com/chinsanchung/preonboarding-cardoc/blob/main/src/auth/auth.service.ts)의 `login` 메소드로 JWT 토큰을 발급해 응답으로 보냅니다.

```typescript
// local.strategy.ts
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'id' });
  }

  async validate(id: string, password: string): Promise<AuthUserDto> {
    const { ok, data, httpStatus, error } = await this.authService.validateUser(
      id,
      password
    );
    if (!ok) {
      throw new HttpException(error, httpStatus);
    }
    return data;
  }
}
```

```typescript
export class AuthService {
  async validateUser(
    id: string,
    pass: string
  ): Promise<IOutputWithData<AuthUserDto>> {
    const user = await this.users.findOne({ id });
    if (user) {
      const isCorrectPassword = await bcrypt.compare(pass, user.password);
      if (isCorrectPassword) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, property, created_at, ...result } = user;
        return { ok: true, data: result };
      }
      return {
        ok: false,
        httpStatus: 400,
        error: '비밀번호가 일치하지 않습니다.',
      };
    }
    return {
      ok: false,
      httpStatus: 400,
      error: '존재하지 않는 계정입니다.',
    };
  }
  login(user: AuthUserDto): { access_token: string } {
    return { access_token: this.jwtService.sign(user) };
  }
}
```

#### 로그인 인증

passport-jwt 를 이용해 [JWT 전략](https://github.com/chinsanchung/preonboarding-cardoc/blob/main/src/auth/strategies/jwt.strategy.ts)이 담긴 `JwtAuthGuard` 데코레이터를 만듭니다.

```typescript
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET_KEY'),
    });
  }

  async validate(payload: AuthUserDto): Promise<AuthUserDto> {
    return payload;
  }
}
```

데코레이터에서 JWT 토큰의 검증이 완료되면 `validate` 메소드를 이용해 `id`, `idx`가 담긴 payload를 `Request` 객체에 추가합니다. 즉, `req.user`을 이용해 로그인한 유저의 `id`, `idx`를 가져올 수 있습니다.

### 카닥 API 로부터 타이어 정보를 저장하기

우선 [properties 컨트롤러](https://github.com/chinsanchung/preonboarding-cardoc/blob/main/src/properties/properties.controller.ts)에서 요청이 1 ~ 5개 사이인지 검증하고, 요청 값을 [properties 서비스](https://github.com/chinsanchung/preonboarding-cardoc/blob/main/src/properties/properties.service.ts)의 `createProperties` 메소드로 전달합니다.

```typescript
const inputLength = createPropertiesInput.length;
if (inputLength == 0 || inputLength > 5) {
  throw new HttpException('1개부터 5개끼지 등록하실 수 있습니다.', 400);
}
const result = await this.propertiesService.createProperties(
  createPropertiesInput
);
```

`createProperties` 메소드는 타이어를 등록하는 과정에서 에러가 하나라도 발생하면 그동안의 진행 상황을 취소하는 트랜잭션을 이용합니다.

```typescript
async function createProperties(
  createPropertiesInput: CreatePropertiesDto[]
): Promise<IOutput> {
  // 결과값을 저장하고 finally 에서 활용합니다.
  let ok = false;
  let httpStatus = 200;
  let error = '';
  // 이미 조회한 항목은 다시 조회하지 않기 위해 사용합니다.
  const userEntities = {};
  const tireEntites = {};
  const entireTireInfo = {};
  const queryRunner = this.connection.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 최대 5개까지의 요청 값을 반복문으로 실행합니다.
    for (let i = 0; i < createPropertiesInput.length; i++) {
      // 1. 유저 아이디 검증
      // 2. 카닥 API 에서 차량 데이터 조회
      // 3. 타이어 생성 또는 조회
    }
    ok = true;
    await queryRunner.commitTransaction();
  } catch (err) {
    await queryRunner.rollbackTransaction();
  } finally {
    await queryRunner.release();
    return { ok, httpStatus, error };
  }
}
```

- `userEntities`, `entireTireInfo` 객체는 한 번 조회했던 정보를 저장해서 같은 과정을 반복하지 않기 위해 사용합니다. 프로그래머스의 [nodeJS 백엔드 과정](https://programmers.co.kr/learn/courses/12887) 강의에서 얻은 아이디어로, 데이터베이스에서 무언가를 읽는 행위 하나에 비용이 발생하기 떄문에 캐시로 저장해서 데이터를 조회하는 기능을 최소화하려는 의도로 작성한 기능입니다.

이제 트랜잭션의 과정을 하나씩 살펴봅니다.

1. 유저 아이디를 검증합니다. 하나라도 에러가 있으면 에러를 보내서 트랜잭션을 종료합니다. `userEntities`에 유저 정보를 저장해서 한 번 확인한 아이디는 다시 확인하지 않습니다.

```typescript
const { id, trimId } = createPropertiesInput[i];
if (!userEntities[id]) {
  const checkUserEntity = await this.checkAndReturnUserEntity(id);
  if (!checkUserEntity.ok) {
    httpStatus = checkUserEntity.httpStatus;
    error = checkUserEntity.error;
    throw new Error();
  }
  Object.assign(userEntities, { [`${id}`]: checkUserEntity.data });
}
// ...
```

2. 카닥 API 에서 차에 대한 정보를 불러옵니다. trimId 결과를 entireTireInfo에 저장하여 같은 trimId 로 API 를 호출하는 것을 방지합니다.

```typescript
if (!entireTireInfo[trimId]) {
  const carInfo = await this.getTireInfoFromCarApi(trimId);
  // * 유효한 trimid 로 불러온 것인지 확인합니다.
  if (!carInfo.ok) {
    httpStatus = carInfo.httpStatus;
    error = carInfo.error;
    throw new Error();
  }
  Object.assign(entireTireInfo, { [`${trimId}`]: carInfo.data });
}
```

3. 타이어에 저장한 것인지 확인하고, 저장하지 않으면 타이어 생성을, 저장했으면 타이어 데이터를 불러옵니다.

```typescript
const checkTireEntity = await this.checkOrCreateAndReturnTireEntity(
  entireTireInfo[`${trimId}`]
);
if (!checkTireEntity.ok) {
  httpStatus = checkTireEntity.httpStatus;
  error = checkTireEntity.error;
  throw new Error();
}
Object.assign(tireEntites, { [`${id}`]: checkTireEntity.data });
```

4. 마지막으로 properties 테이블에 유저의 아이디, 타이어 아이디를 저장합니다. 아이디와 타이어 정보가 데이터베이스에 있을 경우, 중복이라 간주하여 다시 등록하지 않습니다.

```typescript
await this.checkOrCreatePropertyEntity({
  user: userEntities[`${id}`],
  tire: tireEntites[`${id}`],
});
```

### 사용자의 타이어 조회하기

타이어의 목록과 특정 타이어를 조회합니다.

```typescript
export class PropertiesService {
  async getProperties({
    page,
    limit,
    user,
  }: {
    page: number;
    limit: number;
    user: User;
  }): Promise<{ count: number; data: Property[] }> {
    const result = await this.properties.findAndCount({
      where: { user },
      take: limit,
      skip: (page - 1) * limit,
    });
    return {
      count: result[1],
      data: result[0],
    };
  }

  async getProperty({
    id,
    user,
  }: {
    id: number;
    user: User;
  }): Promise<IOutputWithData<Property>> {
    try {
      const result = await this.properties.findOne({ idx: id, user });
      if (result) {
        return { ok: true, data: result };
      }
      return { ok: false, httpStatus: 400, error: '일치하는 정보가 없습니다.' };
    } catch (error) {
      return {
        ok: false,
        httpStatus: 500,
        error: '조회 과정에서 에러가 발생했습니다.',
      };
    }
  }
}
```

---

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
