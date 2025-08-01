import type { Meta, StoryFn } from "@storybook/react-vite";

import { Button } from "../Button/Button";
import { ChoiceList } from "../CheckboxAndRadio/ChoiceList";
import { InputField } from "../InputField/InputField";
import { FormLayout } from "./FormLayout";

export const DefaultFormLayout: StoryFn = () => (
  <div>
    <FormLayout>
      <FormLayout.Section title="Section title which for a medium width form body is slightly wider">
        <p>
          Here is a description of this form, which should have a maximum width set by the width property of this
          FormLayout and never more than that, even though the title has a larger maximum width.
        </p>
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
            <ChoiceList.Radio id="option1" label="Option 1">
              Some radio option with quite a large description about the results of picking this option
            </ChoiceList.Radio>
            <ChoiceList.Radio id="option2" label="Option 2">
              Then there is ofcourse another option which you could pick instead of the first option
            </ChoiceList.Radio>
            <ChoiceList.Radio id="option3" label="Option 3">
              People should be able to choose the third option as well
            </ChoiceList.Radio>
          </ChoiceList>
        </FormLayout.Field>
        <InputField name="inp5" label="Input 5" />
      </FormLayout.Section>
      <FormLayout.Controls>
        <Button>Submit your changes</Button>
        <Button variant="secondary">Cancel</Button>
      </FormLayout.Controls>
    </FormLayout>
  </div>
);

export default {} satisfies Meta;
