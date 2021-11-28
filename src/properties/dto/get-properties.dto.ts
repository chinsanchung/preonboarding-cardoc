import { IsOptional, IsString } from 'class-validator';

export class GetPropertiesInput {
  @IsString()
  page: number;

  @IsString()
  @IsOptional()
  limit?: string;
}
