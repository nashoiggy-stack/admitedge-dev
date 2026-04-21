"use client";

import { usePathname } from "next/navigation";
import { NavBar } from "./NavBar";
import { useAuthContext } from "./AuthProvider";

export const NavBarWrapper: React.FC = () => {
  const { user, guest } = useAuthContext();
  const pathname = usePathname();

  // Hide nav on landing page
  if (pathname === "/") return null;

  // Show nav if logged in, guest, or on public routes like GPA
  if (!user && !guest && pathname !== "/gpa") return null;

  return <NavBar />;
};
