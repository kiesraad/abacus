import { t } from "@/i18n/translate";

import { Button } from "../Button/Button";
import cls from "./FileInput.module.css";

type InputProps = React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;

export function FileInput({ id, children, ...props }: InputProps) {
  return (
    <span>
      <div className={cls.fileInputBtn}>
        <Button.Label htmlFor={id}>{children}</Button.Label>
        <input {...props} id={id} type="file" name={props.name || id} className={cls.fileInput} />
      </div>
      <label htmlFor={id} className={cls.selectedFile}>
        {t("no_file_chosen")}
      </label>
    </span>
  );
}
