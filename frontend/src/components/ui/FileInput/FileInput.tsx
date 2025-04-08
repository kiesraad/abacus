import { t } from "@/lib/i18n";

import { Button } from "../Button/Button";
import cls from "./FileInput.module.css";

type InputProps = React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;

interface FileInputProps extends InputProps {
  file?: File | undefined;
}

export function FileInput({ id, children, file, ...props }: FileInputProps) {
  return (
    <>
      <Button.Label htmlFor={id}>{children}</Button.Label>
      <input {...props} id={id} type="file" name={props.name || id} className={cls.fileInput} />
      <label htmlFor={id} className={cls.selectedFile}>
        {file?.name || t("no_file_chosen")}
      </label>
    </>
  );
}
