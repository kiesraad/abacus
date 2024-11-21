import { Story } from "@ladle/react";

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
      <Table.Column>Number</Table.Column>
      <Table.Column width={"20rem"}>Fixed width</Table.Column>
      <Table.Column>Some value</Table.Column>
    </Table.Header>
    <Table.Body>
      {data.map((row) => (
        <Table.Row key={row[0]}>
          <Table.Cell number fontSizeClass="fs-body">
            {row[0]}
          </Table.Cell>
          <Table.Cell fontSizeClass="fs-md">{row[1]}</Table.Cell>
          <Table.Cell fontSizeClass="fs-md">{row[2]}</Table.Cell>
        </Table.Row>
      ))}
    </Table.Body>
  </Table>
);

export const LinkTable: Story = () => {
  return (
    <Table id="link_table">
      <Table.Header>
        <Table.Column>Number</Table.Column>
        <Table.Column>Click me</Table.Column>
        <Table.Column>Look a chevron</Table.Column>
      </Table.Header>
      <Table.Body>
        {data.map((row) => (
          <Table.LinkRow key={row[0]} to={`#row${row[0]}`}>
            <Table.Cell number fontSizeClass="fs-body">
              {row[0]}
            </Table.Cell>
            <Table.Cell fontSizeClass="fs-md">{row[1]}</Table.Cell>
            <Table.Cell fontSizeClass="fs-md">{row[2]}</Table.Cell>
          </Table.LinkRow>
        ))}
      </Table.Body>
    </Table>
  );
};

export const IconBadgeTable: Story = () => (
  <Table id="icon_badge_table">
    <Table.Header>
      <Table.Column>Number</Table.Column>
      <Table.Column>With icon</Table.Column>
      <Table.Column>With badge</Table.Column>
    </Table.Header>
    <Table.Body>
      {data.map((row) => (
        <Table.LinkRow key={row[0]} to={`#row${row[0]}`}>
          <Table.Cell number fontSizeClass="fs-body">
            {row[0]}
          </Table.Cell>
          <Table.Cell fontSizeClass="fs-md">
            <Icon icon={<IconCheckHeart />} color="accept" />
            <span>{row[1]}</span>
          </Table.Cell>
          <Table.Cell fontSizeClass="fs-md">
            <span>{row[2]}</span>
            <Badge type="first_entry_in_progress" showIcon />
          </Table.Cell>
        </Table.LinkRow>
      ))}
    </Table.Body>
  </Table>
);
