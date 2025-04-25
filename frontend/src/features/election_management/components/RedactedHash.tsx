import { Fragment } from "react";

import { cn } from "@/utils/classnames";

import cls from "./RedactedHash.module.css";

export interface Stub {
  selected: boolean;
  index: number;
}

interface RedactedHashProps {
  hash: string[];
  stubs: Stub[];
}

export function RedactedHash({ hash, stubs }: RedactedHashProps) {
  return (
    <div className={cls.container}>
      <div id="hash" className={cls.hash}>
        {hash.map((chunk, hashIndex) => {
          const prefix = hashIndex === hash.length - 1 ? "" : "-";
          const stubIndex = stubs.findIndex((s) => s.index === hashIndex);
          // Either render a stub marker, or just return the prefix and chunk text
          if (stubIndex !== -1) {
            return (
              <Fragment key={stubIndex}>
                <span className={cn(cls.chunkStub, stubs[stubIndex]?.selected ? cls.chunkStubFocus : undefined)}>
                  {stubIndex + 1}
                </span>
                <span>{prefix}</span>
              </Fragment>
            );
          }

          return (
            <Fragment key={chunk}>
              <span className={cls.chunk}>{chunk}</span>
              <span>{prefix}</span>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
