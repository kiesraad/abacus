import { Button } from "@/components/ui/Button/Button";
import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";
import type { ApportionmentState, ListSeatAssignment, PGNumber, PoliticalGroup } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { formatPoliticalGroupName } from "@/utils/politicalGroup";
import { getFootnotesFromResultChanges, type ResultChange } from "../../utils/seat-change";
import type { HighestAverageAssignmentStep } from "../../utils/steps";
import { isListDrawingLotsVariant } from "../../utils/utils";
import cls from "../Apportionment.module.css";

function getCellClassName(state: ApportionmentState, step: HighestAverageAssignmentStep, listNumber: PGNumber) {
  if (step.change.selected_list_number === listNumber) {
    if (
      isListDrawingLotsVariant(state, ["AbsoluteMajorityHighestAverage"]) &&
      state.drawing_lots_required.options.includes(step.change.selected_list_number)
    ) {
      return "bg-highlight bold";
    } else {
      return "bg-yellow bold";
    }
  } else if (step.change.list_options.includes(listNumber)) {
    return "bg-highlight";
  }
  return undefined;
}

function getListDrawingLotsInformation(state: ApportionmentState, list_number: number) {
  if (isListDrawingLotsVariant(state, ["HighestAverageResidualSeat"])) {
    const list_drawing_lots_average = state.drawing_lots_required.list_averages.find(
      (list_average) => list_average.pg_number === list_number,
    )?.average;
    const mark_list_drawing_lots_average = state.drawing_lots_required.options.includes(list_number);
    return { list_drawing_lots_average, mark_list_drawing_lots_average };
  }
  return { list_drawing_lots_average: undefined, mark_list_drawing_lots_average: false };
}

interface HighestAveragesTableProps {
  steps: HighestAverageAssignmentStep[];
  standings: ListSeatAssignment[];
  politicalGroups: PoliticalGroup[];
  resultChanges: ResultChange[];
  state: ApportionmentState;
}

export function HighestAveragesTable({
  steps,
  standings,
  politicalGroups,
  resultChanges,
  state,
}: HighestAveragesTableProps) {
  const addDrawingLotsRound = isListDrawingLotsVariant(state, ["HighestAverageResidualSeat"]);
  return (
    <div className={cls.scrollable}>
      <Table id="highest-averages-table" className={cn(cls.table, cls.highestAveragesTable)}>
        <Table.Header>
          <Table.HeaderCell className={cn(cls.sticky, "text-align-r")}>{t("list")}</Table.HeaderCell>
          <Table.HeaderCell className={cls.sticky}>{t("list_name")}</Table.HeaderCell>
          {steps.map((step, index) => (
            <Table.HeaderCell key={step.residual_seat_number} className="text-align-r" span={2}>
              {t("apportionment.round")} {index + 1}
            </Table.HeaderCell>
          ))}
          {addDrawingLotsRound && (
            <Table.HeaderCell className="text-align-r" span={2}>
              {t("apportionment.round")} {steps.length + 1}
            </Table.HeaderCell>
          )}
          <Table.HeaderCell className={cn(cls.sticky, "text-align-r")}>
            {t("apportionment.residual_seats_count")}
          </Table.HeaderCell>
        </Table.Header>
        <Table.Body>
          {standings.map((listSeatAssignment: ListSeatAssignment) => {
            let residualSeats = steps.filter((step) => {
              return step.change.selected_list_number === listSeatAssignment.list_number;
            }).length;
            const listResultChanges = resultChanges.filter(
              (change) => change.listNumber === listSeatAssignment.list_number,
            );
            listResultChanges.forEach((listResultChange) => {
              residualSeats = residualSeats + listResultChange.increase - listResultChange.decrease;
            });
            const { list_drawing_lots_average, mark_list_drawing_lots_average } = getListDrawingLotsInformation(
              state,
              listSeatAssignment.list_number,
            );

            return (
              <Table.Row key={listSeatAssignment.list_number}>
                <Table.Cell className={cn(cls.listNumberColumn, cls.sticky, "text-align-r", "font-number")}>
                  {listSeatAssignment.list_number}
                </Table.Cell>
                <Table.Cell className={cls.sticky}>
                  {formatPoliticalGroupName(
                    politicalGroups.find((pg) => pg.number === listSeatAssignment.list_number),
                    false,
                  )}
                </Table.Cell>
                {steps.map((step) => {
                  const average = step.standings.find(
                    (standing) => standing.list_number === listSeatAssignment.list_number,
                  )?.next_votes_per_seat;
                  return (
                    <Table.DisplayFractionCells
                      key={`${listSeatAssignment.list_number}-${step.residual_seat_number}`}
                      className={getCellClassName(state, step, listSeatAssignment.list_number)}
                    >
                      {!step.change.list_exhausted.includes(listSeatAssignment.list_number) ? average : undefined}
                    </Table.DisplayFractionCells>
                  );
                })}
                {list_drawing_lots_average && (
                  <Table.DisplayFractionCells className={mark_list_drawing_lots_average ? "bg-yellow bold" : undefined}>
                    {list_drawing_lots_average}
                  </Table.DisplayFractionCells>
                )}
                <Table.NumberCell className={cn(cls.sticky, "bold")}>
                  {getFootnotesFromResultChanges(listResultChanges)} {residualSeats}
                </Table.NumberCell>
              </Table.Row>
            );
          })}
          <Table.TotalRow>
            <Table.Cell className={cls.sticky} />
            <Table.Cell className={cn(cls.sticky, "text-align-r", "nowrap", "bold")}>
              {t("apportionment.residual_seat_assigned_to_list")}
            </Table.Cell>
            {steps.map((step) => (
              <Table.NumberCell key={step.residual_seat_number} colSpan={2}>
                {step.change.selected_list_number}
              </Table.NumberCell>
            ))}
            {addDrawingLotsRound && (
              <Table.Cell className={cn(cls.sticky, "text-align-r")} colSpan={2}>
                <Button.Link variant="underlined" className="bold" to="../drawing-lots">
                  {t("apportionment.drawing_lots_needed")}
                </Button.Link>
              </Table.Cell>
            )}
            <Table.Cell className={cls.sticky} />
          </Table.TotalRow>
        </Table.Body>
      </Table>
    </div>
  );
}
