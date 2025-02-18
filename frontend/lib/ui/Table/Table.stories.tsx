import { Story } from "@ladle/react";

import { Fraction } from "@kiesraad/api";
import { IconCheckHeart } from "@kiesraad/icon";
import { Badge, Icon } from "@kiesraad/ui";

import { Table } from "./Table";

const data: [number, string, string][] = [
  [1, "some", "value"],
  [2, "other", "value"],
  [3, "another", "thing"],
];

export const BasicTable: Story = () => (
  <Table id="basic_table">
    <Table.Header>
      <Table.HeaderCell>Number</Table.HeaderCell>
      <Table.HeaderCell className="w-13">Fixed width</Table.HeaderCell>
      <Table.HeaderCell>Some value</Table.HeaderCell>
    </Table.Header>
    <Table.Body>
      {data.map((row) => (
        <Table.Row key={row[0]}>
          <Table.NumberCell>{row[0]}</Table.NumberCell>
          <Table.Cell>{row[1]}</Table.Cell>
          <Table.Cell>{row[2]}</Table.Cell>
        </Table.Row>
      ))}
    </Table.Body>
  </Table>
);

export const StyledTable: Story = () => (
  <Table id="styled_table">
    <Table.Header className="bg-gray">
      <Table.HeaderCell>Nummer</Table.HeaderCell>
      <Table.HeaderCell>Stembureau</Table.HeaderCell>
    </Table.Header>
    <Table.Body className="fs-sm">
      <Table.Row>
        <Table.NumberCell className="bg-gray">33</Table.NumberCell>
        <Table.Cell>
          <span>Op rolletjes</span>
          <Badge type="first_entry_in_progress" />
        </Table.Cell>
      </Table.Row>
      <Table.Row>
        <Table.NumberCell className="bg-gray">34</Table.NumberCell>
        <Table.Cell>
          <span>Testplek</span>
          <Badge type="first_entry_not_started" />
        </Table.Cell>
      </Table.Row>
    </Table.Body>
  </Table>
);

export const LinkTable: Story = () => {
  return (
    <Table id="link_table">
      <Table.Header>
        <Table.HeaderCell>Number</Table.HeaderCell>
        <Table.HeaderCell>Click me</Table.HeaderCell>
        <Table.HeaderCell>Look a chevron right of here</Table.HeaderCell>
      </Table.Header>
      <Table.Body className="fs-md">
        {data.map((row) => (
          <Table.LinkRow key={row[0]} to={`#row${row[0]}`}>
            <Table.NumberCell>{row[0]}</Table.NumberCell>
            <Table.Cell>{row[1]}</Table.Cell>
            <Table.Cell>{row[2]}</Table.Cell>
          </Table.LinkRow>
        ))}
      </Table.Body>
    </Table>
  );
};

export const TotalTableWithFractions: Story = () => {
  const data: [number, string, Fraction, number][] = [
    [1, "Political Group A", { integer: 3, numerator: 149, denominator: 150 }, 15],
    [2, "Political Group B", { integer: 5, numerator: 0, denominator: 1 }, 11],
    [3, "Political Group C", { integer: 8, numerator: 1, denominator: 150 }, 4],
  ];
  let total = 0;
  return (
    <>
      <h2>Fractions</h2>
      <Table id="total_table_with_fractions">
        <Table.Header>
          <Table.HeaderCell className="text-align-r">Number</Table.HeaderCell>
          <Table.HeaderCell className="w-full">List name</Table.HeaderCell>
          <Table.HeaderCell span={2} className="text-align-r">
            Fractions
          </Table.HeaderCell>
          <Table.HeaderCell className="text-align-r">Seats</Table.HeaderCell>
        </Table.Header>
        <Table.Body>
          {data.map((row) => {
            total += row[3];
            return (
              <Table.Row key={row[0]}>
                <Table.NumberCell>{row[0]}</Table.NumberCell>
                <Table.Cell>{row[1]}</Table.Cell>
                <Table.DisplayFractionCells>{row[2]}</Table.DisplayFractionCells>
                <Table.NumberCell>{row[3]}</Table.NumberCell>
              </Table.Row>
            );
          })}
          <Table.TotalRow>
            <Table.Cell />
            <Table.Cell />
            <Table.Cell colSpan={2} className="text-align-r">
              Total
            </Table.Cell>
            <Table.NumberCell>{total}</Table.NumberCell>
          </Table.TotalRow>
        </Table.Body>
      </Table>

      <h2 className="mt-lg">Fractions with only whole numbers</h2>
      <Table id="total_table_with_fractions_whole_numbers">
        <Table.Header>
          <Table.HeaderCell className="text-align-r">Number</Table.HeaderCell>
          <Table.HeaderCell className="w-full">List name</Table.HeaderCell>
          <Table.HeaderCell span={2} className="text-align-r">
            Fractions
          </Table.HeaderCell>
          <Table.HeaderCell className="text-align-r">Seats</Table.HeaderCell>
        </Table.Header>
        <Table.Body>
          {data.map((row) => {
            total += row[3];
            return (
              <Table.Row key={row[0]}>
                <Table.NumberCell>{row[0]}</Table.NumberCell>
                <Table.Cell>{row[1]}</Table.Cell>
                <Table.DisplayFractionCells>{{ ...row[2], numerator: 0, denominator: 0 }}</Table.DisplayFractionCells>
                <Table.NumberCell>{row[3]}</Table.NumberCell>
              </Table.Row>
            );
          })}
          <Table.TotalRow>
            <Table.Cell />
            <Table.Cell />
            <Table.Cell colSpan={2} className="text-align-r">
              Total
            </Table.Cell>
            <Table.NumberCell>{total}</Table.NumberCell>
          </Table.TotalRow>
        </Table.Body>
      </Table>
    </>
  );
};

export const IconBadgeTable: Story = () => (
  <Table id="icon_badge_table">
    <Table.Header>
      <Table.HeaderCell>Number</Table.HeaderCell>
      <Table.HeaderCell>With icon</Table.HeaderCell>
      <Table.HeaderCell>With badge</Table.HeaderCell>
    </Table.Header>
    <Table.Body>
      {data.map((row) => (
        <Table.LinkRow key={row[0]} to={`#row${row[0]}`}>
          <Table.NumberCell>{row[0]}</Table.NumberCell>
          <Table.Cell>
            <Icon icon={<IconCheckHeart />} color="accept" />
            <span>{row[1]}</span>
          </Table.Cell>
          <Table.Cell>
            <span>{row[2]}</span>
            <Badge type="first_entry_in_progress" showIcon />
          </Table.Cell>
        </Table.LinkRow>
      ))}
    </Table.Body>
  </Table>
);
