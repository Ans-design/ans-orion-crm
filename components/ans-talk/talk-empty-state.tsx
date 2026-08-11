'use client';



import { MessageSquarePlus, Users } from 'lucide-react';



type Props = {

  onNewConversation: () => void;

  onNewGroup: () => void;

};



export function TalkEmptyState({ onNewConversation, onNewGroup }: Props) {

  return (

    <div className="talk-empty flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">

      <div className="talk-empty-icon mb-4 flex h-11 w-11 items-center justify-center rounded-[7px]">

        <MessageSquarePlus size={20} className="text-[var(--orion-red-vivid)]" strokeWidth={1.75} />

      </div>

      <h3 className="text-sm font-semibold text-foreground">Sélectionnez une conversation</h3>

      <p className="mt-1.5 max-w-xs text-xs text-muted-foreground leading-5">

        Choisissez un canal dans la liste ou démarrez un nouvel échange.

      </p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">

        <button type="button" onClick={onNewConversation} className="talk-btn-primary px-4 py-2 text-xs font-semibold rounded-lg">

          Nouveau message

        </button>

        <button type="button" onClick={onNewGroup} className="talk-btn-ghost px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 rounded-lg">

          <Users size={14} strokeWidth={1.75} /> Groupe

        </button>

      </div>

    </div>

  );

}


