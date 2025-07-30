export default function getFailureSuggestion(errors: string[]): string {
  const errorText = errors.join(" ").toLowerCase();

  if (errorText.includes("timeout")) {
    return "Connection timeouts detected - proxy may be slow or unreachable";
  } else if (errorText.includes("refused") || errorText.includes("not found")) {
    return "Connection issues - verify proxy address and availability";
  } else if (
    errorText.includes("authentication") ||
    errorText.includes("auth")
  ) {
    return "Authentication problems - check credentials";
  } else if (errorText.includes("protocol")) {
    return "Tried different protocols but none worked";
  } else {
    return "Multiple connection failures - proxy may be invalid or offline";
  }
}
