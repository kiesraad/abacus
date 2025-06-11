import { DataEntrySection, SectionValues } from "../types/types";
import { HeadingSubsectionComponent } from "./subsections/HeadingSubsection";
import { InputGridSubsectionComponent } from "./subsections/InputGridSubsection";
import { MessageSubsectionComponent } from "./subsections/MessageSubsection";
import { RadioSubsectionComponent } from "./subsections/RadioSubsection";

export interface DataEntrySubsectionsProps {
  section: DataEntrySection;
  currentValues: SectionValues;
  setValues: (path: string, value: string) => void;
  defaultProps: {
    errorsAndWarnings?: Map<string, "error" | "warning">;
    errorsAndWarningsAccepted: boolean;
  };
  missingTotalError: boolean;
}

export function DataEntrySubsections({
  section,
  currentValues,
  setValues,
  defaultProps,
  missingTotalError,
}: DataEntrySubsectionsProps) {
  return (
    <>
      {section.subsections.map((subsection, subsectionIdx) => {
        switch (subsection.type) {
          case "heading":
            return <HeadingSubsectionComponent key={`heading-${subsectionIdx}`} subsection={subsection} />;
          case "message":
            return <MessageSubsectionComponent key={`message-${subsectionIdx}`} subsection={subsection} />;
          case "radio":
            return (
              <RadioSubsectionComponent
                key={`radio-${subsectionIdx}`}
                subsection={subsection}
                currentValues={currentValues}
                setValues={setValues}
                defaultProps={defaultProps}
              />
            );
          case "inputGrid":
            return (
              <InputGridSubsectionComponent
                key={`input-grid-${subsectionIdx}`}
                subsection={subsection}
                sectionId={section.id}
                currentValues={currentValues}
                setValues={setValues}
                defaultProps={defaultProps}
                missingTotalError={missingTotalError}
              />
            );
        }
      })}
    </>
  );
}
