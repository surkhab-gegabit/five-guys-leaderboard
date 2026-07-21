import NextAuth, { type DefaultSession, CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { sql } from './lib/db';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';

// Custom error classes so our frontend knows exactly when to ask for the 6-digit code
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
        token: { label: "2FA Token", type: "text" } // We added the token to our expected inputs!
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const cleanEmail = String(credentials.email).trim().toLowerCase();
        const users = await sql`SELECT *, two_factor_secret FROM users WHERE LOWER(email) = ${cleanEmail}`;
        const user = users[0];

        if (!user || !user.password_hash) return null;

        const isValid = await bcrypt.compare(String(credentials.password), user.password_hash);
        
        if (isValid) {
          
          // --- THE NEW 2FA CHECK ---
          if (user.two_factor_secret) {
            // If they didn't provide a token yet, stop and tell the frontend we need one
            if (!credentials.token) {
              throw new TwoFactorRequiredError();
            }

            // If they provided a token, verify it mathematically
            const verified = speakeasy.totp.verify({
              secret: user.two_factor_secret,
              encoding: 'base32',
              token: String(credentials.token)
            });

            if (!verified) {
              throw new InvalidTwoFactorError();
            }
          }
          // -------------------------

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