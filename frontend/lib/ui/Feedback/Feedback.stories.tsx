import type { Story } from "@ladle/react";

import { AlertType } from "@kiesraad/ui";

import { Feedback } from "./Feedback";

type Props = {
  title: string;
  type: AlertType;
  code?: string;
};

export const DefaultFeedback: Story<Props> = ({ title, type, code }) => (
  <Feedback title={title} type={type} code={code}>
    <p>
      De invoer bij E, F, G of H lijkt niet te kloppen. Check of je het papieren proces verbaal goed
      hebt overgenomen.
    </p>
    <ul>
      <li>Heb je iets niet goed overgenomen? Herstel de fout en ga verder.</li>
      <li>
        Heb je alles gecontroleerd en komt je invoer overeen met het papier? Overleg dan met de
        coördinator.
      </li>
    </ul>
  </Feedback>
);

export default {
  args: {
    title: "Controleer pagina 1 van het proces verbaal",
    code: "F.201",
  },
  argTypes: {
    type: {
      options: ["error", "warning"],
      control: { type: "radio" },
      defaultValue: "error",
    },
  },
};
