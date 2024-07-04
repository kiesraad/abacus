import * as React from "react";

import { usePollingStationDataEntry } from "@kiesraad/api";
import { BottomBar, Button, InputGrid, Tooltip } from "@kiesraad/ui";
import { usePositiveNumberInputMask, usePreventFormEnterSubmit } from "@kiesraad/util";

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

interface VotersAndVotesFormElement extends HTMLFormElement {
  readonly elements: FormElements;
}

export function VotersAndVotesForm() {
  const { register, deformat, warnings } = usePositiveNumberInputMask();
  const formRef = React.useRef<HTMLFormElement>(null);
  usePreventFormEnterSubmit(formRef);
  const [doSubmit, { data, loading, error }] = usePollingStationDataEntry({
    polling_station_id: 1,
    entry_number: 1,
  });

  function handleSubmit(event: React.FormEvent<VotersAndVotesFormElement>) {
    event.preventDefault();
    const elements = event.currentTarget.elements;

    doSubmit({
      data: {
        voters_counts: {
          poll_card_count: deformat(elements.pollCards.value),
          proxy_certificate_count: deformat(elements.proxyCertificates.value),
          voter_card_count: deformat(elements.voterCards.value),
          total_admitted_voters_count: deformat(elements.totalAdmittedVoters.value),
        },
        votes_counts: {
          votes_candidates_counts: deformat(elements.votesOnCandidates.value),
          blank_votes_count: deformat(elements.blankVotes.value),
          invalid_votes_count: deformat(elements.invalidVotes.value),
          total_votes_cast_count: deformat(elements.totalVotesCast.value),
        },
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} ref={formRef}>
      <h2>Toegelaten kiezers en uitgebrachte stemmen</h2>
      {data && <p id="result">Success</p>}
      {error && (
        <p id="result">
          Error {error.errorCode} {error.message || ""}
        </p>
      )}
      <InputGrid>
        <InputGrid.Header>
          <th>Veld</th>
          <th>Geteld aantal</th>
          <th>Omschrijving</th>
        </InputGrid.Header>
        <InputGrid.Body>
          <InputGrid.Row>
            <td>A</td>
            <td>
              <input id="pollCards" maxLength={11} {...register()} />
            </td>
            <td>Stempassen</td>
          </InputGrid.Row>
          <InputGrid.Row>
            <td>B</td>
            <td>
              <input id="proxyCertificates" maxLength={11} {...register()} />
            </td>
            <td>Volmachtbewijzen</td>
          </InputGrid.Row>
          <InputGrid.Row>
            <td>C</td>
            <td>
              <input id="voterCards" maxLength={11} {...register()} />
            </td>
            <td>Kiezerspassen</td>
          </InputGrid.Row>
          <InputGrid.Row isTotal addSeparator>
            <td>D</td>
            <td>
              <input id="totalAdmittedVoters" maxLength={11} {...register()} />
            </td>
            <td>Totaal toegelaten kiezers</td>
          </InputGrid.Row>
          <InputGrid.Row>
            <td>E</td>
            <td>
              <input id="votesOnCandidates" maxLength={11} {...register()} />
            </td>
            <td>Stemmen op kandidaten</td>
          </InputGrid.Row>
          <InputGrid.Row>
            <td>F</td>
            <td>
              <input id="blankVotes" maxLength={11} {...register()} />
            </td>
            <td>Blanco stemmen</td>
          </InputGrid.Row>
          <InputGrid.Row>
            <td>G</td>
            <td>
              <input id="invalidVotes" maxLength={11} {...register()} />
            </td>
            <td>Ongeldige stemmen</td>
          </InputGrid.Row>
          <InputGrid.Row isTotal>
            <td>H</td>
            <td>
              <input id="totalVotesCast" maxLength={11} {...register()} />
            </td>
            <td>Totaal uitgebrachte stemmen</td>
          </InputGrid.Row>
        </InputGrid.Body>
      </InputGrid>
      <BottomBar type="form">
        <Button type="submit" size="lg" disabled={loading}>
          Volgende
        </Button>
        <span className="button_hint">SHIFT + Enter</span>
      </BottomBar>
      {warnings.map((warning) => {
        const trimmedString =
          warning.value.length > 20 ? warning.value.substring(0, 20) + "..." : warning.value;
        return (
          <Tooltip key={warning.anchor.id} anchor={warning.anchor} closeOnClickOrKeyboardEvent>
            <p>
              Je probeert <strong>{trimmedString}</strong> te plakken. Je kunt hier alleen cijfers
              invullen.
            </p>
          </Tooltip>
        );
      })}
    </form>
  );
}
