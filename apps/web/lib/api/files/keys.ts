export const fileKeys = {
  all: ["files"] as const,
  signedUrls: () => [...fileKeys.all, "signed-url"] as const,
  signedUrl: (id: string) => [...fileKeys.signedUrls(), id] as const,
};
