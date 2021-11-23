import { Body, Controller, HttpException, Post } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async createUser(@Body() createUserInput: CreateUserDto): Promise<string> {
    const { ok, httpStatus, error } = await this.usersService.createUser(
      createUserInput,
    );
    if (ok) {
      return '유저를 생성했습니다.';
    }
    throw new HttpException(error, httpStatus);
  }
}
