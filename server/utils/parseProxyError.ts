import { ProxyError, ProxyProtocol } from "@/types";

export default function parseProxyError(
  error: any,
  protocol: ProxyProtocol
): ProxyError {
  let message = "Unknown error";
  let code = "UNKNOWN_ERROR";
  let suggestion: string | undefined;

  if (error.name === "AbortError") {
    message = "Connection timeout";
    code = "TIMEOUT";
    suggestion = "Try increasing timeout or check if proxy is responsive";
  } else if (error.code === "ECONNREFUSED") {
    message = "Connection refused by proxy";
    code = "CONNECTION_REFUSED";
    suggestion = "Check if proxy server is running and accessible";
  } else if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED") {
    message = "Connection timeout";
    code = "TIMEOUT";
    suggestion = "Proxy may be slow or overloaded";
  } else if (error.code === "ENOTFOUND") {
    message = "Proxy host not found";
    code = "HOST_NOT_FOUND";
    suggestion = "Verify proxy hostname/IP address";
  } else if (error.code === "ECONNRESET") {
    message = "Connection reset by proxy";
    code = "CONNECTION_RESET";
    suggestion = "Proxy may have connection limits or authentication issues";
  } else if (error.code === "EPROTO" || error.code === "EPROTONOSUPPORT") {
    message = `Protocol error - ${protocol} may not be supported`;
    code = "PROTOCOL_ERROR";
    suggestion = "Try a different protocol type";
  } else if (error.message?.toLowerCase().includes("authentication")) {
    message = "Authentication failed";
    code = "AUTH_FAILED";
    suggestion = "Check username/password credentials";
  } else if (
    error.message?.includes("tunneling socket could not be established")
  ) {
    message = "Proxy tunneling failed";
    code = "TUNNEL_FAILED";
    suggestion = "Proxy may not support HTTPS or target URL";
  } else if (error.message?.includes("socket hang up")) {
    message = "Connection dropped unexpectedly";
    code = "CONNECTION_DROPPED";
    suggestion = "Proxy connection is unstable";
  } else if (error.message) {
    message = error.message.substring(0, 150); // Increased limit but still reasonable
    code = "CUSTOM_ERROR";
  }

  return { message, code, suggestion };
}
