import { IsNumber, IsString } from 'class-validator';

export class CreatePropertiesDto {
  @IsString()
  id: string;

  @IsNumber()
  trimId: number;
}
