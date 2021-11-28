import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';

jest.mock('bcrypt');

const mockUserRepository = () => ({
  findOne: jest.fn(),
});
const mockJwtService = () => ({
  sign: jest.fn(() => 'TOKEN'),
});

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let userRepository: MockRepository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository(),
        },
        {
          provide: JwtService,
          useValue: mockJwtService(),
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(jwtService).toBeDefined();
    expect(userRepository).toBeDefined();
  });

  describe('validateUser', () => {
    const mockUser = { idx: 1, id: 'testid', password: '12345' };

    it('실패: 유저가 존재하지 않습니다.', async () => {
      const validateArgs = { id: 'falseId', password: '12345' };
      userRepository.findOne.mockResolvedValue(undefined);
      const result = await service.validateUser(
        validateArgs.id,
        validateArgs.password,
      );
      expect(result).toEqual({
        ok: false,
        httpStatus: 400,
        error: '존재하지 않는 계정입니다.',
      });
    });

    it('실패: 비밀번호가 일치하지 않습니다.', async () => {
      const validateArgs = { id: 'testid', pass: '54321' };
      userRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(async () => false);

      const result = await service.validateUser(
        validateArgs.id,
        validateArgs.pass,
      );

      expect(bcrypt.compare).toHaveBeenCalled();
      expect(bcrypt.compare).toHaveBeenCalledWith(
        validateArgs.pass,
        mockUser.password,
      );
      expect(result).toEqual({
        ok: false,
        httpStatus: 400,
        error: '비밀번호가 일치하지 않습니다.',
      });
    });

    it('성공: 입력한 정보와 일치하는 유저가 있습니다.', async () => {
      const validateArgs = { id: 'testid', password: '12345' };
      userRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);

      const result = await service.validateUser(
        validateArgs.id,
        validateArgs.password,
      );

      expect(bcrypt.compare).toHaveBeenCalled();
      expect(bcrypt.compare).toHaveBeenCalledWith(
        validateArgs.password,
        mockUser.password,
      );

      expect(result).toEqual({ ok: true, data: { idx: 1, id: 'testid' } });
    });
  });

  describe('login', () => {
    it('성공: 토큰을 발급합니다.', async () => {
      const mockUser = { idx: 1, id: 'testid' };
      const result = service.login(mockUser);

      expect(jwtService.sign).toHaveBeenCalledTimes(1);
      expect(jwtService.sign).toHaveBeenCalledWith(mockUser);

      expect(result).toEqual({ access_token: 'TOKEN' });
    });
  });
});
