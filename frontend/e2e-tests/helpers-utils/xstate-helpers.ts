import { expect } from "@playwright/test";

export type TestStates = Record<string, () => Promise<void>>;
export type TestEvents = Record<string, () => Promise<void>>;

interface MyMachineConfig {
  initial: string;
  states: {
    [key: string]: { on?: Record<string, string> };
  };
}

export function getStatesAndEventsFromMachineDefinition(machineDef: MyMachineConfig) {
  const machineFromStates: string[] = Object.keys(machineDef.states);
  let machineEvents: string[] = [];
  let machineToStates: string[] = [];

  Object.values(machineDef.states).forEach((value) => {
    if ("on" in value) {
      machineEvents = [...machineEvents, ...Object.keys(value.on!)];
      machineToStates = [...machineToStates, ...Object.values(value.on!)];
    }
  });

  return { machineFromStates, machineEvents, machineToStates };
}

export function assertMachineAndImplementationMatches(
  dataEntryMachineDefinition: MyMachineConfig,
  states: TestStates,
  events: TestEvents,
) {
  const { machineFromStates, machineToStates, machineEvents } =
    getStatesAndEventsFromMachineDefinition(dataEntryMachineDefinition);

  expect(new Set(machineFromStates), "Machine definition from states and to states do not match").toEqual(
    new Set(machineToStates),
  );
  expect(new Set(Object.keys(states)), "Implemented states and machine definition states do not match").toEqual(
    new Set(machineFromStates),
  );
  expect(new Set(Object.keys(events)), "Implemented events and machine definition events do not match").toEqual(
    new Set(machineEvents),
  );
}
