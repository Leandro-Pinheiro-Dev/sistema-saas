import Image from "next/image";

import { Button } from "./ui/button";

import { Card, CardContent } from "./ui/card";

import { MenuIcon } from "lucide-react";

import { Sheet, SheetTrigger } from "./ui/sheet";

import SideBarSheet from "./sidebar-sheet";

import InstallPwaButton from "./install-pwa-button";

const Header = () => {
  return (
    <Card className="rounded-none border-x-0 border-t-0 shadow-sm sm:rounded-xl sm:border">
      <CardContent className="flex flex-row items-center justify-between px-4 py-3 sm:px-5 sm:py-4">
        {/* =====================================================
            LOGO
        ===================================================== */}
        <div className="relative h-12 w-32 sm:h-14 sm:w-36">
          <Image
            src="/LOGO_SpacoVip.jpeg"
            alt="SpaçoVip"
            fill
            priority
            sizes="(max-width: 640px) 128px, 144px"
            className="object-contain object-left"
          />
        </div>

        {/* =====================================================
            AÇÕES DO HEADER
        ===================================================== */}
        <div className="flex items-center gap-2">
          {/* =====================================================
              BOTÃO INSTALAR PWA
          ===================================================== */}
          <InstallPwaButton />

          {/* =====================================================
              MENU
          ===================================================== */}
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="outline" size="icon" aria-label="Abrir menu" />
              }
            >
              <MenuIcon className="h-5 w-5" />
            </SheetTrigger>

            <SideBarSheet />
          </Sheet>
        </div>
      </CardContent>
    </Card>
  );
};

export default Header;
