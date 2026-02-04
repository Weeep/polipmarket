export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  locked: number;
  createdAt: Date;
  updatedAt: Date;
}
