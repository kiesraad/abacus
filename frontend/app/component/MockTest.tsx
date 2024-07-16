import * as React from "react";

export function MockTest() {
  const [message, setMessage] = React.useState("...");

  React.useEffect(() => {
    const action = async () => {
      const response = await fetch("/ping", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ping: "ping" }),
      });

      const data = (await response.json()) as object;
      setMessage(`Response: ${JSON.stringify(data)}`);
    };

    action().catch((err: unknown) => {
      setMessage(`Error: ${err instanceof Error ? err.message : String(err)}`);
    });
  }, []);
  return (
    <div>
      <h4>Testing mockserver</h4>
      {message && <p>{message}</p>}
    </div>
  );
}
