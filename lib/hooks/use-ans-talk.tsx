'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { DEMO_CONVERSATIONS, DEMO_USERS, getDemoMessages, getDemoUnreadTotal } from '@/lib/ans-talk/demo-data';
import { canUseTalkDemoFallback, sanitizeTalkError, type TalkErrorDisplay } from '@/lib/ans-talk/error-utils';
import { ANS_TALK_POLL_MS, nextTalkPollDelayMs } from '@/lib/ans-talk/polling';
import { connectTalkStream } from '@/lib/ans-talk/talk-stream-client';
import { getApiErrorMessage, unwrapApiData } from '@/lib/api-client';
import type { TalkConversation, TalkMessage, TalkUser } from '@/lib/ans-talk/talk-types';

export type { TalkConversation, TalkMessage, TalkUser } from '@/lib/ans-talk/talk-types';

export type AnsTalkState = {
  conversations: TalkConversation[];
  messages: TalkMessage[];
  attachments: TalkMessage['attachments'];
  users: TalkUser[];
  activeConvId: string | null;
  setActiveConvId: (id: string | null) => void;
  loading: boolean;
  messagesLoading: boolean;
  error: string | null;
  errorDisplay: TalkErrorDisplay | null;
  demoMode: boolean;
  unreadTotal: number;
  reload: () => Promise<boolean>;
  sendMessage: (body: string, opts?: { replyToId?: string; attachmentIds?: string[] }) => Promise<boolean>;
  uploadFiles: (files: File[], onProgress?: (pct: number) => void) => Promise<string[]>;
  createPrivateChat: (targetUserId: string) => Promise<string | null>;
  loadMessages: (convId: string, search?: string) => Promise<void>;
  loadOlderMessages: () => Promise<void>;
  hasOlderMessages: boolean;
  createGroupChat: (name: string, memberIds: string[]) => Promise<string | null>;
  createOrderChat: (commandeId: string) => Promise<string | null>;
  /** Bulle ouverte ou panel actif → polling complet ; sinon badge non lus seulement. */
  setPollingActive: (active: boolean) => void;
};

const AnsTalkContext = createContext<AnsTalkState | null>(null);

export type AnsTalkVariant = 'bubble' | 'fullscreen';

export function AnsTalkProvider({
  children,
  variant = 'bubble',
}: {
  children: ReactNode;
  variant?: AnsTalkVariant;
}) {
  const value = useAnsTalkInternal(variant);
  return <AnsTalkContext.Provider value={value}>{children}</AnsTalkContext.Provider>;
}

function useAnsTalkContext() {
  return useContext(AnsTalkContext);
}

export function useAnsTalk() {
  const ctx = useAnsTalkContext();
  if (!ctx) {
    throw new Error('useAnsTalk doit être utilisé dans AnsTalkProvider');
  }
  return ctx;
}

