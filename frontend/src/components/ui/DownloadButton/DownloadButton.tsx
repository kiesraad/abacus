import type { AnchorHTMLAttributes } from "react";
import { IconDownload, IconFile } from "@/components/generated/icons";
import { cn } from "@/utils/classnames";
import cls from "./DownloadButton.module.css";

export interface DownloadButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  icon: "file" | "download";
  title: string;
  href: string;
  subtitle?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
}

export function DownloadButton({
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
    <a
      href={href}
      className={cn(cls.DownloadButton, cls[icon], isDisabled || isLoading ? cls.disabled : "")}
      title={title}
      {...htmlAnchorProps}
    >
      <Icon />
      <span>
        <span className={cls.title}>{title}</span>
        {subtitle && <span className={cls.subtitle}>{subtitle}</span>}
      </span>
    </a>
  );
}
