import { Body, Controller, HttpException, Post } from '@nestjs/common';
import { CreatePropertiesDto } from './dto/create-properties.dto';
import { PropertiesService } from './properties.service';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  async createProperties(
    @Body() createPropertiesInput: CreatePropertiesDto[],
  ): Promise<any> {
    const inputLength = createPropertiesInput.length;
    if (inputLength == 0 || inputLength > 5) {
      throw new HttpException('1개부터 5개끼지 등록하실 수 있습니다.', 400);
    }
    const result = await this.propertiesService.createProperties(
      createPropertiesInput,
    );
    if (result.ok) {
      return '입력해주신 타이어 정보를 저장했습니다. 이전에 같은 아이디와 타이어를 등록한 경우, 중복이라 간주하여 새로 저장하지 않습니다';
    }
    throw new HttpException(result.error, result.httpStatus);
  }
}
