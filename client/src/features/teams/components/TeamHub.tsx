import { useState } from 'react';
import { Copy, Check, Crown, LogOut, RefreshCw, Trash2, Zap, Users } from 'lucide-react';
import type { Team } from '@/types';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CATEGORY_META } from '@/lib/categories';
import { formatNumber } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { ApiError } from '@/lib/apiClient';
import {
  useLeaveTeam,
  useRemoveMember,
  useTransferOwnership,
  useRegenerateInviteCode,
  useDisbandTeam,
} from '../hooks/useTeams';

function messageOf(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Something went wrong. Try again.';
}

export function TeamHub({ team }: { team: Team }) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const pushToast = useUiStore((s) => s.pushToast);
  const [copied, setCopied] = useState(false);

  const leaveTeam = useLeaveTeam();
  const removeMember = useRemoveMember();
  const transferOwnership = useTransferOwnership();
  const regenerateInviteCode = useRegenerateInviteCode();
  const disbandTeam = useDisbandTeam();

  const me = team.members.find((m) => m.userId === currentUserId);
  const isOwner = me?.role === 'owner';
  const sortedMembers = [...team.members].sort((a, b) => b.xp - a.xp);

  async function copyInviteCode() {
    if (!team.inviteCode) return;
    try {
      await navigator.clipboard.writeText(team.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      pushToast({ title: 'Copy failed', description: 'Select and copy the code manually.', variant: 'error' });
    }
  }

  async function handleLeave() {
    try {
      const result = await leaveTeam.mutateAsync();
      pushToast({
        title: result.disbanded ? 'Team disbanded' : 'Left team',
        description: result.disbanded ? `${team.name} had no remaining members.` : `You left ${team.name}.`,
        variant: 'info',
      });
    } catch (err) {
      pushToast({ title: 'Could not leave team', description: messageOf(err), variant: 'error' });
    }
  }

  async function handleDisband() {
    try {
      await disbandTeam.mutateAsync();
      pushToast({ title: 'Team disbanded', description: `${team.name} has been disbanded.`, variant: 'info' });
    } catch (err) {
      pushToast({ title: 'Could not disband team', description: messageOf(err), variant: 'error' });
    }
  }

  async function handleRemove(userId: string, username: string) {
    try {
      await removeMember.mutateAsync(userId);
      pushToast({ title: 'Member removed', description: `${username} was removed from the team.`, variant: 'info' });
    } catch (err) {
      pushToast({ title: 'Could not remove member', description: messageOf(err), variant: 'error' });
    }
  }

  async function handleTransfer(userId: string, username: string) {
    try {
      await transferOwnership.mutateAsync(userId);
      pushToast({ title: 'Ownership transferred', description: `${username} is now the team owner.`, variant: 'success' });
    } catch (err) {
      pushToast({ title: 'Could not transfer ownership', description: messageOf(err), variant: 'error' });
    }
  }

  async function handleRegenerate() {
    try {
      await regenerateInviteCode.mutateAsync();
      pushToast({ title: 'Invite code regenerated', variant: 'success' });
    } catch (err) {
      pushToast({ title: 'Could not regenerate code', description: messageOf(err), variant: 'error' });
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <GlassPanel strength="strong" className="flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-semibold text-[var(--color-text-primary)]">{team.name}</h2>
              {isOwner && <Badge variant="accent">Owner</Badge>}
            </div>
            {team.description && (
              <p className="mt-1 max-w-lg text-sm text-[var(--color-text-secondary)]">{team.description}</p>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-[var(--color-text-secondary)]">
            <span className="inline-flex items-center gap-1.5 font-mono text-[var(--color-accent)]">
              <Zap className="size-4" /> {formatNumber(team.xp)} XP
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4" /> {team.memberCount} members
            </span>
          </div>
        </div>

        {team.inviteCode && (
          <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-dashed border-[var(--color-glass-border-strong)] bg-[var(--color-bg)]/40 px-4 py-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">
                Invite code
              </p>
              <p className="font-mono text-sm text-[var(--color-accent)]">{team.inviteCode}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={copyInviteCode} leftIcon={copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
              {isOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  isLoading={regenerateInviteCode.isPending}
                  onClick={handleRegenerate}
                  leftIcon={<RefreshCw className="size-3.5" />}
                >
                  New code
                </Button>
              )}
            </div>
          </div>
        )}
      </GlassPanel>

      <GlassPanel className="flex flex-col gap-3 p-6">
        <h3 className="font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)]">
          Category coverage
        </h3>
        <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
          {team.categoryProgress.map((cp) => {
            const meta = CATEGORY_META[cp.category];
            return (
              <div key={cp.category} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--color-text-secondary)]">{meta.name}</span>
                  <span className="font-mono text-[var(--color-text-muted)]">
                    {cp.solved}/{cp.total}
                  </span>
                </div>
                <ProgressBar value={cp.solved} max={Math.max(cp.total, 1)} />
              </div>
            );
          })}
        </div>
      </GlassPanel>

      <GlassPanel className="flex flex-col gap-1 overflow-hidden">
        <h3 className="px-6 pt-5 font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)]">
          Contributors
        </h3>
        <ul className="flex flex-col divide-y divide-[var(--color-glass-border)] px-2 pb-2">
          {sortedMembers.map((member) => (
            <li key={member.userId} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
                {member.role === 'owner' && <Crown className="size-3.5 text-[var(--color-warning)]" aria-label="Owner" />}
                {member.username}
              </span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-[var(--color-text-muted)]">
                  {formatNumber(member.xp)} XP · {member.solvedCount} solves
                </span>
                {isOwner && member.userId !== currentUserId && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTransfer(member.userId, member.username)}
                      className="text-[var(--color-text-muted)]"
                    >
                      Make owner
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(member.userId, member.username)}
                      className="text-[var(--color-error)]"
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </GlassPanel>

      <div className="flex justify-end gap-2">
        {isOwner && (
          <Button
            variant="outline"
            className="border-[var(--color-error)]/40 text-[var(--color-error)]"
            isLoading={disbandTeam.isPending}
            onClick={handleDisband}
            leftIcon={<Trash2 className="size-4" />}
          >
            Disband team
          </Button>
        )}
        <Button variant="outline" isLoading={leaveTeam.isPending} onClick={handleLeave} leftIcon={<LogOut className="size-4" />}>
          Leave team
        </Button>
      </div>
    </div>
  );
}

