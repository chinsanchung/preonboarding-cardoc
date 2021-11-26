import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import { Tire } from '../entities/tire.entity';
import { Property } from '../entities/property.entity';
import { User } from '../entities/user.entity';
import { CreatePropertiesDto } from './dto/create-properties.dto';
import {
  IOutput,
  IOutputWithData,
} from '../common/interfaces/output.interface';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property)
    private readonly properties: Repository<Property>,
    @InjectRepository(Tire)
    private readonly tires: Repository<Tire>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private connection: Connection,
  ) {}

  async getProperties({
    page,
    limit,
    user,
  }: {
    page: number;
    limit: number;
    user: User;
  }): Promise<{ count: number; data: Property[] }> {
    const result = await this.properties.findAndCount({
      where: { user },
      take: limit,
      skip: (page - 1) * limit,
    });
    return {
      count: result[1],
      data: result[0],
    };
  }

  async getProperty({
    id,
    user,
  }: {
    id: number;
    user: User;
  }): Promise<IOutputWithData<Property>> {
    try {
      const result = await this.properties.findOne({ idx: id, user });
      if (result) {
        return { ok: true, data: result };
      }
      return { ok: false, httpStatus: 400, error: '일치하는 정보가 없습니다.' };
    } catch (error) {
      console.log(error);
      return {
        ok: false,
        httpStatus: 500,
        error: '조회 과정에서 에러가 발생했습니다.',
      };
    }
  }

  private async checkAndReturnUser(id: string): Promise<IOutputWithData<User>> {
    try {
      const existUser = await this.users.findOne({ id });
      if (existUser) {
        return { ok: true, data: existUser };
      }
      return {
        ok: false,
        httpStatus: 400,
        error: `${id} 계정이 존재하지 않습니다.`,
      };
    } catch (error) {
      return {
        ok: false,
        httpStatus: 500,
        error: '유저 조회에 에러가 발생했습니다.',
      };
    }
  }

  private extractTireInfoFromString(tireString: string): {
    width: number;
    aspect_ratio: number;
    wheel_size: number;
  } {
    // 출처: https://stackoverflow.com/a/42828284
    const [width, aspectRatio, wheelSize] = tireString.match(/\d+/g);
    return {
      width: Number(width),
      aspect_ratio: Number(aspectRatio),
      wheel_size: Number(wheelSize),
    };
  }
  private async getTireInfoFromCarApi(
    trimId: number,
  ): Promise<
    IOutputWithData<{ width: number; aspect_ratio: number; wheel_size: number }>
  > {
    try {
      const response = await axios.get(
        `https://dev.mycar.cardoc.co.kr/v1/trim/${trimId}`,
      );
      const tireInfo = this.extractTireInfoFromString(
        response.data.spec?.driving?.frontTire?.value,
      );
      return {
        ok: true,
        data: tireInfo,
      };
    } catch (err) {
      return {
        ok: false,
        httpStatus: 400,
        error: `${trimId}은 유효하지 않은 trimId 입니다.`,
      };
    }
  }

  private async checkOrCreateTireEntity(tireInfo: {
    width: number;
    aspect_ratio: number;
    wheel_size: number;
  }): Promise<Tire> {
    const existTire = await this.tires.findOne(tireInfo);
    if (!existTire) {
      return await this.tires.save(this.tires.create(tireInfo));
    }
    return existTire;
  }

  private async checkOrCreatePropertyEntity({
    user,
    tire,
  }: {
    user: User;
    tire: Tire;
  }): Promise<void> {
    const existProperty = await this.properties.findOne({ user, tire });
    if (!existProperty) {
      await this.properties.save(this.properties.create({ user, tire }));
    }
    return;
  }

  async createProperties(
    createPropertiesInput: CreatePropertiesDto[],
  ): Promise<IOutput> {
    // 결과값을 저장하고 finally 에서 활용합니다.
    let ok = false;
    let httpStatus = 500;
    let error = '';
    // 이미 조회한 항목은 다시 조회하지 않기 위해 사용합니다.
    const userEntities = {};
    const tireEntites = {};
    const entireTireInfo = {};

    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (let i = 0; i < createPropertiesInput.length; i++) {
        const { id, trimId } = createPropertiesInput[i];
        // * 유효한 유저 아이디인지 확인합니다. 한 번 확인한 아이디는 다시 확인하지 않습니다.
        if (!userEntities[id]) {
          const checkUserExistence = await this.checkAndReturnUser(id);
          if (!checkUserExistence.ok) {
            httpStatus = checkUserExistence.httpStatus;
            error = checkUserExistence.error;
            throw new Error();
          }
          Object.assign(userEntities, { [`${id}`]: checkUserExistence.data });
        }

        // * 카닥 API 에서 차에 대한 정보를 불러옵니다. trimId 결과를 entireTireInfo에 저장하여 같은 trimId 로 API 를 호출하는 것을 방지합니다.
        if (!entireTireInfo[trimId]) {
          const carInfo = await this.getTireInfoFromCarApi(trimId);
          // * 유효한 trimid 로 불러온 것인지 확인합니다.
          if (!carInfo.ok) {
            httpStatus = carInfo.httpStatus;
            error = carInfo.error;
            throw new Error();
          }
          Object.assign(entireTireInfo, { [`${trimId}`]: carInfo.data });
        }

        // * 타이어에 저장한 것인지 확인하고, 저장하지 않으면 타이어 생성을, 저장했으면 타이어 데이터를 불러옵니다.
        const tire = await this.checkOrCreateTireEntity(
          entireTireInfo[`${trimId}`],
        );
        Object.assign(tireEntites, { [`${id}`]: tire });

        // * 프로퍼티에 유저 아이디와 타이어 아이디를 저장합니다. 이전에 같은 아이디와 타이어를 등록한 경우, 중복이라 간주하여 새로 저장하지 않습니다.
        await this.checkOrCreatePropertyEntity({
          user: userEntities[`${id}`],
          tire: tireEntites[`${id}`],
        });
      }

      ok = true;

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
      return { ok, httpStatus, error };
    }
  }
}
