import { ProxyState } from "../createState.ts";

const decoder = new TextDecoder();

export class TimeoutError extends Error {
  code = "ECONTIMEDOUT";
  name = "TimeoutError";
  ok = false;
  redirected = false;
  status = 408;
  statusText = "ECONTIMEDOUT";
  type = "error";

  constructor(public message: string = "TimeoutError", public url?: string) {
    super(message);
  }

  static type() {
    return this.name;
  }
}

export function sendProxyReq(state: ProxyState) {
  const url = state.proxy.url as URL;
  const reqInit = state.proxy.reqInit;
  const timeout = state.options.timeout;
  const isTimeout = typeof timeout === "number";

  // TODO: use AbortController - blocked by https://github.com/denoland/deno/pull/6093.

  let timeoutId: number;
  return Promise.all<any>([
    fetch(url, reqInit).then((res) => {
      if (isTimeout) clearTimeout(timeoutId);

      return res;
    }),
    ...(isTimeout
      ? [
        new Promise((resolve, reject) => {
          timeoutId = setTimeout(
            () => reject(new TimeoutError(TimeoutError.type(), url.toString())),
            timeout,
          );
        }),
      ]
      : []),
  ]).then(async ([res]: Response[]) => {
    state.proxy.res = res;
    const bufferedResponse = await res.arrayBuffer();
    state.proxy.resData = bufferedResponse === null
      ? null
      : bufferedResponse;

    return state;
  });
}
