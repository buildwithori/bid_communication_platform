import {
  LayoutDashboard,
  Users,
  GraduationCap,
  FolderKanban,
  PlayCircle,
  CalendarDays,
  Wrench,
  Star,
  BarChart3,
} from 'lucide-react';
import type { NavSection } from '@/components/layout/NavSidebar';

export const adminNav: NavSection[] = [
  {
    heading: 'Overview',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    heading: 'People',
    items: [
      { href: '/admin/entrepreneurs', label: 'Entrepreneurs', icon: Users },
      { href: '/admin/trainers', label: 'Trainers', icon: GraduationCap },
    ],
  },
  {
    heading: 'Programs',
    items: [
      { href: '/admin/programs', label: 'Programs', icon: FolderKanban },
    ],
  },
  {
    heading: 'Content',
    items: [
      { href: '/admin/content', label: 'Content Library', icon: PlayCircle },
    ],
  },
  {
    heading: 'Requests',
    items: [
      { href: '/admin/sessions', label: 'Sessions', icon: CalendarDays },
      { href: '/admin/tool-requests', label: 'Tool Requests', icon: Wrench },
    ],
  },
  {
    heading: 'Settings',
    items: [
      { href: '/admin/stages-sectors', label: 'Stages & Sectors', icon: Star },
    ],
  },
  {
    heading: 'Analytics',
    items: [
      { href: '/admin/reporting', label: 'Reporting', icon: BarChart3 },
    ],
  },
];
