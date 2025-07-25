// Prompt the user to 'download' (i.e. save) a file
function offerDownload(blob: Blob, filename: string) {
  const file = new File([blob], filename);
  const fileUrl = window.URL.createObjectURL(file);
  const anchorElement = document.createElement("a");

  anchorElement.href = fileUrl;
  anchorElement.download = filename;
  anchorElement.hidden = true;

  document.body.appendChild(anchorElement);

  anchorElement.click();
  anchorElement.remove();

  setTimeout(() => {
    window.URL.revokeObjectURL(fileUrl);
  }, 30000);
}

// Download a file from a URL and offer a download prompt to the user with the result
export async function downloadFrom(url: string) {
  let filename: string;

  try {
    const res = await fetch(url);
    if (res.status !== 200) {
      const message = `Download failed: status code ${res.status}`;
      throw new Error(message);
    }
    filename = res.headers.get("Content-Disposition")?.split('filename="')[1]?.slice(0, -1) ?? "document";
    offerDownload(await res.blob(), filename);
  } catch (e) {
    console.error(e);
  }
}
