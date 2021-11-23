import { IsString, Max } from 'class-validator';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import bcrypt from 'bcrypt';
import { InternalServerErrorException } from '@nestjs/common';
import { Property } from './property.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @IsString()
  @Max(12)
  user_id: string;

  @Column()
  @IsString()
  @Max(20)
  password: string;

  @CreateDateColumn({ type: 'datetime' })
  created_at: string;

  @OneToMany((type) => Property, (property) => property.user)
  property: Property[];

  @BeforeInsert()
  async hashPassword(): Promise<void> {
    try {
      this.password = await bcrypt.hash(this.password, 10);
      return;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }
}
