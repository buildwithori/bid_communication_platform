import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FolderKanban,
} from 'lucide-react';
import type { NavSection } from '@/components/layout/NavSidebar';

/** Nav shown to trainers — scoped to their own work only. */
export const trainerNav: NavSection[] = [
  {
    heading: 'Overview',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    heading: 'My Work',
    items: [
      { href: '/admin/entrepreneurs', label: 'My Entrepreneurs', icon: Users },
      { href: '/admin/programs', label: 'My Programmes', icon: FolderKanban },
      { href: '/admin/sessions', label: 'My Sessions', icon: CalendarDays },
    ],
  },
];
