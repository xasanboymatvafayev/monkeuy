import { JSXElement } from "solid-js";

import { restartTestEvent } from "../../../events/test";
import { getActivePage } from "../../../states/core";
import { getFocus } from "../../../states/test";
import { cn } from "../../../utils/cn";
import { isDevEnvironment } from "../../../utils/env";

export function Logo(): JSXElement {
  return (
    <a
      href={`${location.origin}/`}
      class="-m-2 flex h-6 w-max gap-2 rounded-[0.8rem] p-2 focus-visible:**:data-[ui-element='logoSubtext']:text-transparent"
      aria-label="TezYoz Bosh sahifa"
      router-link
      style={{
        "box-sizing": "content-box",
        "font-family": "Lexend Deca, sans-serif",
      }}
      data-ui-element="logo"
      onClick={() => {
        if (getActivePage() === "test") restartTestEvent.dispatch();
      }}
    >
      {/* TezYoz SVG Logo - tezlik chiziqlari bilan */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 120 40"
        class={cn("h-full transition-colors", {
          "opacity-40": getFocus(),
        })}
      >
        {/* Tezlik chiziqlari */}
        <line x1="2" y1="14" x2="18" y2="14" stroke="#e2b714" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="5" y1="20" x2="18" y2="20" stroke="#e2b714" stroke-width="2" stroke-linecap="round"/>
        <line x1="8" y1="26" x2="18" y2="26" stroke="#e2b714" stroke-width="1.5" stroke-linecap="round"/>
        {/* "Tez" qismi - qora */}
        <text
          x="20"
          y="30"
          font-family="Lexend Deca, sans-serif"
          font-weight="800"
          font-size="22"
          fill="#d1d0c5"
          letter-spacing="-0.5"
        >Tez</text>
        {/* "Yoz" qismi - sariq */}
        <text
          x="62"
          y="30"
          font-family="Lexend Deca, sans-serif"
          font-weight="800"
          font-size="22"
          fill="#e2b714"
          letter-spacing="-0.5"
        >Yoz</text>
      </svg>

      <div class="hidden h-6 place-content-center text-[2rem] leading-0 sm:grid">
        <div
          class={cn(
            "-mt-[1.65em] hidden pl-[0.5em] text-[0.315em] leading-0 text-sub transition-colors duration-125 lg:block",
            { "text-transparent": getFocus() },
          )}
          data-ui-element="logoSubtext"
        >
          {isDevEnvironment() ? "localhost" : "tez va aniq yozing"}
        </div>
      </div>
    </a>
  );
}
