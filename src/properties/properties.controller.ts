import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Property } from '../entities/property.entity';
import { CreatePropertiesDto } from './dto/create-properties.dto';
import { GetPropertiesInput } from './dto/get-properties.dto';
import { PropertiesService } from './properties.service';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getProperties(
    @Request() req,
    @Query() query: GetPropertiesInput,
  ): Promise<{ count: number; data: Property[] }> {
    const limit = query?.limit ? Number(query.limit) : 5;
    return await this.propertiesService.getProperties({
      page: Number(query.page),
      limit,
      user: req.user,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:id')
  async getProperty(
    @Request() req,
    @Param('id') id: string,
  ): Promise<Property> {
    const result = await this.propertiesService.getProperty({
      id: Number(id),
      user: req.user,
    });
    if (result.ok) {
      return result.data;
    }
    throw new HttpException(result.error, result.httpStatus);
  }

  @Post()
  async createProperties(
    @Body() createPropertiesInput: CreatePropertiesDto[],
  ): Promise<string> {
    const inputLength = createPropertiesInput.length;
    if (inputLength == 0 || inputLength > 5) {
      throw new HttpException('1개부터 5개끼지 등록하실 수 있습니다.', 400);
    }
    const result = await this.propertiesService.createProperties(
      createPropertiesInput,
    );
    if (result.ok) {
      return '입력해주신 타이어 정보를 저장했습니다. 만일 동일한 아이디와 타이어로 등록했던 항목이 있을 경우, 중복이라 간주하여 새로 저장하지 않습니다';
    }
    throw new HttpException(result.error, result.httpStatus);
  }
}
