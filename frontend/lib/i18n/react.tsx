import * as React from "react";

import { locale, TranslationKey, translations } from ".";

export function tx(k: TranslationKey, components: { [key: string]: React.ReactNode }): React.ReactNode {
  const translated = translations[locale][k];
  //tokenize translated into text and <tag>..</tag> parts
  const parts = translated.split(/<[^>]+>/g);

  console.error(parts, components);

  return <></>;
}
