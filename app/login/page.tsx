'use client';

import { useState, useEffect, useCallback } from 'react';
import { signIn } from 'next-auth/react';
import {
  Mail, HelpCircle,
  Shield, Sparkles, ArrowRight, ShoppingCart, IdCard, ChevronDown,
} from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { DEMO_ACCOUNTS_PUBLIC } from '@/lib/dev-accounts-public';
import { ORION_V29_PUBLIC } from '@/lib/orion-v29-accounts';
import { DEMO_QUICK_LOGIN_TOKEN } from '@/lib/auth-constants';
import { resolvePostLoginPath, completeLoginRedirect } from '@/lib/auth-redirect';
import { verifyServerSession, fetchServerSession } from '@/lib/auth-session-client';
import { LOGIN_MESSAGES } from '@/lib/login-account-status';
import '@/styles/login-role-pills.css';
import { Input } from '@/components/ui/input';
import {
  OrionAuthLayout,
  OrionLogoBlock,
  OrionLoginCard,
  OrionAlert,
  OrionAuthFormField,
  OrionPasswordInput,
  OrionButton,
} from '@/components/orion/auth';
import { AccessRequestForm } from '@/components/auth/access-request-form';
import { LoginRolePills } from '@/components/auth/login-role-pills';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const APP_VERSION = '2.9.0';
/** Compte démo seed (email) — préremplissage uniquement si comptes démo publics activés. */
const LOCAL_DEMO_EMAIL =
  process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS === 'true'
    ? (DEMO_ACCOUNTS_PUBLIC.find((a) => a.role === 'demo')?.email ?? '')
    : '';

function isLocalhostClient() {
  if (typeof window === 'undefined') return false;
  return /localhost|127\.0\.0\.1/i.test(window.location.hostname);
}

const LOGIN_TITLE = 'Connexion à ANS ORION';
const LOGIN_SUBTITLE = 'Accédez à votre espace de travail.';

type AuthMode = 'login' | 'setup' | 'register' | 'forgot' | 'access';

