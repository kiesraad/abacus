import { tx } from "@/i18n/translate";

const MAX_FILE_UPLOAD_SIZE_MB: number = 5;

export async function isFileTooLarge(file: File) {
  // Get the size of the string in bytes after JSON encoding
  const fileSize: number = new Blob([JSON.stringify(await file.text())]).size;
  return fileSize > MAX_FILE_UPLOAD_SIZE_MB * 1024 * 1024;
}

export function fileTooLargeError(file: File) {
  return tx(
    "file_too_large",
    {},
    {
      filename: file.name,
      max_size: `${MAX_FILE_UPLOAD_SIZE_MB}`,
    },
  );
}
