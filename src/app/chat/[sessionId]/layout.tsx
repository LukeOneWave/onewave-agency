export default function ChatSessionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="-m-6 h-full overflow-hidden">{children}</div>;
}
