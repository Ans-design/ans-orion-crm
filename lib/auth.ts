import '@/lib/init-server-env';
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { matchDevAccount, getDevAccounts } from '@/lib/dev-accounts';
import { matchOrionV29Account, resolveOrionV29QuickLogin } from '@/lib/orion-v29-accounts';
import { getDemoQuickLoginToken } from '@/lib/auth-constants';
import { isDemoLoginFeaturesEnabled, isQuickLoginEnabled, isV29MatriculeAuthEnabled } from '@/lib/auth-environment';
import { matchLocalAdminAuth } from '@/lib/local-auth';
import { getNextAuthSecret } from '@/lib/auth-secret';
import {
  getAuthSessionCookieName,
  getAuthSessionCookieOptions,
  isSecureAuthCookie,
} from '@/lib/auth-cookies';
import { resolveAuthUserFromDb } from '@/lib/resolve-auth-user';
import { gateAccountAccess } from '@/lib/login-account-status';

async function withDbUser(profile: { id?: string; email: string; name?: string | null; role: string; matricule?: string | null }, skipDb = false) {
  if (skipDb || profile.id === 'local-admin') {
    return {
      id: profile.id ?? profile.email,
      email: profile.email,
      name: profile.name ?? profile.email,
      role: profile.role,
      matricule: profile.matricule ?? null,
    };
  }
  const resolved = await resolveAuthUserFromDb(profile);
  const id = resolved?.id ?? profile.id ?? profile.email;
  return {
    id,
    email: resolved?.email ?? profile.email,
    name: resolved?.name ?? profile.name ?? profile.email,
    role: resolved?.role ?? profile.role,
    matricule: profile.matricule ?? null,
  };
}

function matchDemoEnv(email: string, password: string) {
  if (!password || password.length < 8) return null;
  const pairs = [
    {
      email: (process.env.DEMO_ADMIN_EMAIL || '').trim().toLowerCase(),
      password: (process.env.DEMO_ADMIN_PASSWORD || '').trim(),
      name: 'Admin ANS',
      role: 'admin',
      id: 'demo-admin',
    },
    {
      email: (process.env.DEMO_EMAIL || '').trim().toLowerCase(),
      password: (process.env.DEMO_PASSWORD || '').trim(),
      name: 'Compte Démo',
      role: 'demo',
      id: 'demo-user',
    },
  ].filter((p) => p.email && p.password.length >= 8);

  const hit = pairs.find((a) => a.email === email && a.password === password);
  return hit ? { id: hit.id, email: hit.email, name: hit.name, role: hit.role } : null;
}

function resolveDemoQuickLogin(login: string) {
  const v29 = resolveOrionV29QuickLogin(login);
  if (v29) {
    return { id: v29.id, email: v29.email, name: v29.name, role: v29.role, matricule: v29.matricule };
  }
  const fromDev = getDevAccounts().find((a) => a.email === login.trim().toLowerCase());
  if (fromDev) {
    return { id: fromDev.id, email: fromDev.email, name: fromDev.name, role: fromDev.role, matricule: null as string | null };
  }
  const pairs = [
    {
      email: (process.env.DEMO_ADMIN_EMAIL || '').trim().toLowerCase(),
      name: 'Admin ANS',
      role: 'admin',
      id: 'demo-admin',
    },
    {
      email: (process.env.DEMO_EMAIL || '').trim().toLowerCase(),
      name: 'Compte Démo',
      role: 'demo',
      id: 'demo-user',
    },
  ].filter((p) => p.email);
  const hit = pairs.find((a) => a.email === login.trim().toLowerCase());
  return hit ? { id: hit.id, email: hit.email, name: hit.name, role: hit.role, matricule: null as string | null } : null;
}

