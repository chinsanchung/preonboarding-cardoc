import axios from 'axios';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Connection, QueryRunner } from 'typeorm';
import { Property } from 'src/entities/property.entity';
import { Tire } from 'src/entities/tire.entity';
import { User } from 'src/entities/user.entity';
import { PropertiesService } from './properties.service';

jest.mock('axios');

const mockRepository = () => ({
  findAndCount: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
});

const qr = {
  manager: {},
} as QueryRunner;

class MockConnection {
  createQueryRunner(mode?: 'master' | 'slave'): QueryRunner {
    return qr;
  }
}

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('PropertiesService', () => {
  let service: PropertiesService;
  let propertiesRepository: MockRepository<Property>;
  let userRepository: MockRepository<User>;
  let tireRepository: MockRepository<Tire>;
  let connection: Connection;

  beforeEach(async () => {
    qr.connect = jest.fn();
    qr.startTransaction = jest.fn();
    qr.commitTransaction = jest.fn();
    qr.rollbackTransaction = jest.fn();
    qr.release = jest.fn();

    const module = await Test.createTestingModule({
      providers: [
        PropertiesService,
        { provide: getRepositoryToken(Property), useValue: mockRepository() },
        { provide: getRepositoryToken(User), useValue: mockRepository() },
        { provide: getRepositoryToken(Tire), useValue: mockRepository() },
        { provide: Connection, useClass: MockConnection },
      ],
    }).compile();

    service = module.get<PropertiesService>(PropertiesService);
    propertiesRepository = module.get(getRepositoryToken(Property));
    userRepository = module.get(getRepositoryToken(User));
    tireRepository = module.get(getRepositoryToken(Tire));
    connection = module.get<Connection>(Connection);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(propertiesRepository).toBeDefined();
    expect(userRepository).toBeDefined();
    expect(tireRepository).toBeDefined();
    expect(connection).toBeDefined();
  });

  const mockTireFromApi = {
    spec: {
      driving: {
        frontTire: {
          value: '205/75R18',
        },
      },
    },
  };
  const mockTireInfoFromString = {
    width: 205,
    aspect_ratio: 75,
    wheel_size: 18,
  };
  const mockUser = {
    idx: 1,
    id: 'testid',
    password: '123',
    created_at: new Date(),
    property: [],
    hashPassword: jest.fn(),
  };
  const mockTire = {
    idx: 1,
    width: 225,
    aspect_ratio: 60,
    wheel_size: 16,
  };
  const mockProperty = { user: mockUser, tire: mockTire };

  describe('getProperties', () => {
    it('실패: 일치하는 결과가 없습니다.', async () => {
      propertiesRepository.findAndCount.mockResolvedValue([[], 0]);
      const result = await service.getProperties({
        page: 1,
        limit: 5,
        user: mockUser,
      });

      expect(propertiesRepository.findAndCount).toHaveBeenCalledTimes(1);
      expect(propertiesRepository.findAndCount).toHaveBeenCalledWith(
        expect.any(Object),
      );
      expect(result).toEqual({ count: 0, data: [] });
    });

    it('성공: 소유주의 타이어 목록을 불러옵니다.', async () => {
      const mockProperties = [{ idx: 1, user: mockUser, tire: { idx: 1 } }];
      propertiesRepository.findAndCount.mockResolvedValue([mockProperties, 1]);

      const result = await service.getProperties({
        page: 1,
        limit: 5,
        user: mockUser,
      });

      expect(propertiesRepository.findAndCount).toHaveBeenCalledTimes(1);
      expect(propertiesRepository.findAndCount).toHaveBeenCalledWith(
        expect.any(Object),
      );
      expect(result).toEqual({ count: 1, data: mockProperties });
    });
  });

  describe('getProperty', () => {
    const getPropertyArgs = { id: 1, user: mockUser };
    it('실패: 일치하는 정보가 없습니다.', async () => {
      propertiesRepository.findOne.mockResolvedValue(undefined);

      const result = await service.getProperty(getPropertyArgs);

      expect(propertiesRepository.findOne).toHaveBeenCalledTimes(1);
      expect(propertiesRepository.findOne).toHaveBeenCalledWith({
        idx: getPropertyArgs.id,
        user: getPropertyArgs.user,
      });
      expect(result).toEqual({
        ok: false,
        httpStatus: 400,
        error: '일치하는 정보가 없습니다.',
      });
    });

    it('실패: 조회 과정에서 에러가 발생했습니다.', async () => {
      propertiesRepository.findOne.mockRejectedValue(new Error());

      const result = await service.getProperty(getPropertyArgs);

      expect(propertiesRepository.findOne).toHaveBeenCalledTimes(1);
      expect(propertiesRepository.findOne).toHaveBeenCalledWith({
        idx: getPropertyArgs.id,
        user: getPropertyArgs.user,
      });
      expect(result).toEqual({
        ok: false,
        httpStatus: 500,
        error: '조회 과정에서 에러가 발생했습니다.',
      });
    });

    it('성공: 소유주의 타이어 정보를 리턴합니다.', async () => {
      propertiesRepository.findOne.mockResolvedValue({
        idx: 1,
        tire: mockTire,
      });

      const result = await service.getProperty(getPropertyArgs);

      expect(propertiesRepository.findOne).toHaveBeenCalledTimes(1);
      expect(propertiesRepository.findOne).toHaveBeenCalledWith({
        idx: getPropertyArgs.id,
        user: getPropertyArgs.user,
      });
      expect(result).toEqual({
        ok: true,
        data: { idx: 1, tire: mockTire },
      });
    });
  });

  describe('checkAndReturnUserEntity', () => {
    it('실패: 계정이 존재하지 않습니다.', async () => {
      const ID = 'testid';
      const falseResult = {
        ok: false,
        httpStatus: 400,
        error: `${ID} 계정이 존재하지 않습니다.`,
      };
      jest
        .spyOn(service, 'checkAndReturnUserEntity')
        .mockResolvedValue(falseResult);

      const result = await service.checkAndReturnUserEntity(ID);

      expect(service.checkAndReturnUserEntity).toHaveBeenCalledTimes(1);
      expect(service.checkAndReturnUserEntity).toHaveBeenCalledWith(ID);
      expect(result).toEqual(falseResult);
    });

    it('성공: 계정이 존재합니다.', async () => {
      const ID = 'testid';
      jest
        .spyOn(service, 'checkAndReturnUserEntity')
        .mockResolvedValue({ ok: true, data: mockUser });

      const result = await service.checkAndReturnUserEntity(ID);

      expect(service.checkAndReturnUserEntity).toHaveBeenCalledTimes(1);
      expect(service.checkAndReturnUserEntity).toHaveBeenCalledWith(ID);
      expect(result).toEqual({ ok: true, data: mockUser });
    });
  });

  describe('extractTireInfoFromString', () => {
    it('성공: 타이어 정보를 리턴합니다.', () => {
      const TIRE_STRING = '205/75R18';
      jest
        .spyOn(service, 'extractTireInfoFromString')
        .mockReturnValue(mockTireInfoFromString);
      const result = service.extractTireInfoFromString(TIRE_STRING);
      expect(service.extractTireInfoFromString).toHaveBeenCalledTimes(1);
      expect(service.extractTireInfoFromString).toHaveBeenCalledWith(
        TIRE_STRING,
      );
      expect(result).toEqual(mockTireInfoFromString);
    });
  });

  describe('getTireInfoFromCarApi', () => {
    it('실패: 유효하지 않은 trimId 입니다.', async () => {
      const TRIM_ID = 99999;
      const falseResult = {
        ok: false,
        httpStatus: 400,
        error: `${TRIM_ID}은 유효하지 않은 trimId 입니다.`,
      };
      jest
        .spyOn(axios, 'get')
        .mockRejectedValue({ code: -1000, message: 'No value present' });
      jest
        .spyOn(service, 'getTireInfoFromCarApi')
        .mockResolvedValue(falseResult);

      const result = await service.getTireInfoFromCarApi(TRIM_ID);

      expect(service.getTireInfoFromCarApi).toHaveBeenCalledTimes(1);
      expect(service.getTireInfoFromCarApi).toHaveBeenCalledWith(TRIM_ID);
      expect(result).toEqual(falseResult);
    });

    it('성공: 자동차 정보를 리턴합니다.', async () => {
      const TRIM_ID = 5000;
      jest.spyOn(axios, 'get').mockResolvedValue(mockTireFromApi);
      jest
        .spyOn(service, 'extractTireInfoFromString')
        .mockReturnValue(mockTireInfoFromString);
      jest
        .spyOn(service, 'getTireInfoFromCarApi')
        .mockResolvedValue({ ok: true, data: mockTireInfoFromString });

      const result = await service.getTireInfoFromCarApi(TRIM_ID);
      expect(service.getTireInfoFromCarApi).toHaveBeenCalledTimes(1);
      expect(service.getTireInfoFromCarApi).toHaveBeenCalledWith(TRIM_ID);
      expect(result).toEqual({ ok: true, data: mockTireInfoFromString });
    });
  });

  describe('checkOrCreateAndReturnTireEntity', () => {
    it('실패: 타이어를 조회 또는 생성하는 과정에서 오류가 발생했습니다.', async () => {
      const falseResult = {
        ok: false,
        httpStatus: 500,
        error: '타이어를 조회 또는 생성하는 과정에서 오류가 발생했습니다.',
      };
      tireRepository.findOne.mockRejectedValue(new Error());
      jest
        .spyOn(service, 'checkOrCreateAndReturnTireEntity')
        .mockResolvedValue(falseResult);

      const result = await service.checkOrCreateAndReturnTireEntity(
        mockTireInfoFromString,
      );

      expect(service.checkOrCreateAndReturnTireEntity).toHaveBeenCalledTimes(1);
      expect(service.checkOrCreateAndReturnTireEntity).toHaveBeenCalledWith(
        mockTireInfoFromString,
      );
      expect(result).toEqual(falseResult);
    });

    it('성공: 타이어를 생성합니다.', async () => {
      tireRepository.findOne.mockResolvedValue(undefined);
      tireRepository.create.mockReturnValue(mockTire);
      tireRepository.save.mockResolvedValue(mockTire);
      jest
        .spyOn(service, 'checkOrCreateAndReturnTireEntity')
        .mockResolvedValue({ ok: true, data: mockTire });

      const result = await service.checkOrCreateAndReturnTireEntity(
        mockTireInfoFromString,
      );

      expect(service.checkOrCreateAndReturnTireEntity).toHaveBeenCalledTimes(1);
      expect(service.checkOrCreateAndReturnTireEntity).toHaveBeenCalledWith(
        mockTireInfoFromString,
      );
      expect(result).toEqual({ ok: true, data: mockTire });
    });

    it('성공: 존재하는 타이어를 리턴합니다.', async () => {
      tireRepository.findOne.mockResolvedValue(mockTire);
      jest
        .spyOn(service, 'checkOrCreateAndReturnTireEntity')
        .mockResolvedValue({ ok: true, data: mockTire });

      const result = await service.checkOrCreateAndReturnTireEntity(
        mockTireInfoFromString,
      );

      expect(service.checkOrCreateAndReturnTireEntity).toHaveBeenCalledTimes(1);
      expect(service.checkOrCreateAndReturnTireEntity).toHaveBeenCalledWith(
        mockTireInfoFromString,
      );
      expect(result).toEqual({ ok: true, data: mockTire });
    });
  });

  describe('checkOrCreatePropertyEntity', () => {
    it('기존의 property 가 존재합니다.', async () => {
      propertiesRepository.findOne.mockResolvedValue(mockProperty);
      jest.spyOn(service, 'checkOrCreatePropertyEntity').mockResolvedValue();

      await service.checkOrCreatePropertyEntity({
        user: mockUser,
        tire: mockTire,
      });

      expect(service.checkOrCreatePropertyEntity).toHaveBeenCalledTimes(1);
      expect(service.checkOrCreatePropertyEntity).toHaveBeenCalledWith({
        user: mockUser,
        tire: mockTire,
      });
    });

    it('새로운 property 를 생성합니다.', async () => {
      propertiesRepository.findOne.mockResolvedValue(undefined);
      propertiesRepository.create.mockReturnValue(mockProperty);
      propertiesRepository.save.mockResolvedValue(mockProperty);
      jest.spyOn(service, 'checkOrCreatePropertyEntity').mockResolvedValue();

      await service.checkOrCreatePropertyEntity({
        user: mockUser,
        tire: mockTire,
      });

      expect(service.checkOrCreatePropertyEntity).toHaveBeenCalledTimes(1);
      expect(service.checkOrCreatePropertyEntity).toHaveBeenCalledWith({
        user: mockUser,
        tire: mockTire,
      });
    });
  });

  describe('createProperties', () => {
    let queryRunner: QueryRunner;
    const createPropertiesArgs = [{ id: 'testid', trimId: 5000 }];

    beforeEach(() => {
      queryRunner = connection.createQueryRunner();
      jest.spyOn(queryRunner, 'connect').mockResolvedValueOnce(undefined);
      jest
        .spyOn(queryRunner, 'startTransaction')
        .mockResolvedValueOnce(undefined);
    });
    afterEach(() => {
      jest.spyOn(queryRunner, 'release').mockResolvedValue();
    });

    it('실패: 계정이 존재하지 않습니다.', async () => {
      const falseResult = {
        ok: false,
        httpStatus: 400,
        error: `${createPropertiesArgs[0].id} 계정이 존재하지 않습니다.`,
      };
      jest
        .spyOn(service, 'checkAndReturnUserEntity')
        .mockResolvedValue(falseResult);
      jest.spyOn(queryRunner, 'rollbackTransaction').mockResolvedValue();

      const result = await service.createProperties(createPropertiesArgs);

      expect(service.checkAndReturnUserEntity).toHaveBeenCalledTimes(1);
      expect(service.checkAndReturnUserEntity).toHaveBeenCalledWith(
        createPropertiesArgs[0].id,
      );
      expect(result).toEqual(falseResult);
    });

    it('실패: 유효하지 않은 trimId 입니다.', async () => {
      const falseResult = {
        ok: false,
        httpStatus: 400,
        error: `${createPropertiesArgs[0].trimId}은 유효하지 않은 trimId 입니다.`,
      };

      jest
        .spyOn(service, 'checkAndReturnUserEntity')
        .mockResolvedValue({ ok: true, data: mockUser });
      jest
        .spyOn(axios, 'get')
        .mockRejectedValue({ code: -1000, message: 'No value present' });
      jest
        .spyOn(service, 'getTireInfoFromCarApi')
        .mockResolvedValue(falseResult);
      jest.spyOn(queryRunner, 'rollbackTransaction').mockResolvedValue();

      const result = await service.createProperties(createPropertiesArgs);

      expect(service.checkAndReturnUserEntity).toHaveBeenCalledTimes(1);
      expect(service.checkAndReturnUserEntity).toHaveBeenCalledWith(
        createPropertiesArgs[0].id,
      );
      expect(service.getTireInfoFromCarApi).toHaveBeenCalledTimes(1);
      expect(service.getTireInfoFromCarApi).toHaveBeenCalledWith(
        createPropertiesArgs[0].trimId,
      );
      expect(result).toEqual(falseResult);
    });

    it('실패: 타이어를 조회 또는 생성하는 과정에서 오류가 발생했습니다.', async () => {
      const falseResult = {
        ok: false,
        httpStatus: 500,
        error: '타이어를 조회 또는 생성하는 과정에서 오류가 발생했습니다.',
      };

      jest
        .spyOn(service, 'checkAndReturnUserEntity')
        .mockResolvedValue({ ok: true, data: mockUser });
      jest.spyOn(axios, 'get').mockResolvedValue(mockTireFromApi);
      jest
        .spyOn(service, 'extractTireInfoFromString')
        .mockReturnValue(mockTireInfoFromString);
      jest
        .spyOn(service, 'getTireInfoFromCarApi')
        .mockResolvedValue({ ok: true, data: mockTireInfoFromString });

      jest
        .spyOn(service, 'checkOrCreateAndReturnTireEntity')
        .mockResolvedValue(falseResult);
      jest.spyOn(queryRunner, 'rollbackTransaction').mockResolvedValue();

      const result = await service.createProperties(createPropertiesArgs);

      expect(service.checkAndReturnUserEntity).toHaveBeenCalledTimes(1);
      expect(service.checkAndReturnUserEntity).toHaveBeenCalledWith(
        createPropertiesArgs[0].id,
      );
      expect(service.getTireInfoFromCarApi).toHaveBeenCalledTimes(1);
      expect(service.getTireInfoFromCarApi).toHaveBeenCalledWith(
        createPropertiesArgs[0].trimId,
      );
      expect(service.checkOrCreateAndReturnTireEntity).toHaveBeenCalledTimes(1);
      expect(service.checkOrCreateAndReturnTireEntity).toHaveBeenCalledWith(
        mockTireInfoFromString,
      );
      expect(result).toEqual(falseResult);
    });

    it('성공: 새로운 타이어 정보입니다. 소유주의 타이어를 등록합니다.', async () => {
      tireRepository.findOne.mockResolvedValue(undefined);
      tireRepository.create.mockReturnValue(mockTire);
      tireRepository.save.mockResolvedValue(mockTire);
      propertiesRepository.findOne.mockResolvedValue(undefined);
      propertiesRepository.create.mockReturnValue(mockProperty);
      propertiesRepository.save.mockResolvedValue(mockProperty);

      jest
        .spyOn(service, 'checkAndReturnUserEntity')
        .mockResolvedValue({ ok: true, data: mockUser });
      jest.spyOn(axios, 'get').mockResolvedValue(mockTireFromApi);
      jest
        .spyOn(service, 'extractTireInfoFromString')
        .mockReturnValue(mockTireInfoFromString);
      jest
        .spyOn(service, 'getTireInfoFromCarApi')
        .mockResolvedValue({ ok: true, data: mockTireInfoFromString });

      jest
        .spyOn(service, 'checkOrCreateAndReturnTireEntity')
        .mockResolvedValue({
          ok: true,
          data: mockTire,
        });
      jest
        .spyOn(service, 'checkOrCreatePropertyEntity')
        .mockResolvedValue(undefined);
      jest.spyOn(queryRunner, 'commitTransaction').mockResolvedValue();

      const result = await service.createProperties(createPropertiesArgs);
      expect(service.checkAndReturnUserEntity).toHaveBeenCalledTimes(1);
      expect(service.checkAndReturnUserEntity).toHaveBeenCalledWith(
        createPropertiesArgs[0].id,
      );
      expect(service.getTireInfoFromCarApi).toHaveBeenCalledTimes(1);
      expect(service.getTireInfoFromCarApi).toHaveBeenCalledWith(
        createPropertiesArgs[0].trimId,
      );
      expect(service.checkOrCreateAndReturnTireEntity).toHaveBeenCalledTimes(1);
      expect(service.checkOrCreateAndReturnTireEntity).toHaveBeenCalledWith(
        mockTireInfoFromString,
      );
      expect(service.checkOrCreatePropertyEntity).toHaveBeenCalledTimes(1);
      expect(service.checkOrCreatePropertyEntity).toHaveBeenCalledWith(
        mockProperty,
      );
      expect(result).toEqual({ ok: true, error: '', httpStatus: 200 });
    });
  });
});
