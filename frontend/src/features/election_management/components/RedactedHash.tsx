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
              <Fragment key={hashIndex}>
                <span
                  className={cn(cls.chunk, cls.stub, stubs[stubIndex]?.selected ? cls.stubFocus : undefined)}
                  role={stubs[stubIndex]?.selected ? "mark" : undefined}
                >
                  {stubIndex + 1}
                </span>
                <span className={cls.delimiter}>{prefix}</span>
              </Fragment>
            );
          }

          return (
            <Fragment key={hashIndex}>
              <span className={cls.chunk}>{chunk}</span>
              <span className={cls.delimiter}>{prefix}</span>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
