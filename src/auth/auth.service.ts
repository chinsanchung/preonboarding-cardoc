import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { IOutputWithData } from '../common/interfaces/output.interface';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    id: string,
    pass: string,
  ): Promise<IOutputWithData<{ idx: number; id: string }>> {
    const user = await this.usersService.findOne(id);
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

  async login(user: { idx: number; id: string }) {
    return { access_token: this.jwtService.sign(user) };
  }
}
