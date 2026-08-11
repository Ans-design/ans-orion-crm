'use client';

import { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft, Search, Info, MoreHorizontal, PanelLeftClose, PanelLeftOpen,
  Users, Package,
} from 'lucide-react';
import type { TalkConversation } from '@/lib/hooks/use-ans-talk';
import { avatarColor, initials } from './ans-talk-utils';
import { convVisual, convToneClass } from '@/lib/ans-talk/talk-visual';

type OrderCtx = {
  numero: string;
  article: string;
  statut: string;
  clientName?: string;
} | null;

type Props = {
  conversation: TalkConversation;
  orderCtx: OrderCtx;
  chatSearch: string;
  contextOpen: boolean;
  onChatSearchChange: (v: string) => void;
  onBack?: () => void;
  onToggleContext: () => void;
  onOpenFiles?: () => void;
};

function contextSubtitle(conv: TalkConversation, orderCtx: OrderCtx): string {
  const parts: string[] = [];
  if (orderCtx?.clientName) parts.push(orderCtx.clientName);
  else if (orderCtx?.numero) parts.push(orderCtx.numero);
  else if (conv.commandeId) parts.push('Commande liée');
  else if (conv.devisId) parts.push('Devis lié');
  if (conv.members.length > 0) {
    parts.push(`${conv.members.length} membre${conv.members.length > 1 ? 's' : ''}`);
  }
  return parts.join(' · ');
}

export function TalkConversationHeader({
  conversation,
  orderCtx,
  chatSearch,
  contextOpen,
  onChatSearchChange,
  onBack,
  onToggleContext,
  onOpenFiles,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const color = avatarColor(conversation.id);
  const visual = convVisual(conversation);
  const TypeIcon = visual.icon;
  const subtitle = contextSubtitle(conversation, orderCtx);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  return (
    <header className="talk-chat-header shrink-0">
      <div className="talk-chat-header__main">
        {onBack && (
          <button type="button" className="md:hidden talk-icon-btn shrink-0" onClick={onBack} aria-label="Conversations">
            <ArrowLeft size={16} strokeWidth={1.8} />
          </button>
        )}

        <div className="talk-chat-header__avatar-wrap">
          <div className="talk-avatar shrink-0" style={{ background: color }}>
            {initials(conversation.name)}
          </div>
          <span className={`talk-conv-type-badge ${convToneClass(visual.tone)}`} title={visual.label}>
            <TypeIcon size={9} strokeWidth={2} />
          </span>
        </div>

        <div className="talk-chat-header__meta min-w-0 flex-1">
          <div className="talk-chat-header__title-row">
            <h2 className="talk-chat-header__title truncate">{conversation.name}</h2>
            <span className={`talk-header-type-chip talk-type-chip--${visual.tone}`}>
              {conversation.commandeId ? <Package size={10} strokeWidth={2} /> : <Users size={10} strokeWidth={2} />}
              {visual.label}
            </span>
          </div>
          <div className="talk-chat-header__sub">
            <span className="talk-online-dot talk-online-dot--inline" aria-hidden />
            <span className="truncate">{subtitle || 'Conversation active'}</span>
          </div>
        </div>
      </div>

      <div className="talk-chat-header__actions">
        <div className={`talk-header-search ${searchOpen || chatSearch ? 'is-open' : ''}`}>
          <button
            type="button"
            className="talk-icon-btn lg:hidden"
            aria-label="Rechercher"
            onClick={() => setSearchOpen((v) => !v)}
          >
            <Search size={15} strokeWidth={1.8} />
          </button>
          <label className="talk-header-search-field">
            <Search size={13} strokeWidth={1.8} aria-hidden />
            <input
              value={chatSearch}
              onChange={(e) => onChatSearchChange(e.target.value)}
              placeholder="Rechercher dans le fil…"
              aria-label="Rechercher dans la conversation"
            />
          </label>
        </div>

        <button
          type="button"
          className={`talk-icon-btn${contextOpen ? ' is-active' : ''}`}
          onClick={onToggleContext}
          aria-label="Informations"
          title={contextOpen ? 'Masquer le contexte' : 'Afficher le contexte'}
        >
          <Info size={16} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          className="talk-icon-btn hidden md:grid"
          onClick={onToggleContext}
          aria-label="Panneau contexte"
          title={contextOpen ? 'Masquer contexte' : 'Afficher contexte'}
        >
          {contextOpen ? <PanelLeftClose size={15} strokeWidth={1.8} /> : <PanelLeftOpen size={15} strokeWidth={1.8} />}
        </button>

        <div className="relative hidden md:block" ref={menuRef}>
          <button
            type="button"
            className={`talk-icon-btn${menuOpen ? ' is-active' : ''}`}
            aria-label="Options"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MoreHorizontal size={15} strokeWidth={1.8} />
          </button>
          {menuOpen && (
            <div className="talk-header-menu">
              <button
                type="button"
                className="talk-header-menu-item"
                onClick={() => { onOpenFiles?.(); setMenuOpen(false); }}
              >
                Fichiers &amp; médias
              </button>
              {conversation.commandeId && (
                <a href={`/commandes/${conversation.commandeId}`} className="talk-header-menu-item">
                  Ouvrir dossier commande
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
