export function directDownload(url: string) {
  const a = document.createElement("a");
  a.setAttribute("href", url);
  // Without the download attribute, Firefox starts a navigation and aborts all in-flight API requests.
  // The filename comes from the Content-Disposition header of the response.
  a.setAttribute("download", "");
  a.click();
}
