import { getServerSession } from "next-auth";
import { authOptions } from "../infrastructure/authOptions";

export const getSession = () => getServerSession(authOptions);
