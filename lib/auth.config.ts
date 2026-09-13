import type { NextAuthOptions } from "next-auth";

export const authConfig: NextAuthOptions = {
  secret: process.env.AUTH_SECRET ?? "jtinventory-development-secret",
  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt" as const,
  },

  providers: [],
  
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? session.user.id ?? "");
        session.user.role = token.role as "MAHASISWA" | "DOSEN" | "TEKNISI";
      }
      return session;
    },
  },
};