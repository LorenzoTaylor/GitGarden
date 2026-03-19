import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
} from "@/components/ui/pixelact-ui/menubar";
import { Button } from "@/components/ui/pixelact-ui/button";
import { useAuth } from "../../context/AuthContext";
import AuthModal from "../AuthModal";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [authModal, setAuthModal] = useState<{ open: boolean; tab: "login" | "signup" }>({
    open: false,
    tab: "login",
  });

  return (
    <div className="w-full px-2 sm:px-8 md:px-16">
      <Menubar className="flex justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3 m-2 sm:m-4">
          <img
            src="/assets/pixel-art-cartoon-rubber-duck-with-straw-hat-icon-png.png"
            alt="GitGarden Logo"
            className="w-14 h-14 [image-rendering:pixelated]"
          />
          <span className="hidden sm:inline text-xl font-bold">GitGarden</span>
        </div>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-2">
          {user ? (
            <>
              <MenubarMenu>
                <MenubarTrigger
                  className="cursor-pointer"
                  onClick={() => navigate("/dashboard/create")}
                >
                  Create
                </MenubarTrigger>
              </MenubarMenu>
              <MenubarMenu>
                <MenubarTrigger className="cursor-pointer" onClick={() => navigate("/dashboard")}>
                  My Outfits
                </MenubarTrigger>
              </MenubarMenu>
              <MenubarMenu>
                <MenubarTrigger className="cursor-pointer" onClick={() => navigate("/account")}>
                  Account
                </MenubarTrigger>
              </MenubarMenu>
              <MenubarMenu>
                <MenubarTrigger className="cursor-pointer">{user.username}</MenubarTrigger>
                <MenubarContent>
                  <MenubarItem onClick={logout}>Log Out</MenubarItem>
                </MenubarContent>
              </MenubarMenu>
            </>
          ) : (
            <>
              <Button
                onClick={() => setAuthModal({ open: true, tab: "login" })}
                className="bg-black hover:bg-neutral-600 text-white"
              >
                Log In
              </Button>
              <Button
                onClick={() => setAuthModal({ open: true, tab: "signup" })}
                className="bg-green-800 hover:bg-green-700 text-white"
              >
                Sign Up
              </Button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="flex sm:hidden items-center">
          <MenubarMenu>
            <MenubarTrigger className="cursor-pointer px-2">
              <Icon icon="pixelarticons:menu" className="w-6 h-6" />
            </MenubarTrigger>
            <MenubarContent align="end">
              {user ? (
                <>
                  <MenubarItem onClick={() => navigate("/dashboard/create")}>Create</MenubarItem>
                  <MenubarItem onClick={() => navigate("/dashboard")}>My Outfits</MenubarItem>
                  <MenubarItem onClick={() => navigate("/account")}>Account</MenubarItem>
                  <MenubarItem onClick={logout}>Log Out ({user.username})</MenubarItem>
                </>
              ) : (
                <>
                  <MenubarItem onClick={() => setAuthModal({ open: true, tab: "login" })}>
                    Log In
                  </MenubarItem>
                  <MenubarItem onClick={() => setAuthModal({ open: true, tab: "signup" })}>
                    Sign Up
                  </MenubarItem>
                </>
              )}
            </MenubarContent>
          </MenubarMenu>
        </div>
      </Menubar>

      <AuthModal
        isOpen={authModal.open}
        onClose={() => setAuthModal({ ...authModal, open: false })}
        initialTab={authModal.tab}
      />
    </div>
  );
}

export default Navbar;
