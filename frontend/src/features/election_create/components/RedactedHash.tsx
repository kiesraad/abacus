import { Fragment } from "react";

import { cn } from "@/utils/classnames";

import cls from "./RedactedHash.module.css";

export interface Stub {
  selected: boolean;
  index: number;
  error: string;
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
            const stub = stubs[stubIndex];
            if (!stub) return null;
            const selected = stub.selected;
            const error = stub.error.length > 0;

            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: we can use the index as key since there is no unique id
              <Fragment key={hashIndex}>
                <span
                  className={cn(
                    cls.chunk,
                    cls.stub,
                    error && !selected ? cls.error : undefined,
                    selected ? cls.stubFocus : undefined,
                  )}
                  role={selected ? "mark" : undefined}
                >
                  {stubIndex + 1}
                </span>
                <span className={cls.delimiter}>{prefix}</span>
              </Fragment>
            );
          }

          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: we can use the index as key since there is no unique id
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
