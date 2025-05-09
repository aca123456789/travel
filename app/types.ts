import type { userRoleEnum, noteStatusEnum, mediaTypeEnum } from "~/db/schema";

export interface User {
  id: string;
  username: string;
  nickname: string;
  avatarUrl?: string | null;
  role: typeof userRoleEnum.enumValues[number];
  createdAt: Date;
  updatedAt: Date;
}

export interface Media {
  id: string;
  noteId: string;
  mediaType: typeof mediaTypeEnum.enumValues[number];
  url: string;
  order: number;
  createdAt: Date;
}

export interface TravelNote {
  id: string;
  userId: string;
  title: string;
  content: string;
  location?: string | null;
  status: typeof noteStatusEnum.enumValues[number];
  rejectionReason?: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  user?: Omit<User, "passwordHash" | "updatedAt" | "createdAt" | "role">;
  media?: Media[];
} 
