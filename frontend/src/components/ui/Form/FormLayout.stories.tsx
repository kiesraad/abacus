import type { Meta, StoryFn } from "@storybook/react-vite";

import { Alert } from "../Alert/Alert";
import { Button } from "../Button/Button";
import { ChoiceList } from "../CheckboxAndRadio/ChoiceList";
import { InputField } from "../InputField/InputField";
import { FormLayout } from "./FormLayout";

export const DefaultFormLayout: StoryFn = () => (
  <div>
    <FormLayout.Alert>
      {/* FormLayout.Alert is outside of the FormLayout to prevent extra margin on the bottom. */}
      <Alert type="success">
        <h2>It works!</h2>
        <p>This is a success alert.</p>
      </Alert>
    </FormLayout.Alert>
    <FormLayout>
      <FormLayout.Section title="Section title which for a medium width form body is slightly wider">
        <p>
          Here is a description of this form, which should have a maximum width set by the width property of this
          FormLayout and never more than that, even though the title has a larger maximum width.
        </p>
        <FormLayout.Row>
          <InputField id="inp1" name="inp1" label="Input 1" fieldWidth="narrow" />
          <InputField id="inp2" name="inp2" label="Input 2" />
        </FormLayout.Row>
      </FormLayout.Section>

      <FormLayout.Section title="Section 2">
        <InputField id="inp3" name="inp3" label="Input 3" />
        <InputField id="inp4" name="inp4" label="Input 4" />
      </FormLayout.Section>

      <FormLayout.Section title="Section 3">
        <FormLayout.Field>
          <ChoiceList>
            <ChoiceList.Legend>Choose an option</ChoiceList.Legend>
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
        <InputField id="inp5" name="inp5" label="Input 5" />
      </FormLayout.Section>
      <FormLayout.Controls>
        <Button>Submit your changes</Button>
        <Button variant="secondary">Cancel</Button>
      </FormLayout.Controls>
    </FormLayout>
  </div>
);

export const DisabledFormLayout: StoryFn = () => (
  <div>
    <FormLayout disabled={true}>
      <FormLayout.Field>
        <ChoiceList>
          <ChoiceList.Legend>Choose an option</ChoiceList.Legend>
          <ChoiceList.Radio id="option1" label="Option 1">
            Some radio option with quite a large description about the results of picking this option
          </ChoiceList.Radio>
          <ChoiceList.Radio id="option2" label="Option 2" checked={true}>
            Then there is ofcourse another option which you could pick instead of the first option
          </ChoiceList.Radio>
          <ChoiceList.Radio id="option3" label="Option 3">
            People should be able to choose the third option as well
          </ChoiceList.Radio>
        </ChoiceList>
      </FormLayout.Field>
      <InputField id="inp1" name="inp1" label="Input 1" value="some text here already" />
      <FormLayout.Controls>
        <Button>Submit your changes</Button>
        <Button variant="secondary">Cancel</Button>
      </FormLayout.Controls>
    </FormLayout>
  </div>
);

export default {} satisfies Meta;
