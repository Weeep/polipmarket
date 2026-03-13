export type UserInfoDTO = {
  id: string;
  name?: string | null;
  nickname?: string | null;
  image?: string | null;
  role: string;
  balance: number;
  locked: number;
};
