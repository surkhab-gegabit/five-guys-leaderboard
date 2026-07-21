import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { sql } from './lib/db';
import bcrypt from 'bcryptjs';

// Tell TypeScript about our custom User and Session properties, including the ID!
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
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // 1. Clean the incoming email (remove spaces and force lowercase)
        const cleanEmail = String(credentials.email).trim().toLowerCase();

        // 2. Tell SQL to lowercase the database email before comparing
        const users = await sql`SELECT * FROM users WHERE LOWER(email) = ${cleanEmail}`;
        const user = users[0];

        if (!user || !user.password_hash) return null;

        const isValid = await bcrypt.compare(String(credentials.password), user.password_hash);
        
        if (isValid) {
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