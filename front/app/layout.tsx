import './styles/global.css';
import type {Metadata} from "next";
import Providers from "@/app/components/providers/Providers";


export const metadata: Metadata = {
  title: "Chattt",
  description: "Chattt la meilleur app de chat",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={""}>
    <body>
    <Providers>
      {children}
    </Providers>
    </body>
    </html>
  );
}
