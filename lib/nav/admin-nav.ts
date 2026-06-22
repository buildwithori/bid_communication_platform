import {
  LayoutDashboard,
  Users,
  GraduationCap,
  FolderKanban,
  ArrowRightLeft,
  PlayCircle,
  Star,
  BarChart3,
} from 'lucide-react';
import type { NavSection } from '@/components/layout/NavSidebar';

/** Admin-side navigation tree. */
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
      { href: '/admin/assignments', label: 'Assignments', icon: ArrowRightLeft },
    ],
  },
  {
    heading: 'Content',
    items: [
      { href: '/admin/content', label: 'Content Library', icon: PlayCircle },
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
