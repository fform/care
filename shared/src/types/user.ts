export type UserRole = 'organizer' | 'caregiver' | 'supporter' | 'care_recipient' | 'professional';

export type AuthProvider = 'google' | 'apple' | 'email';

export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  avatarUrl: string | null;
  authProviders: AuthProvider[];
  createdAt: string;
  updatedAt: string;
}

export interface CircleMember {
  userId: string;
  circleId: string;
  role: UserRole;
  user: Pick<User, 'id' | 'name' | 'avatarUrl'>;
  joinedAt: string;
}
