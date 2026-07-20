export const fileKeys = {
  all: ["files"] as const,
  signedUrls: () => [...fileKeys.all, "signed-url"] as const,
  signedUrl: (id: string) => [...fileKeys.signedUrls(), id] as const,
  workbookPreviews: () => [...fileKeys.all, "workbook-preview"] as const,
  workbookPreview: (id: string, query: unknown) =>
    [...fileKeys.workbookPreviews(), id, query] as const,
};