const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 jours

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const login = credentials.email.trim();
        const loginLower = login.toLowerCase();
        const password = credentials.password ?? '';

        if (password === getDemoQuickLoginToken()) {
          if (isQuickLoginEnabled()) {
            const quick = resolveDemoQuickLogin(login);
            return quick ? withDbUser(quick) : null;
          }
          return null;
        }

        if (!password) return null;

        const localTest = matchLocalAdminAuth(login, password);
        if (localTest) {
          return withDbUser(localTest, true);
        }

        if (isV29MatriculeAuthEnabled()) {
          const v29 = matchOrionV29Account(login, password);
          if (v29) {
            return withDbUser({ id: v29.id, email: v29.email, name: v29.name, role: v29.role, matricule: v29.matricule });
          }
        }

        if (login.includes('@')) {
          try {
            const user = await prisma.user.findUnique({ where: { email: loginLower } });
            if (user?.password && (await bcrypt.compare(password, user.password))) {
              const employee = await prisma.employee.findFirst({
                where: { OR: [{ email: loginLower }, { userId: user.id }] },
                select: { statut: true },
              });
              const gate = gateAccountAccess({ userRole: user.role, employeeStatut: employee?.statut });
              if (!gate.allowed) return null;
              return {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                matricule: null,
                mustChangePassword: Boolean((user as { mustChangePassword?: boolean }).mustChangePassword),
              };
            }
          } catch (err) {
            console.error('Auth DB error:', err);
          }
        } else {
          try {
            const employee = await prisma.employee.findUnique({
              where: { matricule: login.toUpperCase() },
              select: { userId: true, email: true, firstName: true, lastName: true, authRole: true, statut: true },
            });
            if (employee) {
              const user = employee.userId
                ? await prisma.user.findUnique({ where: { id: employee.userId } })
                : employee.email
                  ? await prisma.user.findUnique({ where: { email: employee.email.toLowerCase() } })
                  : null;
              if (user?.password && (await bcrypt.compare(password, user.password))) {
                const gate = gateAccountAccess({
                  userRole: user.role || employee.authRole,
                  employeeStatut: employee.statut,
                });
                if (!gate.allowed) return null;
                return {
                  id: user.id,
                  email: user.email,
                  name: user.name ?? `${employee.firstName} ${employee.lastName}`,
                  role: user.role || employee.authRole,
                  matricule: login.toUpperCase(),
                  mustChangePassword: Boolean((user as { mustChangePassword?: boolean }).mustChangePassword),
                };
              }
            }
          } catch (err) {
            console.error('Auth matricule error:', err);
          }
        }

        if (isDemoLoginFeaturesEnabled()) {
          const demo = matchDemoEnv(loginLower, password) ?? matchDevAccount(loginLower, password);
          if (demo) return withDbUser({ ...demo, matricule: null });
        }

        return null;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE,
    updateAge: 24 * 60 * 60,
  },
  jwt: { maxAge: SESSION_MAX_AGE },
  useSecureCookies: isSecureAuthCookie(),
  cookies: {
    sessionToken: {
      name: getAuthSessionCookieName(),
      options: getAuthSessionCookieOptions(),
    },
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.email = user.email;
        token.matricule = user.matricule ?? null;
        token.mustChangePassword = Boolean(user.mustChangePassword);
      }
      if (token.email) {
        const resolved = await resolveAuthUserFromDb({
          id: token.id as string | undefined,
          email: String(token.email),
          role: (token.role as string) || 'user',
        });
        if (resolved) {
          token.id = resolved.id;
          token.role = resolved.role;
        }
        // Relire le flag à chaque refresh JWT (après changement MDP)
        try {
          const u = await prisma.user.findUnique({
            where: { id: String(token.id) },
            select: { mustChangePassword: true },
          });
          if (u) token.mustChangePassword = Boolean(u.mustChangePassword);
        } catch {
          /* ignore — SQLite / boot */
        }
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session?.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).matricule = token.matricule ?? null;
        (session.user as any).mustChangePassword = Boolean(token.mustChangePassword);
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
  secret: getNextAuthSecret(),
};
