import type { Story } from "@ladle/react";

import { ShortcutHint } from "./ShortcutHint";

export const DefaultShortcut: Story = () => (
  <div style={{ minWidth: 800 }}>
    <ShortcutHint id="test1" shortcut="shift+enter" />
    <br />
    <br />
    <ShortcutHint id="test2" shortcut="shift+a" />
    <br />
    <br />
    <ShortcutHint id="test3" shortcut="ctrl+enter" />
    <br />
    <br />
    <ShortcutHint id="test4" shortcut="ctrl+space" />
    <br />
    <br />
    <ShortcutHint id="test5" shortcut="a" />
    <br />
    <br />
    <ShortcutHint id="test5" shortcut="ctrl+shift+b" />
  </div>
);
