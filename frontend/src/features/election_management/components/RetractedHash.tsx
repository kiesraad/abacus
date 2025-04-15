import { cn } from "@/lib/util/classnames";

import cls from "./RetractedHash.module.css";

export interface Stub {
  selected: boolean;
  index: number;
}

interface RetractedHashProps {
  hash: string[];
  stubs: Stub[];
}

export function RetractedHash({ hash, stubs }: RetractedHashProps) {
  return (
    <div className={cls.hash}>
      {hash.map((chunk, hashIndex) => {
        const prefix = hashIndex === 0 ? "" : "-";
        const stubIndex = stubs.findIndex((s) => s.index === hashIndex);
        // Either render a stub marker, or just return the prefix and chunk text
        if (stubIndex !== -1) {
          return (
            <>
              {prefix}
              <span
                className={cn(cls.hashChunkStub, stubs[stubIndex]?.selected ? cls.hashChunkStubHighlight : undefined)}
              >
                {stubIndex + 1}
              </span>
            </>
          );
        }

        return prefix + chunk;
      })}
    </div>
  );
}
