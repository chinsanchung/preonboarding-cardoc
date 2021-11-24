import { HttpException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'id' });
  }

  async validate(id: string, password: string) {
    const { ok, data, httpStatus, error } = await this.authService.validateUser(
      id,
      password,
    );
    if (!ok) {
      throw new HttpException(error, httpStatus);
    }
    return data;
  }
}
