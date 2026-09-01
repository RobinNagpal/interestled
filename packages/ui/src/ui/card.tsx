import { View } from "react-native";
import type { ComponentProps, ReactElement, RefAttributes } from "react";
import { Text, TextClassContext } from "./text";
import { cn } from "./utils";

/** Vendored from react-native-reusables — see the note in `text.tsx`. */
type ViewProps = ComponentProps<typeof View> & RefAttributes<View>;
type CardTextProps = ComponentProps<typeof Text>;

export function Card({ className, ...props }: ViewProps): ReactElement {
  return (
    <TextClassContext.Provider value="text-card-foreground">
      <View className={cn("bg-card flex flex-col gap-3 rounded-card p-4", className)} {...props} />
    </TextClassContext.Provider>
  );
}

export function CardHeader({ className, ...props }: ViewProps): ReactElement {
  return <View className={cn("flex flex-col gap-1", className)} {...props} />;
}

export function CardTitle({ className, ...props }: CardTextProps): ReactElement {
  return <Text role="heading" aria-level={3} className={cn("text-lg font-semibold leading-none", className)} {...props} />;
}

export function CardDescription({ className, ...props }: CardTextProps): ReactElement {
  return <Text className={cn("text-muted-foreground text-sm", className)} {...props} />;
}

export function CardContent({ className, ...props }: ViewProps): ReactElement {
  return <View className={cn("gap-3", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ViewProps): ReactElement {
  return <View className={cn("flex flex-row items-center gap-2", className)} {...props} />;
}
