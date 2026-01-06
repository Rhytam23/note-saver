import { MotionStyle } from 'framer-motion';

export type NotePriority = 'high' | 'medium' | 'low' | 'none';

export type PriorityFilter = 'high' | 'medium' | 'low' | null;

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
  priority: NotePriority;
  coverImage?: string;
}

export interface OnboardingStep {
  targetId: string;
  title: string;
  content: string;
  position: 'center' | 'top' | 'bottom' | 'left' | 'right';
}

export type Theme = 'light' | 'dark';

export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  passwordHash?: string;
  themePreference?: SeasonalTheme | 'auto';
}

export interface Tag {
  name: string;
  imageUrl?: string;
  color?: string;
  defaultPriority?: NotePriority;
}

export type SeasonalTheme =
  | 'none'
  | 'winter'
  | 'autumn'
  | 'spring'
  | 'summer'
  | 'monsoon'
  | 'diwali'
  | 'holi'
  | 'pongal'
  | 'navratri'
  | 'christmas'
  | 'new_year'
  | 'independence_day_in';

export interface UserLocation {
  country: string;
  latitude: number;
}