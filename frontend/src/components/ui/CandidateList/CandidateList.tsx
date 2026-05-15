import type { ReactNode } from "react";
import { t } from "@/i18n/translate";
import type { Candidate, DeceasedCandidate, PoliticalGroup } from "@/types/generated/openapi";
import { getCandidateFullName } from "@/utils/candidate";
import { formatPoliticalGroupName } from "@/utils/politicalGroup";
import { Table } from "../Table/Table";

interface CandidateListRowContentProps {
  candidate: Candidate;
  isDeceased: boolean;
}

function CandidateListRowContent({ candidate, isDeceased }: CandidateListRowContentProps): ReactNode {
  const name = getCandidateFullName(candidate);
  return (
    // TODO: Fix superscript dagger
    <>
      <Table.NumberCell className="bold">{candidate.number}</Table.NumberCell>
      <Table.Cell className={isDeceased ? "bold" : ""}>
        {name}
        {isDeceased && <sup>&nbsp;&dagger;</sup>}
      </Table.Cell>
    </>
  );
}

interface CandidateListRowProps {
  candidate: Candidate;
  pgNumber: number;
  isDeceased: boolean;
  onClick?: (candidateNumber: number, pgNumber: number) => void;
}

function CandidateListRow({ candidate, pgNumber, isDeceased, onClick }: CandidateListRowProps): ReactNode {
  if (onClick && !isDeceased) {
    return (
      <Table.ClickRow
        onClick={() => {
          onClick(candidate.number, pgNumber);
        }}
      >
        <CandidateListRowContent candidate={candidate} isDeceased={isDeceased} />
      </Table.ClickRow>
    );
  } else {
    return (
      <Table.Row>
        <CandidateListRowContent candidate={candidate} isDeceased={isDeceased} />
      </Table.Row>
    );
  }
}

interface CandidateListTableProps {
  politicalGroup: PoliticalGroup;
  deceasedCandidates?: DeceasedCandidate[];
  onClick?: (candidateNumber: number, pgNumber: number) => void;
}

function CandidateListTable({ politicalGroup, deceasedCandidates, onClick }: CandidateListTableProps): ReactNode {
  return (
    <Table>
      <Table.Header>
        <Table.HeaderCell className="text-align-r">{t("number")}</Table.HeaderCell>
        <Table.HeaderCell>{t("candidate.title.singular")}</Table.HeaderCell>
      </Table.Header>
      <Table.Body>
        {politicalGroup.candidates.map((candidate) => {
          return (
            <CandidateListRow
              key={candidate.number}
              candidate={candidate}
              pgNumber={politicalGroup.number}
              isDeceased={
                deceasedCandidates ? !!deceasedCandidates.find((dc) => dc.candidate_number === candidate.number) : false
              }
              onClick={onClick}
            />
          );
        })}
      </Table.Body>
    </Table>
  );
}

export interface CandidateListsProps {
  politicalGroup: PoliticalGroup;
  deceasedCandidates?: DeceasedCandidate[];
  onClick?: (candidateNumber: number, pgNumber: number) => void;
}

export function CandidateList({ politicalGroup, deceasedCandidates, onClick }: CandidateListsProps): ReactNode {
  return (
    <div>
      <h3 className="mb-md">{formatPoliticalGroupName(politicalGroup)}</h3>
      <CandidateListTable politicalGroup={politicalGroup} deceasedCandidates={deceasedCandidates} onClick={onClick} />
    </div>
  );
}
