import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
  MenubarShortcut,
  MenubarRadioGroup,
  MenubarRadioItem,
} from "@/components/ui/pixelact-ui/menubar";

export function Navbar() {
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

        <div className="flex">
          {/* Settings Menu */}
          <MenubarMenu>
            <MenubarTrigger className="cursor-pointer">Settings</MenubarTrigger>
          </MenubarMenu>

          {/* Characters Menu */}
          <MenubarMenu>
            <MenubarTrigger>Characters</MenubarTrigger>
            <MenubarContent>
              <MenubarRadioGroup value="benoit">
                <MenubarRadioItem value="andy">Andy</MenubarRadioItem>
                <MenubarRadioItem value="benoit">Benoit</MenubarRadioItem>
                <MenubarRadioItem value="Luis">Luis</MenubarRadioItem>
              </MenubarRadioGroup>
              <MenubarSeparator />
              <MenubarItem inset>Edit...</MenubarItem>
              <MenubarSeparator />
              <MenubarItem inset>Add Profile...</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </div>
      </Menubar>
    </div>
  );
}

export default Navbar;
