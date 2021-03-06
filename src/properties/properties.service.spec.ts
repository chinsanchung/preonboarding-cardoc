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
    it('??????: ???????????? ????????? ????????????.', async () => {
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

    it('??????: ???????????? ????????? ????????? ???????????????.', async () => {
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
    it('??????: ???????????? ????????? ????????????.', async () => {
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
        error: '???????????? ????????? ????????????.',
      });
    });

    it('??????: ?????? ???????????? ????????? ??????????????????.', async () => {
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
        error: '?????? ???????????? ????????? ??????????????????.',
      });
    });

    it('??????: ???????????? ????????? ????????? ???????????????.', async () => {
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
    it('??????: ????????? ???????????? ????????????.', async () => {
      const ID = 'testid';
      const falseResult = {
        ok: false,
        httpStatus: 400,
        error: `${ID} ????????? ???????????? ????????????.`,
      };
      jest
        .spyOn(service, 'checkAndReturnUserEntity')
        .mockResolvedValue(falseResult);

      const result = await service.checkAndReturnUserEntity(ID);

      expect(service.checkAndReturnUserEntity).toHaveBeenCalledTimes(1);
      expect(service.checkAndReturnUserEntity).toHaveBeenCalledWith(ID);
      expect(result).toEqual(falseResult);
    });

    it('??????: ????????? ???????????????.', async () => {
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
    it('??????: ????????? ????????? ???????????????.', () => {
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
    it('??????: ???????????? ?????? trimId ?????????.', async () => {
      const TRIM_ID = 99999;
      const falseResult = {
        ok: false,
        httpStatus: 400,
        error: `${TRIM_ID}??? ???????????? ?????? trimId ?????????.`,
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

    it('??????: ????????? ????????? ???????????????.', async () => {
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
    it('??????: ???????????? ?????? ?????? ???????????? ???????????? ????????? ??????????????????.', async () => {
      const falseResult = {
        ok: false,
        httpStatus: 500,
        error: '???????????? ?????? ?????? ???????????? ???????????? ????????? ??????????????????.',
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

    it('??????: ???????????? ???????????????.', async () => {
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

    it('??????: ???????????? ???????????? ???????????????.', async () => {
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
    it('????????? property ??? ???????????????.', async () => {
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

    it('????????? property ??? ???????????????.', async () => {
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

    it('??????: ????????? ???????????? ????????????.', async () => {
      const falseResult = {
        ok: false,
        httpStatus: 400,
        error: `${createPropertiesArgs[0].id} ????????? ???????????? ????????????.`,
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

    it('??????: ???????????? ?????? trimId ?????????.', async () => {
      const falseResult = {
        ok: false,
        httpStatus: 400,
        error: `${createPropertiesArgs[0].trimId}??? ???????????? ?????? trimId ?????????.`,
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

    it('??????: ???????????? ?????? ?????? ???????????? ???????????? ????????? ??????????????????.', async () => {
      const falseResult = {
        ok: false,
        httpStatus: 500,
        error: '???????????? ?????? ?????? ???????????? ???????????? ????????? ??????????????????.',
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

    it('??????: ????????? ????????? ???????????????. ???????????? ???????????? ???????????????.', async () => {
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
