import Header from "./Header";

type Props = {
  sidebar: React.ReactNode;
  children: React.ReactNode;
};

export default function Layout({ children, sidebar }: Props) {
  return (
    <div>
      <Header />
      <main className="h-screen flex">
        <div className="w-full md:w-1/4 hidden md:flex max-w-sm bg-white border-r flex-col h-screen fixed">
          {sidebar}
        </div>
        <div className="w-full my-4">{children}</div>
      </main>
    </div>
  );
}
