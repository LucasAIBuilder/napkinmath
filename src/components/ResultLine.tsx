type Props = {
  text: string | null;
  active: boolean;
};

export default function ResultLine({ text, active }: Props) {
  return (
    <div
      className={[
        "h-7 leading-7",
        "whitespace-pre",
        "text-right text-base sm:text-sm",
        active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-500",
      ].join(" ")}
    >
      {text ?? ""}
    </div>
  );
}
