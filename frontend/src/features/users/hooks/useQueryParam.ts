import { useSearchParams } from "react-router";

/**
 * A custom hook to get and clear a specific query parameter from the URL,
 * such as `?message=User%20created`
 *
 * @param {string} key - The query parameter key e.g. "message"
 * @returns {[string | null, () => void]} - The parameter value e.g. "User created", and a function to clear it
 */
export function useQueryParam(key: string): [string | null, () => void] {
  const [params, setParams] = useSearchParams();

  const param = params.get(key);

  const clearParam = () => {
    setParams((prev) => {
      prev.delete(key);
      return prev;
    });
  };

  return [param, clearParam];
}
