import { useState } from 'react';
import { Users, KeyRound, Plus } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useCreateTeam, useJoinTeam } from '../hooks/useTeams';
import { useUiStore } from '@/stores/uiStore';
import { ApiError } from '@/lib/apiClient';

export function CreateOrJoinTeam() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const createTeam = useCreateTeam();
  const joinTeam = useJoinTeam();
  const pushToast = useUiStore((s) => s.pushToast);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const team = await createTeam.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
      pushToast({ title: 'Team created', description: `Welcome to ${team.name}.`, variant: 'success' });
    } catch (err) {
      pushToast({ title: 'Could not create team', description: messageOf(err), variant: 'error' });
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    try {
      const team = await joinTeam.mutateAsync(inviteCode.trim());
      pushToast({ title: 'Joined team', description: `Welcome to ${team.name}.`, variant: 'success' });
    } catch (err) {
      pushToast({ title: 'Could not join team', description: messageOf(err), variant: 'error' });
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 @lg:grid-cols-2">
      <GlassPanel className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2 text-[var(--color-accent)]">
          <Plus className="size-4" />
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide">Create a team</h3>
        </div>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <Input
            label="Team name"
            placeholder="RedStorm"
            mono
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={3}
            maxLength={32}
            required
          />
          <Input
            label="Description (optional)"
            placeholder="A short line about your crew"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={280}
          />
          <Button type="submit" isLoading={createTeam.isPending} leftIcon={<Users className="size-4" />}>
            Create team
          </Button>
        </form>
      </GlassPanel>

      <GlassPanel className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2 text-[var(--color-secondary)]">
          <KeyRound className="size-4" />
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide">Join with an invite code</h3>
        </div>
        <form onSubmit={handleJoin} className="flex flex-col gap-3">
          <Input
            label="Invite code"
            placeholder="REDSTORM-7X2Q"
            mono
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            required
          />
          <p className="text-xs text-[var(--color-text-muted)]">
            Ask a team owner for their code — found on their team page.
          </p>
          <Button type="submit" variant="outline" isLoading={joinTeam.isPending}>
            Join team
          </Button>
        </form>
      </GlassPanel>
    </div>
  );
}

function messageOf(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Something went wrong. Try again.';
}
