import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export default async function ItemsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "TEKNISI") {
    redirect("/");
  }

  return children;
}