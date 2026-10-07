import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { t } from "@/i18n/translate";
import { getCertificateMockData, getSubCommitteeMockData } from "@/testing/api-mocks/SubCommitteeMockData";
import { CertificateInformation } from "./CertificateInformation";

const certificate = getCertificateMockData({ common_name: "Gemeente Juinen" });
const subCommittee = getSubCommitteeMockData({
  id: 5,
  number: 5,
  name: "Juinen",
  authority_id: "0392",
  authority_name: "Juinen",
  certificates: [certificate],
});
const committee = `${t(`committee_category.${subCommittee.category}.abbreviation`)} ${subCommittee.authority_name}`;

const meta = {
  component: CertificateInformation,
  parameters: { needsMessages: true },
  args: {
    certificate: certificate,
    title: `${t("election_certificate.certificate")} ${committee} ${certificate.election_identifier}`,
    deleteHref: undefined,
  },
} satisfies Meta<typeof CertificateInformation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByTestId(`certificate-info-${certificate.public_key_fingerprint}`)).toHaveTextContent(
      [
        "Organisatie: PS2027_Noord-Holland",
        "Organisatorische eenheid: Abacus 1.2.0",
        "Algemene naam: Gemeente Juinen",
        "Geldig vanaf: 1 januari 2026",
        "Geldig tot en met: 1 april 2027",
        "Handtekeningalgoritme: RSA 4096-bit",
      ].join(""),
    );
    await expect(
      await canvas.findByTestId(`certificate-title-${certificate.public_key_fingerprint}`),
    ).toHaveTextContent("Publieke sleutel GSB Juinen PS2027_Noord-Holland");
  },
};
