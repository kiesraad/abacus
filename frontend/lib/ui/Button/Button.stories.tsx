import type { Story } from "@ladle/react";

import { Button } from "./Button";

export const DefaultButton: Story = () => <Button>Click me</Button>;

export const EnabledButton: Story<{
    text:string;
    label:string;
}> = ({label, text}) => <Button type="button" aria-label={label} >{text}</Button>;

EnabledButton.args = {
    text: "Click me!",
    label: "enabled-button",
}

export const DisabledButton: Story<{
    text:string;
    label:string;
    disabled: boolean;
}> = ({label, disabled, text}) => <Button type="button" aria-label={label} disabled={disabled}>{text}</Button>;

DisabledButton.args = {
    text: "I'm disabled!",
    label: "disabled-button",
    disabled: true,
}
