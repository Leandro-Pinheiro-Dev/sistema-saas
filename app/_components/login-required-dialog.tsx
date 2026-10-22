"use client";

import { Dialog, DialogContent } from "./ui/dialog";
import SignInDialog from "./sign-in-dialog";

const LoginRequiredDialog = () => {
  return (
    <Dialog open>
      <DialogContent className="w-[90%]">
        <SignInDialog />
      </DialogContent>
    </Dialog>
  );
};

export default LoginRequiredDialog;
