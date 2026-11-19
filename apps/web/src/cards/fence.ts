// Kept apart from the library so a post can find its card without loading the card code.
/** The fenced block an agent post may carry: ```openui … ``` */
export const CARD_FENCE = /```openui[ \t]*\n([\s\S]*?)```/
