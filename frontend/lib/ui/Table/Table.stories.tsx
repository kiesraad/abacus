import { Story } from "@ladle/react";

import { Table } from "./Table";

const data: [number, string, string][] = [
  [1, "some", "value"],
  [2, "other", "value"],
  [3, "another", "thing"],
];

export const BasicTable: Story = () => (
  <Table id="basic_table">
    <Table.Header>
      <Table.Column number>Number</Table.Column>
      <Table.Column width={"20rem"}>Fixed width</Table.Column>
      <Table.Column>Some value</Table.Column>
    </Table.Header>
    <Table.Body>
      {data.map((row) => (
        <Table.Row key={row[0]}>
          <Table.Cell number>{row[0]}</Table.Cell>
          <Table.Cell>{row[1]}</Table.Cell>
          <Table.Cell>{row[2]}</Table.Cell>
        </Table.Row>
      ))}
    </Table.Body>
  </Table>
);

export const LinkTable: Story = () => {
  return (
    <Table id="link_table">
      <Table.Header>
        <Table.Column number>Number</Table.Column>
        <Table.Column>Click me</Table.Column>
        <Table.Column>Look a chevron</Table.Column>
      </Table.Header>
      <Table.Body>
        {data.map((row) => (
          <Table.LinkRow key={row[0]} to={`#row${row[0]}`}>
            <Table.Cell number>{row[0]}</Table.Cell>
            <Table.Cell>{row[1]}</Table.Cell>
            <Table.Cell>{row[2]}</Table.Cell>
          </Table.LinkRow>
        ))}
      </Table.Body>
    </Table>
  );
};
