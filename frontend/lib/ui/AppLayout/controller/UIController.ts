export abstract class UIController {
  ref: React.RefObject<HTMLDivElement>;

  constructor(ref: React.RefObject<HTMLDivElement>) {
    this.ref = ref;
  }

  register() {}
  unregister() {}
}
