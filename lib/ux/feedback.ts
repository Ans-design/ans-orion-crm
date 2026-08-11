import toast from 'react-hot-toast';
import { toUserError, UX_MSG, classifyFetchError } from '@/lib/ux/messages';

const SUCCESS_MS = 3800;
const ERROR_MS = 4500;
const WARN_MS = 4000;
const INFO_MS = 3200;

type ToastOpts = { duration?: number; id?: string; icon?: string };

function withVariant(
  message: string,
  variant: 'default' | 'success' | 'error' | 'info' | 'warn' | 'loading',
  opts?: ToastOpts & { duration?: number },
) {
  const { icon, duration, id } = opts ?? {};
  return toast(message, {
    id,
    duration,
    icon,
    className: `orion-toast orion-toast--${variant}`,
    style: {
      background: undefined,
      color: undefined,
      border: undefined,
      boxShadow: undefined,
    },
  });
}

export const uxToast = {
  success(message: string, opts?: ToastOpts) {
    return withVariant(message, 'success', {
      ...opts,
      duration: opts?.duration ?? SUCCESS_MS,
      icon: opts?.icon ?? '✓',
    });
  },
  error(raw: unknown, fallback?: string) {
    const msg = classifyFetchError(raw, fallback ?? UX_MSG.loadFailed);
    return withVariant(msg, 'error', { duration: ERROR_MS, icon: '✕' });
  },
  /** Alerte non bloquante (stock bas, sync partielle, etc.) — HTML v29 toast orange. */
  warn(message: string, opts?: ToastOpts) {
    return withVariant(message, 'warn', {
      ...opts,
      duration: opts?.duration ?? WARN_MS,
      icon: opts?.icon ?? '⚠',
    });
  },
  info(message: string, opts?: ToastOpts | string) {
    const normalized: ToastOpts =
      typeof opts === 'string' ? { icon: opts } : (opts ?? {});
    return withVariant(message, 'info', {
      ...normalized,
      duration: normalized.duration ?? INFO_MS,
      icon: normalized.icon ?? 'ℹ️',
    });
  },
  loading(message: string, id?: string) {
    return withVariant(message, 'loading', { duration: Infinity, id, icon: '⏳' });
  },
  dismiss(id?: string) {
    toast.dismiss(id);
  },
  promise<T>(
    promise: Promise<T>,
    msgs: { loading: string; success: string; error?: string },
    id?: string,
  ) {
    const loadingId = id ?? `promise-${Date.now()}`;
    uxToast.loading(msgs.loading, loadingId);
    return promise
      .then((value) => {
        uxToast.success(msgs.success, { id: loadingId });
        return value;
      })
      .catch((e) => {
        const msg = classifyFetchError(e, msgs.error ?? UX_MSG.loadFailed);
        withVariant(msg, 'error', { duration: ERROR_MS, id: loadingId, icon: '✕' });
        throw e;
      });
  },
};

export { toUserError, UX_MSG, classifyFetchError };
