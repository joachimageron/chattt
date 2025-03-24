import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserInput: CreateUserInput): Promise<User> {
    try {
      // Generate a salt
      const salt = await bcrypt.genSalt();

      // Hash the password with the salt
      const hashedPassword = await bcrypt.hash(createUserInput.password, salt);

      console.log('hashedPassword', hashedPassword);
      console.log('createUserInput', createUserInput);
      // Create a new user with the hashed password
      const user = this.usersRepository.create({
        ...createUserInput,
        password: hashedPassword,
      });

      // Save the user to the database
      return await this.usersRepository.save(user);
    } catch (error: unknown) {
      // Vérification si l'erreur est un objet
      if (typeof error === 'object' && error !== null) {
        // Utiliser une assertion de type avec une vérification de propriété
        const err = error as Record<string, any>;
        if ('code' in err && err.code === '23505') {
          throw new ConflictException('Email already exists');
        }
      }
      // Log l'erreur pour le débogage
      console.error('Error creating user:', error);
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: string): Promise<User> {
    return this.usersRepository.findOneOrFail({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  // Add a method to validate user password for authentication
  async validateUserPassword(
    email: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.findByEmail(email);

    if (user && (await this.comparePasswords(password, user.password))) {
      return user;
    }

    return null;
  }

  // Helper method to compare passwords
  private async comparePasswords(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async update(
    id: string,
    updateUserInput: UpdateUserInput,
    currentUserId: string,
  ): Promise<User> {
    try {
      // Vérifier que l'utilisateur existe
      const user = await this.findOne(id);

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // Vérifier que l'utilisateur courant est autorisé à modifier cet utilisateur
      if (id !== currentUserId) {
        throw new ForbiddenException('You can only update your own profile');
      }

      // Créer un objet qui ne contient que les propriétés non-undefined
      const updates: Partial<User> = {};

      if (updateUserInput.email !== undefined) {
        updates.email = updateUserInput.email;
      }

      if (updateUserInput.name !== undefined) {
        updates.name = updateUserInput.name;
      }

      // Si mise à jour du mot de passe, hasher le nouveau mot de passe
      if (updateUserInput.password !== undefined) {
        const salt = await bcrypt.genSalt();
        updates.password = await bcrypt.hash(updateUserInput.password, salt);
      }

      // Mise à jour des données de l'utilisateur en n'appliquant que les champs modifiés
      const updatedUser = await this.usersRepository.save({
        ...user,
        ...updates,
      });

      return updatedUser;
    } catch (error) {
      if (typeof error === 'object' && error !== null) {
        const err = error as Record<string, any>;
        if ('code' in err && err.code === '23505') {
          throw new ConflictException('Email already exists');
        }

        // Si c'est une exception déjà gérée, la renvoyer
        if (
          error instanceof NotFoundException ||
          error instanceof ForbiddenException
        ) {
          throw error;
        }
      }

      console.error('Error updating user:', error);
      throw new InternalServerErrorException('Failed to update user');
    }
  }
}
