import type { CircleMember } from './user';

export interface Circle {
  id: string;
  name: string;
  description: string | null;
  /** The person/pet being cared for */
  heartName: string;
  heartAvatarUrl: string | null;
  /** Accent color for tabs and UI (hex) */
  color: string;
  members: CircleMember[];
  createdAt: string;
  updatedAt: string;
}

export interface Plan {
  id: string;
  circleId: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Concern {
  id: string;
  circleId: string;
  planId: string | null;
  title: string;
  description: string | null;
  dueAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
}
