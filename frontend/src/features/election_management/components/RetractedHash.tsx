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
    <div id="hash" className={cls.hash}>
      {hash.map((chunk, hashIndex) => {
        const prefix = hashIndex === hash.length - 1 ? "" : "-";
        const stubIndex = stubs.findIndex((s) => s.index === hashIndex);
        // Either render a stub marker, or just return the prefix and chunk text
        if (stubIndex !== -1) {
          return (
            <>
              <div className={cn(cls.chunkStub, stubs[stubIndex]?.selected ? cls.chunkStubFocus : undefined)}>
                {stubIndex + 1}
              </div>
              {prefix}
            </>
          );
        }

        return (
          <>
            <div className={cls.chunk}>{chunk}</div>
            {prefix}
          </>
        );
      })}
    </div>
  );
}
