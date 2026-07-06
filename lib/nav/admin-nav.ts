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
  ClipboardCheck,
  Tags,
} from 'lucide-react';
import type { NavSection } from '@/components/layout/NavSidebar';
import { routes } from '@/lib/routes';

export const adminNav: NavSection[] = [
  {
    heading: 'Overview',
    items: [
      { href: routes.admin.dashboard, label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    heading: 'People',
    items: [
      { href: routes.admin.entrepreneurs, label: 'Entrepreneurs', icon: Users },
      { href: routes.admin.trainers, label: 'Trainers', icon: GraduationCap },
    ],
  },
  {
    heading: 'Programs',
    items: [
      { href: routes.admin.programs, label: 'Programs', icon: FolderKanban },
    ],
  },
  {
    heading: 'Content',
    items: [
      { href: routes.admin.content, label: 'Content Library', icon: PlayCircle },
    ],
  },
  {
    heading: 'Requests',
    items: [
      { href: routes.admin.deliverableReviews, label: 'Deliverable Reviews', icon: ClipboardCheck },
      { href: routes.admin.sessions, label: 'Sessions', icon: CalendarDays },
      { href: routes.admin.toolRequests, label: 'Tool Requests', icon: Wrench },
    ],
  },
  {
    heading: 'Settings',
    items: [
      { href: routes.admin.settingsStages, label: 'Business Stages', icon: Star },
      { href: routes.admin.settingsSectors, label: 'Sectors', icon: Tags },
    ],
  },
  {
    heading: 'Analytics',
    items: [
      { href: routes.admin.reporting, label: 'Reporting', icon: BarChart3 },
    ],
  },
];
