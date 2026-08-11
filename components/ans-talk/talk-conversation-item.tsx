'use client';

import type { TalkConversation } from '@/lib/hooks/use-ans-talk';
import { avatarColor, initials } from './ans-talk-utils';
import { convPriority, convPriorityLabel, convSlaInfo, convToneClass, convVisual } from '@/lib/ans-talk/talk-visual';
import { Zap, AlertTriangle, Building2, Users } from 'lucide-react';

type Props = {
  conversation: TalkConversation;
  isActive: boolean;
  onSelect: () => void;
};

function formatConvTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  ) {
    return 'Hier';
  }
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function isRecentlyActive(c: TalkConversation): boolean {
  const iso = c.lastMessage?.createdAt ?? c.updatedAt;
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < 30 * 60 * 1000;
}

export function TalkConversationItem({ conversation: c, isActive, onSelect }: Props) {
  const visual = convVisual(c);
  const priority = visual.kind === 'client' ? convPriority(c) : null;
  const TypeIcon = visual.icon;
  const color = avatarColor(c.id);
  const hasUnread = c.unreadCount > 0;
  const online = isRecentlyActive(c) && visual.kind === 'team';
  const timeIso = c.lastMessage?.createdAt ?? c.updatedAt;
  const time = timeIso ? formatConvTime(timeIso) : '';
  const preview = c.lastMessage?.body?.trim() || 'Aucun nouveau message';
  const previewPrefix = c.lastMessage?.senderName ? `${c.lastMessage.senderName.split(' ')[0]} : ` : '';
  const isClient = visual.kind === 'client';
  const sla = priority ? convSlaInfo(c, priority) : null;

  const rowClass = [
    'talk-conv-row',
    `talk-conv-row--${visual.kind}`,
    `talk-conv-row--tone-${visual.tone}`,
    priority && `talk-conv-row--prio-${priority}`,
    sla?.overdue && 'talk-conv-row--sla-overdue',
    isActive && 'talk-conv-row--active',
    hasUnread && 'talk-conv-row--unread',
    c.noResponse && 'talk-conv-row--alert',
    c.pinned && 'talk-conv-row--pinned',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" onClick={onSelect} className={rowClass}>
      <div className="talk-conv-avatar-wrap">
        <div
          className={[
            'talk-avatar',
            isClient ? 'talk-avatar--client' : 'talk-avatar--team',
            priority ? `talk-avatar--prio-${priority}` : '',
            sla?.overdue ? 'talk-avatar--prio-urgent' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{ background: isClient ? undefined : color }}
        >
          {isClient ? <TypeIcon size={15} strokeWidth={1.9} /> : initials(c.name)}
        </div>
        {online && (
          <span className="talk-online-dot" title="Actif récemment" role="img" aria-label="Actif récemment" />
        )}
        <span className={`talk-conv-type-badge ${convToneClass(visual.tone)}`} title={visual.label}>
          <TypeIcon size={9} strokeWidth={2} />
        </span>
      </div>

      <div className="min-w-0 talk-conv-main">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`talk-conv-name truncate ${hasUnread ? 'is-unread' : ''}`}>
            {c.name}
          </span>
          {c.noResponse && (
            <span className="talk-alert-chip" title="Sans réponse">
              <AlertTriangle size={9} strokeWidth={2.2} />
            </span>
          )}
        </div>
        <p className={`talk-conv-preview truncate ${hasUnread ? 'is-unread' : ''}`}>
          {previewPrefix}
          {preview}
        </p>
        <div className="talk-conv-tags">
          {priority && (
            <span className={`talk-prio-chip talk-prio-chip--${priority}`}>
              {convPriorityLabel(priority)}
            </span>
          )}
          {sla && (
            <span
              className={`talk-sla-chip${sla.overdue ? ' talk-sla-chip--overdue' : ''}`}
              title="Délai indicatif réponse / récupération client"
            >
              {sla.label}
            </span>
          )}
          <span className={`talk-kind-chip talk-kind-chip--${visual.kind}`}>
            {isClient ? <Building2 size={9} strokeWidth={2.2} /> : <Users size={9} strokeWidth={2.2} />}
            {isClient ? 'Client' : visual.kind === 'announce' ? 'Annonce' : 'Interne'}
          </span>
          <span className={`talk-type-chip talk-type-chip--${visual.tone}`}>{visual.label}</span>
          {c.pinned && (
            <span className="talk-type-chip talk-type-chip--pinned">
              <Zap size={9} strokeWidth={2} /> Épinglé
            </span>
          )}
          {c.noResponse && <span className="talk-type-chip talk-type-chip--alert">Sans réponse</span>}
        </div>
      </div>

      <div className="talk-conv-meta">
        {time && <span className={`talk-conv-time ${hasUnread ? 'is-unread' : ''}`}>{time}</span>}
        {hasUnread ? (
          <span className="talk-unread-badge">{c.unreadCount > 99 ? '99+' : c.unreadCount}</span>
        ) : c.pinned ? (
          <Zap size={12} className="text-[var(--talk-primary)]" strokeWidth={2} aria-hidden />
        ) : null}
      </div>
    </button>
  );
}
