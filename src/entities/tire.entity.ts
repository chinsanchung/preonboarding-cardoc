import { IsNumber, IsString } from 'class-validator';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Property } from './property.entity';

@Entity()
export class Tire {
  @PrimaryGeneratedColumn()
  idx: number;

  @Column()
  @IsNumber()
  width: number;

  @Column()
  @IsString()
  aspect_ratio: string;

  @Column()
  @IsNumber()
  wheel_size: number;

  @OneToMany((type) => Property, (property) => property.tire)
  property: Property;
}
