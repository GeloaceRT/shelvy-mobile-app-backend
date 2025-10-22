import { Request, Response } from 'express';
import authService from '../services/auth.service';

export class AuthController {
    constructor(private readonly service = authService) {}

    public loginUser = async (req: Request, res: Response) => {
        try {
            const { email, username, password } = req.body;
            const identifier = (email ?? username ?? '').trim();
            console.log('[AuthController] login attempt', identifier);

            if (!identifier || !password) {
                return res
                    .status(400)
                    .json({ message: 'Email/username and password are required.' });
            }

            const user = await this.service.validateUser(identifier, password);
            if (!user) {
                console.log('[AuthController] invalid credentials', identifier);
                return res.status(401).json({ message: 'Invalid credentials.' });
            }

            const token = this.service.generateToken(user.id);
            console.log('[AuthController] login success', identifier);
            return res
                .status(200)
                .json({ token, user: { id: user.id, username: user.username } });
        } catch (error) {
            console.error('[AuthController] login error', error);
            return res.status(500).json({ message: 'Unable to process login.', error });
        }
    };

    public logoutUser = async (_req: Request, res: Response) => {
        try {
            return res.status(200).json({ message: 'Logged out successfully.' });
        } catch (error) {
            return res.status(500).json({ message: 'Unable to process logout.', error });
        }
    };
}