type PublicInfo = {
  branding: { companyName: string; companySubtitle: string; showPublicVersion: boolean; logoUrl?: string | null };
  appVersion: string;
  articleCount: number;
  secureSession: boolean;
};

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [demoMode, setDemoMode] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [allowSignup, setAllowSignup] = useState(false);
  const [showQuickLogin, setShowQuickLogin] = useState(false);
  const [showV29Profiles, setShowV29Profiles] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [registerRole, setRegisterRole] = useState('commercial');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginIdError, setLoginIdError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [demoResetUrl, setDemoResetUrl] = useState<string | null>(null);
  const [redirectTo, setRedirectTo] = useState('/dashboard');
  const [publicInfo, setPublicInfo] = useState<PublicInfo | null>(null);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [demoExpanded, setDemoExpanded] = useState(false);
  const [isLocalHost, setIsLocalHost] = useState(false);
  const [secureSession, setSecureSession] = useState(false);
  const [isPreviewEmbed, setIsPreviewEmbed] = useState(false);

  useEffect(() => {
    const local = isLocalhostClient();
    setIsLocalHost(local);
    if (!local) return;
    // Préremplir l’email démo réel (pas l’ancien matricule ADM01).
    setLoginId((v) => v || LOCAL_DEMO_EMAIL);
    setDemoExpanded(true);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    setRedirectTo(resolvePostLoginPath(redirect));
    const error = params.get('error');
    const reason = params.get('reason');
    if (reason === 'session_expired' || error === 'SessionRequired') {
      setSessionExpired(true);
    }
    if (error === 'CredentialsSignin') {
      uxToast.error(LOGIN_MESSAGES.invalidCredentials);
    }
    setIsPreviewEmbed(params.get('_preview') === '1');
  }, []);

  useEffect(() => {
    fetch('/api/auth/public-info')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setPublicInfo(d);
        if (typeof d.secureSession === 'boolean') setSecureSession(d.secureSession);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (publicInfo?.secureSession !== undefined) return;
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      setSecureSession(true);
    }
  }, [publicInfo?.secureSession]);

  const finalizeLogin = useCallback(async (opts?: { demoQuick?: boolean; successLabel?: string }) => {
    const session = await fetchServerSession();
    if (!session?.user) {
      uxToast.error('Session non établie — réessayez ou videz les cookies du site');
      return false;
    }
    const role = session.user.role;
    const target = resolvePostLoginPath(redirectTo, role);

    const successRes = await fetch('/api/auth/login-success', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redirect: redirectTo, demoQuick: opts?.demoQuick }),
    }).catch(() => null);

    const serverRedirect =
      successRes?.ok
        ? ((await successRes.json().catch(() => ({}))) as { redirect?: string }).redirect
        : undefined;

    if (opts?.successLabel) uxToast.success(opts.successLabel);
    else uxToast.success('Connexion réussie — redirection…');
    completeLoginRedirect(serverRedirect ?? target, role);
    return true;
  }, [redirectTo]);

  const startCredentialsLogin = useCallback(async (
    id: string,
    pw: string,
    opts?: { demoQuick?: boolean; successLabel?: string },
  ) => {
    const callbackUrl = resolvePostLoginPath(redirectTo);
    const result = await signIn('credentials', {
      email: id,
      password: pw,
      redirect: false,
    });
    if (!result?.ok) {
      const failRes = await fetch('/api/auth/login-fail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: id }),
      }).catch(() => null);
      const failData = failRes ? await failRes.json().catch(() => ({})) : {};
      const msg =
        (failData as { message?: string }).message
        || ((failData as { locked?: boolean }).locked
          ? LOGIN_MESSAGES.locked
          : LOGIN_MESSAGES.invalidCredentials);
      const remaining = (failData as { remainingAttempts?: number }).remainingAttempts;
      const fullMsg =
        remaining != null && remaining > 0 && remaining <= 2
          ? `${msg} (${remaining} tentative(s) restante(s).)`
          : msg;
      setLoginError(fullMsg);
      setPasswordError(fullMsg);
      uxToast.error(fullMsg);
      return false;
    }
    setLoginError(null);
    const serverOk = await verifyServerSession();
    if (serverOk) {
      return finalizeLogin(opts);
    }
    await signIn('credentials', {
      email: id,
      password: pw,
      callbackUrl,
      redirect: true,
    });
    return true;
  }, [finalizeLogin, redirectTo]);

  useEffect(() => {
    fetch('/api/auth/setup-status')
      .then((r) => r.json())
      .then((d) => {
        if (d.demoMode) setDemoMode(true);
        if (d.needsSetup && !d.demoMode) {
          setNeedsSetup(true);
          setMode('setup');
        }
        if (typeof d.allowSignup === 'boolean') setAllowSignup(d.allowSignup);
        if (typeof d.showQuickLogin === 'boolean') setShowQuickLogin(d.showQuickLogin);
        if (typeof d.showV29Profiles === 'boolean') setShowV29Profiles(d.showV29Profiles);
        // Local : forcer l’affichage de tous les profils même si le flag API manque
        if (isLocalhostClient()) {
          setShowQuickLogin(true);
          setShowV29Profiles(true);
          setDemoExpanded(true);
        }
      })
      .catch(() => uxToast.error('Impossible de vérifier le statut du serveur'));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreviewEmbed) return;
    if (loading) return;
    const id = loginId.trim();
    setLoginIdError(null);
    setPasswordError(null);
    if (!id) {
      setLoginIdError(LOGIN_MESSAGES.identifierRequired);
      uxToast.error(LOGIN_MESSAGES.identifierRequired);
      return;
    }
    if (id.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id.toLowerCase())) {
      setLoginIdError(LOGIN_MESSAGES.emailInvalid);
      uxToast.error(LOGIN_MESSAGES.emailInvalid);
      return;
    }
    if (!password || password.length < 4) {
      setPasswordError(LOGIN_MESSAGES.passwordRequired);
      uxToast.error(LOGIN_MESSAGES.passwordRequired);
      return;
    }
    setLoading(true);
    setLoginError(null);
    try {
      const normalized = id.includes('@') ? id.toLowerCase() : id.toUpperCase();
      const check = await fetch('/api/auth/login-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: normalized,
          login: normalized,
          matricule: normalized,
          password,
        }),
      });
      if (!check.ok) {
        const data = await check.json().catch(() => ({}));
        const msg = (data as { message?: string }).message || LOGIN_MESSAGES.locked;
        setLoginError(msg);
        if ((data as { code?: string }).code === 'disabled' || (data as { code?: string }).code === 'unauthorized') {
          setLoginIdError(msg);
        } else {
          setPasswordError(msg);
        }
        uxToast.error(msg);
        return;
      }
      await startCredentialsLogin(normalized, password);
    } catch {
      uxToast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const quickLoginV29 = async (acc: (typeof ORION_V29_PUBLIC)[number]) => {
    if (loading) return;
    setLoading(true);
    setLoginId(acc.email);
    setPassword('');
    try {
      await startCredentialsLogin(acc.matricule, DEMO_QUICK_LOGIN_TOKEN, {
        successLabel: `Connecté — ${acc.name} (${acc.profile})`,
      });
    } catch {
      uxToast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const fillV29Login = (acc: (typeof ORION_V29_PUBLIC)[number]) => {
    setLoginId(acc.email);
    setPassword('');
    setLoginError(null);
    setLoginIdError(null);
    uxToast.info(`${acc.profile} · ${acc.matricule} — saisissez le mot de passe profil`);
  };

  const quickLogin = async (acc: (typeof DEMO_ACCOUNTS_PUBLIC)[number]) => {
    if (loading) return;
    setLoading(true);
    try {
      await startCredentialsLogin(acc.email, DEMO_QUICK_LOGIN_TOKEN, {
        demoQuick: true,
        successLabel: `Connecté — ${acc.name}`,
      });
    } catch {
      uxToast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const identifier = (isForgot ? (email || loginId) : '').trim() || loginId.trim() || email.trim();
    if (!identifier) {
      uxToast.error('Entrez votre email ou matricule.');
      return;
    }
    setLoading(true);
    setDemoResetUrl(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      if (!res.ok) {
        uxToast.error(data.error, 'Erreur');
        return;
      }
      uxToast.success(data.message);
      if (data.demoResetUrl) setDemoResetUrl(data.demoResetUrl);
    } catch {
      uxToast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (password.length < 8) {
      uxToast.error('Mot de passe : 8 caractères minimum');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          name: name.trim() || undefined,
          role: registerRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        uxToast.error(data?.error ?? 'Erreur création compte');
        return;
      }
      uxToast.success('Compte créé — connexion…');
      const ok = await startCredentialsLogin(email.trim().toLowerCase(), password);
      if (!ok) setMode('login');
    } catch {
      uxToast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const isSetup = mode === 'setup';
  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';

  const switchTab = (next: AuthMode) => {
    if (next === 'setup') setMode('setup');
    else if (next === 'register') setMode('register');
    else setMode('login');
  };

  const branding = publicInfo?.branding;
  const showVersion = branding?.showPublicVersion ?? false;

  const showLocalTestHint = isLocalHost && !isPreviewEmbed;

  const loginCardTitle = isSetup
    ? 'Première installation'
    : isRegister
      ? 'Inscription'
      : isForgot
        ? 'Mot de passe oublié'
        : mode === 'login'
          ? LOGIN_TITLE
          : undefined;

  const loginCardSubtitle = isSetup
    ? 'Créez votre compte administrateur pour démarrer.'
    : isRegister
      ? 'Rejoignez votre équipe sur ANS ORION.'
      : isForgot
        ? 'Entrez votre email pour recevoir un lien de réinitialisation.'
        : mode === 'login'
          ? LOGIN_SUBTITLE
          : undefined;

  return (
    <>
    <OrionAuthLayout
      brand={
        <OrionLogoBlock
          companyName={branding?.companyName ?? 'ANS DESIGN PRINT'}
          companySubtitle={branding?.companySubtitle ?? 'ERP'}
          logoUrl={branding?.logoUrl}
          demoBadge={
            (demoMode || showLocalTestHint) ? (
              <span className="orion-login-demo-badge mt-3 inline-flex">
                <Sparkles size={12} className="text-[var(--ans-yellow-soft)]" aria-hidden />
                {demoMode ? 'Mode DEMO' : 'Test local'}
              </span>
            ) : undefined
          }
        />
      }
      form={
        <OrionLoginCard title={loginCardTitle} subtitle={loginCardSubtitle}>
          {isPreviewEmbed && (
            <OrionAlert variant="info" className="mb-4">
              Mode aperçu — saisie interactive, connexion désactivée dans l&apos;iframe.
            </OrionAlert>
          )}
          {!isSetup && !isForgot && (
            <div className="flex gap-1 p-1 rounded-lg bg-[var(--bg-chip)] mb-6 border border-[var(--border-soft)]">
              <button
                type="button"
                onClick={() => switchTab('login')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orion-red)] ${
                  mode === 'login' ? 'ans-btn-primary shadow-sm' : 'text-[var(--login-panel-muted)] hover:text-[var(--login-panel-title)]'
                }`}
              >
                Identifiants
              </button>
              {allowSignup && (
                <button
                  type="button"
                  onClick={() => switchTab('register')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    isRegister ? 'ans-btn-gold shadow-sm' : 'text-[var(--login-panel-muted)] hover:text-[var(--login-panel-title)]'
                  }`}
                >
                  Inscription
                </button>
              )}
            </div>
          )}

          {showLocalTestHint && mode === 'login' && !isForgot && (
            <div className="orion-login-test-hint mb-4" role="note">
              <span className="font-semibold text-[#92400e]">Connexion démo (local)</span>
              {' — '}
              <strong>{LOCAL_DEMO_EMAIL}</strong>
              <button
                type="button"
                className="ml-2 text-[var(--orion-red)] font-semibold hover:underline"
                disabled={loading}
                onClick={() => {
                  const demo = DEMO_ACCOUNTS_PUBLIC.find((a) => a.email === LOCAL_DEMO_EMAIL);
                  if (demo) void quickLogin(demo);
                  else {
                    setLoginId(LOCAL_DEMO_EMAIL);
                    setPassword('');
                  }
                }}
              >
                Connexion rapide
              </button>
            </div>
          )}

          {mode === 'login' && redirectTo === '/panier' && (
            <OrionAlert variant="warning" className="mb-4">
              <span className="flex items-center gap-2">
                <ShoppingCart size={16} className="shrink-0" aria-hidden />
                Connectez-vous pour retrouver votre panier
              </span>
            </OrionAlert>
          )}

          {sessionExpired && mode === 'login' && (
            <OrionAlert variant="warning" className="mb-4">
              Votre session a expiré. Veuillez vous reconnecter pour continuer.
            </OrionAlert>
          )}

          {loginError && mode === 'login' && (
            <OrionAlert variant="error" className="mb-4" role="alert">
              {loginError}
            </OrionAlert>
          )}

          {showQuickLogin && showV29Profiles && mode === 'login' && !isForgot && !isPreviewEmbed && (
            <LoginRolePills disabled={loading} onQuickLogin={(acc) => void quickLoginV29(acc)} />
          )}

          <form onSubmit={isForgot ? handleForgot : isSetup || isRegister ? handleSignup : handleLogin} className="space-y-4">
            {(isSetup || isRegister) && (
              <OrionAuthFormField label="Nom complet" htmlFor="login-name">
                <Input id="login-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" disabled={loading} className="h-11" />
              </OrionAuthFormField>
            )}
            {mode === 'login' && !isForgot ? (
              <OrionAuthFormField
                label="Email"
                htmlFor="login-id"
                hint="Compte démo ou email professionnel ANS DESIGN."
                error={loginIdError ?? undefined}
                shake={!!loginIdError}
              >
                <div className="relative">
                  <Input
                    id="login-id"
                    type="text"
                    inputMode="email"
                    value={loginId}
                    onChange={(e) => { setLoginId(e.target.value); setLoginError(null); setLoginIdError(null); }}
                    placeholder={LOCAL_DEMO_EMAIL}
                    autoComplete="username"
                    disabled={loading}
                    variant={loginIdError ? 'error' : 'default'}
                    className="pl-10 h-11"
                    aria-invalid={!!loginIdError || !!loginError}
                    aria-describedby={loginIdError ? 'login-id-error' : undefined}
                  />
                  <Mail size={14} className="absolute left-3 top-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </OrionAuthFormField>
            ) : null}
            {isRegister && (
              <OrionAuthFormField label="Profil" htmlFor="login-role">
                <select
                  id="login-role"
                  value={registerRole}
                  onChange={(e) => setRegisterRole(e.target.value)}
                  disabled={loading}
                  className="w-full h-11 rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="commercial">Commercial</option>
                  <option value="designer">Graphiste</option>
                  <option value="demo">Démo CRM</option>
                  <option value="lecture">Lecture seule</option>
                </select>
              </OrionAuthFormField>
            )}
            {(isSetup || isRegister || isForgot) && !isForgot && (
              <OrionAuthFormField label="Email" htmlFor="login-email" required>
                <div className="relative">
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemple.com"
                    required
                    autoComplete="email"
                    disabled={loading}
                    className="pl-10 h-11"
                  />
                  <Mail size={14} className="absolute left-3 top-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </OrionAuthFormField>
            )}
            {isForgot && (
              <OrionAuthFormField
                label="Email ou matricule"
                htmlFor="login-forgot-id"
                hint="Si le compte existe, un email de réinitialisation sera envoyé (message sécurisé)."
                required
              >
                <div className="relative">
                  <Input
                    id="login-forgot-id"
                    value={email || loginId}
                    onChange={(e) => { setEmail(e.target.value); setLoginId(e.target.value); }}
                    placeholder="email ou matricule"
                    required
                    autoComplete="username"
                    disabled={loading}
                    className="pl-10 h-11"
                  />
                  <IdCard size={14} className="absolute left-3 top-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </OrionAuthFormField>
            )}
            {!isForgot && (
              <OrionPasswordInput
                id="login-password"
                value={password}
                onChange={(v) => { setPassword(v); setLoginError(null); setPasswordError(null); }}
                disabled={loading}
                loading={loading}
                required
                minLength={mode === 'login' ? 4 : 8}
                autoComplete={isSetup || isRegister ? 'new-password' : 'current-password'}
                error={passwordError}
                shake={!!passwordError}
                defaultShowPassword={isLocalHost}
                hint={isSetup || isRegister ? '8 caractères minimum' : (isLocalHost ? 'Cliquez l’œil pour aperçu / masquage' : undefined)}
                labelAction={
                  mode === 'login' ? (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setEmail(loginId); }}
                      className="text-xs text-[var(--orion-red)] hover:underline whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orion-red)] focus-visible:ring-offset-2 rounded px-0.5"
                    >
                      Mot de passe oublié ?
                    </button>
                  ) : undefined
                }
              />
            )}
            <OrionButton type="submit" authVariant={isRegister || isSetup ? 'gold' : 'primary'} loading={loading} disabled={isPreviewEmbed}>
              {loading
                ? (isForgot ? 'Envoi en cours…' : 'Connexion en cours…')
                : isForgot
                  ? 'Envoyer le lien'
                  : isSetup
                    ? 'Créer mon compte admin'
                    : isRegister
                      ? "S'inscrire"
                      : 'Se connecter'}
            </OrionButton>
          </form>

          {showQuickLogin && !isPreviewEmbed && mode === 'login' && (
            <div className="mt-5 border-t border-[var(--border-soft)] pt-4">
              <button
                type="button"
                onClick={() => setDemoExpanded((v) => !v)}
                className="w-full flex items-center justify-between gap-2 text-left text-xs font-semibold text-[var(--login-panel-muted)] hover:text-[var(--login-panel-title)] transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orion-red)] rounded-md px-1"
                aria-expanded={demoExpanded}
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles size={12} className="text-[var(--orion-yellow)]" />
                  Accès de démonstration
                </span>
                <ChevronDown
                  size={14}
                  className={`shrink-0 transition-transform ${demoExpanded ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>

              {demoExpanded && (
                <div className="mt-3 space-y-3 orion-fade-up">
                  <p className="text-[10px] text-[var(--login-panel-muted)]">
                    Comptes de test — réservés aux environnements de démonstration.
                  </p>
                  {DEMO_ACCOUNTS_PUBLIC.map((acc) => {
                    const isAdmin = acc.role === 'admin';
                    return (
                      <button
                        key={acc.email}
                        type="button"
                        disabled={loading}
                        onClick={() => quickLogin(acc)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-[7px] border transition-all disabled:opacity-100 disabled:bg-[var(--app-disabled-bg)] disabled:text-[var(--app-disabled-text)] min-h-[44px] ${
                          isAdmin
                            ? 'border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10'
                            : 'border-[var(--border-soft)] bg-[var(--bg-chip)] hover:bg-[var(--bg-row-hover)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="font-semibold text-sm flex items-center gap-1.5">
                              {isAdmin && <Shield size={14} className="text-emerald-500" />}
                              {acc.name}
                            </span>
                            <span className="text-[var(--login-panel-muted)] text-xs">{acc.badge}</span>
                          </div>
                          <ArrowRight size={16} className="text-[var(--login-panel-muted)] shrink-0" />
                        </div>
                      </button>
                    );
                  })}

                  {showV29Profiles && (
                    <>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--login-panel-muted)] pt-1">
                        Tous les profils équipe
                      </p>
                      <p className="text-[10px] text-[var(--login-panel-muted)]">
                        Liste complète — ou utilisez les pastilles ci-dessus.
                      </p>
                      <div className="grid grid-cols-1 gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                        {ORION_V29_PUBLIC.map((acc) => {
                          const isAdminProfile = acc.role === 'admin' || acc.profile === 'Admin' || acc.profile === 'Direction';
                          return (
                            <button
                              key={acc.matricule}
                              type="button"
                              disabled={loading}
                              onClick={() => quickLoginV29(acc)}
                              className={`w-full text-left px-3 py-2 rounded-[7px] border transition-all disabled:opacity-100 disabled:bg-[var(--app-disabled-bg)] disabled:text-[var(--app-disabled-text)] text-xs min-h-[40px] ${
                                isAdminProfile
                                  ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10'
                                  : 'border-[var(--border-soft)] bg-[var(--bg-chip)] hover:bg-[var(--bg-row-hover)]'
                              }`}
                            >
                              <div className="flex justify-between gap-2">
                                <span className="font-semibold flex items-center gap-1">
                                  {isAdminProfile && <Shield size={12} className="text-emerald-500 shrink-0" />}
                                  {acc.name}
                                </span>
                                <span className="text-[var(--login-panel-muted)]">{acc.profile}</span>
                              </div>
                              <div className="mt-0.5 flex flex-wrap gap-x-2 text-[10px] text-[var(--login-panel-muted)]">
                                <span className="font-mono">{acc.matricule}</span>
                                <span>{acc.email}</span>
                                <button
                                  type="button"
                                  className="text-[var(--orion-red)] font-semibold hover:underline"
                                  disabled={loading}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fillV29Login(acc);
                                  }}
                                >
                                  Remplir
                                </button>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {demoMode && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-[var(--login-panel-muted)]">
                      <Sparkles size={10} className="text-[var(--orion-yellow)]" /> Mode démo actif
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {demoResetUrl && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200/80 dark:border-red-500/30 text-xs">
              <p className="font-semibold text-[var(--orion-red)] mb-1">Mode démo — lien de reset :</p>
              <a href={demoResetUrl} className="text-[var(--orion-red-dark)] underline break-all">
                Ouvrir le lien de réinitialisation
              </a>
            </div>
          )}

          {!isSetup && (
            <div className="mt-5 pt-5 border-t border-[var(--border-soft)] flex flex-col items-center gap-2 text-center">
              {isForgot ? (
                <button type="button" onClick={() => setMode('login')} className="text-sm text-[var(--orion-red)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--orion-red)] rounded">
                  Retour à la connexion
                </button>
              ) : mode === 'login' ? (
                <>
                  {allowSignup && (
                    <button type="button" onClick={() => setMode('register')} className="text-sm font-medium text-[var(--orion-red)] hover:underline">
                      Créer un compte
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setAccessModalOpen(true)}
                    className="orion-login-contact-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--orion-red)]"
                  >
                    <HelpCircle size={12} /> Contacter l&apos;administrateur
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setMode('login')} className="text-sm text-[var(--orion-red)] hover:underline">
                  Déjà un compte ? Se connecter
                </button>
              )}
            </div>
          )}

          {(secureSession || showVersion) && (
            <div className="mt-5 pt-4 border-t border-[var(--border-soft)] flex flex-wrap items-center justify-center gap-3 text-[11px] text-[var(--login-panel-muted)]">
              {secureSession && (
                <span className="flex items-center gap-1" title="HTTPS + cookies httpOnly / secure">
                  <Shield size={12} aria-hidden /> Session sécurisée
                </span>
              )}
              {showVersion && (
                <span className="font-mono" title={`ORION v${publicInfo?.appVersion ?? APP_VERSION}`}>
                  v{publicInfo?.appVersion ?? APP_VERSION}
                </span>
              )}
            </div>
          )}
        </OrionLoginCard>
      }
      footer={
        <p className="text-center text-xs text-[var(--login-text-muted-on-dark)]">
          © 2026 {branding?.companyName ?? 'ANS Design Print'}
        </p>
      }
    />

      <Dialog open={accessModalOpen} onOpenChange={setAccessModalOpen}>
        <DialogContent className="max-w-md rounded-[var(--radius-ui,12px)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Demande d&apos;accès ORION</DialogTitle>
            <DialogDescription>
              Transmettez votre demande à l&apos;administrateur — vous pourrez suivre son statut par email.
            </DialogDescription>
          </DialogHeader>
          <AccessRequestForm onBack={() => setAccessModalOpen(false)} compact />
        </DialogContent>
      </Dialog>
    </>
  );
}
