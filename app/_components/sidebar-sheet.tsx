"use client";

import Image from "next/image";
import { Button, buttonVariants } from "./ui/button";
import { CalendarIcon, HomeIcon, LogInIcon, LogOutIcon } from "lucide-react";
import Link from "next/link";
import { SheetClose, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { quickSearchOptions } from "../_constants/search";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useRouter } from "next/navigation";
import SignInDialog from "./sign-in-dialog";

const SideBarSheet = () => {
  const { data } = useSession();
  const handleLogoutClick = () => signOut();
  const router = useRouter();
  return (
    <SheetContent>
      <SheetHeader className="mt-8">
        <SheetTitle className="text-left">MENU</SheetTitle>
      </SheetHeader>

      <div className="flex  items-center justify-between border-b border-solid py-5">
        {data?.user ? (
          <div className="flex items-center gap-2">
            <Avatar>
              <AvatarImage src={data?.user?.image ?? ""} />
              <AvatarFallback>LP</AvatarFallback>
            </Avatar>

            <div className="flex flex-col">
              <p className="font-bold">{data.user.name}</p>
              <p className="text-xs text-muted-foreground">{data.user.email}</p>
            </div>
          </div>
        ) : (
          <>
            <h2 className="absolute left-1/2 -translate-x-1/2 font-bold">
              Olá, Faça seu Login!
            </h2>

            <Dialog>
              <DialogTrigger render={<Button size="icon" className="mr-40" />}>
                <LogInIcon />
              </DialogTrigger>
              <DialogContent className="w-[90%]">
                <SignInDialog />
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      <div className="py-5 flex flex-col gap-2 border-b border-solid">
        <SheetClose
          nativeButton={false}
          render={
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "w-full justify-start gap-2",
              )}
            />
          }
        >
          <HomeIcon size={18} />
          INICIO
        </SheetClose>

        <SheetClose
          nativeButton={false}
          render={
            <Link
              href="/bookings"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "w-full justify-start gap-2",
              )}
            />
          }
        >
          <CalendarIcon size={18} />
          MEUS AGENDAMENTOS
        </SheetClose>
      </div>

      <div className="py-5 flex flex-col gap-2 border-b border-solid ">
        {quickSearchOptions.map((option) => (
          <Button
            key={option.title}
            variant="ghost"
            className="justify-start gap-2"
            onClick={() => router.push(`/barbershops?search=${option.title}`)}
          >
            <Image
              alt={option.title}
              src={option.imageUrl}
              width={18}
              height={18}
            />
            {option.title}
          </Button>
        ))}
      </div>

      {data?.user && (
        <div className="py-5 flex flex-col gap-2 border-b border-solid">
          <Button
            variant="ghost"
            className=" justify-start"
            onClick={handleLogoutClick}
          >
            <LogOutIcon size={18} />
            Sair da Conta
          </Button>
        </div>
      )}
    </SheetContent>
  );
};

export default SideBarSheet;
