export type UserInfoDTO = {
  id: string;
  name?: string | null;
  image?: string | null;
  role: string;
  balance: number;
  locked: number;
};
