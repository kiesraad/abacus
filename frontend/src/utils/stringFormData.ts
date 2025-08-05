export class StringFormData extends FormData {
  // This class extends FormData to provide a method for retrieving *trimmed* string values
  getString(name: string): string {
    const value = this.get(name);

    return typeof value === "string" ? value.trim() : "";
  }
}
