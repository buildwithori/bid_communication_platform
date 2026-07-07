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
      { href: routes.trainer.dashboard, label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    heading: 'My Work',
    items: [
      { href: routes.trainer.entrepreneurs, label: 'My Entrepreneurs', icon: Users },
      { href: routes.trainer.programmes, label: 'My Programmes', icon: FolderKanban },
      { href: routes.trainer.sessions, label: 'My Sessions', icon: CalendarDays },
    ],
  },
];
