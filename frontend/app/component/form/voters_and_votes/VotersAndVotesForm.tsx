import * as React from "react";

import { usePollingStationDataEntry } from "@kiesraad/api";
import { Button, InputGrid } from "@kiesraad/ui";
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
  const { register, format, deformat } = usePositiveNumberInputMask();
  const formRef = React.useRef<HTMLFormElement>(null);
  usePreventFormEnterSubmit(formRef);
  const [doSubmit, { data, loading, error }] = usePollingStationDataEntry({
    id: 1,
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
              <input id="pollCards" {...register()} defaultValue={format(pickGoodTestNumber())} />
            </td>
            <td>Stempassen</td>
          </InputGrid.Row>
          <InputGrid.Row>
            <td>B</td>
            <td>
              <input
                id="proxyCertificates"
                {...register()}
                defaultValue={format(pickGoodTestNumber())}
              />
            </td>
            <td>Volmachtbewijzen</td>
          </InputGrid.Row>
          <InputGrid.Row>
            <td>C</td>
            <td>
              <input id="voterCards" {...register()} defaultValue={format(pickGoodTestNumber())} />
            </td>
            <td>Kiezerspassen</td>
          </InputGrid.Row>
          <InputGrid.Row isTotal>
            <td>D</td>
            <td>
              <input
                id="totalAdmittedVoters"
                {...register()}
                defaultValue={format(pickGoodTestNumber())}
              />
            </td>
            <td>Totaal toegelaten kiezers</td>
          </InputGrid.Row>

          <InputGrid.Seperator />

          <InputGrid.Row>
            <td>E</td>
            <td>
              <input
                id="votesOnCandidates"
                {...register()}
                defaultValue={format(pickGoodTestNumber())}
              />
            </td>
            <td>Stemmen op kandidaten</td>
          </InputGrid.Row>
          <InputGrid.Row>
            <td>F</td>
            <td>
              <input id="blankVotes" {...register()} defaultValue={format(pickGoodTestNumber())} />
            </td>
            <td>Blanco stemmen</td>
          </InputGrid.Row>
          <InputGrid.Row>
            <td>G</td>
            <td>
              <input
                id="invalidVotes"
                {...register()}
                defaultValue={format(pickGoodTestNumber())}
              />
            </td>
            <td>Ongeldige stemmen</td>
          </InputGrid.Row>
          <InputGrid.Row isTotal>
            <td>H</td>
            <td>
              <input
                id="totalVotesCast"
                {...register()}
                defaultValue={format(pickGoodTestNumber())}
              />
            </td>
            <td>Totaal uitgebrachte stemmen</td>
          </InputGrid.Row>
        </InputGrid.Body>
      </InputGrid>
      <br /> <br />
      <Button type="submit" size="lg" disabled={loading}>
        Volgende
      </Button>
    </form>
  );
}

//currently I want zeroes in the value
function pickGoodTestNumber() {
  const n = Math.ceil(Math.random() * 4) * 10 * 10;
  return Math.floor(Math.random() * n) * 10;
}
