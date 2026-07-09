import type { Entrepreneur, Program, Tool, ToolStatus, ToolVisibility } from '@/types';

export const toolVisibilityLabels: Record<ToolVisibility, string> = {
  'all-entrepreneurs': 'All entrepreneurs',
  programmes: 'Selected programmes',
  entrepreneurs: 'Selected entrepreneurs',
};

export const toolStatusLabels: Record<ToolStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
};

export function getToolStatus(tool: Tool): ToolStatus {
  return tool.status ?? 'published';
}

export function getToolVisibility(tool: Tool): ToolVisibility {
  return tool.visibility ?? 'all-entrepreneurs';
}

export type EntrepreneurToolAccessSource = 'global' | 'programme' | 'individual' | 'none';

export function getEntrepreneurToolAccessSource(tool: Tool, entrepreneur: Entrepreneur): EntrepreneurToolAccessSource {
  if (getToolStatus(tool) !== 'published') return 'none';

  const blockedToolIds = new Set(entrepreneur.toolAccess?.blockedToolIds ?? []);
  if (blockedToolIds.has(tool.id)) return 'none';

  const addedToolIds = new Set(entrepreneur.toolAccess?.addedToolIds ?? []);
  if (addedToolIds.has(tool.id)) return 'individual';

  const visibility = getToolVisibility(tool);
  if (visibility === 'all-entrepreneurs') return 'global';

  if (visibility === 'programmes') {
    const programmeIds = new Set([
      ...(entrepreneur.programmeIds ?? []),
      ...(entrepreneur.programmeId ? [entrepreneur.programmeId] : []),
    ]);
    return (tool.programmeIds ?? []).some((programmeId) => programmeIds.has(programmeId))
      ? 'programme'
      : 'none';
  }

  return (tool.entrepreneurIds ?? []).includes(entrepreneur.id) ? 'individual' : 'none';
}

export function isToolVisibleToEntrepreneur(tool: Tool, entrepreneur: Entrepreneur) {
  return getEntrepreneurToolAccessSource(tool, entrepreneur) !== 'none';
}

export function describeToolAudience(
  tool: Tool,
  programmes: Pick<Program, 'id' | 'name'>[],
  entrepreneurs: Pick<Entrepreneur, 'id' | 'businessName'>[],
) {
  const visibility = getToolVisibility(tool);

  if (visibility === 'all-entrepreneurs') {
    return { label: 'All entrepreneurs', detail: 'Visible to every entrepreneur account' };
  }

  if (visibility === 'programmes') {
    const names = (tool.programmeIds ?? [])
      .map((id) => programmes.find((program) => program.id === id)?.name)
      .filter(Boolean) as string[];
    return {
      label: `${names.length} programme${names.length === 1 ? '' : 's'}`,
      detail: names.length ? names.join(', ') : 'No programmes selected',
    };
  }

  const names = (tool.entrepreneurIds ?? [])
    .map((id) => entrepreneurs.find((entrepreneur) => entrepreneur.id === id)?.businessName)
    .filter(Boolean) as string[];
  return {
    label: `${names.length} entrepreneur${names.length === 1 ? '' : 's'}`,
    detail: names.length ? names.join(', ') : 'No entrepreneurs selected',
  };
}