function useAnsTalkInternal(variant: AnsTalkVariant): AnsTalkState {
  const [conversations, setConversations] = useState<TalkConversation[]>([]);
  const [messages, setMessages] = useState<TalkMessage[]>([]);
  const [attachments, setAttachments] = useState<TalkMessage['attachments']>([]);
  const [users, setUsers] = useState<TalkUser[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDisplay, setErrorDisplay] = useState<TalkErrorDisplay | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [pollingActive, setPollingActive] = useState(variant === 'fullscreen');
  const demoModeRef = useRef(false);

  const publishUnreadTotal = useCallback((count: number) => {
    setUnreadTotal(count);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('orion:talk-unread', { detail: { count } }),
      );
    }
  }, []);

  const activateDemoMode = useCallback(() => {
    demoModeRef.current = true;
    setDemoMode(true);
    setConversations(DEMO_CONVERSATIONS);
    setUsers(DEMO_USERS);
    publishUnreadTotal(getDemoUnreadTotal());
    setError(null);
    setErrorDisplay(null);
  }, [publishUnreadTotal]);
  const messagesAbortRef = useRef<AbortController | null>(null);
  const activeConvRef = useRef<string | null>(null);
  const reloadInFlightRef = useRef(false);
  const editingPausedRef = useRef(false);
  const sessionExpiredRef = useRef(false);
  const pollDelayRef = useRef<number>(
    variant === 'fullscreen' ? ANS_TALK_POLL_MS.active : ANS_TALK_POLL_MS.unreadOnly,
  );
  const pollingActiveRef = useRef(pollingActive);
  const variantRef = useRef(variant);
  const streamActiveRef = useRef(false);
  const lastStreamUnreadRef = useRef(-1);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);

  useEffect(() => {
    pollingActiveRef.current = pollingActive;
  }, [pollingActive]);

  useEffect(() => {
    variantRef.current = variant;
    if (variant === 'fullscreen') setPollingActive(true);
  }, [variant]);

  useEffect(() => {
    activeConvRef.current = activeConvId;
  }, [activeConvId]);

  const loadConversations = useCallback(async () => {
    if (demoModeRef.current) return;
    const r = await fetch('/api/messaging/conversations', { credentials: 'include', cache: 'no-store' });
    if (!r.ok) {
      let msg = 'Impossible de charger les conversations';
      try {
        const d = await r.json();
        msg = getApiErrorMessage(d, msg);
      } catch { /* ignore */ }
      if (r.status === 401) {
        sessionExpiredRef.current = true;
        msg = 'Session expirée — reconnectez-vous';
        setError(msg);
        setErrorDisplay(sanitizeTalkError(msg));
        return;
      }
      if (canUseTalkDemoFallback()) {
        activateDemoMode();
        return;
      }
      setError(msg);
      setErrorDisplay(sanitizeTalkError(msg));
      return;
    }
    const d = unwrapApiData<{ conversations?: TalkConversation[]; degraded?: boolean }>(await r.json());
    const list = d.conversations ?? [];
    if ((!list.length && d.degraded) && canUseTalkDemoFallback()) {
      activateDemoMode();
      return;
    }
    setConversations(list);
    setError(null);
    setErrorDisplay(null);
  }, [activateDemoMode]);

  const loadUnread = useCallback(async (): Promise<boolean> => {
    if (sessionExpiredRef.current) return true;
    const r = await fetch('/api/messaging/unread', { credentials: 'include', cache: 'no-store' });
    if (r.status === 401) {
      sessionExpiredRef.current = true;
      return false;
    }
    if (!r.ok) return false;
    const d = unwrapApiData<{ unreadCount?: number }>(await r.json());
    publishUnreadTotal(d.unreadCount ?? 0);
    return true;
  }, [publishUnreadTotal]);

  const loadUsers = useCallback(async () => {
    const r = await fetch('/api/messaging/users', { credentials: 'include', cache: 'no-store' });
    if (r.ok) {
      setUsers(unwrapApiData<TalkUser[]>(await r.json()));
    }
  }, []);

  const loadMessages = useCallback(async (convId: string, search?: string) => {
    if (demoModeRef.current) {
      setMessagesLoading(true);
      const msgs = getDemoMessages(convId);
      const filtered = search
        ? msgs.filter((m) => m.body.toLowerCase().includes(search.toLowerCase()))
        : msgs;
      setMessages(filtered);
      setAttachments(filtered.flatMap((m) => m.attachments));
      setMessagesLoading(false);
      setError(null);
      setErrorDisplay(null);
      return;
    }

    messagesAbortRef.current?.abort();
    const ac = new AbortController();
    messagesAbortRef.current = ac;
    setMessagesLoading(true);
    const qs = new URLSearchParams();
    if (search) qs.set('search', search);
    const qsStr = qs.toString() ? `?${qs.toString()}` : '';
    try {
      const r = await fetch(`/api/messaging/conversations/${convId}/messages${qsStr}`, {
        credentials: 'include',
        cache: 'no-store',
        signal: ac.signal,
      });
      if (!r.ok) {
        if (ac.signal.aborted) return;
        let msg = 'Impossible de charger les messages';
        try {
          const d = await r.json();
          if (d?.error === 'NOT_MEMBER') msg = 'Vous n\'êtes pas membre de cette conversation';
          else if (d?.error === 'NOT_FOUND') msg = 'Conversation introuvable';
          else if (typeof d?.error === 'string') msg = d.error;
        } catch { /* ignore */ }
        setError(msg);
        setErrorDisplay(sanitizeTalkError(msg));
        if (r.status === 403 || r.status === 404) {
          setActiveConvId(null);
          setMessages([]);
          setAttachments([]);
          await loadConversations();
        }
        return;
      }
      const d = await r.json();
      if (ac.signal.aborted || activeConvRef.current !== convId) return;
      const list = d.messages ?? [];
      setMessages(list);
      setAttachments(d.attachments ?? []);
      setHasOlderMessages(list.length >= 100);
      setError(null);
    } catch (e) {
      if (!ac.signal.aborted) {
        const msg = e instanceof Error ? e.message : 'Erreur réseau';
        if (canUseTalkDemoFallback()) {
          activateDemoMode();
          await loadMessages(convId, search);
          return;
        }
        setError(msg);
        setErrorDisplay(sanitizeTalkError(msg));
      }
    } finally {
      if (!ac.signal.aborted && activeConvRef.current === convId) {
        setMessagesLoading(false);
      }
    }
  }, [loadConversations, activateDemoMode]);

  const reload = useCallback(async (): Promise<boolean> => {
    if (demoModeRef.current) {
      setConversations(DEMO_CONVERSATIONS);
      if (activeConvRef.current) {
        const msgs = getDemoMessages(activeConvRef.current);
        setMessages(msgs);
        setAttachments(msgs.flatMap((m) => m.attachments));
      }
      return true;
    }
    if (reloadInFlightRef.current || editingPausedRef.current) return true;
    reloadInFlightRef.current = true;
    try {
      await loadConversations();
      const unreadOk = await loadUnread();
      if (activeConvRef.current) await loadMessages(activeConvRef.current);
      return unreadOk;
    } catch {
      return false;
    } finally {
      reloadInFlightRef.current = false;
    }
  }, [loadConversations, loadMessages, loadUnread]);

  useEffect(() => {
    setLoading(true);
    /** FAB / bubble : badge non-lus seulement — conversations + users au fullscreen. */
    const boot =
      variant === 'fullscreen'
        ? Promise.all([loadConversations(), loadUnread(), loadUsers()])
        : loadUnread();
    boot.finally(() => setLoading(false));
  }, [variant, loadConversations, loadUnread, loadUsers]);

  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      setAttachments([]);
      setMessagesLoading(false);
      return;
    }
    setMessages([]);
    setAttachments([]);
    loadMessages(activeConvId);
  }, [activeConvId, loadMessages]);

  const pollTick = useCallback(async (): Promise<boolean> => {
    if (sessionExpiredRef.current) return true;
    const active = pollingActiveRef.current || variantRef.current === 'fullscreen';
    /** SSE actif en mode badge — évite le polling HTTP redondant des non-lus. */
    if (!active && streamActiveRef.current) return true;
    if (active) return reload();
    return loadUnread();
  }, [reload, loadUnread]);

  useEffect(() => {
    if (demoMode || sessionExpiredRef.current) {
      streamActiveRef.current = false;
      return;
    }
    const cleanup = connectTalkStream({
      onUnread: (count) => {
        publishUnreadTotal(count);
        if (
          count !== lastStreamUnreadRef.current
          && (pollingActiveRef.current || variantRef.current === 'fullscreen')
        ) {
          void reload();
        }
        lastStreamUnreadRef.current = count;
      },
      onConnected: () => {
        streamActiveRef.current = true;
      },
      onDisconnected: () => {
        streamActiveRef.current = false;
      },
    });
    return cleanup;
  }, [demoMode, reload, publishUnreadTotal]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = (delayMs: number) => {
      if (cancelled) return;
      timer = setTimeout(async () => {
        if (cancelled || sessionExpiredRef.current) return;
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
          schedule(pollDelayRef.current);
          return;
        }
        const ok = await pollTick().catch(() => false);
        pollDelayRef.current = nextTalkPollDelayMs(
          pollDelayRef.current,
          !ok,
          pollingActiveRef.current || variantRef.current === 'fullscreen',
        );
        schedule(pollDelayRef.current);
      }, delayMs);
    };

    schedule(pollDelayRef.current);

    const onWake = () => {
      if (sessionExpiredRef.current || cancelled) return;
      void pollTick().finally(() => schedule(pollDelayRef.current));
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') onWake();
    };
    window.addEventListener('focus', onWake);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener('focus', onWake);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pollTick]);

  const sendMessage = async (body: string, opts?: { replyToId?: string; attachmentIds?: string[] }) => {
    if (!activeConvId) return false;
    const convId = activeConvId;
    if (demoModeRef.current) {
      const newMsg: TalkMessage = {
        id: `demo-local-${Date.now()}`,
        conversationId: convId,
        senderId: 'local-admin',
        senderName: 'Vous',
        senderRole: 'admin',
        body,
        createdAt: new Date().toISOString(),
        editedAt: null,
        pinned: false,
        replyToId: opts?.replyToId ?? null,
        replyTo: null,
        reads: [],
        ackedBy: [],
        isMine: true,
        reactions: {},
        attachments: [],
        tasks: [],
      };
      setMessages((prev) => [...prev, newMsg]);
      return true;
    }

    const tempId = `pending-${Date.now()}`;
    const optimistic: TalkMessage = {
      id: tempId,
      conversationId: convId,
      senderId: null,
      senderName: 'Vous',
      senderRole: null,
      body,
      createdAt: new Date().toISOString(),
      editedAt: null,
      pinned: false,
      replyToId: opts?.replyToId ?? null,
      replyTo: null,
      reads: [],
      ackedBy: [],
      isMine: true,
      reactions: {},
      attachments: [],
      tasks: [],
    };
    setMessages((prev) => [...prev, optimistic]);
    setConversations((prev) => prev.map((c) => (
      c.id === convId
        ? {
            ...c,
            updatedAt: new Date().toISOString(),
            lastMessage: { id: tempId, body: body.slice(0, 160), senderName: 'Vous', createdAt: optimistic.createdAt },
          }
        : c
    )));

    const r = await fetch(`/api/messaging/conversations/${convId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ body, ...opts }),
    });
    if (!r.ok) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      try {
        const d = await r.json();
        if (d?.error) setError(getApiErrorMessage(d, 'Envoi impossible'));
      } catch { /* ignore */ }
      return false;
    }
    const saved = unwrapApiData<TalkMessage>(await r.json());
    setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...saved, isMine: true } : m)));
    void loadConversations();
    return true;
  };

  const loadOlderMessages = useCallback(async () => {
    if (!activeConvRef.current || demoModeRef.current || messages.length === 0) return;
    const oldest = messages[0];
    if (!oldest) return;
    const convId = activeConvRef.current;
    const r = await fetch(
      `/api/messaging/conversations/${convId}/messages?before=${encodeURIComponent(oldest.createdAt)}&limit=50`,
      { credentials: 'include', cache: 'no-store' },
    );
    if (!r.ok) return;
    const d = await r.json();
    const older = (d.messages ?? []) as TalkMessage[];
    if (older.length < 50) setHasOlderMessages(false);
    setMessages((prev) => [...older.filter((m) => !prev.some((p) => p.id === m.id)), ...prev]);
  }, [messages]);

  const uploadFiles = async (files: File[], onProgress?: (pct: number) => void) => {
    if (!activeConvId || !files.length) return [];
    const form = new FormData();
    form.set('conversationId', activeConvId);
    files.forEach((f, i) => form.set(`file${i}`, f));
    onProgress?.(10);
    const r = await fetch('/api/messaging/upload', { method: 'POST', credentials: 'include', body: form });
    onProgress?.(100);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw new Error(getApiErrorMessage(d, 'Échec upload'));
    }
    const d = unwrapApiData<{ attachments?: { id: string }[] }>(await r.json());
    return (d.attachments ?? []).map((a) => a.id);
  };

  const createPrivateChat = async (targetUserId: string) => {
    const r = await fetch('/api/messaging/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ type: 'private', targetUserId }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setError(getApiErrorMessage(d, 'Impossible de créer le chat privé'));
      return null;
    }
    const conv = unwrapApiData<{ id: string }>(await r.json());
    await loadConversations();
    setActiveConvId(conv.id);
    return conv.id;
  };

  const createGroupChat = async (name: string, memberIds: string[]) => {
    const r = await fetch('/api/messaging/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ type: 'group', name, memberIds }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setError(getApiErrorMessage(d, 'Impossible de créer le groupe'));
      return null;
    }
    const conv = unwrapApiData<{ id: string }>(await r.json());
    await loadConversations();
    setActiveConvId(conv.id);
    return conv.id;
  };

  const createOrderChat = async (commandeId: string) => {
    const r = await fetch('/api/messaging/conversations/create-from-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ commandeId }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setError(getApiErrorMessage(d, 'Impossible de créer le dossier commande'));
      return null;
    }
    const conv = unwrapApiData<{ id: string }>(await r.json());
    await loadConversations();
    setActiveConvId(conv.id);
    return conv.id;
  };

  return {
    conversations,
    messages,
    attachments,
    users,
    activeConvId,
    setActiveConvId,
    loading,
    messagesLoading,
    error,
    errorDisplay,
    demoMode,
    unreadTotal,
    reload,
    sendMessage,
    uploadFiles,
    createPrivateChat,
    createGroupChat,
    createOrderChat,
    loadMessages,
    loadOlderMessages,
    hasOlderMessages,
    setPollingActive,
  };
}
