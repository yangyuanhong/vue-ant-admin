import { message } from "ant-design-vue";
import Clipboard from "clipboard";

function clipboardSuccess() {
  message.success("Copy successfully");
}

function clipboardError() {
  message.error("Copy failed");
}

export default function handleClipboard(text: string, event: MouseEvent) {
  const trigger = event.currentTarget;
  if (!(trigger instanceof Element)) {
    clipboardError();
    return;
  }

  const clipboard = new Clipboard(trigger, {
    text: () => text,
  }) as any;
  clipboard.on("success", () => {
    clipboardSuccess();
    clipboard.destroy();
  });
  clipboard.on("error", () => {
    clipboardError();
    clipboard.destroy();
  });
  // ClipboardJS registers a click listener in its constructor. Trigger the
  // operation directly for the current click, then clean up the listener.
  clipboard.onClick(event);
}
