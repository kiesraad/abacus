import type { Story } from "@ladle/react";

import { ShortcutHint } from "./ShortcutHint";

export const DefaultShortcut: Story = () => (
  <div style={{ minWidth: 800 }}>
    <ShortcutHint id="test1" shortcut="Shift+Enter" />
    <br />
    <br />
    <ShortcutHint id="test2" shortcut="Shift+a" />
    <br />
    <br />
    <ShortcutHint id="test3" shortcut="Control+Enter" />
    <br />
    <br />
    <ShortcutHint id="test4" shortcut="Control+Space" />
    <br />
    <br />
    <ShortcutHint id="test5" shortcut="a" />
    <br />
    <br />
    <ShortcutHint id="test5" shortcut="Control+Shift+b" />
  </div>
);
