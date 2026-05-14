import { apiJson } from "./api";
import { isDemoMode } from "./demo-mode";
import { demoAssignSos, demoDismissSos } from "./demo-state";

export async function assignSosAttempt(sosAttemptId: string, driverId: string) {
  if (isDemoMode()) return demoAssignSos(sosAttemptId, driverId);
  return apiJson<unknown>(`/api/v1/sos/${sosAttemptId}/assign`, {
    method: "POST",
    body: JSON.stringify({ driverId }),
  });
}

export async function dismissSosAttempt(sosAttemptId: string, reason: string) {
  if (isDemoMode()) return demoDismissSos(sosAttemptId, reason);
  return apiJson<unknown>(`/api/v1/sos/${sosAttemptId}/dismiss`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}
