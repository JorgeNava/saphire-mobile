declare module 'react-native-markdown-display' {
  import { ComponentType } from 'react';
  import { StyleProp, TextStyle, ViewStyle } from 'react-native';

  interface MarkdownStyles {
    [key: string]: StyleProp<TextStyle | ViewStyle>;
  }

  interface MarkdownProps {
    children: string;
    style?: MarkdownStyles;
    mergeStyle?: boolean;
  }

  const Markdown: ComponentType<MarkdownProps>;
  export default Markdown;
}
