import type { JSX } from "react/jsx-runtime";
import type { ApportionmentState, SeatAssignment, SeatChange, SeatChangeStep } from "@/types/generated/openapi";
import cls from "../components/Apportionment.module.css";
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

type AssignmentTableData = {
  steps: SeatAssignment["steps"];
  resultChanges: ResultChange[];
};

export function buildAssignmentTableData(steps: SeatChangeStep[], state: ApportionmentState) {
  const dataset: Record<AssignmentStepType, AssignmentTableData> = {
    LargestRemainderAssignment: {
      steps: [],
      resultChanges: [],
    },
    HighestAverageAssignment: {
      steps: [],
      resultChanges: [],
    },
    UniqueHighestAverageAssignment: {
      steps: [],
      resultChanges: [],
    },
  };

  let currentTable: AssignmentStepType | undefined;
  for (const step of steps) {
    const change = step.change;
    const type = change.changed_by;

    if (type === "LargestRemainderAssignment") {
      dataset.LargestRemainderAssignment.steps.push(step);

      currentTable = type;
    } else if (type === "HighestAverageAssignment") {
      dataset.HighestAverageAssignment.steps.push(step);

      currentTable = type;
    } else if (type === "UniqueHighestAverageAssignment") {
      dataset.UniqueHighestAverageAssignment.steps.push(step);

      currentTable = type;
    } else if (type === "AbsoluteMajorityReassignment") {
      // This step can never occur as a first step
      if (!currentTable) continue;

      dataset[currentTable].resultChanges.push({
        listNumber: change.list_assigned_seat,
        footnoteNumber: 0,
        delta: 1,
        seat_type: "ResidualSeat",
        type: "AbsoluteMajorityReassignment",
      });

      dataset[currentTable].resultChanges.push({
        listNumber: change.list_retracted_seat,
        footnoteNumber: 0,
        delta: -1,
        seat_type: "ResidualSeat",
        type: "AbsoluteMajorityReassignment",
      });
    } else if (type === "ListExhaustionRemoval") {
      const existsInLargestRemainder = dataset.LargestRemainderAssignment.resultChanges.find(
        (c) => c.type === "FullSeatRemoval" && c.listNumber === change.list_retracted_seat,
      );
      // The full seat removal footnote is only rendered once per list, not for every removal
      if (change.full_seat && !existsInLargestRemainder) {
        // If < 19 this change is shown in the largest remainders table
        // If >= 19 this change is not shown
        dataset.LargestRemainderAssignment.resultChanges.push({
          listNumber: change.list_retracted_seat,
          footnoteNumber: 0,
          // Not correct, since this could happen multiple times. But during display we get this information from the standings
          delta: -1,
          seat_type: "FullSeat",
          type: "FullSeatRemoval",
        });
      }

      if (!change.full_seat) {
        // This step can never occur as a first step
        if (!currentTable) continue;

        const existsInUniqueHighestAverage = dataset.UniqueHighestAverageAssignment.resultChanges.find(
          (c) => c.type === "ResidualSeatRemoval" && c.listNumber === change.list_retracted_seat,
        );

        // A list can only get one residual seat removed in UniqueHighestAverageTable, hence another
        // ResidualSeatRemoval needs to be displayed in the LargestRemainderTable
        // There is never a footnote for HighestAverageAssignment (< 19 seats), because you can only
        // have these steps once list exhaustion (P 10) has been completed.
        const table =
          currentTable === "UniqueHighestAverageAssignment" && existsInUniqueHighestAverage
            ? "LargestRemainderAssignment"
            : currentTable;

        dataset[table].resultChanges.push({
          listNumber: change.list_retracted_seat,
          footnoteNumber: 0,
          delta: -1,
          seat_type: "ResidualSeat",
          type: "ResidualSeatRemoval",
        });
      }
    }
  }

  // This can not occur as a first step, so currentTable must be defined
  if (
    isListDrawingLotsVariant(state, ["AbsoluteMajorityHighestAverage", "AbsoluteMajorityLargestRemainder"]) &&
    currentTable
  ) {
    dataset[currentTable].resultChanges.push({
      listNumber: state.drawing_lots_required.assign_to,
      footnoteNumber: 0,
      delta: 0,
      seat_type: "ResidualSeat",
      type: "AbsoluteMajorityDrawingOfLots",
    });

    state.drawing_lots_required.options.forEach((list) => {
      dataset[currentTable].resultChanges.push({
        listNumber: list,
        footnoteNumber: 0,
        delta: 0,
        seat_type: "ResidualSeat",
        type: "AbsoluteMajorityDrawingOfLots",
      });
    });
  }

  const changes = [
    ...dataset.LargestRemainderAssignment.resultChanges,
    ...dataset.HighestAverageAssignment.resultChanges,
    ...dataset.UniqueHighestAverageAssignment.resultChanges,
  ];
  changes.sort((a, b) => {
    const order = [
      "FullSeatRemoval",
      "AbsoluteMajorityDrawingOfLots",
      "AbsoluteMajorityReassignment",
      "ResidualSeatRemoval",
    ];
    return order.indexOf(a.type) - order.indexOf(b.type);
  });

  let footnoteNumber = 0;
  let previousChangeType: ResultChange["type"] | undefined;
  for (const change of changes) {
    // Only update the footnote number if not an absolute majority type or if the previous change
    // type was not the same absolute majority type.
    if (
      !["AbsoluteMajorityDrawingOfLots", "AbsoluteMajorityReassignment"].includes(change.type) ||
      change.type !== previousChangeType
    ) {
      footnoteNumber++;
    }

    change.footnoteNumber = footnoteNumber;
    previousChangeType = change.type;
  }

  return dataset;
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
