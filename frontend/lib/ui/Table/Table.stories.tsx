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
  <>
    <div className="mb-lg">
      <Table id="basic_table">
        <Table.Header>
          <Table.Column>Number</Table.Column>
          <Table.Column className="w-13">Fixed width</Table.Column>
          <Table.Column>Some value</Table.Column>
        </Table.Header>
        <Table.Body>
          {data.map((row) => (
            <Table.Row key={row[0]}>
              <Table.Cell className="table-number">{row[0]}</Table.Cell>
              <Table.Cell>{row[1]}</Table.Cell>
              <Table.Cell>{row[2]}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>

    <div className="mb-lg">
      <Table id="styled_table">
        <Table.Header className="bg-gray">
          <Table.Column>Nummer</Table.Column>
          <Table.Column>Stembureau</Table.Column>
        </Table.Header>
        <Table.Body className="fs-sm">
          <Table.Row>
            <Table.Cell className="table-number">33</Table.Cell>
            <Table.Cell>
              <span>Op rolletjes</span>
              <Badge type="first_entry_in_progress" />
            </Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell className="table-number">34</Table.Cell>
            <Table.Cell>
              <span>Testplek</span>
              <Badge type="not_started" />
            </Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
    </div>
  </>
);

export const LinkTable: Story = () => {
  return (
    <Table id="link_table">
      <Table.Header>
        <Table.Column>Number</Table.Column>
        <Table.Column>Click me</Table.Column>
        <Table.Column>Look a chevron</Table.Column>
      </Table.Header>
      <Table.Body className="fs-md">
        {data.map((row) => (
          <Table.LinkRow key={row[0]} to={`#row${row[0]}`}>
            <Table.Cell className="table-number">{row[0]}</Table.Cell>
            <Table.Cell>{row[1]}</Table.Cell>
            <Table.Cell>{row[2]}</Table.Cell>
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
          <Table.Cell className="table-number">{row[0]}</Table.Cell>
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
