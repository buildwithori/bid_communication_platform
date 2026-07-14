import type { ApiToolType, ApiToolVisibility, ToolPayload, ToolRecord } from '@/lib/api/tools';
import type { Tool, ToolType, ToolVisibility } from '@/types';

export const apiToolTypeToUi: Record<ApiToolType, ToolType> = {
  pdf: 'pdf',
  embedded_tool: 'embed',
};

export const uiToolTypeToApi: Record<ToolType, ApiToolType> = {
  pdf: 'pdf',
  embed: 'embedded_tool',
};

export const apiToolVisibilityToUi: Record<ApiToolVisibility, ToolVisibility> = {
  all_entrepreneurs: 'all-entrepreneurs',
  programmes: 'programmes',
  entrepreneurs: 'entrepreneurs',
};

export const uiToolVisibilityToApi: Record<ToolVisibility, ApiToolVisibility> = {
  'all-entrepreneurs': 'all_entrepreneurs',
  programmes: 'programmes',
  entrepreneurs: 'entrepreneurs',
};

export function mapToolRecordToUi(record: ToolRecord): Tool {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    type: apiToolTypeToUi[record.type],
    toolArea: record.toolArea.name,
    toolAreaId: record.toolArea.id,
    status: record.status,
    visibility: apiToolVisibilityToUi[record.visibility],
    programmeIds: record.audience.programmeIds,
    entrepreneurIds: record.audience.entrepreneurUserIds,
    hiddenEntrepreneurIds: record.audience.hiddenEntrepreneurUserIds,
    pdfAssetId: record.pdfAsset?.id,
    pdfFileName: record.pdfAsset?.originalFilename,
    embedUrl: record.embeddedUrl ?? undefined,
    updatedAt: record.updatedAt,
    iconKey: isToolIcon(record.iconKey) ? record.iconKey : 'plus',
  };
}

export function buildToolPayloadFromUi(
  tool: Tool,
  toolAreaId: string,
  options?: { pdfAssetId?: string | null; hiddenEntrepreneurUserIds?: string[] },
): ToolPayload {
  const isPdf = tool.type === 'pdf';
  return {
    name: tool.name,
    description: tool.description,
    type: uiToolTypeToApi[tool.type],
    toolAreaId,
    iconKey: tool.iconKey,
    visibility: uiToolVisibilityToApi[tool.visibility ?? 'all-entrepreneurs'],
    status: tool.status ?? 'draft',
    pdfAssetId: isPdf ? options?.pdfAssetId ?? null : null,
    embeddedUrl: isPdf ? null : tool.embedUrl ?? null,
    programmeIds: tool.visibility === 'programmes' ? tool.programmeIds ?? [] : [],
    entrepreneurUserIds: tool.visibility === 'entrepreneurs' ? tool.entrepreneurIds ?? [] : [],
    hiddenEntrepreneurUserIds: options?.hiddenEntrepreneurUserIds ?? [],
  };
}

function isToolIcon(value: string): value is Tool['iconKey'] {
  return ['canvas', 'document', 'timer', 'star', 'plus', 'calendar'].includes(value);
}
