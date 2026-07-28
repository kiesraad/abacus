import type { JSX } from "react/jsx-runtime";
import type { ApportionmentState, SeatChange, SeatChangeStep } from "@/types/generated/openapi";
import cls from "../components/Apportionment.module.css";
import {
  isAbsoluteMajorityReassignmentStep,
  isHighestAverageAssignmentStep,
  isLargestRemainderAssignmentStep,
  isListExhaustionRemovalStep,
  isUniqueHighestAverageAssignmentStep,
  type ListExhaustionRemovalStep,
  type SpecificStep,
} from "./steps";
import { isListDrawingLotsVariant } from "./utils";

export interface ResultChange {
  listNumber: number;
  footnoteNumber: number;
  delta: number;
  seat_type: "FullSeat" | "ResidualSeat";
  type: "FullSeatRemoval" | "AbsoluteMajorityDrawingOfLots" | "AbsoluteMajorityReassignment" | "ResidualSeatRemoval";
}

type AssignmentStepType = Extract<
  SeatChange["changed_by"],
  "LargestRemainderAssignment" | "HighestAverageAssignment" | "UniqueHighestAverageAssignment"
>;

type AssignmentTableDatasets = {
  [T in AssignmentStepType]: {
    steps: SpecificStep<T>[];
    resultChanges: ResultChange[];
  };
};

function resultChange(
  listNumber: number,
  delta: number,
  seat_type: ResultChange["seat_type"],
  type: ResultChange["type"],
): ResultChange {
  return { listNumber, footnoteNumber: 0, delta, seat_type, type };
}

const emptyTableData = () => ({ steps: [], resultChanges: [] });

export function buildAssignmentTableData(steps: SeatChangeStep[], state: ApportionmentState) {
  const tableData: AssignmentTableDatasets = {
    LargestRemainderAssignment: emptyTableData(),
    HighestAverageAssignment: emptyTableData(),
    UniqueHighestAverageAssignment: emptyTableData(),
  };

  let currentTable: AssignmentStepType | undefined;
  for (const step of steps) {
    // Assign every step to the correct table
    if (isLargestRemainderAssignmentStep(step)) {
      tableData.LargestRemainderAssignment.steps.push(step);
      currentTable = step.change.changed_by;
    } else if (isHighestAverageAssignmentStep(step)) {
      tableData.HighestAverageAssignment.steps.push(step);
      currentTable = step.change.changed_by;
    } else if (isUniqueHighestAverageAssignmentStep(step)) {
      tableData.UniqueHighestAverageAssignment.steps.push(step);
      currentTable = step.change.changed_by;
    }

    // Assign absolute majority and list exhaustion changes based on the current table
    if (isAbsoluteMajorityReassignmentStep(step)) {
      // This step can never occur as a first step
      if (!currentTable) continue;

      tableData[currentTable].resultChanges.push(
        resultChange(step.change.list_assigned_seat, 1, "ResidualSeat", "AbsoluteMajorityReassignment"),
        resultChange(step.change.list_retracted_seat, -1, "ResidualSeat", "AbsoluteMajorityReassignment"),
      );
    } else if (isListExhaustionRemovalStep(step)) {
      addListExhaustionChanges(tableData, currentTable, step.change);
    }
  }

  // Add drawing of lots changes to the current table, if applicable
  addAbsoluteMajorityDrawingOfLotsChanges(tableData, currentTable, state);

  // Finally update the footnote numbers for all changes in the table data
  assignFootnoteNumbers(tableData);

  return tableData;
}

