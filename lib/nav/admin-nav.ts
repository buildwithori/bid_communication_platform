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
  FileText,
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
      { href: routes.admin.documents, label: 'Documents', icon: FileText },
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
      { href: routes.admin.stagesSectors, label: 'Stages & Sectors', icon: Star },
    ],
  },
  {
    heading: 'Analytics',
    items: [
      { href: routes.admin.reporting, label: 'Reporting', icon: BarChart3 },
    ],
  },
];
