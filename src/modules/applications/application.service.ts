import { applicationStore } from "./application.store.js";

export async function getApplication(applicationId: string) {
  return applicationStore.findById(applicationId);
}
