import { Button } from "@kiesraad/ui";
import { useNavigate } from "react-router-dom";

export function InputHomePage() {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate("/input/030");
  };

  return (
    <>
      <header>
        <h1>Input home page</h1>
      </header>
      <main>
        <article>
          <h2>Welk stembureau ga je invoeren?</h2>

          <Button onClick={handleStart}>Beginnen</Button>
        </article>
      </main>
    </>
  );
}
