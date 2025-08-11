import { useEffect, useState } from "react";

import { useInitialApiGetWithErrors } from "@/api/useInitialApiGet";
import { Footer } from "@/components/footer/Footer";
import { NavBar } from "@/components/navbar/NavBar";
import { PageTitle } from "@/components/page_title/PageTitle";
import { AppLayout } from "@/components/ui/AppLayout/AppLayout";
import { t } from "@/i18n/translate";
import { ADMIN_EXISTS_REQUEST_PATH } from "@/types/generated/openapi";

import { CreateFirstAdminForm } from "./CreateFirstAdminForm";
import { FirstLoginForm } from "./FirstLoginForm";
import { InitialiseWelcome } from "./InitialiseWelcome";

enum InitialiseSteps {
  Welcome = "welcome",
  CreateAdminAccount = "create-admin-account",
  Login = "login",
}

interface InitialiseApplicationStepProps {
  step: InitialiseSteps;
  setStep: (step: InitialiseSteps) => void;
}

function InitialiseApplicationStep({ step, setStep }: InitialiseApplicationStepProps) {
  if (step === InitialiseSteps.Login) {
    return (
      <FirstLoginForm
        prev={() => {
          setStep(InitialiseSteps.CreateAdminAccount);
        }}
      />
    );
  }

  if (step === InitialiseSteps.CreateAdminAccount) {
    return (
      <CreateFirstAdminForm
        next={() => {
          setStep(InitialiseSteps.Login);
        }}
      />
    );
  }

  return (
    <InitialiseWelcome
      next={() => {
        setStep(InitialiseSteps.CreateAdminAccount);
      }}
    />
  );
}

export function InitialiseApplicationPage() {
  const [step, setStep] = useState<InitialiseSteps>(InitialiseSteps.Welcome);
  const url: ADMIN_EXISTS_REQUEST_PATH = "/api/initialise/admin-exists";
  const adminExists = useInitialApiGetWithErrors(url);

  // navigate to login if admin exists
  useEffect(() => {
    if (adminExists.requestState.status === "success") {
      setStep(InitialiseSteps.Login);
    }
  }, [adminExists.requestState]);

  return (
    <AppLayout>
      <NavBar empty />
      <PageTitle title={t("initialise.welcome_title")} />
      <InitialiseApplicationStep step={step} setStep={setStep} />
      <Footer />
    </AppLayout>
  );
}
