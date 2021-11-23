import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IOutput } from '../common/interfaces/output.interface';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async createUser({
    user_id,
    password,
  }: CreateUserDto): Promise<IOutput<null>> {
    try {
      // 1. 아이디 중복 체크
      const existUser = await this.users.findOne({ user_id });
      if (existUser) {
        return {
          ok: false,
          httpStatus: 400,
          error: '이미 존재하는 아이디입니다.',
        };
      }
      // 2. 유저 생성
      await this.users.save(this.users.create({ user_id, password }));
      return { ok: true };
    } catch (e) {
      console.log('ERR:', e);
      return {
        ok: false,
        httpStatus: 500,
        error: '유저 생성에 에러가 발생했습니다.',
      };
    }
  }
}
