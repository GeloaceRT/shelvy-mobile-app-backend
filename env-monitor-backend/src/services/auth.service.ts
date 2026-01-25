import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import config from '../config';
import prisma from '../database/prisma';
import { firebaseAdmin, realtimeDb, isFirebaseInitialized } from '../config/firebase';
import firebaseService from './firebase.service';

type UserRecord = {
    id?: number;
    username?: string;
    password?: string;
};

type RegisterResult = UserRecord & { firebaseUid?: string; firebaseToken?: string };

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
    async registerUser(identifier: string, password: string): Promise<RegisterResult> {
        const normalizedIdentifier = identifier.trim().toLowerCase();
        const hashedPassword = await bcrypt.hash(password, 10);

        // If Firebase Admin SDK is available, prefer Firebase-first auth/storage
        if (isFirebaseInitialized) {
            const acct = await firebaseService.createFirebaseAccount(normalizedIdentifier, password).catch(() => ({}));
            const firebaseUid = acct.uid;
            const firebaseToken = acct.token;

            // write profile into Realtime DB when possible
            try {
                        if (firebaseUid) {
                            await firebaseService.writeUserProfile(firebaseUid, { email: normalizedIdentifier, createdAt: Date.now(), source: 'signup' });
                        }
            } catch (e) {
                        console.warn('[AuthService] RTDB profile write failed', (e as any)?.message ?? e);
            }

            return { firebaseUid, firebaseToken, username: normalizedIdentifier };
        }
        if (!usePrisma) {
            const existing = mockUsers.find((user) => user.username.toLowerCase() === normalizedIdentifier);
            // If user already exists in server DB, attempt to ensure a Firebase account and return token
            if (existing) {
                const acct = await firebaseService.createFirebaseAccount(normalizedIdentifier, password).catch(() => ({}));
                const firebaseUid = acct.uid;
                const firebaseToken = acct.token;

                // ensure RTDB profile exists
                try {
                    if (firebaseUid) {
                                await firebaseService.writeUserProfile(firebaseUid, { email: normalizedIdentifier, createdAt: Date.now(), source: 'signup-existing' });
                    }
                } catch (e) {
                            console.warn('[AuthService] RTDB profile write failed', (e as any)?.message ?? e);
                }

                return { ...existing, firebaseUid, firebaseToken };
            }

            // create firebase auth user for new mock user
            let firebaseUid: string | undefined;
            let firebaseToken: string | undefined;
            try {
                const acct = await firebaseService.createFirebaseAccount(normalizedIdentifier, password).catch(() => ({}));
                firebaseUid = acct.uid;
                firebaseToken = acct.token;
                if (firebaseUid) {
                    try {
                                await firebaseService.writeUserProfile(firebaseUid, { email: normalizedIdentifier, createdAt: Date.now(), source: 'signup' });
                    } catch (e) {
                                console.warn('[AuthService] RTDB profile write failed', (e as any)?.message ?? e);
                    }
                }
            } catch (e) {
                console.warn('[AuthService] firebase createUser failed', (e as any)?.message ?? e);
            }

            const newUser: UserRecord = {
                id: mockNextId++,
                username: normalizedIdentifier,
                password: hashedPassword,
            };
            mockUsers.push(newUser);
            return { ...newUser, firebaseUid, firebaseToken };
        }

        // Prisma-backed flow: create Firebase user and Prisma user
        const existing = await prisma.user.findUnique({ where: { username: normalizedIdentifier } });
        if (existing) {
            const acct = await firebaseService.createFirebaseAccount(normalizedIdentifier, password).catch(() => ({}));
            const firebaseUid = acct.uid;
            const firebaseToken = acct.token;

            try {
                if (firebaseUid) {
                            await firebaseService.writeUserProfile(firebaseUid, { email: normalizedIdentifier, createdAt: Date.now(), serverId: existing.id, source: 'signup-existing' });
                }
            } catch (e) {
                        console.warn('[AuthService] RTDB profile write failed', (e as any)?.message ?? e);
            }

            return { id: existing.id, username: existing.username, password: existing.password, firebaseUid, firebaseToken };
        }

        // create server user first so we have serverId for RTDB
        const created = await prisma.user.create({
            data: {
                username: normalizedIdentifier,
                password: hashedPassword,
            },
        });

        let firebaseUid: string | undefined;
        let firebaseToken: string | undefined;
        try {
            const acct = await firebaseService.createFirebaseAccount(normalizedIdentifier, password).catch(() => ({}));
            firebaseUid = acct.uid;
            firebaseToken = acct.token;
            try {
                if (firebaseUid) {
                            await firebaseService.writeUserProfile(firebaseUid, { email: normalizedIdentifier, createdAt: Date.now(), serverId: created.id });
                }
            } catch (e) {
                        console.warn('[AuthService] RTDB profile write failed', (e as any)?.message ?? e);
            }
        } catch (e) {
                    console.warn('[AuthService] firebase createUser failed', (e as any)?.message ?? e);
        }

        return { id: created.id, username: created.username, password: created.password, firebaseUid, firebaseToken };
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

    generateToken(userId: number | string): string {
        const options: SignOptions = {
            expiresIn: config.auth.tokenExpiresIn as SignOptions['expiresIn'],
        };
        const payload = typeof userId === 'number' ? { id: userId } : { uid: userId } as any;
        return jwt.sign(payload, config.auth.jwtSecret, options);
    }
}

export default new AuthService();