import { useState } from "react";

import { t } from "@/lib/i18n";

import btnCls from "../Button/Button.module.css";
import cls from "./FileInput.module.css";

export type FileInputProps = React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;

export function FileInput({ id, children, ...props }: FileInputProps) {
  const [file, setFile] = useState<File | undefined>(undefined);

  return (
    <>
      <label htmlFor={id} className={btnCls.button}>
        {children}
      </label>
      <input
        {...props}
        id={id}
        type="file"
        name={props.name || id}
        className={cls.fileInput}
        onChange={(e) => {
          setFile(e.target.files ? e.target.files[0] : undefined);
        }}
      />
      <label htmlFor={id} className={cls.selectedFile}>
        {file?.name || t("no_file_chosen")}
      </label>
    </>
  );
}
