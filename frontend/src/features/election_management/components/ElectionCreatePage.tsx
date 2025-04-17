import { useState } from "react";
import { useLocation } from "react-router";

import { isError, isSuccess } from "@/api/ApiResult";
import { ELECTION_IMPORT_VALIDATE_REQUEST_PATH, ElectionDefinitionUploadResponse } from "@/api/gen/openapi";
import { useCrud } from "@/api/useCrud";
import { Footer } from "@/components/footer/Footer";
import { NavBar } from "@/components/navbar/NavBar";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert, Button, FileInput, InputField, ProgressList, StickyNav } from "@/components/ui";
import { cn } from "@/lib/util/classnames";
import { formatDateFull } from "@/lib/util/format";

import { t, tx } from "@kiesraad/i18n";

import cls from "./ElectionCreatePage.module.css";
import { RetractedHash, Stub } from "./RetractedHash";

export function ElectionCreatePage() {
  const location = useLocation();
  const [file, setFile] = useState<File | undefined>(undefined);
  const [data, setData] = useState<ElectionDefinitionUploadResponse | undefined>(undefined);
  const [stubs, setStubs] = useState<Stub[]>([]);
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
        setStubs(
          response.data.hash.retracted_indexes.map((retracted_index) => ({
            selected: false,
            index: retracted_index,
          })),
        );

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
              <>
                <h2>{t("election.check_eml.title")}</h2>
                <p>
                  {tx("election.check_eml.description", {
                    file: () => {
                      return <b>{file.name}</b>;
                    },
                  })}
                </p>
                <Alert type="notify" variant="no-icon" margin="mb-md" small>
                  <p>
                    <strong>{data.election.category}</strong>
                    <br />
                    <span className="capitalize">{formatDateFull(new Date(data.election.election_date))}</span>
                  </p>
                  <p>
                    <strong>Digitale vingerafdruk</strong> (hashcode):
                    <RetractedHash hash={data.hash.chunks} stubs={stubs} />
                  </p>
                </Alert>
                <p>{t("election.check_eml.check_hash.description")}</p>
                {stubs.map((stub, stubIndex) => (
                  <InputField
                    key={stub.index}
                    name={stub.index.toString()}
                    type="text"
                    label={t("election.check_eml.check_hash.label", { stub: stubIndex + 1 })}
                    hint={t("election.check_eml.check_hash.hint")}
                    fieldSize="medium"
                    fieldWidth="narrow"
                    margin="mb-md"
                    onFocus={() => {
                      const newStubs = [...stubs];
                      newStubs[stubIndex]!.selected = true;
                      setStubs(newStubs);
                    }}
                    onBlur={() => {
                      const newStubs = [...stubs];
                      newStubs[stubIndex]!.selected = false;
                      setStubs(newStubs);
                    }}
                    autoFocus={stubIndex === 0}
                  />
                ))}
                <div className="mt-lg">
                  <Button>{t("next")}</Button>
                </div>
              </>
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
