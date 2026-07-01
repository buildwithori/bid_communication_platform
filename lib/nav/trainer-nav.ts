import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FolderKanban,
} from 'lucide-react';
import type { NavSection } from '@/components/layout/NavSidebar';
import { routes } from '@/lib/routes';

/** Nav shown to trainers — scoped to their own work only. */
export const trainerNav: NavSection[] = [
  {
    heading: 'Overview',
    items: [
      { href: routes.admin.dashboard, label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    heading: 'My Work',
    items: [
      { href: routes.admin.entrepreneurs, label: 'My Entrepreneurs', icon: Users },
      { href: routes.admin.programs, label: 'My Programmes', icon: FolderKanban },
      { href: routes.admin.sessions, label: 'My Sessions', icon: CalendarDays },
    ],
  },
];
