import { NavBar } from "./NavBarPgObj";

export class TypistNavBar extends NavBar {
  async clickElection(electionLocation: string, electionName: string) {
    const linkText = `${electionLocation} — ${electionName}`;
    await this.navigation.getByRole("link", { name: linkText }).click();
  }
}
