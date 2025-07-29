import { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";

import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Form } from "@/components/ui/Form/Form";
import { t } from "@/i18n/translate";

import { useElectionCreateContext } from "../hooks/useElectionCreateContext";

/*
 * NOTE: DSO is currently unsupported by Abacus, so it is disabled by default
 */
export function CountingMethodType() {
  const { state } = useElectionCreateContext();
  const navigate = useNavigate();

  // if no election data was stored, navigate back to beginning
  if (!state.election) {
    return <Navigate to="/elections/create" />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await navigate("/elections/create/number-of-voters");
  }

  return (
    <section className="md">
      <h2>
        {t("election.voting_method_type.title")} {state.election.location}
      </h2>
      <p className="mt-lg mb-xl">
        {t("election.voting_method_type.description", {
          election: state.election.name,
          location: state.election.location,
        })}
      </p>
      <Form onSubmit={(e) => void handleSubmit(e)}>
        <ChoiceList>
          <ChoiceList.Radio
            id="cso"
            label={t("election.voting_method_type.cso")}
            checked={true}
            onChange={() => {
              /*
              We need this to suppress an error because we explicitly set the `checked` property.
              We'll actually implement this handler once we support DSO
            */
            }}
          >
            {t("election.voting_method_type.cso_description")}
          </ChoiceList.Radio>
          <ChoiceList.Radio
            id="dso"
            label={
              <span>
                {t("election.voting_method_type.dso")} (<b>{t("election.voting_method_type.dso_not_supported")}</b>)
              </span>
            }
            checked={false}
            disabled
          >
            {t("election.voting_method_type.dso_description")}
          </ChoiceList.Radio>
        </ChoiceList>
        <div className="mt-lg">
          <Button type="submit">{t("next")}</Button>
        </div>
      </Form>
    </section>
  );
}
