import { useState } from "react";
import { useLocation } from "react-router";

import { isError, isSuccess } from "@/api/ApiResult";
import { ELECTION_IMPORT_VALIDATE_REQUEST_PATH, ElectionDefinitionUploadResponse } from "@/api/gen/openapi";
import { useCrud } from "@/api/useCrud";
import { Footer } from "@/components/footer/Footer";
import { NavBar } from "@/components/navbar/NavBar";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert, FileInput, ProgressList, StickyNav } from "@/components/ui";
import { cn } from "@/lib/util/classnames";

import { t } from "@kiesraad/i18n";

import { CheckElectionDefinition } from "./CheckElectionDefinition";
import cls from "./ElectionCreatePage.module.css";

export function ElectionCreatePage() {
  const location = useLocation();
  const [file, setFile] = useState<File | undefined>(undefined);
  const [data, setData] = useState<ElectionDefinitionUploadResponse | undefined>(undefined);
  const [error, setError] = useState<boolean>(false);
  const path: ELECTION_IMPORT_VALIDATE_REQUEST_PATH = `/api/elections/validate`;
  const { create } = useCrud<ElectionDefinitionUploadResponse>({ create: path });

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentFile = e.target.files ? e.target.files[0] : undefined;
    setFile(currentFile);
    if (currentFile !== undefined) {
      const response = await create({ data: await currentFile.text() });
      if (isSuccess(response)) {
        setData(response.data);
        setError(false);
      } else if (isError(response)) {
        setData(undefined);
        setError(true);
      }
    }
  };

  return (
    <>
      <PageTitle title={`${t("election.create")} - Abacus`} />
      <NavBar location={location} />
      <header>
        <section>
          <h1>{t("election.create")}</h1>
        </section>
      </header>
      <main>
        <StickyNav>
          <ProgressList>
            <ProgressList.Fixed>
              <ProgressList.Item key="election_definition" status="idle" active>
                <span>{t("election_definition")}</span>
              </ProgressList.Item>
              <ProgressList.Item key="polling_station_role" status="idle">
                <span>{t("polling_station.role")}</span>
              </ProgressList.Item>
              <ProgressList.Item key="list_of_candidates" status="idle">
                <span>{t("list_of_candidates.plural")}</span>
              </ProgressList.Item>
              <ProgressList.Item key="polling_stations" status="idle">
                <span>{t("polling_stations")}</span>
              </ProgressList.Item>
              <ProgressList.Item key="counting_method_type" status="idle">
                <span>{t("counting_method_type")}</span>
              </ProgressList.Item>
            </ProgressList.Fixed>
            <div className="mt-md">
              <ProgressList.Fixed>
                <ProgressList.Item key="check_and_save" status="idle">
                  <span>{t("check_and_save.title")}</span>
                </ProgressList.Item>
              </ProgressList.Fixed>
            </div>
          </ProgressList>
        </StickyNav>
        <article>
          <section className={cn("md", cls.container)}>
            {file && data ? (
              <CheckElectionDefinition file={file} election={data.election} hash={data.hash} />
            ) : (
              <>
                <h2>{t("election.import_eml")}</h2>
                {error && (
                  <Alert type="error" title={t("election.invalid_election_definition.title")} inline>
                    {t("election.invalid_election_definition.description")}
                  </Alert>
                )}
                <p className="mt-lg mb-lg">{t("election.use_instructions_to_import_eml")}</p>
                <FileInput id="upload-eml" onChange={(e) => void onFileChange(e)} file={file}>
                  {t("select_file")}
                </FileInput>
              </>
            )}
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
