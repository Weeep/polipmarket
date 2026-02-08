export interface Event {
  id: string;
  question: string;
  description?: string | null;
  bettingCloseAt: Date;
  resolveAt?: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
