import { DetailedHTMLProps, InputHTMLAttributes } from "react";

import { t } from "@/i18n/translate";

import { Button } from "../Button/Button";
import cls from "./FileInput.module.css";

type InputProps = DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;

interface FileInputProps extends InputProps {
  file?: File | undefined;
}

export function FileInput({ id, children, file, ...props }: FileInputProps) {
  return (
    <span className={cls.fileInputWrapper}>
      <div className={cls.fileInputBtn}>
        <Button.Label htmlFor={id}>{children}</Button.Label>
        <input {...props} id={id} type="file" name={props.name || id} className={cls.fileInput} />
      </div>
      <label htmlFor={id} className={cls.selectedFile}>
        {file?.name || t("no_file_chosen")}
      </label>
    </span>
  );
}
