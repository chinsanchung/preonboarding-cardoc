import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';

const mockRepository = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
});

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: MockRepository<User>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository(),
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    const createUserArgs = {
      id: 'testid',
      password: '12345',
    };
    it('실패: 이미 존재하는 계정입니다.', async () => {
      usersRepository.findOne.mockResolvedValue({ idx: 1, id: 'testid' });
      const result = await service.createUser(createUserArgs);
      expect(result).toEqual({
        ok: false,
        httpStatus: 400,
        error: '이미 존재하는 아이디입니다.',
      });
    });

    it('실패: 조회 과정에서 에러가 발생했습니다.', async () => {
      usersRepository.findOne.mockRejectedValue(new Error(''));
      const result = await service.createUser(createUserArgs);
      expect(result).toEqual({
        ok: false,
        httpStatus: 500,
        error: '유저 생성에 에러가 발생했습니다.',
      });
    });

    it('성공: 유저 생성에 성공합니다.', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      usersRepository.create.mockReturnValue(createUserArgs);
      usersRepository.save.mockResolvedValue(createUserArgs);

      const result = await service.createUser(createUserArgs);

      expect(usersRepository.create).toHaveBeenCalledTimes(1);
      expect(usersRepository.create).toHaveBeenCalledWith(createUserArgs);
      expect(usersRepository.save).toHaveBeenCalledTimes(1);
      expect(usersRepository.save).toHaveBeenCalledWith(createUserArgs);

      expect(result).toEqual({ ok: true });
    });
  });
});
