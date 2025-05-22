import { Fragment, ReactElement, useId } from "react";

import { Table } from "@/components/ui/Table/Table";
import { ResolveAction } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { formatNumber } from "@/utils/format";

import cls from "./ResolveDifferences.module.css";

interface DifferencesTableProps {
  title: string;
  headers: string[];
  rows: DifferencesRow[];
  action?: ResolveAction;
}

function formatValue(value: string | number | undefined): string | ReactElement {
  if (!value) {
    return <span className={cls.zeroDash}>&mdash;</span>;
  } else if (typeof value === "string") {
    return value;
  } else {
    return formatNumber(value);
  }
}

export interface DifferencesRow {
  code?: number | string;
  first?: number | string;
  second?: number | string;
  description?: string;
}

const CELL_CLASSES = ["text-align-r", "font-number", "bold"];

export function DifferencesTable({ title, headers, rows, action }: DifferencesTableProps) {
  const id = useId();
  // An array of indices for rows that are different, also used to detect row gaps.
  // Two falsy values are considered equal (e.g. 0 and undefined)
  const differences = rows.reduce<number[]>(
    (show, row, index) => (row.first === row.second || (!row.first && !row.second) ? show : [...show, index]),
    [],
  );

  if (differences.length === 0) {
    return null;
  }

  const keepFirst = action === "keep_first_entry";
  const keepSecond = action === "keep_second_entry";
  const discardFirst = action === "keep_second_entry" || action === "discard_both_entries";
  const discardSecond = action === "keep_first_entry" || action === "discard_both_entries";

  return (
    <section className="mt-lg mb-xl">
      <h3 className="heading-lg" id={id}>
        {title}
      </h3>
      <div>
        <Table className={cls.differencesTable} aria-labelledby={id}>
          <Table.Header>
            <Table.HeaderCell className="w-6 text-align-r">{headers[0]}</Table.HeaderCell>
            <Table.HeaderCell className="w-13 text-align-r">{headers[1]}</Table.HeaderCell>
            <Table.HeaderCell className="w-13 text-align-r">{headers[2]}</Table.HeaderCell>
            <Table.HeaderCell>{headers[3]}</Table.HeaderCell>
          </Table.Header>
          <Table.Body>
            {differences.map((rowIndex, differenceIndex) => {
              // There is a gap if the previous row is not index - 1
              const gapRow = differenceIndex > 0 && differences[differenceIndex - 1] !== rowIndex - 1;

              return (
                <Fragment key={differenceIndex}>
                  {gapRow && (
                    <Table.Row>
                      <Table.Cell className={cls.gapRow} colSpan={4}></Table.Cell>
                    </Table.Row>
                  )}

                  <Table.Row>
                    <Table.HeaderCell scope="row" className="text-align-r normal">
                      {rows[rowIndex]?.code}
                    </Table.HeaderCell>
                    <Table.Cell className={cn(...CELL_CLASSES, keepFirst && cls.keep, discardFirst && cls.discard)}>
                      {formatValue(rows[rowIndex]?.first)}
                    </Table.Cell>
                    <Table.Cell className={cn(...CELL_CLASSES, keepSecond && cls.keep, discardSecond && cls.discard)}>
                      {formatValue(rows[rowIndex]?.second)}
                    </Table.Cell>
                    <Table.Cell>{rows[rowIndex]?.description}</Table.Cell>
                  </Table.Row>
                </Fragment>
              );
            })}
          </Table.Body>
        </Table>
      </div>
    </section>
  );
}
