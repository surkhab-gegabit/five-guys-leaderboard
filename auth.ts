import NextAuth, { type DefaultSession, CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { sql } from './lib/db';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

class TwoFactorRequiredError extends CredentialsSignin {
  code = "2FA_REQUIRED";
}
class InvalidTwoFactorError extends CredentialsSignin {
  code = "INVALID_2FA";
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      store_id: number | null;
    } & DefaultSession['user'];
  }
  interface User {
    id: string;
    role: string;
    store_id: number | null;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string;
    role: string;
    store_id: number | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        token: { label: "2FA Token", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const cleanEmail = String(credentials.email).trim().toLowerCase();
        const cleanPassword = String(credentials.password).trim(); // Prevent mobile trailing space bugs
        
        const users = await sql`
          SELECT *, requires_2fa, two_factor_secret, two_factor_expires 
          FROM users 
          WHERE LOWER(email) = ${cleanEmail}
        `;
        const user = users[0];

        if (!user || !user.password_hash) return null;

        const isValid = await bcrypt.compare(cleanPassword, user.password_hash);
        
        if (isValid) {
          
          if (user.requires_2fa) {
            
            // 1. If no token was provided yet, generate one and email it
            if (!credentials.token) {
              const now = Date.now();
              const expiresAt = new Date(now + 10 * 60000); // 10 mins
              
              let generatedCode = user.two_factor_secret;
              const existingExpiry = user.two_factor_expires ? new Date(user.two_factor_expires).getTime() : 0;

              // REUSE PROTECTION: If a code was already generated less than 60 seconds ago, 
              // reuse it instead of spamming Gmail and causing mobile timeout hangs.
              const isRecentCodeValid = generatedCode && existingExpiry > (now + 9 * 60000);

              if (!isRecentCodeValid) {
                generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
                
                await sql`
                  UPDATE users 
                  SET two_factor_secret = ${generatedCode}, two_factor_expires = ${expiresAt} 
                  WHERE id = ${user.id}
                `;

                // Send the email with a safety try/catch block so it never hangs indefinitely
                try {
                  const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                      user: process.env.EMAIL_USER,
                      pass: process.env.EMAIL_PASS
                    },
                    socketTimeout: 10000 // 10 second timeout so mobile networks don't freeze
                  });

                  await transporter.sendMail({
                    from: `"Five Guys Leaderboard" <${process.env.EMAIL_USER}>`,
                    to: user.email,
                    subject: 'Your Five Guys Login Code',
                    html: `
                      <div style="font-family: sans-serif; padding: 20px;">
                        <h2>Five Guys Login Verification</h2>
                        <p>Your 6-digit login code is:</p>
                        <h1 style="color: #DA291C; font-size: 40px; letter-spacing: 5px;">${generatedCode}</h1>
                        <p>This code will expire in 10 minutes.</p>
                      </div>
                    `
                  });
                } catch (emailError) {
                  console.error("Failed to send 2FA email:", emailError);
                  // Even if email fails, we still throw 2FA required so the app doesn't crash on mobile
                }
              }

              throw new TwoFactorRequiredError();
            }

            // 2. If a token was provided, verify it (trim whitespace in case mobile keyboard added a space)
            const cleanToken = String(credentials.token).trim();
            const currentDate = new Date();
            
            if (
              cleanToken !== user.two_factor_secret || 
              (user.two_factor_expires && currentDate > new Date(user.two_factor_expires))
            ) {
              throw new InvalidTwoFactorError();
            }

            // 3. Clear the code after successful login
            await sql`
              UPDATE users 
              SET two_factor_secret = NULL, two_factor_expires = NULL 
              WHERE id = ${user.id}
            `;
          }

          return { 
            id: String(user.id), 
            email: user.email, 
            name: user.name, 
            role: user.role,      
            store_id: user.store_id 
          };
        }
        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id; 
        token.role = user.role;
        token.store_id = user.store_id;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token && session.user) {
        session.user.id = token.id; 
        session.user.role = token.role;
        session.user.store_id = token.store_id;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login', 
  }
});