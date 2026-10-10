export interface ChallengeInstanceDto {
  id: string;
  challengeId: string;
  userId: string;
  status: string;
  endpoint: string | null;
  failureReason: string | null;
  createdAt: Date;
  expiresAt: Date | null;
}

/**
 * The extension point for actually running interactive challenges —
 * deliberately just an interface in this phase. The only implementation
 * that exists today is NotImplementedRuntime, which never pulls, builds,
 * or runs anything (see its own comment for why). A real implementation
 * (LocalDockerRuntime, KubernetesRuntime, RemoteWorkerRuntime, ...) plugs
 * in here later without the API/model/ownership layer above it changing.
 */
export interface ChallengeRuntime {
  createInstance(challengeId: string, userId: string): Promise<ChallengeInstanceDto>;
  getInstance(instanceId: string): Promise<ChallengeInstanceDto>;
  stopInstance(instanceId: string): Promise<void>;
  restartInstance(instanceId: string): Promise<void>;
}
