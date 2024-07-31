import { useParams } from "react-router-dom";

//
export function useNumericParam(p: string): number {
  const params = useParams();
  const param = params[p];
  if (!param) {
    throw Error(`Parameter ${p} does not exist`);
  }

  if (!/\d+/.test(param)) {
    throw Error(`Parameter ${p} is not numeric`);
  }

  return parseInt(param, 10);
}
