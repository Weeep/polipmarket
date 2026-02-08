export interface Event {
  id: string;
  question: string;
  description?: string | null;
  resolveAt?: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
