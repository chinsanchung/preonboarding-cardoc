import { IsString, Length } from 'class-validator';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { InternalServerErrorException } from '@nestjs/common';
import { Property } from './property.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  idx: number;

  @Column()
  @IsString()
  @Length(5, 12)
  id: string;

  @Column()
  @IsString()
  @Length(5, 20)
  password: string;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @OneToMany((type) => Property, (property) => property.user)
  property: Property[];

  @BeforeInsert()
  async hashPassword(): Promise<void> {
    try {
      this.password = await bcrypt.hash(this.password, 10);
      return;
    } catch (error) {
      throw new InternalServerErrorException(
        '비밀번호 암호화에 오류가 발생했습니다.',
      );
    }
  }
}
