import { t } from "@/i18n/translate";

import { Button } from "../Button/Button";
import cls from "./Pagination.module.css";

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  return (
    <div className={cls.pagination}>
      <Button
        disabled={page === 1}
        onClick={() => {
          onPageChange(page - 1);
        }}
      >
        {t("previous")}
      </Button>
      <span>{t("page_number", { page, totalPages })}</span>
      <Button
        disabled={page === totalPages}
        onClick={() => {
          onPageChange(page + 1);
        }}
      >
        {t("next")}
      </Button>
    </div>
  );
}
