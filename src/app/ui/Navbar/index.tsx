import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
    <div className="w-full px-30">
      <Menubar className="flex justify-between">
        {/* Logo and Title */}
        <div className="flex items-center gap-3 m-10">
          <img
            src="/assets/pixel-art-cartoon-rubber-duck-with-straw-hat-icon-png.png"
            alt="GitGarden Logo"
            className="w-14 h-14 [image-rendering:pixelated]"
          />
          <span className="text-xl font-bold">GitGarden</span>
        </div>

        <div className="flex items-center gap-2">
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
                <MenubarTrigger
                  className="cursor-pointer"
                  onClick={() => navigate("/dashboard")}
                >
                  My Outfits
                </MenubarTrigger>
              </MenubarMenu>
              <MenubarMenu>
                <MenubarTrigger
                  className="cursor-pointer"
                  onClick={() => navigate("/account")}
                >
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
