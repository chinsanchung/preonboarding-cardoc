import { Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Tire } from './tire.entity';
import { User } from './user.entity';

@Entity()
export class Property {
  @PrimaryGeneratedColumn()
  idx: number;

  @ManyToOne((type) => User, (user) => user.property)
  user: User;

  @ManyToOne((type) => Tire, (tire) => tire.property)
  tire: Tire;
}
