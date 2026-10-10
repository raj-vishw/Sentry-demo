import { useState } from 'react';
import { ArrowLeft, Ban, CheckCircle2, Eye, EyeOff, ShieldCheck, ShieldX, UserCheck, UserX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { ErrorState } from '@/components/feedback/ErrorState';
import { BadgeGrid } from '@/features/profile/components/BadgeGrid';
import { formatRelativeTime } from '@/lib/utils';
import { useAdminUserDetail, useSetUserStatus, useApproveUser, useRejectUser, useSetUserHidden } from '../hooks/useAdmin';
import type { AccountStatus } from '@/types';

type StatusAction = 'DISABLE' | 'ENABLE' | 'BAN' | 'UNBAN' | 'APPROVE' | 'REJECT';

const ACTION_CONFIG: Record<
  StatusAction,
  {
    nextStatus?: AccountStatus;
    label: string;
    icon: typeof Ban;
    variant: 'danger' | 'primary' | 'outline';
    requiresTyping: boolean;
    confirmTitle: string;
    description: (username: string) => string;
  }
> = {
  DISABLE: {
    nextStatus: 'DISABLED',
    label: 'Disable account',
    icon: Ban,
    variant: 'danger',
    requiresTyping: true,
    confirmTitle: 'Disable this account?',
    description: (u) => `${u} will be immediately signed out and unable to log back in at all. Type the username to confirm.`,
  },
  ENABLE: {
    nextStatus: 'ACTIVE',
    label: 'Enable account',
    icon: CheckCircle2,
    variant: 'primary',
    requiresTyping: false,
    confirmTitle: 'Enable this account?',
    description: (u) => `${u} will be able to log in again.`,
  },
  BAN: {
    nextStatus: 'BANNED',
    label: 'Ban account',
    icon: ShieldX,
    variant: 'danger',
    requiresTyping: true,
    confirmTitle: 'Ban this account?',
    description: (u) =>
      `${u} stays logged in and can keep browsing, but can no longer submit flags, unlock hints, join/create a team, or submit a writeup. Type the username to confirm.`,
  },
  UNBAN: {
    nextStatus: 'ACTIVE',
    label: 'Unban account',
    icon: ShieldCheck,
    variant: 'primary',
    requiresTyping: false,
    confirmTitle: 'Unban this account?',
    description: (u) => `${u} will be able to submit flags, unlock hints, join/create a team, and submit writeups again.`,
  },
  APPROVE: {
    label: 'Approve account',
    icon: UserCheck,
    variant: 'primary',
    requiresTyping: false,
    confirmTitle: 'Approve this registration?',
    description: (u) => `${u} will become an active account and can log in immediately.`,
  },
  REJECT: {
    label: 'Reject account',
    icon: UserX,
    variant: 'danger',
    requiresTyping: false,
    confirmTitle: 'Reject this registration?',
    description: (u) => `${u}'s pending registration will be permanently deleted. This cannot be undone.`,
  },
};

// Only the valid actions for each current status — e.g. a DISABLED
// account can only be re-enabled, not banned directly. PENDING gets
// Approve/Reject instead of a status transition.
const ACTIONS_BY_STATUS: Record<AccountStatus, StatusAction[]> = {
  ACTIVE: ['BAN', 'DISABLE'],
  DISABLED: ['ENABLE'],
  BANNED: ['UNBAN', 'DISABLE'],
  PENDING: ['APPROVE', 'REJECT'],
};

export function AdminUserDetail({ userId, onBack }: { userId: string; onBack: () => void }) {
  const { data: user, isLoading, isError, refetch } = useAdminUserDetail(userId);
  const setStatus = useSetUserStatus();
  const approveUser = useApproveUser();
  const rejectUser = useRejectUser();
  const setHidden = useSetUserHidden();
  const [pendingAction, setPendingAction] = useState<StatusAction | null>(null);
  const [confirmText, setConfirmText] = useState('');

  function handleConfirmedAction() {
    if (!user || !pendingAction) return;
    if (pendingAction === 'APPROVE') {
      approveUser.mutate(user.id, { onSuccess: () => setPendingAction(null) });
      return;
    }
    if (pendingAction === 'REJECT') {
      // The account is gone after this — there's nothing left to show.
      rejectUser.mutate(user.id, { onSuccess: onBack });
      return;
    }
    const nextStatus = ACTION_CONFIG[pendingAction].nextStatus as 'ACTIVE' | 'DISABLED' | 'BANNED';
    setStatus.mutate({ id: user.id, status: nextStatus }, { onSuccess: () => setPendingAction(null) });
  }

  const isMutating = setStatus.isPending || approveUser.isPending || rejectUser.isPending;

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-4" /> Back to users
      </button>

      {isLoading && <LoadingSpinner />}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {user && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-[var(--color-text-primary)]">{user.username}</h2>
              <p className="font-mono text-xs text-[var(--color-text-muted)]">{user.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant={user.role === 'admin' ? 'secondary' : 'default'}>{user.role}</Badge>
                <Badge
                  variant={
                    user.status === 'ACTIVE'
                      ? 'success'
                      : user.status === 'BANNED' || user.status === 'PENDING'
                        ? 'warning'
                        : 'error'
                  }
                >
                  {user.status}
                </Badge>
                {user.teamName && <Badge variant="accent">{user.teamName}</Badge>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={user.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                isLoading={setHidden.isPending}
                onClick={() => setHidden.mutate({ id: user.id, hidden: !user.hidden })}
              >
                {user.hidden ? 'Unhide from leaderboard' : 'Hide from leaderboard'}
              </Button>
              {ACTIONS_BY_STATUS[user.status].map((action) => {
                const config = ACTION_CONFIG[action];
                const Icon = config.icon;
                return (
                  <Button
                    key={action}
                    variant={config.variant}
                    size="sm"
                    leftIcon={<Icon className="size-4" />}
                    onClick={() => setPendingAction(action)}
                  >
                    {config.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Points" value={user.points.toLocaleString()} />
            <Stat label="Solved" value={user.solvedCount} />
            <Stat label="Streak" value={`${user.streak}d`} />
            <Stat label="Submissions" value={`${user.correctSubmissionCount} / ${user.submissionCount}`} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Badges</CardTitle>
            </CardHeader>
            <CardContent>
              <BadgeGrid badges={user.badges} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Solves</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-[var(--color-border)]">
              {user.recentSolves.length === 0 && (
                <p className="py-4 text-sm text-[var(--color-text-muted)]">No solves yet.</p>
              )}
              {user.recentSolves.map((s) => (
                <div key={s.challengeId} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 text-sm">
                  <span className="text-[var(--color-text-primary)]">{s.title}</span>
                  <span className="font-mono text-xs text-[var(--color-text-muted)]">
                    +{s.points} · {formatRelativeTime(s.solvedAt)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <ConfirmDialog
            open={pendingAction !== null}
            onClose={() => {
              setPendingAction(null);
              setConfirmText('');
            }}
            onConfirm={handleConfirmedAction}
            title={pendingAction ? ACTION_CONFIG[pendingAction].confirmTitle : ''}
            description={pendingAction ? ACTION_CONFIG[pendingAction].description(user.username) : ''}
            confirmLabel={pendingAction ? ACTION_CONFIG[pendingAction].label : ''}
            variant={pendingAction && ACTION_CONFIG[pendingAction].variant === 'danger' ? 'danger' : 'primary'}
            isLoading={isMutating}
            confirmDisabled={!!pendingAction && ACTION_CONFIG[pendingAction].requiresTyping && confirmText !== user.username}
          >
            {pendingAction && ACTION_CONFIG[pendingAction].requiresTyping && (
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`Type "${user.username}" to confirm`}
                className="mt-4 h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus-visible:outline-none"
              />
            )}
          </ConfirmDialog>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-0.5 p-4">
        <p className="font-display text-xl font-bold text-[var(--color-text-primary)]">{value}</p>
        <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
      </CardContent>
    </Card>
  );
}
