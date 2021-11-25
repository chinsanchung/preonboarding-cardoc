import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from '../entities/property.entity';
import { Tire } from '../entities/tire.entity';
import { User } from '../entities/user.entity';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';

@Module({
  imports: [TypeOrmModule.forFeature([Property, Tire, User])],
  controllers: [PropertiesController],
  providers: [PropertiesService],
})
export class PropertiesModule {}
