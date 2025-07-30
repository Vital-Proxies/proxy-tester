export default function getHttpErrorSuggestion(statusCode: number): string {
  switch (statusCode) {
    case 401:
    case 407:
      return "Authentication required - check proxy credentials";
    case 403:
      return "Access forbidden - proxy may block target URL";
    case 404:
      return "Target URL not found";

    case 429:
      return "Rate limited - proxy or target server overloaded";
    case 500:
    case 502:
    case 503:
    case 504:
      return "Server error - proxy or target server issues";
    default:
      return statusCode >= 400 && statusCode < 500
        ? "Client error - check request or proxy configuration"
        : "Server error - temporary issue, try again later";
  }
}
