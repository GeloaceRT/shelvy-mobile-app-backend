import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import config from '../config';
import prisma from '../database/prisma';

type UserRecord = {
    id: number;
    username: string;
    password: string;
};

const usePrisma = process.env.USE_PRISMA === 'true';

const mockUsers: UserRecord[] = [
    {
        id: 1,
        username: 'demo@example.com',
        password: bcrypt.hashSync('demo123', 10),
    },
];

let mockNextId = mockUsers.length + 1;

class AuthService {
    async registerUser(identifier: string, password: string): Promise<UserRecord> {
        const normalizedIdentifier = identifier.trim().toLowerCase();
        const hashedPassword = await bcrypt.hash(password, 10);
        if (!usePrisma) {
            const existing = mockUsers.find(
                (user) => user.username.toLowerCase() === normalizedIdentifier,
            );
            if (existing) {
                throw new Error('Username already exists.');
            }

            const newUser: UserRecord = {
                id: mockNextId++,
                username: normalizedIdentifier,
                password: hashedPassword,
            };
            mockUsers.push(newUser);
            return newUser;
        }

        return prisma.user.create({
            data: {
                username: normalizedIdentifier,
                password: hashedPassword,
            },
        });
    }

    async validateUser(identifier: string, password: string): Promise<UserRecord | null> {
        const normalizedIdentifier = identifier.trim().toLowerCase();
        if (!usePrisma) {
            const user = mockUsers.find(
                (item) => item.username.toLowerCase() === normalizedIdentifier,
            );
            if (!user) {
                return null;
            }

            const isMatch = await bcrypt.compare(password, user.password);
            return isMatch ? user : null;
        }

        const user = await prisma.user.findUnique({
            where: { username: normalizedIdentifier },
        });
        if (!user) {
            return null;
        }

        const isMatch = await bcrypt.compare(password, user.password);
        return isMatch ? user : null;
    }

    generateToken(userId: number): string {
        const options: SignOptions = {
            expiresIn: config.auth.tokenExpiresIn as SignOptions['expiresIn'],
        };
        return jwt.sign({ id: userId }, config.auth.jwtSecret, options);
    }
}

export default new AuthService();