import { App } from "@capacitor/app";

type BackHandler = () => boolean | Promise<boolean>;

const handlers: BackHandler[] = [];

export const BackButtonManager = {
  /**
   * Register a custom back button handler.
   * Handlers are stacked; only the most recently registered handler (top of the stack) is executed.
   * The handler should return true if it handled the event, or false if it wants to fall through.
   */
  push(handler: BackHandler) {
    handlers.push(handler);
    return () => {
      const idx = handlers.indexOf(handler);
      if (idx !== -1) {
        handlers.splice(idx, 1);
      }
    };
  },

  /**
   * Execute the top-most back button handler.
   * If no handler is registered, or they all returned false, execute the fallback.
   */
  async execute(fallback: () => void) {
    if (handlers.length > 0) {
      const handled = await handlers[handlers.length - 1]();
      if (handled) {
        return;
      }
    }
    fallback();
  }
};
