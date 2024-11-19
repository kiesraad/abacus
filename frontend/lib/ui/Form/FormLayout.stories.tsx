import type { Story } from "@ladle/react";

import { Button } from "../Button/Button";
import { ChoiceList } from "../CheckboxAndRadio";
import { InputField } from "../InputField/InputField";
import { FormLayout } from "./FormLayout";

export const DefaultFormLayout: Story = () => (
  <div>
    <FormLayout>
      <FormLayout.Section title="Section 1">
        <FormLayout.Row>
          <InputField name="inp1" label="Input 1" fieldWidth="narrow" />
          <InputField name="inp2" label="Input 2" />
        </FormLayout.Row>
      </FormLayout.Section>

      <FormLayout.Section title="Section 2">
        <InputField name="inp3" label="Input 3" />
        <InputField name="inp4" label="Input 4" />
      </FormLayout.Section>

      <FormLayout.Section title="Section 3">
        <FormLayout.Field>
          <ChoiceList>
            <ChoiceList.Title>Choose an option</ChoiceList.Title>
            <ChoiceList.Radio id="option1" label="Option 1" />
            <ChoiceList.Radio id="option2" label="Option 2" />
            <ChoiceList.Radio id="option3" label="Option 3" />
          </ChoiceList>
        </FormLayout.Field>
        <InputField name="inp4" label="Input 6" />
      </FormLayout.Section>
      <FormLayout.Controls>
        <Button>Submit</Button>
      </FormLayout.Controls>
    </FormLayout>
  </div>
);
