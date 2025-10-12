import type { BoxStyle, TextStyle } from "@opentui/core";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      box: {
        children?: React.ReactNode;
        style?: Partial<BoxStyle>;
        title?: string;
        border?: boolean;
        backgroundColor?: string;
        borderColor?: string;
        padding?: number;
        margin?: number;
        marginTop?: number;
        marginBottom?: number;
        marginLeft?: number;
        marginRight?: number;
        marginX?: number;
        marginY?: number;
        width?: string | number;
        height?: string | number;
        flexDirection?: "row" | "column";
        flexGrow?: number;
        flexShrink?: number;
        justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly";
        alignItems?: "flex-start" | "flex-end" | "center" | "stretch";
      };
      text: {
        children?: React.ReactNode;
        content?: string;
        style?: Partial<TextStyle>;
      };
      input: {
        placeholder?: string;
        onInput?: (value: string) => void;
        onSubmit?: () => void;
        focused?: boolean;
        style?: Partial<TextStyle>;
      };
    }
  }
}

export {};
