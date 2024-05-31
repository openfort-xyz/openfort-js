import Header from "./Header";
import Footer from "./Footer";
import { CustomLogo } from "../Shared/CustomLogo";

type Props = {
  children: React.ReactNode;
};

export default function Layout({ children }: Props) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <div className="flex flex-col flex-grow container mx-auto md:w-11/12 lg:w-4/5 xl:w-3/4 divide-y divide-black-500">
        <main className="flex-grow">
          <div className="mx-auto mt-12 mb-6 max-w-md ">
            <CustomLogo />
            <div className="relative border border-gray-200 rounded shadow-md bg-white px-10 py-12">
              {children}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
