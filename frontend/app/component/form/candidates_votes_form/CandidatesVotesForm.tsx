import * as React from "react";
import { useNavigate } from "react-router-dom";

import { PoliticalGroup } from "@kiesraad/api";
import { BottomBar, Button, InputGrid } from "@kiesraad/ui";
import { usePositiveNumberInputMask, usePreventFormEnterSubmit } from "@kiesraad/util";

interface FormElements extends HTMLFormControlsCollection {
  list_total: HTMLInputElement;
}

interface CandidatesVotesFormElement extends HTMLFormElement {
  readonly elements: FormElements;
}

export interface CandidatesVotesFormProps {
  group: PoliticalGroup;
}

export function CandidatesVotesForm({ group }: CandidatesVotesFormProps) {
  const navigate = useNavigate();
  const { register } = usePositiveNumberInputMask();
  const formRef = React.useRef<HTMLFormElement>(null);

  usePreventFormEnterSubmit(formRef);

  const candidates = React.useMemo(() => {
    return group.candidates.map((candidate) => {
      return `${candidate.last_name}, ${candidate.initials} (${candidate.first_name})`;
    });
  }, [group]);

  function handleSubmit(event: React.FormEvent<CandidatesVotesFormElement>) {
    event.preventDefault();
    navigate(`../list/${group.number + 1}`);
  }

  return (
    <form onSubmit={handleSubmit} ref={formRef}>
      <h2>{group.name}</h2>
      <InputGrid key={`list${group.number}`} zebra>
        <InputGrid.Header>
          <th>Nummer</th>
          <th>Aantal stemmen</th>
          <th>Kandidaat</th>
        </InputGrid.Header>
        <InputGrid.Body>
          {candidates.map((candidate, index) => {
            const addSeparator = (index + 1) % 25 == 0;
            return (
              <InputGrid.Row
                isFocused={index === 0}
                addSeparator={addSeparator}
                key={`list${group.number}-candidate${index + 1}`}
              >
                <td>{index + 1}</td>
                <td>
                  <input
                    id={`list${group.number}-candidate${index + 1}`}
                    maxLength={11}
                    {...register()}
                    /* eslint-disable-next-line jsx-a11y/no-autofocus */
                    autoFocus={index === 0}
                  />
                </td>
                <td>{candidate}</td>
              </InputGrid.Row>
            );
          })}
          <InputGrid.Total key={`list${group.number}-total`}>
            <td></td>
            <td>
              <input id={`list${group.number}-total`} maxLength={11} {...register()} />
            </td>
            <td>Totaal lijst {group.number}</td>
          </InputGrid.Total>
        </InputGrid.Body>
      </InputGrid>
      <BottomBar type="form">
        <Button type="submit" size="lg">
          Volgende
        </Button>
        <span className="button_hint">SHIFT + Enter</span>
      </BottomBar>
    </form>
  );
}
