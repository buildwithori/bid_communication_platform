import {
  LayoutDashboard,
  PlayCircle,
  UserSquare,
  FileText,
  CalendarDays,
  Wrench,
} from 'lucide-react';
import type { NavSection } from '@/components/layout/NavSidebar';
import { routes } from '@/lib/routes';

/** Entrepreneur-side navigation tree. */
export const entrepreneurNav: NavSection[] = [
  {
    heading: 'Overview',
    items: [
      { href: routes.entrepreneur.dashboard, label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    heading: 'Learn',
    items: [
      { href: routes.entrepreneur.training, label: 'Training Library', icon: PlayCircle },
    ],
  },
  {
    heading: 'My work',
    items: [
      { href: routes.entrepreneur.profile, label: 'My Profile', icon: UserSquare },
      { href: routes.entrepreneur.deliverables, label: 'Deliverables', icon: FileText },
      { href: routes.entrepreneur.schedule, label: 'Schedule', icon: CalendarDays },
    ],
  },
  {
    heading: 'Resources',
    items: [
      { href: routes.entrepreneur.tools, label: 'Entrepreneur Tools', icon: Wrench },
    ],
  },
];
