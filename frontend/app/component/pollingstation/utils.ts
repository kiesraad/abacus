export function getUrlForFormSectionID(electionId: number, pollingStationId: number, sectionId: string) {
  const baseUrl = `/${electionId}/input/${pollingStationId}`;

  let url: string = "";
  if (sectionId.startsWith("political_group_votes_")) {
    url = `${baseUrl}/list/${sectionId.replace("political_group_votes_", "")}`;
  } else {
    switch (sectionId) {
      case "recounted":
        url = `${baseUrl}/recounted`;
        break;
      case "differences_counts":
        url = `${baseUrl}/differences`;
        break;
      case "voters_votes_counts":
        url = `${baseUrl}/numbers`;
        break;
      case "save":
        url = `${baseUrl}/save`;
        break;
    }
  }

  return url;
}