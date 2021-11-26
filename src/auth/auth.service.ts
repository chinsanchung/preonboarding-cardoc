import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { IOutputWithData } from '../common/interfaces/output.interface';
import { AuthUserDto } from './dto/auth-user.dto';
import { Repository } from 'typeorm';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    id: string,
    pass: string,
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
