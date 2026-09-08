import { type AnchorHTMLAttributes, type ReactNode, useId } from "react";
import { IconDownload, IconFile } from "@/components/generated/icons";
import cls from "./DownloadButton.module.css";

export interface DownloadButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children?: ReactNode;
  icon: "file" | "download";
  title: string;
  href: string;
  subtitle?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
}

export function DownloadButton({
  children,
  icon,
  title,
  subtitle,
  href,
  isDisabled,
  isLoading,
  ...htmlAnchorProps
}: DownloadButtonProps) {
  const Icon = icon === "file" ? IconFile : IconDownload;
  const id = useId();

  return (
    <div className={cls.downloadButton}>
      {children && <div id={id}>{children}</div>}
      <a
        href={href}
        className={isDisabled || isLoading ? cls.disabled : undefined}
        title={title}
        aria-describedby={children ? id : undefined}
        {...htmlAnchorProps}
      >
        <Icon />
        <span>
          <span className={cls.title}>{title}</span>
          {subtitle && <span className={cls.subtitle}>{subtitle}</span>}
        </span>
      </a>
    </div>
  );
}
