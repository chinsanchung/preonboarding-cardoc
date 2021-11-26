import { PickType } from '@nestjs/mapped-types';
import { User } from '../../entities/user.entity';

export class AuthUserDto extends PickType(User, ['idx', 'id']) {}
