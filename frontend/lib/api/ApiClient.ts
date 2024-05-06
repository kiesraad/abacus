export class ApiClient {
  host: string;

  constructor(host: string) {
    this.host = host;
  }

  async postRequest(path: string, requestBody: object): Promise<Response> {
    const host = process.env.NODE_ENV === "test" ? "http://testhost" : "";
    const response = await fetch(host + "/v1" + path, {
      method: "POST",
      body: JSON.stringify(requestBody),
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response;
  }
}
