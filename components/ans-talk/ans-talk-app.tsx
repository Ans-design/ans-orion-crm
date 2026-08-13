'use client';



import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { useSession } from 'next-auth/react';

import { uxToast } from '@/lib/ux/feedback';
import { unwrapApiData } from '@/lib/api-client';

import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

import { useAnsTalk } from '@/lib/hooks/use-ans-talk';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

import { AnsTalkShell } from './ans-talk-shell';

import { TalkConversationList, type ConvFilterTab } from './talk-conversation-list';
import { filterConversations } from './talk-filters';

import { TalkConversationHeader } from './talk-conversation-header';

import { TalkMessageList } from './talk-message-list';

import { TalkComposer } from './talk-composer';

import { TalkEmptyState } from './talk-empty-state';

import { TalkErrorState } from './talk-error-state';

import { AnsTalkContextPanel } from './ans-talk-context-panel';

import { TalkNewMessageModal } from './talk-new-message-modal';



type Props = {

  initialConvId?: string | null;

  compact?: boolean;

};



type OrderCtx = {

  numero: string;

  article: string;

  statut: string;

  quantite?: number;

  dimensions?: string;

  clientName?: string;

} | null;



export function AnsTalkApp({ initialConvId, compact }: Props) {

  const router = useRouter();

  const searchParams = useSearchParams();

  const { data: session } = useSession();

  const userRole = (session?.user as { role?: string })?.role || 'user';

  const canModerate = userRole === 'admin' || userRole === 'manager';



  const {

    conversations, messages, users, activeConvId, setActiveConvId,

    loading, messagesLoading, errorDisplay, demoMode, sendMessage, uploadFiles, createPrivateChat, createGroupChat, createOrderChat, reload,
    loadOlderMessages, hasOlderMessages,
  } = useAnsTalk();



  const [filter, setFilter] = useState<ConvFilterTab>('all');

  const [search, setSearch] = useState('');
  const [chatSearch, setChatSearch] = useState('');

  const [input, setInput] = useState('');

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const [replyTo, setReplyTo] = useState<{ id: string; body: string; senderName: string } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [editText, setEditText] = useState('');

  const [uploadPct, setUploadPct] = useState<number | null>(null);

  const [dragOver, setDragOver] = useState(false);

  const [showNewModal, setShowNewModal] = useState(false);
  const [newModalView, setNewModalView] = useState<'pick' | 'private' | 'group' | 'order'>('pick');
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);

  const [contextOpen, setContextOpen] = useState(true);

  const [mobileShowInbox, setMobileShowInbox] = useState(!initialConvId);

  const [recording, setRecording] = useState(false);

  const [galleryRefreshKey, setGalleryRefreshKey] = useState(0);

  const [orderCtx, setOrderCtx] = useState<OrderCtx>(null);



  const endRef = useRef<HTMLDivElement>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const voiceChunksRef = useRef<Blob[]>([]);

  const initialConvApplied = useRef(false);

  const commandeDeeplinkTried = useRef<string | null>(null);

  const dragCounter = useRef(0);



  useEffect(() => {

    if (initialConvId && !initialConvApplied.current) {

      setActiveConvId(initialConvId);

      setMobileShowInbox(false);

      initialConvApplied.current = true;

    } else if (!activeConvId && conversations.length && !initialConvApplied.current) {

      setActiveConvId(conversations[0].id);

    }

  }, [initialConvId, conversations, activeConvId, setActiveConvId]);



  useEffect(() => {

    const urlConv = searchParams.get('conv');

    const urlDevis = searchParams.get('devis');

    const urlCommande = searchParams.get('commande') || searchParams.get('commandeId');

    if (urlDevis && !loading) {

      const match = conversations.find((c) => c.devisId === urlDevis);

      if (match) { setActiveConvId(match.id); setMobileShowInbox(false); return; }

    }

    if (urlCommande && !loading) {

      const match = conversations.find((c) => c.commandeId === urlCommande);

      if (match) {

        if (match.id !== activeConvId) {

          setActiveConvId(match.id);

          setMobileShowInbox(false);

        }

        if (!urlConv) {

          router.replace(`/messagerie?conv=${encodeURIComponent(match.id)}`, { scroll: false });

        }

        return;

      }

      // Groupe pas encore en inbox → création à la volée (une seule tentative / id)

      if (commandeDeeplinkTried.current === urlCommande) return;

      commandeDeeplinkTried.current = urlCommande;

      void createOrderChat(urlCommande).then((id) => {

        if (!id) {

          commandeDeeplinkTried.current = null;

          return;

        }

        setActiveConvId(id);

        setMobileShowInbox(false);

        router.replace(`/messagerie?conv=${encodeURIComponent(id)}`, { scroll: false });

        void reload();

      });

      return;

    }

    if (urlConv && urlConv !== activeConvId && !loading) {

      if (conversations.some((c) => c.id === urlConv)) {

        setActiveConvId(urlConv);

        setMobileShowInbox(false);

      } else if (conversations.length) {

        router.replace('/messagerie', { scroll: false });

        setActiveConvId(conversations[0].id);

      }

    }

  }, [
    searchParams,
    activeConvId,
    setActiveConvId,
    conversations,
    loading,
    router,
    createOrderChat,
    reload,
  ]);



  useEffect(() => {

    if (!activeConvId || loading) return;

    if (conversations.length && !conversations.some((c) => c.id === activeConvId)) {

      setActiveConvId(conversations[0]?.id ?? null);

    }

  }, [conversations, activeConvId, loading, setActiveConvId]);



  useEffect(() => {

    setReplyTo(null);

    setChatSearch('');

    setEditingId(null);

    setEditText('');

    setPendingFiles([]);

    setUploadPct(null);

  }, [activeConvId]);



  const prevMsgLenRef = useRef(0);
  const prevConvForScrollRef = useRef<string | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const convChanged = prevConvForScrollRef.current !== activeConvId;
    const grew = messages.length > prevMsgLenRef.current;
    prevConvForScrollRef.current = activeConvId;
    prevMsgLenRef.current = messages.length;
    if (!convChanged && !grew) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (convChanged || nearBottom) {
      endRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
    }
  }, [messages.length, activeConvId]);



  const activeConv = conversations.find((c) => c.id === activeConvId);
  const filteredConversations = filterConversations(conversations, filter, search);



  useEffect(() => {

    if (!activeConv?.commandeId || demoMode) {

      setOrderCtx(null);

      return;

    }

    const ac = new AbortController();

    fetch(`/api/commandes/${activeConv.commandeId}/overview`, { credentials: 'include', signal: ac.signal })

      .then((r) => (r.ok ? r.json() : null))

      .then((body) => {
        const d = body ? unwrapApiData<{
          commande?: {
            numero: string;
            article: string;
            statut: string;
            client?: { name?: string };
            lignes?: { label?: string; quantity?: number; articleLabel?: string }[];
          };
        }>(body) : null;

        if (!d?.commande) return;

        const c = d.commande;

        const ligne = c.lignes?.[0];

        setOrderCtx({

          numero: c.numero,

          article: c.article,

          statut: c.statut,

          quantite: ligne?.quantity,

          dimensions: ligne?.articleLabel?.match(/\d+\s*x\s*\d+/i)?.[0],

          clientName: c.client?.name,

        });

      })

      .catch(() => { if (!ac.signal.aborted) setOrderCtx(null); });

    return () => ac.abort();

  }, [activeConv?.commandeId, demoMode]);



  const visibleMessages = chatSearch

    ? messages.filter((m) => m.body.toLowerCase().includes(chatSearch.toLowerCase()))

    : messages;

  const pinnedMessages = visibleMessages.filter((m) => m.pinned);

  const regularMessages = visibleMessages.filter((m) => !m.pinned);



  const handleSend = async () => {

    if (!input.trim() && !pendingFiles.length) return;

    try {

      let attachmentIds: string[] = [];

      if (pendingFiles.length) {

        setUploadPct(0);

        attachmentIds = await uploadFiles(pendingFiles, setUploadPct);

        setUploadPct(null);

      }

      const ok = await sendMessage(input.trim() || '📎 Fichier joint', {

        replyToId: replyTo?.id,

        attachmentIds: attachmentIds.length ? attachmentIds : undefined,

      });

      if (ok) {

        setInput('');

        setReplyTo(null);

        setPendingFiles([]);

        setGalleryRefreshKey((k) => k + 1);

      } else uxToast.error('Envoi impossible');

    } catch (e) {

      uxToast.error(e instanceof Error ? e.message : 'Erreur upload');

      setUploadPct(null);

    }

  };



  const onDrop = useCallback((files: FileList | File[]) => {

    if (!activeConvId) return;

    setPendingFiles((prev) => [...prev, ...Array.from(files)]);

  }, [activeConvId]);



  const saveEdit = async (messageId: string) => {

    if (demoMode) { setEditingId(null); return; }

    const r = await fetch(`/api/messaging/messages/${messageId}`, {

      method: 'PATCH',

      headers: { 'Content-Type': 'application/json' },

      credentials: 'include',

      body: JSON.stringify({ body: editText }),

    });

    if (r.ok) { setEditingId(null); reload(); }

    else uxToast.error('Modification refusée');

  };



  const deleteMsg = async (messageId: string) => {
    if (demoMode) return;
    setDeleteMessageId(messageId);
  };

  const confirmDeleteMsg = async () => {
    if (!deleteMessageId) return;
    const messageId = deleteMessageId;
    setDeleteMessageId(null);
    const r = await fetch(`/api/messaging/messages/${messageId}`, { method: 'DELETE', credentials: 'include' });
    if (r.ok) reload();
    else uxToast.error('Suppression refusée');
  };



  const createTask = async (messageId: string, defaultTitle: string) => {

    if (demoMode) { uxToast.success('Tâche créée (démo)'); return; }

    const title = window.prompt('Titre de la tâche', defaultTitle);

    if (!title?.trim()) return;

    const r = await fetch(`/api/messaging/messages/${messageId}/create-task`, {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      credentials: 'include',

      body: JSON.stringify({ title: title.trim(), commandeId: activeConv?.commandeId }),

    });

    if (r.ok) { uxToast.success('Tâche créée'); reload(); }

    else uxToast.error('Création tâche impossible');

  };



  const ackMsg = async (messageId: string) => {

    if (demoMode) return;

    const r = await fetch(`/api/messaging/messages/${messageId}/read`, { method: 'POST', credentials: 'include' });

    if (r.ok) reload();

    else uxToast.error('Accusé impossible');

  };



  const togglePin = async (messageId: string, pinned: boolean) => {

    if (demoMode) return;

    const r = await fetch(`/api/messaging/messages/${messageId}/pin`, {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      credentials: 'include',

      body: JSON.stringify({ pinned }),

    });

    if (r.ok) reload();

    else uxToast.error('Épinglage refusé');

  };



  const toggleReaction = async (messageId: string, emoji: string) => {

    if (demoMode) return;

    const r = await fetch(`/api/messaging/messages/${messageId}/reactions`, {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      credentials: 'include',

      body: JSON.stringify({ emoji }),

    });

    if (r.ok) reload();

  };



  const onAttachmentStatus = async (id: string, status: string) => {

    if (demoMode) return;

    const r = await fetch(`/api/messaging/attachments/${id}/status`, {

      method: 'PATCH',

      headers: { 'Content-Type': 'application/json' },

      credentials: 'include',

      body: JSON.stringify({ status }),

    });

    if (r.ok) reload();

    else uxToast.error('Changement de statut refusé');

  };



  const selectConv = (id: string) => {

    setActiveConvId(id);

    setMobileShowInbox(false);

    const tab = searchParams.get('tab');

    const qs = tab === 'annonces' ? `?tab=annonces&conv=${id}` : `?conv=${id}`;

    router.replace(`/messagerie${qs}`, { scroll: false });

  };



  const toggleVoiceRecord = async () => {

    if (recording) { mediaRecorderRef.current?.stop(); return; }

    try {

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mr = new MediaRecorder(stream);

      voiceChunksRef.current = [];

      mr.ondataavailable = (e) => { if (e.data.size) voiceChunksRef.current.push(e.data); };

      mr.onstop = () => {

        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(voiceChunksRef.current, { type: 'audio/webm' });

        const file = new File([blob], `vocal-${Date.now()}.webm`, { type: 'audio/webm' });

        setPendingFiles((p) => [...p, file]);

        setRecording(false);

        uxToast.success('Message vocal prêt à envoyer');

      };

      mediaRecorderRef.current = mr;

      mr.start();

      setRecording(true);

    } catch {

      uxToast.error('Micro inaccessible');

    }

  };



  const shellHeight = compact ? 'h-[70vh]' : 'h-full';

  const showContext = contextOpen && Boolean(activeConv);



  return (

    <AnsTalkShell demoMode={demoMode} className={shellHeight}>

      {errorDisplay && (

        <div className="absolute top-10 left-0 right-0 z-20">

          <TalkErrorState error={errorDisplay} demoMode={demoMode} onRetry={() => reload()} />

        </div>

      )}



      <div
        className={cn(
          'talk-workspace',
          showContext && 'talk-workspace--with-context',
        )}
      >
        {showContext && (
          <>
            <button
              type="button"
              className="md:hidden fixed inset-0 z-20 bg-black/40 backdrop-blur-[2px]"
              aria-label="Fermer le contexte"
              onClick={() => setContextOpen(false)}
            />
            <div
              className={cn(
                'talk-workspace__context flex flex-col h-full min-h-0',
                'fixed inset-y-0 left-0 z-30 w-[min(350px,92vw)] md:static md:z-auto md:w-auto shrink-0',
                'ans-talk-mobile-context',
              )}
            >
              <AnsTalkContextPanel
                conv={activeConv!}
                messages={messages}
                galleryRefreshKey={galleryRefreshKey}
                orderCtx={orderCtx}
                userRole={userRole}
                onStatusChange={onAttachmentStatus}
                users={users}
                currentUserId={session?.user?.id}
                inboxFilter={filter}
                onMessageUser={async (userId) => {
                  if (demoMode) {
                    uxToast.success('Conversation ouverte (démo)');
                    return;
                  }
                  const id = await createPrivateChat(userId);
                  if (id) {
                    uxToast.success('Conversation ouverte');
                    setMobileShowInbox(false);
                  } else {
                    uxToast.error('Impossible d’ouvrir la discussion');
                  }
                }}
              />
            </div>
          </>
        )}

        <main
          className={cn(
            'talk-workspace__chat talk-chat-zone flex flex-col min-w-0 min-h-0 ans-talk-mobile-chat',
            compact ? 'flex' : mobileShowInbox ? 'hidden md:flex' : 'flex',
          )}
          onDragEnter={(e) => { e.preventDefault(); dragCounter.current += 1; setDragOver(true); }}
          onDragLeave={() => { dragCounter.current -= 1; if (dragCounter.current <= 0) { dragCounter.current = 0; setDragOver(false); } }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            dragCounter.current = 0;
            setDragOver(false);
            if (e.dataTransfer.files.length) onDrop(e.dataTransfer.files);
          }}
        >

          {activeConv ? (

            <>

              <TalkConversationHeader

                conversation={activeConv}

                orderCtx={orderCtx}

                chatSearch={chatSearch}

                contextOpen={contextOpen}

                onChatSearchChange={setChatSearch}

                onBack={() => setMobileShowInbox(true)}

                onToggleContext={() => setContextOpen((v) => !v)}
                onOpenFiles={() => setContextOpen(true)}

              />

              <div className="talk-msg-wrap flex-1 min-h-0 relative flex flex-col">
              <TalkMessageList
                messages={visibleMessages}
                pinnedMessages={pinnedMessages}
                regularMessages={regularMessages}
                loading={messagesLoading}
                hasOlder={hasOlderMessages}
                onLoadOlder={() => void loadOlderMessages()}

                dragOver={dragOver}

                sessionUserId={session?.user?.id}

                canModerate={canModerate}

                editingId={editingId}

                editText={editText}

                commandeId={activeConv.commandeId}

                onEditTextChange={setEditText}

                onSaveEdit={saveEdit}

                onStartEdit={(id, body) => { setEditingId(id); setEditText(body); }}

                onDelete={deleteMsg}

                onReply={setReplyTo}

                onAck={ackMsg}

                onTogglePin={togglePin}

                onToggleReaction={toggleReaction}

                onCreateTask={createTask}

                scrollRef={scrollRef}

                endRef={endRef}

              />

                <div className="talk-msg-fade" aria-hidden />
              </div>

              <TalkComposer
                input={input}
                pendingFiles={pendingFiles}
                uploadPct={uploadPct}
                recording={recording}
                replyTo={replyTo}
                onInputChange={setInput}
                onSend={handleSend}
                onFilesSelected={(files) => setPendingFiles((p) => [...p, ...files])}
                onRemoveFile={(i) => setPendingFiles((p) => p.filter((_, j) => j !== i))}
                onClearReply={() => setReplyTo(null)}
                onToggleVoice={toggleVoiceRecord}
                onMentionGraphistes={() => setInput((v) => `${v}@graphistes `)}
                onNewMessage={() => { setNewModalView('pick'); setShowNewModal(true); }}
              />

            </>

          ) : (

            <TalkEmptyState

              onNewConversation={() => { setNewModalView('pick'); setShowNewModal(true); }}

              onNewGroup={() => { setNewModalView('group'); setShowNewModal(true); }}

            />

          )}

        </main>

        <div
          className={cn(
            'talk-workspace__inbox flex flex-col h-full min-h-0 shrink-0',
            compact ? 'hidden md:flex' : mobileShowInbox ? 'flex ans-talk-mobile-list' : 'hidden md:flex',
            'fixed inset-y-0 right-0 z-10 w-full md:static md:z-auto md:w-auto',
          )}
        >
          {mobileShowInbox && !compact && (
            <button
              type="button"
              className="md:hidden absolute top-2.5 left-2.5 z-20 talk-icon-btn bg-[var(--talk-surface)] border border-[var(--talk-line)]"
              onClick={() => setMobileShowInbox(false)}
              aria-label="Fermer la liste"
            >
              <X size={16} />
            </button>
          )}
          <TalkConversationList
            conversations={filteredConversations}
            activeConvId={activeConvId}
            loading={loading}
            filter={filter}
            search={search}
            compact={compact}
            onFilterChange={setFilter}
            onSearchChange={setSearch}
            onSelectConv={selectConv}
            onNewGroup={() => { setNewModalView('group'); setShowNewModal(true); }}
          />
        </div>

      </div>



      <TalkNewMessageModal
        open={showNewModal}
        initialView={newModalView}
        users={users}
        onClose={() => setShowNewModal(false)}
        onCreatePrivate={async (userId) => {
          if (demoMode) { uxToast.success('Conversation ouverte (démo)'); setShowNewModal(false); return 'demo'; }
          const id = await createPrivateChat(userId);
          if (id) uxToast.success('Conversation ouverte');
          return id;
        }}
        onCreateGroup={async (name, memberIds) => {
          if (demoMode) { uxToast.success('Groupe créé (démo)'); setShowNewModal(false); return 'demo'; }
          if (!memberIds.length) { uxToast.error('Au moins un membre requis'); return null; }
          const id = await createGroupChat(name, memberIds);
          if (id) uxToast.success('Groupe créé');
          else uxToast.error('Création impossible');
          return id;
        }}
        onCreateOrder={async (commandeId) => {
          if (demoMode) { uxToast.success('Dossier ouvert (démo)'); setShowNewModal(false); return 'demo'; }
          const id = await createOrderChat(commandeId);
          if (id) uxToast.success('Dossier commande ouvert');
          else uxToast.error('Création impossible');
          return id;
        }}
        onOpenAnnonces={() => router.push('/messagerie?tab=annonces')}
      />

      <ConfirmDialog
        open={Boolean(deleteMessageId)}
        onOpenChange={(open) => { if (!open) setDeleteMessageId(null); }}
        title="Confirmer la suppression"
        description="Cette action va supprimer ce message. Cette opération peut être irréversible."
        confirmLabel="Supprimer définitivement"
        cancelLabel="Annuler"
        variant="destructive"
        onConfirm={confirmDeleteMsg}
      />

    </AnsTalkShell>

  );

}


