import { PickType } from '@nestjs/mapped-types';
import { Tire } from '../../entities/tire.entity';

export class TireInfoDto extends PickType(Tire, [
  'width',
  'aspect_ratio',
  'wheel_size',
]) {}
