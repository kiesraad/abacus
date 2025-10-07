import { ReactElement } from "react";

import { tx } from "@/i18n/translate";

// Maximum file upload size in Megabytes
export const MAX_FILE_UPLOAD_SIZE_MB = 5;

export function fileTooLargeError(filename: string): ReactElement {
  return tx(
    "file_too_large",
    {},
    {
      filename,
      max_size: `${MAX_FILE_UPLOAD_SIZE_MB}`,
    },
  );
}
