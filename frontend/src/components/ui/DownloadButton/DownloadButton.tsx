import type { AnchorHTMLAttributes, ReactNode } from "react";
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

  return (
    <div className={cls.downloadButton}>
      {children && <div>{children}</div>}
      <a href={href} className={isDisabled || isLoading ? cls.disabled : undefined} title={title} {...htmlAnchorProps}>
        <Icon />
        <span>
          <span className={cls.title}>{title}</span>
          {subtitle && <span className={cls.subtitle}>{subtitle}</span>}
        </span>
      </a>
    </div>
  );
}
