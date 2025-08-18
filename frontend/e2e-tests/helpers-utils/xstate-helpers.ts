import { expect } from "@playwright/test";

export type TestStates = Record<string, () => Promise<void>>;
export type TestEvents = Record<string, () => Promise<void>>;

export interface MachineDefinition {
  initial: string;
  states: {
    [key: string]: { on?: Record<string, string> };
  };
}

// To be able to show a "custom error message" in the type error
type ErrorMessage<T extends string> = { __errorMessage__: T };

type ReferencedTargets<TStates> = {
  [K in keyof TStates]: TStates[K] extends { on: infer TOn } ? TOn[keyof TOn] : never;
}[keyof TStates];

type RequireStateForAllTargets<TStates, TInitial> = {
  // Check if the state exists in the list of all target states
  [K in Exclude<keyof TStates, symbol>]: K extends ReferencedTargets<TStates> | TInitial
    ? unknown
    : ErrorMessage<`State '${K}' is not used as a target state`>;
};

type RequireReferencedTargetExists<TStates> = {
  [K in keyof TStates]: TStates[K] extends { on: infer TOn }
    ? // If "on" is...
      TOn extends Record<string, string>
      ? // Then replace "on" with a validation type
        Omit<TStates[K], "on"> & { on: ValidateOn<TStates, TOn> }
      : TStates[K]
    : TStates[K];
};

// Check if the on target states exist in the keyof of the machine definition states
type ValidateOn<TStates, O extends Record<string, string>> = {
  [E in Exclude<keyof O, symbol>]: O[E] extends keyof TStates
    ? O[E]
    : ErrorMessage<`State '${E}' has a target state '${O[E]}' that does not exist`>;
};

export const typeCheckedMachineDefinition = <T extends MachineDefinition>(
  dataEntryMachineDefinition: T & {
    states: RequireStateForAllTargets<T["states"], T["initial"]> & RequireReferencedTargetExists<T["states"]>;
  },
) => dataEntryMachineDefinition;

export function getStatesAndEventsFromMachineDefinition(machineDef: MachineDefinition) {
  const machineStates: string[] = Object.keys(machineDef.states);
  let machineEvents: string[] = [];
  let machineTargetStates: string[] = [];

  Object.values(machineDef.states).forEach((value) => {
    if ("on" in value) {
      machineEvents = [...machineEvents, ...Object.keys(value.on!)];
      machineTargetStates = [...machineTargetStates, ...Object.values(value.on!)];
    }
  });

  return { machineStates, machineEvents, machineTargetStates };
}

export function assertMachineAndImplementationMatches(
  machineDefinition: MachineDefinition,
  states: TestStates,
  events: TestEvents,
) {
  const { machineStates, machineEvents, machineTargetStates } =
    getStatesAndEventsFromMachineDefinition(machineDefinition);

  expect(new Set(machineStates), "Machine definition states and target states do not match").toEqual(
    new Set(machineTargetStates).add(machineDefinition.initial),
  );
  expect(new Set(machineStates), "Machine definition states and implemented states do not match").toEqual(
    new Set(Object.keys(states)),
  );
  expect(new Set(machineEvents), "Machine definition events and implemented events do not match").toEqual(
    new Set(Object.keys(events)),
  );
}
