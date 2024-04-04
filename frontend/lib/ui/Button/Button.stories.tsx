import type { Story } from "@ladle/react";

import { Button } from "./Button";

export const DefaultButton: Story = () => <Button>Click me</Button>;

export const EnabledButton: Story<{
    text:string;
    label:string;
}> = ({label, text}) => <Button type="button" aria-label={label} >{text}</Button>;

DefaultButton.args = {
    text: "Click me!",
    label: "I'm a label!",
}

export const DisabledButton: Story<{
    text:string;
    label:string;
    disabled: boolean;
}> = ({label, disabled, text}) => <Button type="button" aria-label={label} disabled={disabled}>{text}</Button>;

DisabledButton.args = {
    text: "I'm disabled!",
    label: "I'm a dislabel!",
    disabled: true,
}
