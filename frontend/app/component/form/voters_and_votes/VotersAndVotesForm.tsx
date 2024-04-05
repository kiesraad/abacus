import { Button, InputGrid } from "@kiesraad/ui";
import { useInputMask } from "@kiesraad/util";

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
  const { register, format } = useInputMask({});

  function handleSubmit(event: React.FormEvent<VotersAndVotesFormElement>) {
    event.preventDefault();
    const elements = event.currentTarget.elements;
    const result = {
      pollCards: elements.pollCards.value,
      proxyCertificates: elements.proxyCertificates.value,
      voterCards: elements.voterCards.value,
      totalAdmittedVoters: elements.totalAdmittedVoters.value,
      votesOnCandidates: elements.votesOnCandidates.value,
      blankVotes: elements.blankVotes.value,
      invalidVotes: elements.invalidVotes.value,
      totalVotesCast: elements.totalVotesCast.value
    };
    console.log(result);
  }

// Instead of adding data-testid like below for pollCards, we could also set the config option testIdAttribute to id.
// See https://testing-library.com/docs/dom-testing-library/api-configuration/#testidattribute

  return (
    <form onSubmit={handleSubmit}>
      <h3>Toegelaten kiezers en uitgebrachte stemmen</h3>
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
              <input id="pollCards" data-testid="pollCards" {...register()} defaultValue={format(pickGoodTestNumber())} />
            </td>
            <td>Stempassen</td>
          </InputGrid.Row>
          <InputGrid.Row>
            <td>B</td>
            <td>
              <input id="proxyCertificates" {...register()} defaultValue={format(pickGoodTestNumber())} />
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
              <input id="totalAdmittedVoters" {...register()} defaultValue={format(pickGoodTestNumber())} />
            </td>
            <td>Totaal toegelaten kiezers</td>
          </InputGrid.Row>

          <InputGrid.Seperator />

          <InputGrid.Row>
            <td>E</td>
            <td>
              <input id="votesOnCandidates" {...register()} defaultValue={format(pickGoodTestNumber())} />
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
              <input id="invalidVotes" {...register()} defaultValue={format(pickGoodTestNumber())} />
            </td>
            <td>Ongeldige stemmen</td>
          </InputGrid.Row>
          <InputGrid.Row isTotal>
            <td>H</td>
            <td>
              <input id="totalVotesCast" {...register()} defaultValue={format(pickGoodTestNumber())} />
            </td>
            <td>Totaal uitgebrachte stemmen</td>
          </InputGrid.Row>
        </InputGrid.Body>
      </InputGrid>
      <br /> <br />
      <Button type="submit">Volgende</Button>
    </form>
  );
}

//currently I want zeroes in the value
function pickGoodTestNumber() {
  const n = Math.ceil(Math.random() * 4) * 10 * 10;
  return Math.floor(Math.random() * n) * 10;
}
