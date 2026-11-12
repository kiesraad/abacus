export function directDownload(url: string) {
  const a = document.createElement("a");
  a.setAttribute("href", url);
  a.click();
}
