type EntryNoCodeDraft = {
  visitorName?: string;
  idPhotoUri?: string;
  pendingUpload?: Promise<string | null> | null;
};

let currentDraft: EntryNoCodeDraft = {};

export function setEntryNoCodeDraft(next: Omit<EntryNoCodeDraft, 'pendingUpload'>): void {
  currentDraft = {
    ...currentDraft,
    ...next,
  };
}

export function setPendingApprovalUpload(promise: Promise<string | null>): void {
  currentDraft = { ...currentDraft, pendingUpload: promise };
}

export function consumePendingApprovalUpload(): Promise<string | null> | null {
  const p = currentDraft.pendingUpload ?? null;
  currentDraft = { ...currentDraft, pendingUpload: null };
  return p;
}

export function getEntryNoCodeDraft(): EntryNoCodeDraft {
  return currentDraft;
}

export function clearEntryNoCodeDraft(): void {
  currentDraft = {};
}
