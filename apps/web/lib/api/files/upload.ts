import type { FileUploadProgress, SignedFileUrl } from "./types";

export function uploadToSignedUrl(
  file: File,
  upload: SignedFileUrl,
  onProgress?: (progress: FileUploadProgress) => void,
  signal?: AbortSignal,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const abort = () => request.abort();

    request.open(upload.method, upload.url);
    Object.entries(upload.headers).forEach(([name, value]) =>
      request.setRequestHeader(name, value),
    );
    request.upload.addEventListener("progress", (event) => {
      const totalBytes = event.lengthComputable ? event.total : file.size;
      onProgress?.({
        loadedBytes: event.loaded,
        totalBytes,
        percent:
          totalBytes > 0
            ? Math.min(100, Math.round((event.loaded / totalBytes) * 100))
            : 0,
      });
    });
    request.addEventListener("load", () => {
      signal?.removeEventListener("abort", abort);
      if (request.status >= 200 && request.status < 300) {
        onProgress?.({
          loadedBytes: file.size,
          totalBytes: file.size,
          percent: 100,
        });
        resolve();
        return;
      }
      reject(new Error(`File upload failed with status ${request.status}.`));
    });
    request.addEventListener("error", () => {
      signal?.removeEventListener("abort", abort);
      reject(new Error("File upload could not be completed. Try again."));
    });
    request.addEventListener("abort", () => {
      signal?.removeEventListener("abort", abort);
      reject(new DOMException("File upload was cancelled.", "AbortError"));
    });

    if (signal?.aborted) {
      reject(new DOMException("File upload was cancelled.", "AbortError"));
      return;
    }
    signal?.addEventListener("abort", abort, { once: true });
    request.send(file);
  });
}
