import { User } from '@prisma/client';

export type AuthenticatedRequest = {
  headers: {
    cookie?: string;
  };
  user?: User;
};
