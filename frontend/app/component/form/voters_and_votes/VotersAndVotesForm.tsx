import * as React from "react";

import { usePollingStationDataEntry } from "@kiesraad/api";
import { Button, InputGrid, Tooltip, Alert } from "@kiesraad/ui";
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
  const { register, format, deformat, warnings } = usePositiveNumberInputMask();
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

  const hasValidationError = data && data.validation_results.errors.length > 0;

  return (
    <form onSubmit={handleSubmit} ref={formRef}>
      <h2>Toegelaten kiezers en uitgebrachte stemmen</h2>
      {error && (
        <Alert type="error">
          <div>
            <h2>Error</h2>
            {error.message}
          </div>
        </Alert>
      )}
      {data && hasValidationError ? (
        <Alert type="error">
          <div>
            <h2>Validatie fouten</h2>
            <ul>
              {data.validation_results.errors.map((error) => (
                <li key={error.code}>{error.code}</li>
              ))}
            </ul>
          </div>
        </Alert>
      ) : (
        <Alert type="success">
          <div>
            <h2>Success</h2>
          </div>
        </Alert>
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

          <InputGrid.Separator />

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

//currently I want zeroes in the value
function pickGoodTestNumber() {
  const n = Math.ceil(Math.random() * 4) * 10 * 10;
  return Math.floor(Math.random() * n) * 10;
}
