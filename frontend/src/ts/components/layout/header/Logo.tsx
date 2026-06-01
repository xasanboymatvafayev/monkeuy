import { JSXElement } from "solid-js";

import { restartTestEvent } from "../../../events/test";
import { getActivePage } from "../../../states/core";
import { getFocus } from "../../../states/test";
import { cn } from "../../../utils/cn";

const LOGO_SRC = "frontend/src/ts/components/layout/header/logo1.png"
  return (
    <a
      href={`${location.origin}/`}
      class="-m-2 flex h-6 w-max items-center gap-2 rounded-[0.8rem] p-2"
      aria-label="TezYoz Bosh sahifa"
      router-link
      style={{ "box-sizing": "content-box" }}
      data-ui-element="logo"
      onClick={() => {
        if (getActivePage() === "test") restartTestEvent.dispatch();
      }}
    >
      <img
        src={LOGO_SRC}
        alt="TezYoz"
        class={cn("h-7 w-auto transition-opacity duration-250", {
          "opacity-30": getFocus(),
        })}
        style={{ "max-height": "28px", "object-fit": "contain" }}
      />
    </a>
  );
}
