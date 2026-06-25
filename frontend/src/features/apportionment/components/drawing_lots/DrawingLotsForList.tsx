import type { ApportionmentState } from "@/types/generated/openapi";

interface DrawingLotsForListProps {
  state: ApportionmentState;
}

export function DrawingLotsForList({ state }: DrawingLotsForListProps) {
  return (
    <ul>
      <li>{state.type}</li>
    </ul>
  );
}
