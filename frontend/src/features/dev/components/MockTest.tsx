import * as React from "react";

interface PongResponse {
  pong: string;
}

function isPongResponse(data: unknown): data is PongResponse {
  return (
    typeof data === "object" && data !== null && "pong" in data && typeof (data as { pong: unknown }).pong === "string"
  );
}

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

      const rawData: unknown = await response.json();

      if (isPongResponse(rawData)) {
        const data = rawData;
        if (data.pong === "ping") {
          setMessage("✅");
        } else {
          setMessage(`⚠️: ${JSON.stringify(data)}`);
        }
      } else {
        setMessage(`❌: Invalid response format: ${JSON.stringify(rawData)}`);
      }
    };

    action().catch((err: unknown) => {
      setMessage(`❌: ${err instanceof Error ? err.message : String(err)}`);
    });
  }, []);
  return <p>Mock Service Worker: {message}</p>;
}
