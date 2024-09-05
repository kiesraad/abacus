export function getUrlForFormSectionID(baseUrl: string, id: string) {
  let url: string = "";
  if (id.startsWith("political_group_votes_")) {
    url = `${baseUrl}/list/${id.replace("political_group_votes_", "")}`;
  } else {
    switch (id) {
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
