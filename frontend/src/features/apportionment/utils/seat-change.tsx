import type { JSX } from "react/jsx-runtime";
import type { ApportionmentState } from "@/types/generated/openapi";
import cls from "../components/Apportionment.module.css";
import type {
  AbsoluteMajorityReassignmentStep,
  LargestRemainderAssignmentStep,
  ListExhaustionRemovalStep,
} from "./steps";
import { isListDrawingLotsVariant } from "./utils";

export interface ResultChange {
  listNumber: number;
  footnoteNumber: number;
  increase: number;
  decrease: number;
  type: "full_seat" | "residual_seat";
}

export function getResultChanges(
  uniquePgNumbersWithFullSeatsRemoved: number[],
  state: ApportionmentState,
  absoluteMajorityReassignment?: AbsoluteMajorityReassignmentStep,
  residualSeatRemovalSteps?: ListExhaustionRemovalStep[],
) {
  const resultChanges: ResultChange[] = [];
  let footnoteNumber = 0;
  uniquePgNumbersWithFullSeatsRemoved.forEach((listNumber) => {
    footnoteNumber += 1;
    resultChanges.push({
      listNumber: listNumber,
      footnoteNumber: footnoteNumber,
      increase: 0,
      decrease: 1,
      type: "full_seat",
    });
  });
  if (isListDrawingLotsVariant(state, ["AbsoluteMajorityHighestAverage", "AbsoluteMajorityLargestRemainder"])) {
    footnoteNumber += 1;
    resultChanges.push({
      listNumber: state.drawing_lots_required.assign_to,
      footnoteNumber: footnoteNumber,
      increase: 0,
      decrease: 0,
      type: "residual_seat",
    });
    state.drawing_lots_required.options.forEach((list) => {
      resultChanges.push({
        listNumber: list,
        footnoteNumber: footnoteNumber,
        increase: 0,
        decrease: 0,
        type: "residual_seat",
      });
    });
  }
  if (absoluteMajorityReassignment) {
    footnoteNumber += 1;
    resultChanges.push({
      listNumber: absoluteMajorityReassignment.change.list_assigned_seat,
      footnoteNumber: footnoteNumber,
      increase: 1,
      decrease: 0,
      type: "residual_seat",
    });
    resultChanges.push({
      listNumber: absoluteMajorityReassignment.change.list_retracted_seat,
      footnoteNumber: footnoteNumber,
      increase: 0,
      decrease: 1,
      type: "residual_seat",
    });
  }
  residualSeatRemovalSteps?.forEach((step) => {
    footnoteNumber += 1;
    resultChanges.push({
      listNumber: step.change.list_retracted_seat,
      footnoteNumber: footnoteNumber,
      increase: 0,
      decrease: 1,
      type: "residual_seat",
    });
  });
  return resultChanges;
}

export function splitResultChanges(
  resultChanges: ResultChange[],
  largestRemainderSteps: LargestRemainderAssignmentStep[],
) {
  const largestRemainderResultChanges: ResultChange[] = [];
  const uniqueHighestAverageResultChanges: ResultChange[] = [];
  resultChanges.forEach((change) => {
    if (change.type === "residual_seat") {
      if (
        largestRemainderSteps.find((step) => step.change.selected_list_number === change.listNumber) &&
        largestRemainderResultChanges.find(
          (largestRemainderChange) =>
            largestRemainderChange.listNumber === change.listNumber && largestRemainderChange.type === "residual_seat",
        )
      ) {
        uniqueHighestAverageResultChanges.push(change);
      } else {
        largestRemainderResultChanges.push(change);
      }
    } else {
      largestRemainderResultChanges.push(change);
    }
  });
  return { largestRemainderResultChanges, uniqueHighestAverageResultChanges };
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
