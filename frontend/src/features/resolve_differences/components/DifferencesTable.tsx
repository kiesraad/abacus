import { Fragment, useId } from "react";

import { Table } from "@/components/ui/Table/Table";

import cls from "./ResolveDifferences.module.css";

interface DifferencesTableProps {
  title: string;
  headers: string[];
  rows: DifferencesRow[];
}

const zeroDash = <span className={cls.zeroDash}>&mdash;</span>;

export interface DifferencesRow {
  code?: number | string;
  first?: number | string;
  second?: number | string;
  description?: string;
}

export function DifferencesTable({ title, headers, rows }: DifferencesTableProps) {
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

  return (
    <section className="mt-lg mb-xl">
      <h2 id={id}>{title}</h2>
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
                    <Table.Cell className="text-align-r font-number bold">
                      {rows[rowIndex]?.first || zeroDash}
                    </Table.Cell>
                    <Table.Cell className="text-align-r font-number bold">
                      {rows[rowIndex]?.second || zeroDash}
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
