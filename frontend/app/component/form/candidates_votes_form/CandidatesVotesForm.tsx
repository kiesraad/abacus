import * as React from "react";

import { BottomBar, Button, InputGrid } from "@kiesraad/ui";
import { usePositiveNumberInputMask, usePreventFormEnterSubmit } from "@kiesraad/util";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useElectionDataRequest } from "@kiesraad/api";

interface FormElements extends HTMLFormControlsCollection {
  pollCards: HTMLInputElement;
  proxyCertificates: HTMLInputElement;
  voterCards: HTMLInputElement;
  totalAdmittedVoters: HTMLInputElement;
  votesOnCandidates: HTMLInputElement;
  blankVotes: HTMLInputElement;
  invalidVotes: HTMLInputElement;
  totalVotesCast: HTMLInputElement;
}

interface CandidatesVotesFormElement extends HTMLFormElement {
  readonly elements: FormElements;
}

export function CandidatesVotesForm() {
  const { id, section } = useParams();
  // const { register, format, deformat } = usePositiveNumberInputMask();
  const { register, format } = usePositiveNumberInputMask();
  const [candidates, setCandidates] = useState<string[]>([]);
  const [listName, setListName] = useState("");
  const formRef = React.useRef<HTMLFormElement>(null);
  const { data, loading } = useElectionDataRequest({
    election_id: parseInt(id || ""),
  });
  usePreventFormEnterSubmit(formRef);
  // const [doSubmit, { data, loading, error }] = usePollingStationDataEntry({
  //   polling_station_id: 1,
  //   entry_number: 1,
  // });

  useEffect(() => {
    if (data) {
      const names: string[] = [];
      const listNumber = parseInt(section?.replace("list", "") || "");
      const currentGroup = data.political_groups?.find((group) => group.number === listNumber);
      if (currentGroup) {
        setListName(currentGroup.name);
        currentGroup.candidates.forEach(
          (candidate: { initials: string; first_name: string; last_name: string }) =>
            names.push(`${candidate.last_name}, ${candidate.initials} (${candidate.first_name})`),
        );
        setCandidates(names);
      }
    }
  }, [data, section]);

  function handleSubmit(event: React.FormEvent<CandidatesVotesFormElement>) {
    event.preventDefault();
    // const elements = event.currentTarget.elements;

    // doSubmit({
    //   data: {
    //     voters_counts: {
    //       poll_card_count: deformat(elements.pollCards.value),
    //       proxy_certificate_count: deformat(elements.proxyCertificates.value),
    //       voter_card_count: deformat(elements.voterCards.value),
    //       total_admitted_voters_count: deformat(elements.totalAdmittedVoters.value),
    //     },
    //     votes_counts: {
    //       votes_candidates_counts: deformat(elements.votesOnCandidates.value),
    //       blank_votes_count: deformat(elements.blankVotes.value),
    //       invalid_votes_count: deformat(elements.invalidVotes.value),
    //       total_votes_cast_count: deformat(elements.totalVotesCast.value),
    //     },
    //   },
    // });
  }

  return (
    <form onSubmit={handleSubmit} ref={formRef}>
      <h2>{listName}</h2>
      {/*{data && <p id="result">Success</p>}*/}
      {/*{error && (*/}
      {/*  <p id="result">*/}
      {/*    Error {error.errorCode} {error.message || ""}*/}
      {/*  </p>*/}
      {/*)}*/}
      <InputGrid zebra>
        <InputGrid.Header>
          <th>Nummer</th>
          <th>Aantal stemmen</th>
          <th>Kandidaat</th>
        </InputGrid.Header>
        <InputGrid.Body>
          {candidates.map((candidate, index) => {
            const addSeparator = (index + 1) % 25 == 0;
            return (
              <>
                <InputGrid.Row>
                  <td>{index + 1}</td>
                  <td>
                    <input
                      id={`candidate${index + 1}`}
                      {...register()}
                      defaultValue={format(pickGoodTestNumber())}
                    />
                  </td>
                  <td>{candidate}</td>
                </InputGrid.Row>
                {addSeparator && <InputGrid.Separator />}
              </>
            );
          })}
          <InputGrid.Total>
            <td></td>
            <td>
              <input id="list1_total" {...register()} defaultValue={format(pickGoodTestNumber())} />
            </td>
            <td>Totaal lijst 1</td>
          </InputGrid.Total>
        </InputGrid.Body>
      </InputGrid>
      <BottomBar type="form">
        <Button type="submit" size="lg" disabled={loading}>
          Volgende
        </Button>
        <span className="button_hint">SHIFT + Enter</span>
      </BottomBar>
    </form>
  );
}

//currently I want zeroes in the value
function pickGoodTestNumber() {
  const n = Math.ceil(Math.random() * 4) * 10 * 10;
  return Math.floor(Math.random() * n) * 10;
}
