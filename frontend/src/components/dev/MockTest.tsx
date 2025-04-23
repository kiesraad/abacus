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

      const data = (await response.json()) as { pong: string };
      if (data.pong === "ping") {
        setMessage("✅");
      } else {
        setMessage(`⚠️: ${JSON.stringify(data)}`);
      }
    };

    action().catch((err: unknown) => {
      setMessage(`❌: ${err instanceof Error ? err.message : String(err)}`);
    });
  }, []);
  return <p>Mock Service Worker: {message}</p>;
}
