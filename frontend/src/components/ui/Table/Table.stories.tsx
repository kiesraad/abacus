import type { Meta, StoryFn, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { IconCheckHeart } from "@/components/generated/icons";

import { Badge } from "../Badge/Badge";
import { Icon } from "../Icon/Icon";
import { Table } from "./Table";

type Props = {
  onClick: () => void;
};

export default {
  args: {
    onClick: fn(),
  },
} satisfies Meta<Props>;

const data: [number, string, string][] = [
  [1, "some", "value"],
  [2, "other", "value"],
  [3, "another", "thing"],
];

export const BasicTable: StoryObj = {
  render: () => {
    return (
      <Table id="basic_table">
        <Table.Header>
          <Table.HeaderCell className="w-14">Large font</Table.HeaderCell>
          <Table.HeaderCell className="w-14">Fixed width</Table.HeaderCell>
          <Table.HeaderCell>Some value</Table.HeaderCell>
        </Table.Header>
        <Table.Body>
          {data.map((row) => (
            <Table.Row key={row[0]}>
              <Table.Cell>{`Element ${row[0]}`}</Table.Cell>
              <Table.Cell>{row[1]}</Table.Cell>
              <Table.Cell>{row[2]}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toHaveTableContent([
      ["Large font", "Fixed width", "Some value"],
      ["Element 1", "some", "value"],
      ["Element 2", "other", "value"],
      ["Element 3", "another", "thing"],
    ]);
  },
};

export const NumberCellTable: StoryFn = () => (
  <Table id="basic_table_number_cell">
    <Table.Header>
      <Table.HeaderCell>Number</Table.HeaderCell>
      <Table.HeaderCell className="w-14">Fixed width</Table.HeaderCell>
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

export const InformationTable: StoryFn = () => (
  <div className="w-39">
    <Table variant="information">
      <Table.Body>
        <Table.Row>
          <Table.Cell>Verkiezing</Table.Cell>
          <Table.Cell>Gemeenteraadsverkiezing 2026</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>Kiesgebied</Table.Cell>
          <Table.Cell>045 – Gemeente Juinen</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>Lijsten en kandidaten</Table.Cell>
          <Table.Cell>18 lijsten met 764 kandidaten</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>Aantal kiesgerechtigden</Table.Cell>
          <Table.Cell>24.000</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>

    <p className="mt-xl">
      NB: Table variant <i>information</i> does not have a first column with a larger font size.
    </p>
  </div>
);

export const StyledTable: StoryObj = {
  render: () => {
    return (
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
              <Badge type="first_entry_in_progress" userRole={"coordinator"} />
            </Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.NumberCell className="bg-gray">34</Table.NumberCell>
            <Table.Cell>
              <span>Testplek</span>
              <Badge type="empty" userRole={"coordinator"} />
            </Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toHaveTableContent([
      ["Nummer", "Stembureau"],
      ["33", "Op rolletjes 1e invoer"],
      ["34", "Testplek 1e invoer"],
    ]);
  },
};

export const ClickTable: StoryObj<Props> = {
  render: ({ onClick }) => {
    return (
      <Table id="link_table">
        <Table.Header>
          <Table.HeaderCell>Number</Table.HeaderCell>
          <Table.HeaderCell>Click me</Table.HeaderCell>
          <Table.HeaderCell>Look a chevron right of here</Table.HeaderCell>
        </Table.Header>
        <Table.Body className="fs-md">
          {data.map((row) => (
            <Table.ClickRow key={row[0]} onClick={onClick}>
              <Table.NumberCell>{row[0]}</Table.NumberCell>
              <Table.Cell>{row[1]}</Table.Cell>
              <Table.Cell>{row[2]}</Table.Cell>
            </Table.ClickRow>
          ))}
        </Table.Body>
      </Table>
    );
  },
  play: async ({ args, canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toHaveTableContent([
      ["Number", "Click me", "Look a chevron right of here"],
      ["1", "some", "value"],
      ["2", "other", "value"],
      ["3", "another", "thing"],
    ]);

    const rows = within(table).getAllByRole("row");
    await userEvent.click(rows[1]!);
    await expect(args.onClick).toHaveBeenCalled();
  },
};

export const LinkTable: StoryObj = {
  render: () => {
    return (
      <Table id="link_table">
        <Table.Header>
          <Table.HeaderCell>Number</Table.HeaderCell>
          <Table.HeaderCell>Click me</Table.HeaderCell>
          <Table.HeaderCell>Look a chevron right of here</Table.HeaderCell>
        </Table.Header>
        <Table.Body className="fs-md">
          {data.map((row) => (
            <Table.Row key={row[0]} to={`#row${row[0]}`}>
              <Table.NumberCell>{row[0]}</Table.NumberCell>
              <Table.Cell>{row[1]}</Table.Cell>
              <Table.Cell>{row[2]}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toHaveTableContent([
      ["Number", "Click me", "Look a chevron right of here"],
      ["1", "some", "value"],
      ["2", "other", "value"],
      ["3", "another", "thing"],
    ]);
  },
};

export const IconBadgeTable: StoryObj = {
  render: () => {
    return (
      <Table id="icon_badge_table">
        <Table.Header>
          <Table.HeaderCell>Number</Table.HeaderCell>
          <Table.HeaderCell>With icon</Table.HeaderCell>
          <Table.HeaderCell>With badge</Table.HeaderCell>
        </Table.Header>
        <Table.Body>
          {data.map((row) => (
            <Table.Row key={row[0]} to={`#row${row[0]}`}>
              <Table.NumberCell>{row[0]}</Table.NumberCell>
              <Table.Cell>
                <Icon icon={<IconCheckHeart />} color="accept" />
                <span>{row[1]}</span>
              </Table.Cell>
              <Table.Cell>
                <span>{row[2]}</span>
                <Badge type="first_entry_in_progress" showIcon userRole={"coordinator"} />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    );
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table");
    await expect(table).toHaveTableContent([
      ["Number", "With icon", "With badge"],
      ["1", "some", "value 1e invoer"],
      ["2", "other", "value 1e invoer"],
      ["3", "another", "thing 1e invoer"],
    ]);
  },
};
