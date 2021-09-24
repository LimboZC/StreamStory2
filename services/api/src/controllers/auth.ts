import bcrypt from 'bcryptjs';
import { NextFunction, Request, Response } from 'express';

import transporter from '../config/mailing';
import { rememberMeCookie, userTokenSize } from '../config/globals';
import * as users from '../db/users';
import * as tokens from '../db/tokens';
import { getUserResponse } from './users';
import getRandomString from '../utils/getRandomString';

export const minPasswordLength = 6;

export async function logIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (req.user) {
        res.status(200).json({
            user: getUserResponse(req.user)
        });
        return;
    }

    try {
        // TODO: form validation/sanitation (use: express-validation!?).
        const { email, password, remember } = req.body;
        const user = await users.findByEmail(email);

        if (!user || !user.active) {
            res.status(401).json({
                error: {
                    email: 'unknown_email'
                }
            });
            return;
        }

        if (!(await bcrypt.compare(password, user.password))) {
            res.status(401).json({
                error: {
                    password: 'invalid_password'
                }
            });
            return;
        }

        req.user = user;
        req.session.userId = user.id;
        await users.updateLastLogin(user.id);

        // Issue a remember me cookie if the option was checked.
        if (remember) {
            // Issue new token.
            const newToken = await tokens.issue(user.id);
            res.cookie(rememberMeCookie.name, newToken, rememberMeCookie.options);
        }

        res.status(200).json({
            user: getUserResponse(user)
        });
    } catch (err) {
        next(err);
    }
}

export async function logOut(req: Request, res: Response): Promise<void> {
    delete req.user;
    delete req.session.userId;

    if (req.cookies[rememberMeCookie.name]) {
        // Clear cookie and token.
        tokens.consume(req.cookies[rememberMeCookie.name]);
        res.clearCookie(rememberMeCookie.name);
    }

    res.status(200).json({ success: true });
}

export async function getStatus(req: Request, res: Response): Promise<void> {
    res.status(200).json({
        user: req.user ? getUserResponse(req.user) : null
    });
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        // TODO: form validation/sanitation (use: express-validation!?).
        const { email, password, password2 } = req.body;
        const user = await users.findByEmail(email);

        if (user) {
            res.status(409).json({
                error: {
                    email: 'registered_email'
                }
            });
            return;
        }

        if (password.length < minPasswordLength) {
            res.status(422).json({
                error: {
                    password: 'short_password'
                }
            });
            return;
        }

        if (password !== password2) {
            res.status(422).json({
                error: {
                    password2: 'password_mismatch'
                }
            });
            return;
        }

        const activationToken = getRandomString(userTokenSize);
        const success = await users.add(2, email, password, {
            activation: activationToken
        });

        if (!success) {
            res.status(500).json({
                error: ['registration_failed']
            });
            return;
        }

        // Send activation e-mail.
        const activationLink = `${process.env.HOST}/login/${activationToken}`;

        // TODO: prepare email templates (separate content from code)
        await transporter.sendMail({
            from: 'StreamStory <streamstory@ijs.si>',
            to: email,
            subject: 'Activate your account',
            text: `Thank you for registering.\nFollow the link below to activate your account:\n${activationLink}`
        });

        res.status(200).json({
            success
        });
    } catch (err) {
        next(err);
    }
}

export async function activate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { token } = req.body;
        const success = await users.activate(token);

        if (!success) {
            res.status(403).json({
                error: ['activation_failed']
            });
            return;
        }

        res.status(200).json({
            success
        });
    } catch (err) {
        next(err);
    }
}

export async function initiatePasswordReset(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        // TODO: form validation/sanitation (use: express-validation!?).
        const { email } = req.body;
        const user = await users.findByEmail(email);

        if (!user || !user.active) {
            res.status(401).json({
                error: {
                    email: 'unknown_email'
                }
            });
            return;
        }

        const passwordResetToken = getRandomString(userTokenSize);
        const success = await users.setPasswordResetToken(user.id, passwordResetToken);

        if (!success) {
            res.status(500).json({
                error: ['password_reset_initiation_failed']
            });
            return;
        }

        // Send reset e-mail.
        const resetLink = `${process.env.HOST}/password-reset/${passwordResetToken}`;

        // TODO: prepare email templates (separate content from code)
        await transporter.sendMail({
            from: 'StreamStory <streamstory@ijs.si>',
            to: email,
            subject: 'Reset your password',
            text: `You requested a password reset for your StreamStory account. Follow the link below to reset it:\n${resetLink}\nThis link is only valid for the next 24 hours. After that you have to request a new one.\nIf you did not request a password reset, you can safely ignore this e-mail.`
        });

        res.status(200).json({
            success
        });
    } catch (err) {
        next(err);
    }
}

export async function resetPassword(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { token, password, password2 } = req.body;

        if (password.length < minPasswordLength) {
            res.status(422).json({
                error: {
                    password: 'short_password'
                }
            });
            return;
        }

        if (password !== password2) {
            res.status(422).json({
                error: {
                    password2: 'password_mismatch'
                }
            });
            return;
        }

        const success = await users.resetPassword(token, password);

        if (!success) {
            res.status(500).json({
                error: ['password_reset_failed']
            });
            return;
        }

        res.status(200).json({
            success
        });
    } catch (err) {
        next(err);
    }
}