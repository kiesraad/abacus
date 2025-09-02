import { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";

import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { KeyboardKeys } from "@/components/ui/KeyboardKeys/KeyboardKeys";
import { t } from "@/i18n/translate";
import { KeyboardKey } from "@/types/ui";

import { useElectionCreateContext } from "../hooks/useElectionCreateContext";

/*
 * NOTES:
 * - This page is only implemented for municipal elections
 * - Also CSB is yet unsupported by Abacus, so it is disabled by default
 */
export function PollingStationRole() {
  const { state } = useElectionCreateContext();
  const navigate = useNavigate();

  // if no election data was stored, navigate back to beginning
  if (!state.election) {
    return <Navigate to="/elections/create" />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await navigate("/elections/create/list-of-candidates");
  }

  return (
    <section className="md">
      <Form title={t("election.polling_station_type.title")} onSubmit={(e) => void handleSubmit(e)}>
        <FormLayout>
          <FormLayout.Section>
            <p>{t("election.polling_station_type.description")}</p>

            <ChoiceList>
              <ChoiceList.Legend>{t("election.polling_station_type.choose")}</ChoiceList.Legend>

              <ChoiceList.Checkbox
                id="gsb"
                label={t("election.polling_station_type.gsb")}
                checked={true}
                onChange={() => {
                  /*
                  We need this to suppress an error because we explicitly set the `checked` property.
                  We'll actually implement this handler once we support CSB
                */
                }}
              ></ChoiceList.Checkbox>
              <ChoiceList.Checkbox
                id="csp"
                label={
                  <span>
                    {t("election.polling_station_type.csb")} (
                    <b>{t("election.polling_station_type.csb_not_supported")}</b>)
                  </span>
                }
                checked={false}
                disabled
              ></ChoiceList.Checkbox>
            </ChoiceList>
          </FormLayout.Section>

          <FormLayout.Controls>
            <Button type="submit">{t("next")}</Button>
            <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
          </FormLayout.Controls>
        </FormLayout>
      </Form>
    </section>
  );
}
