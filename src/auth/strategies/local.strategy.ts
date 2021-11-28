import { HttpException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { AuthUserDto } from '../dto/auth-user.dto';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'id' });
  }

  async validate(id: string, password: string): Promise<AuthUserDto> {
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
