export type TestStates = Record<string, () => Promise<void>>;
export type TestEvents = Record<string, () => Promise<void>>;

interface MyMachineConfig {
  initial: string;
  states: {
    [key: string]: { on?: Record<string, string> };
  };
}

export function getStatesAndEventsFromMachineDefinition(machineDef: MyMachineConfig) {
  const machineStates: string[] = Object.keys(machineDef.states);

  let machineEvents: string[] = [];
  Object.values(machineDef.states).forEach((value) => {
    if ("on" in value) {
      machineEvents = [...machineEvents, ...Object.keys(value.on!)];
    }
  });

  return { machineStates, machineEvents };
}

export function getStatesAndEventsFromTest(testStates: TestStates[], testEvents: TestEvents[]) {
  let states: string[] = [];
  testStates.forEach((element) => {
    states = [...states, ...Object.keys(element)];
  });
  let events: string[] = [];
  testEvents.forEach((element) => {
    events = [...events, ...Object.keys(element)];
  });

  return { states, events };
}