function addListExhaustionChanges(
  tableData: AssignmentTableDatasets,
  currentTable: AssignmentStepType | undefined,
  change: ListExhaustionRemovalStep["change"],
) {
  // The full seat removal footnote is only rendered once per list, not for every removal
  if (change.full_seat) {
    const existingFullSeatRemoval = tableData.LargestRemainderAssignment.resultChanges.find(
      (c) => c.type === "FullSeatRemoval" && c.listNumber === change.list_retracted_seat,
    );

    if (!existingFullSeatRemoval) {
      tableData.LargestRemainderAssignment.resultChanges.push(
        resultChange(change.list_retracted_seat, -1, "FullSeat", "FullSeatRemoval"),
      );
    } else {
      existingFullSeatRemoval.delta -= 1;
    }
  }

  if (!change.full_seat) {
    // This step can never occur as a first step
    if (!currentTable) return;

    const hasUniqueHighestAverageRemoval = tableData.UniqueHighestAverageAssignment.resultChanges.some(
      (c) => c.type === "ResidualSeatRemoval" && c.listNumber === change.list_retracted_seat,
    );

    // A list can only get one residual seat removed in UniqueHighestAverageTable, hence another
    // ResidualSeatRemoval needs to be displayed in the LargestRemainderTable
    // There is never a footnote for HighestAverageAssignment (< 19 seats), because you can only
    // have these steps once list exhaustion (P 10) has been completed.
    const table =
      currentTable === "UniqueHighestAverageAssignment" && hasUniqueHighestAverageRemoval
        ? "LargestRemainderAssignment"
        : currentTable;

    tableData[table].resultChanges.push(
      resultChange(change.list_retracted_seat, -1, "ResidualSeat", "ResidualSeatRemoval"),
    );
  }
}

function addAbsoluteMajorityDrawingOfLotsChanges(
  tableData: AssignmentTableDatasets,
  currentTable: AssignmentStepType | undefined,
  state: ApportionmentState,
) {
  // Drawing of lots can not occur as a first step, so currentTable must be defined
  if (
    !isListDrawingLotsVariant(state, ["AbsoluteMajorityHighestAverage", "AbsoluteMajorityLargestRemainder"]) ||
    !currentTable
  ) {
    return;
  }

  tableData[currentTable].resultChanges.push(
    resultChange(state.drawing_lots_required.assign_to, 0, "ResidualSeat", "AbsoluteMajorityDrawingOfLots"),
    ...state.drawing_lots_required.options.map((list) =>
      resultChange(list, 0, "ResidualSeat", "AbsoluteMajorityDrawingOfLots"),
    ),
  );
}

// Assigns a footnote number to each change in the table data, based on the defined order
function assignFootnoteNumbers(tableData: AssignmentTableDatasets) {
  const changes = Object.values(tableData).flatMap((table) => table.resultChanges);
  const order: Record<ResultChange["type"], number> = {
    FullSeatRemoval: 0,
    AbsoluteMajorityDrawingOfLots: 1,
    AbsoluteMajorityReassignment: 2,
    ResidualSeatRemoval: 3,
  };
  changes.sort((a, b) => order[a.type] - order[b.type]);

  let footnoteNumber = 0;
  let previousChangeType: ResultChange["type"] | undefined;
  for (const change of changes) {
    // Absolute majority types share a footnote if they are consecutive,
    // so we only increment the footnote number if the previous change was not the same type
    const sharesFootnoteWithPrevious =
      ["AbsoluteMajorityDrawingOfLots", "AbsoluteMajorityReassignment"].includes(change.type) &&
      change.type === previousChangeType;

    if (!sharesFootnoteWithPrevious) {
      footnoteNumber++;
    }

    change.footnoteNumber = footnoteNumber;
    previousChangeType = change.type;
  }
}

export function getFootnotesFromResultChanges(listResultChanges: ResultChange[]) {
  const footnoteNumbers = listResultChanges.map((listResultChange) => listResultChange.footnoteNumber);
  const footnoteLinks: JSX.Element[] = [];
  footnoteNumbers.forEach((footnoteNumber, index) => {
    if (index > 0) {
      footnoteLinks.push(<span key={`comma-${footnoteNumber}`}>,</span>);
    }
    footnoteLinks.push(
      <a href={"#footnotes-list"} key={`footnoteLink-${footnoteNumber}`}>
        {footnoteNumber}
      </a>,
    );
  });
  return <sup className={cls.footnoteNumber}>{footnoteLinks}</sup>;
}
