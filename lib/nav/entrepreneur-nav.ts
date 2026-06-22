import {
  LayoutDashboard,
  PlayCircle,
  UserSquare,
  FileText,
  CalendarDays,
  Wrench,
} from 'lucide-react';
import type { NavSection } from '@/components/layout/NavSidebar';

/** Entrepreneur-side navigation tree. */
export const entrepreneurNav: NavSection[] = [
  {
    heading: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    heading: 'Learn',
    items: [
      { href: '/training', label: 'Training Library', icon: PlayCircle },
    ],
  },
  {
    heading: 'My work',
    items: [
      { href: '/profile', label: 'My Profile', icon: UserSquare },
      { href: '/deliverables', label: 'Deliverables', icon: FileText },
      { href: '/schedule', label: 'Schedule', icon: CalendarDays },
    ],
  },
  {
    heading: 'Resources',
    items: [
      { href: '/tools', label: 'Entrepreneur Tools', icon: Wrench },
    ],
  },
];
