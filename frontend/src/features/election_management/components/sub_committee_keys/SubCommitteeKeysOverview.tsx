import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";
import type { SubCommittee } from "@/types/generated/openapi";
import { sortList } from "@/utils/sorting";

import cls from "../ElectionManagement.module.css";

interface SubCommitteeKeysOverviewProps {
  subCommittees: SubCommittee[];
}

function PendingKeysTable({ subCommittees }: SubCommitteeKeysOverviewProps) {
  return (
    <section>
      <h3 className="mb-md">{t("sub_committee_keys.pending")}</h3>
      <Table id="pending_sub_committee_keys" className={cls.keysTable}>
        <Table.Header>
          <Table.HeaderCell className="text-align-r">{t("number")}</Table.HeaderCell>
          <Table.HeaderCell>{t("committee_category.GSB.short")}</Table.HeaderCell>
        </Table.Header>
        <Table.Body className="fs-md">
          {subCommittees.map((subCommittee) => (
            <Table.Row key={subCommittee.id}>
              <Table.NumberCell>{subCommittee.authority_id}</Table.NumberCell>
              <Table.Cell className="break-word">{subCommittee.authority_name}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </section>
  );
}

function ImportedKeysTable({ subCommittees }: SubCommitteeKeysOverviewProps) {
  return (
    <section>
      <h3 className="mb-md">{t("sub_committee_keys.imported")}</h3>
      <Table id="imported_sub_committee_keys" className={cls.keysTable}>
        <Table.Header>
          <Table.HeaderCell className="text-align-r">{t("number")}</Table.HeaderCell>
          <Table.HeaderCell>{t("committee_category.GSB.short")}</Table.HeaderCell>
          <Table.HeaderCell className="text-align-r link-cell-padding">{t("sub_committee_keys.keys")}</Table.HeaderCell>
        </Table.Header>
        <Table.Body className="fs-md">
          {subCommittees.map((subCommittee) => (
            <Table.Row key={subCommittee.id} to={`${subCommittee.id}`}>
              <Table.NumberCell>{subCommittee.authority_id}</Table.NumberCell>
              <Table.Cell className="break-word">{subCommittee.authority_name}</Table.Cell>
              <Table.NumberCell>{subCommittee.certificates.length}</Table.NumberCell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </section>
  );
}

export function SubCommitteeKeysOverview({ subCommittees }: SubCommitteeKeysOverviewProps) {
  const sorted = sortList(subCommittees, (subCommittee) => ({ name: subCommittee.authority_name }));
  const pending = sorted.filter((subCommittee) => subCommittee.certificates.length === 0);
  const imported = sorted.filter((subCommittee) => subCommittee.certificates.length > 0);

  return (
    <article className={cls.subCommitteeKeys}>
      <section>
        <h2 className="form_title">{t("sub_committee_keys.add_all.title")}</h2>
        <p className="w-32">{t("sub_committee_keys.add_all.description")}</p>
      </section>

      {pending.length > 0 && <PendingKeysTable subCommittees={pending} />}
      {imported.length > 0 && <ImportedKeysTable subCommittees={imported} />}
    </article>
  );
}
